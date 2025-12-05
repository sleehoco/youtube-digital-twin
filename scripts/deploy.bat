@echo off
REM Deployment script for Windows: Update knowledge base and deploy to Vercel

echo ========================================
echo YouTube Digital Twin - Deployment Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: Must run from project root directory
    exit /b 1
)

REM Check if venv exists
if not exist "venv\Scripts\python.exe" (
    echo Error: Python venv not found. Run setup first.
    exit /b 1
)

REM Get parameters or use defaults
set CHANNEL_URL=%1
set VIDEO_LIMIT=%2

if "%CHANNEL_URL%"=="" set CHANNEL_URL=https://www.youtube.com/@psychacks
if "%VIDEO_LIMIT%"=="" set VIDEO_LIMIT=50

echo Channel: %CHANNEL_URL%
echo Video limit: %VIDEO_LIMIT%
echo.

REM Step 1: Fetch channel metadata
echo 1. Fetching channel metadata...
venv\Scripts\python.exe scripts\fetch_channel_metadata.py --channel "%CHANNEL_URL%"
if errorlevel 1 (
    echo Failed to fetch channel metadata
    exit /b 1
)
echo.

REM Step 2: Ingest videos
echo 2. Ingesting videos and generating embeddings...
venv\Scripts\python.exe scripts\ingest.py --channel "%CHANNEL_URL%" --limit %VIDEO_LIMIT%
if errorlevel 1 (
    echo Failed to ingest videos
    exit /b 1
)
echo.

REM Step 3: Verify files
echo 3. Verifying generated files...
if not exist "data\knowledge_base.json" (
    echo knowledge_base.json not found
    exit /b 1
)
if not exist "data\channel_metadata.json" (
    echo channel_metadata.json not found
    exit /b 1
)
echo    OK knowledge_base.json
echo    OK channel_metadata.json
echo.

REM Step 4: Git add
echo 4. Staging files for commit...
git add data\knowledge_base.json data\channel_metadata.json data\config.json
echo.

REM Step 5: Git commit
echo 5. Committing changes...
for /f "tokens=*" %%a in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set COMMIT_DATE=%%a

git commit -m "Update knowledge base: %COMMIT_DATE%" -m "" -m "- Channel: %CHANNEL_URL%" -m "- Videos processed: %VIDEO_LIMIT%" -m "- Automated deployment"
echo.

REM Step 6: Ask to push
echo 6. Push to GitHub?
set /p PUSH="   Push to origin/main? (y/N): "
if /i "%PUSH%"=="y" (
    git push origin main
    echo    Pushed to GitHub
    echo.
    echo ========================================
    echo Deployment complete!
    echo.
    echo Vercel will automatically deploy changes
    echo Check: https://vercel.com
    echo ========================================
) else (
    echo    Skipped git push
    echo.
    echo Changes committed locally but not pushed
    echo Run 'git push origin main' when ready
)

echo.
pause
