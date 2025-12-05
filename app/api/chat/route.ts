import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

// Initialize OpenAI client (compatible with Together AI)
const openai = new OpenAI({
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
});

const EMBEDDING_MODEL = 'togethercomputer/m2-bert-80M-8k-retrieval';
const CHAT_MODEL = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

export const dynamic = 'force-dynamic';

async function getKnowledgeBase() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading knowledge base:", error);
    return [];
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

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // 1. Embed the user's query
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

  // 2. Retrieve relevant chunks
  let contextString = "";
  if (embedding) {
      const knowledgeBase = await getKnowledgeBase();
      if (knowledgeBase.length > 0) {
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
  }

  // 3. Generate Answer
  const systemPrompt = `You are a helpful AI assistant that acts as a digital twin of a YouTube channel. 
  Answer the user's question based ONLY on the provided context. 
  If the answer is not in the context, say "I don't have that information from the channel videos."
  
  ${contextString}`;

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
