# YouTube Digital Twin

A RAG-powered chatbot platform that lets you chat with any YouTube channel using AI. Built with Next.js 14, Python 3.12, and Together AI.

---

## Features

- Chat with any YouTube channel using AI
- YouTube transcript ingestion with automatic embedding generation
- RAG (Retrieval-Augmented Generation) for accurate, context-aware responses
- Channel branding - Displays channel avatar, name, and subscriber count
- Real-time streaming responses powered by LLaMA 3.1 70B
- Admin panel for channel configuration and training status
- Vercel-ready deployment configuration

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Together AI API key (free tier available)
- YouTube API key (Google Cloud Console)

### 1. Clone and Install

```bash
git clone https://github.com/sleehoco/youtube-digital-twin.git
cd youtube-digital-twin

# Install Node dependencies
npm install

# Setup Python environment
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install Python dependencies
pip install -r scripts/requirements.txt
```

### 2. Configure Environment Variables

Create `.env.local`:
```env
TOGETHER_API_KEY=your_together_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
ADMIN_PASSWORD=your_secure_password
```

### 3. Run the Application

```bash
# Start Next.js dev server
npm run dev

# Visit:
# - http://localhost:3000 - YouTube Twin Chat
# - http://localhost:3000/admin - Admin Panel
```

---

## Usage

### Ingest a YouTube Channel

```bash
# Activate Python environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Fetch channel metadata
python scripts/fetch_channel_metadata.py --channel "https://www.youtube.com/@YourChannel"

# Ingest videos and generate embeddings
python scripts/ingest.py --channel "https://www.youtube.com/@YourChannel" --limit 50
```

This creates:
- `data/channel_metadata.json` - Channel info (name, avatar, stats)
- `data/knowledge_base.json` - Video transcripts with embeddings

### Chat with Your Channel

Visit http://localhost:3000 and start chatting! The AI will answer questions based on the channel's video content.

### Deploy to Vercel

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete deployment guide.

**Quick deploy:**
```bash
# Run automated deployment script
.\scripts\deploy.bat "https://www.youtube.com/@YourChannel" 50  # Windows
./scripts/deploy.sh "https://www.youtube.com/@YourChannel" 50  # Mac/Linux
```

This will:
1. Fetch channel metadata
2. Ingest videos and create embeddings
3. Commit knowledge base to git
4. Push to GitHub (triggers Vercel deployment)

---

## Project Structure

```
youtube-digital-twin/
├── app/
│   ├── page.tsx                  # YouTube Twin chat UI
│   ├── admin/page.tsx            # Admin panel
│   └── api/
│       ├── chat/route.ts         # RAG chat endpoint
│       └── admin/                # Admin API endpoints
├── scripts/
│   ├── ingest.py                 # YouTube video ingestion
│   ├── fetch_channel_metadata.py # Channel info fetcher
│   └── deploy.bat / deploy.sh    # Deployment automation
├── data/
│   ├── knowledge_base.json       # YouTube embeddings (committed to git)
│   ├── channel_metadata.json     # Channel info (committed to git)
│   └── config.json               # Channel configuration
├── QUICK_START.md                # Quick reference
├── VERCEL_DEPLOYMENT.md          # Deployment guide
└── vercel.json                   # Vercel configuration
```

---

## Use Cases

1. **Customer Support Bot** - Train on product tutorial videos
2. **Educational Assistant** - Create AI tutors from educational channels
3. **Content Discovery** - Help users find relevant video content
4. **Knowledge Management** - Make company training videos searchable

---

## Technology Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Vercel AI SDK

**Backend:**
- Python 3.12
- Together AI (LLM & embeddings)
- YouTube Data API v3
- YouTube Transcript API

**AI/ML:**
- Meta Llama 3.1 70B (chat)
- m2-bert-80M-8k-retrieval (embeddings)

**Deployment:**
- Vercel (frontend hosting)
- Local processing (Python scripts)
- GitHub (version control & CI/CD)

---

## How RAG Works

```
User Question
    │
    ▼
Embed question ──────────► Together AI Embeddings API
    │
    ▼
Find top 5 similar chunks ──► Cosine similarity search
    │                          in knowledge_base.json
    ▼
Inject context + question ──► LLaMA 3.1 70B
    │
    ▼
Stream response ──────────► User
```

The chatbot retrieves relevant video transcript chunks before generating responses, ensuring answers are grounded in actual channel content.

---

## Deployment Architecture

**Vercel (Production):**
- Next.js application
- Chat UI & API routes
- Reads knowledge_base.json from git
- ~$0/month (free tier)

**Local Machine (Processing):**
- Python scripts
- YouTube ingestion
- Embedding generation
- Git commit & push

**Workflow:**
```
Local Processing → Git Push → Vercel Auto-Deploy → Live Updates
```

See [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) for details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](QUICK_START.md) | Get started in 5 minutes |
| [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) | Complete Vercel deployment guide |
| [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) | Quick deployment reference |

---

## API Endpoints

### Chat API
```bash
POST /api/chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "What topics does this channel cover?"}
  ]
}
```

### Admin API
```bash
GET /api/admin/status
GET /api/admin/config
POST /api/admin/train
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.x | 20.x+ |
| Python | 3.9 | 3.12+ |
| RAM | 4 GB | 8 GB+ |
| Disk | 2 GB | 5 GB+ |
| OS | Windows 10, macOS 11, Ubuntu 20.04 | Latest versions |

---

## Cost Estimate

**Free Tier:**
- Vercel hosting: $0/month (100GB bandwidth)
- YouTube API: Free (10,000 units/day)

**Pay-as-you-go:**
- Together AI: ~$1-5/month for moderate use
  - Embeddings: $0.00008 per 1M tokens
  - Chat: $0.18 per 1M tokens

**Total: ~$1-5/month** for personal/moderate use

---

## Troubleshooting

### YouTube ingestion fails
- Check YouTube API key is valid
- Ensure channel URL is correct (format: `@username`)
- Verify API quota not exceeded (10,000 units/day)

### Chat responses generic
- Ensure knowledge base was generated (check `data/knowledge_base.json`)
- Verify embeddings were created successfully
- Try increasing `--limit` during ingestion for more content

### Vercel deployment issues
- Check environment variables are set in Vercel dashboard
- Ensure `knowledge_base.json` is committed to git
- Verify build completes successfully locally with `npm run build`

---

## Example Channel

This repository is pre-configured for **Orion Taraban (@psychacks)**:
- 947K subscribers
- 2,113 videos
- Psychology and relationship content

**Want to use a different channel?**
```bash
python scripts/ingest.py --channel "https://www.youtube.com/@YourChannel" --limit 50
```

---

## Support

- **Issues:** [GitHub Issues](https://github.com/sleehoco/youtube-digital-twin/issues)
- **Documentation:** See docs/ folder
- **Questions:** Check existing issues or create a new one

---

## License

MIT License - see LICENSE file

---

## Resources

**APIs & Frameworks:**
- [Together AI Documentation](https://docs.together.ai)
- [Next.js Documentation](https://nextjs.org/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Vercel Documentation](https://vercel.com/docs)

**AI/ML:**
- [LLaMA Models](https://ai.meta.com/llama/)
