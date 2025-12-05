import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const KB_PATH = path.join(process.cwd(), 'data', 'knowledge_base.json');

export async function GET() {
  try {
    const stat = await fs.stat(KB_PATH);
    const raw = await fs.readFile(KB_PATH, 'utf-8');
    const data = JSON.parse(raw);

    const chunkCount = Array.isArray(data) ? data.length : 0;
    const videoIds = new Set<string>();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item?.metadata?.video_id) {
          videoIds.add(item.metadata.video_id);
        }
      }
    }

    return NextResponse.json({
      exists: true,
      chunkCount,
      videoCount: videoIds.size,
      modifiedAt: stat.mtime,
    });
  } catch (e) {
    return NextResponse.json({ exists: false });
  }
}
