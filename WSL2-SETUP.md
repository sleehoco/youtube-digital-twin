# WSL2 Development Environment - YouTube Digital Twin

## Project Information
- **Project Name:** YouTube Digital Twin
- **Repository:** https://github.com/sleehoco/youtube-digital-twin
- **WSL2 Location:** `~/youtube-digital-twin`
- **Windows Backup:** `C:\Users\sysadmin\youtube-digital-twin`

## WSL2 Configuration

### Environment Details
- **WSL Distribution:** Ubuntu (WSL2)
- **Node.js Version:** v20.19.6 (via NVM)
- **Python Version:** 3.10
- **Package Manager:** npm (included with Node.js)

### File Locations

#### WSL2 Filesystem
- **Project Directory:** `~/youtube-digital-twin`
- **Full Path:** `/home/sysadmin/youtube-digital-twin`
- **Node Modules:** `~/youtube-digital-twin/node_modules` (449 packages)
- **Python Venv:** `~/youtube-digital-twin/venv`
- **Environment File:** `~/youtube-digital-twin/.env.local`
- **Data Directory:** `~/youtube-digital-twin/data` (knowledge base + channel metadata)

#### Windows Access
- **WSL2 from Windows:** `\\wsl$\Ubuntu\home\sysadmin\youtube-digital-twin`
- **Windows Backup:** `C:\Users\sysadmin\youtube-digital-twin` (kept as backup)

### NVM Configuration
- **NVM Directory:** `~/.nvm`
- **Node Installation:** `~/.nvm/versions/node/v20.19.6`
- **NVM Loaded in:** `~/.bashrc`

## Common Commands

### Access WSL2
```bash
# From Windows PowerShell or CMD:
wsl

# Or from Windows Terminal:
# Select "Ubuntu" from dropdown
```

### Development Workflow
```bash
# Navigate to project
cd ~/youtube-digital-twin

# Start development server (Node.js)
npm run dev

# Build for production
npm run build

# Activate Python environment
source venv/bin/activate

# Ingest YouTube channel
python scripts/ingest.py --channel "https://www.youtube.com/@YourChannel" --limit 50

# Fetch channel metadata
python scripts/fetch_channel_metadata.py --channel "https://www.youtube.com/@YourChannel"

# Deactivate Python environment
deactivate
```

### VS Code Integration
```bash
# Open project in VS Code from WSL2
cd ~/youtube-digital-twin
code .

# VS Code will automatically use WSL extension
```

### Git Operations
```bash
# All git commands work normally in WSL2
git status
git add .
git commit -m "message"
git push origin main
```

### Deployment
```bash
# Deploy to Vercel (automated script)
./scripts/deploy.sh "https://www.youtube.com/@YourChannel" 50
```

## Environment Variables

### Required in WSL2 `.env.local`
```bash
# AI Provider
TOGETHER_API_KEY=your_key_here

# YouTube API
YOUTUBE_API_KEY=your_key_here

# Admin Password
ADMIN_PASSWORD=your_secure_password
```

### Vercel Environment Variables
All the same variables must be set in Vercel dashboard:
- Go to: https://vercel.com/your-project/settings/environment-variables

## Project Architecture

### Technology Stack
- **Framework:** Next.js 14.2.15
- **Runtime:** Node.js runtime (API routes)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI Integration:** Together AI (LLaMA 3.1 70B)
- **Embeddings:** m2-bert-80M-8k-retrieval
- **Python:** 3.10 (for ingestion scripts)

### AI Tool
**YouTube Digital Twin** (`/`) - Active
- RAG-powered chatbot
- YouTube transcript ingestion
- Channel metadata display
- Real-time streaming responses

### API Routes
- `/api/chat` - RAG chat endpoint
- `/api/admin/status` - Admin status
- `/api/admin/config` - Admin configuration
- `/api/admin/train` - Trigger training

## Performance Benefits (WSL2 vs Windows)

### Build Times
- **Windows:** ~45-60 seconds
- **WSL2:** ~25-35 seconds (2x faster)

### npm install
- **Windows:** ~60-90 seconds
- **WSL2:** ~25 seconds (3x faster)

### File System
- **Windows:** Slower I/O, especially in node_modules
- **WSL2:** Native Linux performance

### Development Server
- **Windows:** ~3-5 second startup
- **WSL2:** ~1-2 second startup

## Troubleshooting

### Node command not found from Windows
When running `wsl node --version` from Windows, it may fail because NVM isn't loaded in non-interactive shells.

**Solution:** Always enter WSL first, then run commands:
```bash
wsl
cd ~/youtube-digital-twin
node --version
```

### VS Code can't find files
Make sure you're opening the project from WSL2, not Windows path.

**Correct:**
```bash
# In WSL2 terminal:
code ~/youtube-digital-twin
```

**Wrong:**
```bash
# In Windows CMD/PowerShell:
code C:\Users\sysadmin\youtube-digital-twin
```

### Port already in use
If the dev server says port 3000 is in use:
```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- -p 3001
```

### Python venv not activating
Make sure you're in WSL2:
```bash
wsl
cd ~/youtube-digital-twin
source venv/bin/activate
```

### Git line endings
Already configured for LF (Unix-style):
```bash
git config core.autocrlf input
```

## Backup & Recovery

### Backup WSL2 Project
```bash
# From Windows PowerShell:
wsl --export Ubuntu C:\Backups\ubuntu-backup.tar

# Or just the project:
wsl tar -czf /mnt/c/Backups/youtube-twin-backup.tar.gz -C ~ youtube-digital-twin
```

### Restore from Backup
```bash
# Restore entire WSL:
wsl --import Ubuntu C:\WSL\Ubuntu C:\Backups\ubuntu-backup.tar

# Or just the project:
cd ~
tar -xzf /mnt/c/Backups/youtube-twin-backup.tar.gz
```

## Migration Details
- **Migrated to WSL2:** December 2, 2025
- **Node.js Installed:** v20.19.6 (via NVM)
- **Python Venv Created:** December 2, 2025
- **Last Updated:** December 2, 2025

## Notes
- WSL2 is now the primary development environment
- Windows version at `C:\Users\sysadmin\youtube-digital-twin` is kept as backup
- All future development should be done in WSL2 for optimal performance
- Production deployments work identically from WSL2
- Docling Document Pipeline has been removed - focus is solely on YouTube Digital Twin

## Quick Reference Commands

```bash
# Start WSL2
wsl

# Go to project
cd ~/youtube-digital-twin

# Development
npm run dev          # Start dev server
npm run build        # Build for production

# Python (activate venv first)
source venv/bin/activate
python scripts/ingest.py --channel "https://www.youtube.com/@Channel" --limit 50
python scripts/fetch_channel_metadata.py --channel "https://www.youtube.com/@Channel"
deactivate

# Git
git status
git add .
git commit -m "message"
git push

# Deployment
./scripts/deploy.sh "https://www.youtube.com/@Channel" 50

# VS Code
code .

# Check versions
node --version       # v20.19.6
npm --version        # 10.8.2
python3 --version    # 3.10.x
```

## Project Structure (Post-Docling Removal)

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
│   └── deploy.sh                 # Deployment automation
├── data/
│   ├── knowledge_base.json       # YouTube embeddings
│   ├── channel_metadata.json     # Channel info
│   └── config.json               # Configuration
├── venv/                         # Python virtual environment
├── node_modules/                 # Node.js dependencies (449 packages)
├── .env.local                    # Environment variables
├── package.json                  # Node.js dependencies
└── vercel.json                   # Vercel configuration
```
