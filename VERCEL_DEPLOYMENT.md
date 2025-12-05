# Vercel Deployment Guide

This guide explains how to deploy the YouTube Digital Twin chat interface to Vercel while keeping data processing local.

## Architecture Overview

```
LOCAL MACHINE                    VERCEL PRODUCTION
┌──────────────────┐            ┌──────────────────┐
│ Python Scripts   │            │  Next.js Chat    │
│ - ingest.py      │────push───>│  - Chat UI       │
│ - convert.py     │   JSON     │  - RAG API       │
│ - batch.py       │   files    │  - Read-only     │
└──────────────────┘            └──────────────────┘
```

## What Runs Where

### Local Machine (Processing)
✅ YouTube video ingestion
✅ Docling document conversion
✅ Embedding generation
✅ Knowledge base creation
✅ Channel metadata fetching

**Generates:**
- `data/knowledge_base.json` (embeddings + transcript chunks)
- `data/channel_metadata.json` (channel info)

### Vercel (Production)
✅ Next.js web interface
✅ Chat UI (app/page.tsx)
✅ RAG API (app/api/chat/route.ts)
✅ Admin panel (read-only in production)

**Reads:**
- `data/knowledge_base.json` (from git)
- `data/channel_metadata.json` (from git)

❌ **NOT deployed to Vercel:**
- Python scripts
- Docling
- `/convert` API endpoint
- Admin training functionality

## Deployment Workflow

### Initial Setup

1. **Create Vercel Project**
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   ```

2. **Configure Environment Variables in Vercel Dashboard**
   - Go to: https://vercel.com/[your-username]/[project]/settings/environment-variables
   - Add these variables:
     ```
     TOGETHER_API_KEY=your_together_api_key_here
     YOUTUBE_API_KEY=your_youtube_api_key_here
     ADMIN_PASSWORD=your_secure_password_here
     ```

3. **Update Git Ignore**
   The `.gitignore` has been configured to ALLOW committing:
   - ✅ `data/knowledge_base.json`
   - ✅ `data/channel_metadata.json`

   While IGNORING:
   - ❌ `data/uploads/` (temporary files)
   - ❌ `venv/` (Python environment)
   - ❌ `.env*` (secrets)

### Regular Update Workflow

When you want to update the YouTube channel content:

1. **Run Ingestion Locally**
   ```bash
   cd C:\Users\sysadmin\youtube-digital-twin

   # Activate Python environment
   .\venv\Scripts\activate

   # Fetch latest channel metadata
   python scripts/fetch_channel_metadata.py --channel "https://www.youtube.com/@psychacks"

   # Ingest latest videos (adjust --limit as needed)
   python scripts/ingest.py --channel "https://www.youtube.com/@psychacks" --limit 50
   ```

2. **Verify Generated Files**
   ```bash
   # Check knowledge base was created
   ls -lh data/knowledge_base.json

   # Check channel metadata
   cat data/channel_metadata.json
   ```

3. **Commit and Push to Git**
   ```bash
   git add data/knowledge_base.json data/channel_metadata.json
   git commit -m "Update knowledge base: $(date +%Y-%m-%d)"
   git push origin main
   ```

4. **Automatic Vercel Deployment**
   - Vercel automatically detects the git push
   - Builds and deploys the new version
   - Chat interface now uses updated knowledge base
   - Takes ~2-3 minutes

### For Docling Document Processing

When you convert documents with Docling locally:

1. **Convert Documents**
   ```bash
   # Single document
   python scripts/convert_document.py path/to/document.pdf markdown

   # Batch conversion
   python scripts/batch_convert.py --input docs/ --output data/converted/

   # Prepare for LLM training
   python scripts/prepare_training_data.py --input data/converted/ --output training_data.jsonl
   ```

2. **Documents are NOT pushed to Vercel**
   - Document processing happens entirely locally
   - Use converted markdown for local LLM training
   - Or manually add to knowledge base if needed

## File Structure for Deployment

```
youtube-digital-twin/
├── app/                        # ✅ Deployed to Vercel
│   ├── page.tsx               # Chat UI
│   ├── admin/page.tsx         # Admin (read-only in prod)
│   ├── api/chat/route.ts      # RAG endpoint
│   └── convert/               # ❌ Won't work (needs Python)
├── data/
│   ├── knowledge_base.json    # ✅ Committed & deployed
│   ├── channel_metadata.json  # ✅ Committed & deployed
│   ├── config.json            # ✅ Committed (safe to share)
│   └── uploads/               # ❌ Ignored (temporary)
├── scripts/                   # ❌ Not deployed (local only)
│   ├── ingest.py
│   ├── convert_document.py
│   └── ...
├── venv/                      # ❌ Not deployed
├── .env.local                 # ❌ Not committed (secrets)
├── vercel.json                # ✅ Vercel config
└── .vercelignore              # Scripts to exclude
```

## Testing Before Deployment

Test locally before pushing:

```bash
# Build production version locally
npm run build
npm start

# Visit http://localhost:3000
# Test chat functionality
# Verify channel metadata displays correctly
```

## Vercel Dashboard Configuration

1. **Project Settings** → **General**
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

2. **Environment Variables**
   - `TOGETHER_API_KEY` (from Together.AI)
   - `YOUTUBE_API_KEY` (from Google Cloud Console)
   - `ADMIN_PASSWORD` (your choice)

3. **Git Integration**
   - Auto-deploy: ✅ Enabled
   - Production Branch: `main`

## Cost Considerations

### Vercel (Free Tier)
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Serverless functions
- Likely FREE for personal use

### Together.AI Usage
- Embeddings: ~$0.00008 per 1M tokens (very cheap)
- LLM inference: ~$0.18 per 1M tokens
- Estimated cost: **$1-5/month** for moderate use

### No hosting costs for:
- ❌ Python runtime
- ❌ Docling
- ❌ GPU/CPU for processing
- ❌ Storage for documents

## Monitoring

Check deployment status:
```bash
vercel logs
```

Or visit: https://vercel.com/[username]/[project]/deployments

## Limitations

**Admin Panel on Vercel:**
- ⚠️ "Train" button won't work (no Python)
- ⚠️ Config changes won't persist (no write access)
- Use admin panel for viewing status only

**Document Conversion:**
- ❌ `/convert` endpoint won't work on Vercel
- ✅ Use Docling locally instead

**Solution:** Keep the web UI on Vercel, run processing scripts locally

## Quick Commands

```bash
# Deploy to production
git push origin main

# Check deployment status
vercel --prod

# View production logs
vercel logs --prod

# Test production build locally
npm run build && npm start
```

## Troubleshooting

**Issue:** Chat shows "I don't have that information"
- Check if `knowledge_base.json` was committed and pushed
- Verify file is present in Vercel deployment files

**Issue:** Channel avatar not showing
- Verify `channel_metadata.json` is in git
- Check browser console for 404 errors

**Issue:** Environment variables not working
- Set them in Vercel dashboard, not in `.env.local`
- Redeploy after adding variables

## Security Notes

✅ **Safe to commit:**
- `knowledge_base.json` (public YouTube transcripts)
- `channel_metadata.json` (public channel info)
- `config.json` (just channel URL)

❌ **NEVER commit:**
- `.env.local` (API keys)
- `TOGETHER_API_KEY`
- `YOUTUBE_API_KEY`
- Private documents

## Summary

1. **Process locally** → Generate JSON files
2. **Commit JSON** → Push to git
3. **Auto-deploy** → Vercel rebuilds
4. **Users access** → Production chat at your-app.vercel.app

Your chat interface is live on Vercel, but all heavy processing stays on your local machine!
