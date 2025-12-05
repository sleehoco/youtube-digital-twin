# YouTube Digital Twin - Deployment Guide

## Current Status

✅ **Docling Pipeline Removed** - Project now focuses solely on YouTube RAG chatbot
✅ **WSL2 Migration Complete** - Development environment at `~/youtube-digital-twin`
✅ **Build Tested** - Production build successful in WSL2
✅ **Vercel Connected** - Project: `youtube-digital-twin`
🔄 **Ready for Deployment** - Changes ready to push

---

## Deployment Checklist

### 1. Git Commands (Run from WSL2)

```bash
# Navigate to project
wsl
cd ~/youtube-digital-twin

# Check current status
git status

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "Remove Docling Pipeline - Focus on YouTube Digital Twin

- Removed Docling document conversion UI (/app/convert)
- Removed Docling API endpoint (/app/api/convert)
- Removed all Docling Python scripts
- Removed Docling documentation
- Updated README to focus on YouTube RAG chatbot
- Added WSL2-SETUP.md for development environment
- Streamlined project structure for YouTube Digital Twin only"

# Push to GitHub (triggers Vercel deployment)
git push origin main
```

### 2. Verify Vercel Environment Variables

**Required Environment Variables:**
```bash
TOGETHER_API_KEY=<your_together_api_key>
YOUTUBE_API_KEY=<your_youtube_api_key>
ADMIN_PASSWORD=<your_admin_password>
```

**Vercel Dashboard:**
- URL: https://vercel.com/your-team/youtube-digital-twin/settings/environment-variables
- Project: `youtube-digital-twin`
- Project ID: `prj_cfVkvrE9asd8epKScqB2LnfUB5bv`

**Steps:**
1. Go to Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Verify all three variables are set for Production, Preview, and Development
4. If any are missing, add them now

### 3. Monitor Deployment

After pushing to GitHub:

1. **Automatic Trigger:** Vercel will automatically detect the push
2. **Build Process:** Watch the deployment at https://vercel.com/your-team/youtube-digital-twin
3. **Build Time:** Should complete in ~2-3 minutes
4. **Success Indicators:**
   - Build succeeds without errors
   - No `/convert` route in build output
   - Only YouTube Twin routes present

### 4. Post-Deployment Verification

Once deployed, test these endpoints:

```bash
# Main chat interface
https://your-domain.vercel.app/

# Admin panel
https://your-domain.vercel.app/admin

# API endpoints
https://your-domain.vercel.app/api/chat
https://your-domain.vercel.app/api/admin/status
```

**Expected Routes (Post-Docling Removal):**
- `/` - YouTube Twin chat UI ✅
- `/admin` - Admin panel ✅
- `/api/chat` - RAG chat endpoint ✅
- `/api/admin/*` - Admin APIs ✅
- ~~`/convert`~~ - REMOVED ✅

---

## What Changed (Docling Removal)

### Files Deleted
- `app/convert/page.tsx` - Document conversion UI
- `app/api/convert/route.ts` - Document conversion API
- `scripts/batch_convert.py`
- `scripts/convert_document.py`
- `scripts/demo_batch.py`
- `scripts/prepare_training_data.py`
- `scripts/test_docling.py`
- `DOCLING_SETUP.md`
- `docs/llm-training-pipeline.md`

### Files Updated
- `README.md` - Removed all Docling references, focused on YouTube Twin
- `.gitignore` - Unchanged (already configured)

### Files Added
- `WSL2-SETUP.md` - Development environment documentation

### Dependencies (Unchanged)
- Node.js dependencies remain the same
- Python dependencies cleaned (no Docling dependencies)

---

## Quick Commands Reference

### Development (WSL2)
```bash
wsl
cd ~/youtube-digital-twin

# Start dev server
npm run dev

# Build production
npm run build

# Python scripts
source venv/bin/activate
python scripts/ingest.py --channel "https://www.youtube.com/@Channel" --limit 50
```

### Git Operations
```bash
# Check status
git status

# View changes
git diff

# Add all changes
git add -A

# Commit
git commit -m "Your message"

# Push (triggers deployment)
git push origin main

# View commit history
git log --oneline -5
```

### Vercel CLI (Optional)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy manually
vercel --prod

# View logs
vercel logs
```

---

## Build Output Expected

After successful deployment, Vercel build should show:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    ~20 kB         ~108 kB
├ ○ /_not-found                          ~900 B          ~88 kB
├ ○ /admin                               ~2 kB          ~89 kB
├ ƒ /api/admin/config                    0 B                0 B
├ ○ /api/admin/status                    0 B                0 B
├ ƒ /api/admin/train                     0 B                0 B
└ ƒ /api/chat                            0 B                0 B
```

**Note:** No `/convert` or `/api/convert` routes should appear

---

## Troubleshooting

### Build Fails

**Issue:** Vercel build fails with "Module not found"
**Solution:**
```bash
# Clean install in WSL2
cd ~/youtube-digital-twin
rm -rf node_modules package-lock.json
npm install
npm run build
# If successful, commit and push
```

### Missing Environment Variables

**Issue:** API calls fail with authentication errors
**Solution:**
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Add missing variables
4. Redeploy from Vercel dashboard

### Git Push Fails

**Issue:** `git push` rejected
**Solution:**
```bash
# Pull latest changes first
git pull origin main --rebase

# Resolve conflicts if any
# Then push
git push origin main
```

### Routes Still Show /convert

**Issue:** Old routes cached
**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Or check Vercel deployment logs to verify latest commit deployed

---

## Rollback Plan

If deployment has issues:

```bash
# Revert to previous commit
git log --oneline -5  # Find commit hash
git revert <commit-hash>
git push origin main

# Or deploy specific commit from Vercel dashboard
```

---

## Performance Expectations

**Build Time:**
- Windows: ~45-60 seconds
- WSL2: ~25-35 seconds (current)
- Vercel: ~2-3 minutes

**Cold Start:**
- First request: ~1-2 seconds
- Subsequent requests: <500ms

**Bundle Size:**
- First Load JS: ~108 KB (within Next.js recommended limits)
- Routes optimized for edge runtime

---

## Next Steps After Deployment

1. ✅ Deploy with Docling removed
2. 📊 Monitor performance and errors
3. 🔄 Configure for different YouTube channel (Task 4)
4. ✨ Add new features (Task 5)
5. 🔗 Integrate with CesiumCyber (Task 6)

---

## Support

**Vercel Project:** https://vercel.com/your-team/youtube-digital-twin
**GitHub Repo:** https://github.com/sleehoco/youtube-digital-twin
**WSL2 Location:** `~/youtube-digital-twin`
**Windows Backup:** `C:\Users\sysadmin\youtube-digital-twin`

---

**Last Updated:** December 2, 2025
**Migration Date:** December 2, 2025
**Deployment Status:** Ready ✅
