#!/bin/bash
# Deployment script: Update knowledge base and deploy to Vercel

set -e

echo "🚀 YouTube Digital Twin - Deployment Script"
echo "============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Error: Python venv not found. Run setup first."
    exit 1
fi

# Get channel URL from user or use default
CHANNEL_URL=${1:-"https://www.youtube.com/@psychacks"}
VIDEO_LIMIT=${2:-50}

echo "📺 Channel: $CHANNEL_URL"
echo "📊 Video limit: $VIDEO_LIMIT"
echo ""

# Activate Python environment
if [ -f "venv/Scripts/activate" ]; then
    # Windows Git Bash
    source venv/Scripts/activate
else
    # Linux/Mac
    source venv/bin/activate
fi

# Step 1: Fetch channel metadata
echo "1️⃣ Fetching channel metadata..."
python scripts/fetch_channel_metadata.py --channel "$CHANNEL_URL"
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch channel metadata"
    exit 1
fi
echo ""

# Step 2: Ingest videos and create embeddings
echo "2️⃣ Ingesting videos and generating embeddings..."
python scripts/ingest.py --channel "$CHANNEL_URL" --limit $VIDEO_LIMIT
if [ $? -ne 0 ]; then
    echo "❌ Failed to ingest videos"
    exit 1
fi
echo ""

# Step 3: Verify files were created
echo "3️⃣ Verifying generated files..."
if [ ! -f "data/knowledge_base.json" ]; then
    echo "❌ knowledge_base.json not found"
    exit 1
fi
if [ ! -f "data/channel_metadata.json" ]; then
    echo "❌ channel_metadata.json not found"
    exit 1
fi

# Show file sizes
KB_SIZE=$(du -h data/knowledge_base.json | cut -f1)
META_SIZE=$(du -h data/channel_metadata.json | cut -f1)
echo "   ✓ knowledge_base.json ($KB_SIZE)"
echo "   ✓ channel_metadata.json ($META_SIZE)"
echo ""

# Step 4: Git operations
echo "4️⃣ Committing changes to git..."
git add data/knowledge_base.json data/channel_metadata.json data/config.json

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "   ℹ️  No changes to commit"
else
    COMMIT_DATE=$(date +"%Y-%m-%d %H:%M")
    git commit -m "Update knowledge base: $COMMIT_DATE

- Channel: $CHANNEL_URL
- Videos processed: $VIDEO_LIMIT
- Knowledge base: $KB_SIZE
- Automated deployment"

    echo "   ✓ Changes committed"
fi
echo ""

# Step 5: Push to GitHub
echo "5️⃣ Pushing to GitHub..."
read -p "   Push to origin/main? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo "   ✓ Pushed to GitHub"
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "🌐 Vercel will automatically deploy the changes"
    echo "   Check status: https://vercel.com"
else
    echo "   ⏭️  Skipped git push"
    echo ""
    echo "⚠️  Changes committed locally but not pushed"
    echo "   Run 'git push origin main' when ready"
fi

echo ""
echo "================================================"
echo "Next steps:"
echo "1. Monitor Vercel deployment dashboard"
echo "2. Test chat at your-app.vercel.app"
echo "3. Verify channel avatar and metadata display"
echo "================================================"
