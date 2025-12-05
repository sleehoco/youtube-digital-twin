import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

// Initialize OpenAI client (compatible with Together AI)
const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY?.trim(),
  baseURL: 'https://api.together.xyz/v1',
});

const EMBEDDING_MODEL = 'togethercomputer/m2-bert-80M-2k-retrieval'; // Using all-MiniLM-L6-v2 compatible model
const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim();

export const dynamic = 'force-dynamic';

async function getTwinData(twinId: string) {
  try {
    const metadataPath = path.join(process.cwd(), 'data', 'twins', twinId, 'metadata.json');
    const kbPath = path.join(process.cwd(), 'data', 'twins', twinId, 'knowledge_base.json');

    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    const knowledgeBase = JSON.parse(await fs.readFile(kbPath, 'utf-8'));

    return { metadata, knowledgeBase };
  } catch (error) {
    console.error(`Error reading twin data for ${twinId}:`, error);
    return null;
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function searchWeb(query: string) {
  if (!TAVILY_API_KEY) {
    console.log('No Tavily API key configured, skipping web search');
    return null;
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        max_results: 5,
        include_answer: true,
        search_depth: 'basic',
      }),
    });

    if (!response.ok) {
      console.error('Tavily search failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Web search error:', error);
    return null;
  }
}

function shouldSearchWeb(query: string): boolean {
  // Keywords that indicate current/recent information is needed
  const currentInfoKeywords = [
    'latest', 'recent', 'current', 'now', 'today', 'this week', 'this month',
    'news', 'update', 'new', 'upcoming', '2025', '2024', 'what\'s happening',
    'trending', 'just released', 'breaking'
  ];

  const lowerQuery = query.toLowerCase();
  return currentInfoKeywords.some(keyword => lowerQuery.includes(keyword));
}

export async function POST(
  req: Request,
  { params }: { params: { twinId: string } }
) {
  const { messages } = await req.json();
  const { twinId } = params;
  const lastMessage = messages[messages.length - 1];

  // Load twin data
  const twinData = await getTwinData(twinId);

  if (!twinData) {
    return new Response(JSON.stringify({ error: 'Twin not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { metadata, knowledgeBase } = twinData;

  // 1. Check if we should search the web for current information
  let webSearchResults = '';
  if (shouldSearchWeb(lastMessage.content)) {
    console.log('Performing web search for:', lastMessage.content);
    const searchData = await searchWeb(lastMessage.content);

    if (searchData && searchData.results && searchData.results.length > 0) {
      const searchSummaries = searchData.results
        .slice(0, 3)
        .map((result: any, idx: number) =>
          `[${idx + 1}] ${result.title}: ${result.content}`
        )
        .join('\n\n');

      webSearchResults = `\n\nCurrent web information:\n${searchSummaries}`;
    }
  }

  // 2. Embed the user's query
  let embedding = null;
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: lastMessage.content,
    });

    embedding = response.data[0].embedding;

  } catch (error) {
    console.error("Embedding error:", error);
  }

  // 3. Retrieve relevant chunks
  let contextString = "";
  if (embedding && knowledgeBase.length > 0) {
    const chunksWithScores = knowledgeBase.map((chunk: any) => ({
        ...chunk,
        score: cosineSimilarity(embedding, chunk.embedding)
    }));

    // Sort by score descending
    chunksWithScores.sort((a: any, b: any) => b.score - a.score);

    // Take top 5
    const topChunks = chunksWithScores.slice(0, 5);

    const context = topChunks.map((chunk: any) => chunk.text).join("\n\n");
    contextString = `\n\nContext from YouTube Channel:\n${context}`;
  }

  // 4. Generate Answer
  const systemPrompt = `You are ${metadata.title}, the YouTube creator speaking directly to your audience. Respond as yourself in first person, sharing your perspectives, ideas, and insights.

Key instructions:
- Speak naturally as "I" and "my" - you ARE the creator, not an assistant describing their content
- Share your thoughts, philosophies, and advice based on your content
- Be conversational and authentic, as if having a one-on-one discussion
- Don't reference "the channel", "the videos", or "the creator" in third person
- Don't list or cite specific videos - instead, discuss the ideas and concepts directly
- Stay focused on the topics you discuss in your content
- If asked to write code, create content, or do technical tasks, politely decline and redirect: "That's not really what I do - I focus on discussing ideas and perspectives about [your topic]. What would you like to know about that?"
- If asked about something outside your expertise, say "That's not something I typically discuss" or "I haven't explored that topic in depth"
- When current information from web search is available, you can reference it naturally to discuss recent developments, but always from your perspective and expertise

Use the context below to inform your responses, but speak naturally from your perspective:
${contextString}${webSearchResults}`;

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
  });

  const stream = OpenAIStream(response as any);
  return new StreamingTextResponse(stream);
}
