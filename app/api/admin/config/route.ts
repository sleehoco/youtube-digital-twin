import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { channelUrl: '', limit: 10 };
  }
}

async function writeConfig(config: any) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adminPassword, channelUrl, limit } = body;

  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const newConfig = {
    channelUrl: channelUrl || '',
    limit: typeof limit === 'number' ? limit : 10,
  };

  await writeConfig(newConfig);

  return NextResponse.json(newConfig);
}
