# Vercel Deployment - Quick Start

## TL;DR - How to Deploy

### Option 1: Automated Deployment Script (Recommended)

**Windows:**
```bash
cd C:\Users\sysadmin\youtube-digital-twin
scripts\deploy.bat "https://www.youtube.com/@psychacks" 50
```

**Linux/Mac:**
```bash
cd youtube-digital-twin
./scripts/deploy.sh "https://www.youtube.com/@psychacks" 50
```

This script will:
1. Fetch channel metadata
2. Ingest videos and generate embeddings
3. Commit knowledge base files
4. Prompt you to push to GitHub
5. Vercel auto-deploys when you push

### Option 2: Manual Steps

```bash
# 1. Process data locally
.\venv\Scripts\activate
python scripts/fetch_channel_metadata.py --channel "https://www.youtube.com/@psychacks"
python scripts/ingest.py --channel "https://www.youtube.com/@psychacks" --limit 50

# 2. Commit and push
git add data/knowledge_base.json data/channel_metadata.json
git commit -m "Update knowledge base"
git push origin main

# 3. Vercel automatically deploys
```

## Initial Vercel Setup (One-time)

### 1. Install Vercel CLI
```bash
npm i -g vercel
vercel login
```

### 2. Link Your Project
```bash
cd C:\Users\sysadmin\youtube-digital-twin
vercel link
```

Follow prompts:
- Link to existing project? **No**
- Project name: **youtube-digital-twin** (or your choice)
- Directory: **.** (current directory)

### 3. Set Environment Variables

Go to: https://vercel.com/[username]/[project]/settings/environment-variables

Add these three variables:

| Variable Name | Value | Where to Get It |
|---------------|-------|-----------------|
| `TOGETHER_API_KEY` | Your API key | https://api.together.ai/settings/api-keys |
| `YOUTUBE_API_KEY` | Your API key | https://console.cloud.google.com/apis/credentials |
| `ADMIN_PASSWORD` | Your password | Choose a secure password |

**Important:** Add them to all environments (Production, Preview, Development)

### 4. Deploy
```bash
git push origin main
```

Vercel automatically detects the push and deploys!

Visit: `https://[your-project].vercel.app`

## What Gets Deployed

✅ **Frontend (Next.js)**
- Chat interface (/)
- Admin panel (/admin)
- Convert page (/convert) - UI only, conversion won't work

✅ **API Routes**
- `/api/chat` - RAG chatbot (works!)
- `/api/admin/*` - Config & status (works!)
- `/api/convert` - Document conversion (won't work - needs Python)

✅ **Static Data**
- `data/knowledge_base.json` - From git
- `data/channel_metadata.json` - From git

❌ **NOT Deployed**
- Python scripts (scripts/)
- Virtual environment (venv/)
- Docling
- Temporary uploads (data/uploads/)

## How Updates Work

```
┌─────────────────────┐
│  Your Local Machine │
│  (Windows)          │
└──────┬──────────────┘
       │ 1. Run ingestion script
       │ 2. Generate knowledge_base.json
       │ 3. Git commit
       │ 4. Git push
       ▼
┌─────────────────────┐
│  GitHub             │
│  (Repository)       │
└──────┬──────────────┘
       │ Webhook triggers deployment
       ▼
┌─────────────────────┐
│  Vercel             │
│  (Production)       │
│  - Detects push     │
│  - Runs npm build   │
│  - Deploys new ver. │
└─────────────────────┘
       │
       ▼
    Users see updated chat with new content
```

## File Checklist

Before deploying, ensure these files are configured:

- [x] `.env.local` - Has your local API keys (NOT committed)
- [x] `vercel.json` - Vercel configuration
- [x] `.vercelignore` - Excludes Python/scripts from deployment
- [x] `.gitignore` - Updated to ALLOW `knowledge_base.json`
- [x] `data/knowledge_base.json` - Exists and has content
- [x] `data/channel_metadata.json` - Exists with channel info

## Vercel Limits (Free Tier)

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Serverless executions | 100 GB-hrs |
| Build time | 6,000 minutes/month |
| Deployments | Unlimited |

For a personal YouTube twin, you'll likely stay well within free tier limits.

## Testing Before Deployment

```bash
# Build production version locally
npm run build

# Run production server
npm start

# Visit http://localhost:3000
# Test chat, check for errors
```

## Common Issues

### Chat says "I don't have that information"
**Cause:** knowledge_base.json is empty or not deployed
**Fix:** Run ingestion locally, commit, and push

### Channel avatar not showing
**Cause:** channel_metadata.json missing or not committed
**Fix:** Run `python scripts/fetch_channel_metadata.py`, commit, push

### "Train Now" button doesn't persist data
**Expected:** On Vercel, filesystem is ephemeral
**Solution:** Use local ingestion + git push workflow instead

### Build fails on Vercel
**Check:**
1. Environment variables are set
2. No Python imports in frontend code
3. `npm run build` works locally

## Quick Reference

```bash
# Update content (run locally)
scripts\deploy.bat

# Check deployment status
vercel ls

# View logs
vercel logs

# Roll back to previous deployment
vercel rollback

# Open Vercel dashboard
vercel --prod
```

## URLs After Deployment

- **Production:** https://[project].vercel.app
- **Chat:** https://[project].vercel.app/
- **Admin:** https://[project].vercel.app/admin
- **Dashboard:** https://vercel.com/[username]/[project]

## Cost Estimate

**Free Tier:**
- Vercel: $0/month
- Together.AI: ~$1-5/month (pay-as-you-go)
- YouTube API: Free (10,000 units/day)
- **Total: ~$1-5/month**

## Support

- Vercel Docs: https://vercel.com/docs
- Full Guide: See `VERCEL_DEPLOYMENT.md`
- Issues: Check deployment logs in Vercel dashboard
