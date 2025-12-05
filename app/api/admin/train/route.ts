import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

const TOGETHER_BASE_URL = 'https://api.together.xyz/v1';
const EMBEDDING_MODEL = 'togethercomputer/m2-bert-80M-8k-retrieval';
const KB_PATH = path.join(process.cwd(), 'data', 'knowledge_base.json');

if (!YOUTUBE_API_KEY) {
  console.warn('YOUTUBE_API_KEY is not set. /api/admin/train will fail until it is configured.');
}

if (!TOGETHER_API_KEY) {
  console.warn('TOGETHER_API_KEY is not set. /api/admin/train will fail until it is configured.');
}

const openai = new OpenAI({
  apiKey: TOGETHER_API_KEY,
  baseURL: TOGETHER_BASE_URL,
});

export const maxDuration = 60; // seconds, helpful for serverless

function extractHandleOrId(channelUrl: string): { handle?: string; channelId?: string } {
  if (channelUrl.includes('/channel/')) {
    const part = channelUrl.split('/channel/')[1];
    const id = part.split('/')[0];
    return { channelId: id };
  }
  if (channelUrl.includes('youtube.com/@')) {
    const part = channelUrl.split('youtube.com/@')[1];
    const handle = part.split('/')[0];
    return { handle };
  }
  const last = channelUrl.replace(/\/+$/, '').split('/').pop() || '';
  if (last.startsWith('@')) {
    return { handle: last.slice(1) };
  }
  return { handle: last };
}

async function resolveChannelId(channelUrl: string): Promise<string> {
  const { handle, channelId } = extractHandleOrId(channelUrl);
  if (channelId) return channelId;

  const query = handle || channelUrl;
  const url = 'https://www.googleapis.com/youtube/v3/search';
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'channel',
    q: query,
    key: YOUTUBE_API_KEY || '',
    maxResults: '1',
  });

  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube search failed: ${res.status} ${res.statusText}: ${text}`);
  }
  const data = await res.json();
  const items = data.items || [];
  if (!items.length) {
    throw new Error(`No channel found for query '${query}'`);
  }
  return items[0].snippet.channelId as string;
}

async function getChannelVideos(channelUrl: string, limit: number): Promise<string[]> {
  const channelId = await resolveChannelId(channelUrl);
  const url = 'https://www.googleapis.com/youtube/v3/search';

  const videoIds: string[] = [];
  let nextPageToken: string | undefined = undefined;

  while (videoIds.length < limit) {
    const maxResults = Math.min(50, limit - videoIds.length);
    const params = new URLSearchParams({
      part: 'id',
      channelId,
      maxResults: String(maxResults),
      order: 'date',
      type: 'video',
      key: YOUTUBE_API_KEY || '',
    });
    if (nextPageToken) params.set('pageToken', nextPageToken);

    const res = await fetch(`${url}?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube list videos failed: ${res.status} ${res.statusText}: ${text}`);
    }
    const data = await res.json();
    for (const item of data.items || []) {
      const vid = item.id?.videoId;
      if (vid) videoIds.push(vid);
      if (videoIds.length >= limit) break;
    }
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }

  return videoIds;
}

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminPassword, channelUrl, limit } = body as {
      adminPassword?: string;
      channelUrl?: string;
      limit?: number;
    };

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!channelUrl) {
      return new NextResponse('channelUrl is required', { status: 400 });
    }

    if (!YOUTUBE_API_KEY || !TOGETHER_API_KEY) {
      return new NextResponse('Server missing YOUTUBE_API_KEY or TOGETHER_API_KEY', {
        status: 500,
      });
    }

    const videoLimit = limit && limit > 0 ? Math.min(limit, 50) : 10;

    // 1. Get video IDs
    const videoIds = await getChannelVideos(channelUrl, videoLimit);

    // 2. Fetch transcripts and build chunks
    const knowledgeBase: any[] = [];

    for (const videoId of videoIds) {
      let transcriptText = '';
      try {
        // Try YouTube transcripts via youtube-transcript-api compatible endpoint.
        // We can't use the Python lib here, so we call the same underlying HTTP endpoint.
        const url = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Transcript HTTP ${res.status}`);
        }
        const xml = await res.text();
        // Very rough XML to text: strip tags and decode basic entities.
        transcriptText = xml
          .replace(/<\/?text[^>]*>/g, '\n')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (!transcriptText) {
          throw new Error('Empty transcript');
        }
      } catch (e) {
        console.warn(`No transcript for video ${videoId}:`, e);
        continue;
      }

      const chunks = chunkText(transcriptText);
      for (const chunk of chunks) {
        knowledgeBase.push({
          text: chunk,
          metadata: { video_id: videoId },
        });
      }
    }

    if (!knowledgeBase.length) {
      return NextResponse.json({
        ok: false,
        message: 'No transcripts/chunks generated. Check channel or transcripts availability.',
      });
    }

    // 3. Generate embeddings with Together AI
    for (const item of knowledgeBase) {
      try {
        const resp = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: item.text,
        });
        item.embedding = resp.data[0].embedding;
      } catch (e) {
        console.error('Embedding error:', e);
      }
    }

    // 4. Save to knowledge_base.json
    await fs.mkdir(path.dirname(KB_PATH), { recursive: true });
    await fs.writeFile(KB_PATH, JSON.stringify(knowledgeBase), 'utf-8');

    return NextResponse.json({
      ok: true,
      chunks: knowledgeBase.length,
      videos: new Set(knowledgeBase.map((x) => x.metadata?.video_id)).size,
    });
  } catch (error: any) {
    console.error('Admin train error:', error);
    return new NextResponse(error?.message || 'Internal server error', { status: 500 });
  }
}
