@echo off
echo ================================
echo Spotify Downloader Setup Script
echo ================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

echo.
echo Checking yt-dlp installation...
yt-dlp --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: yt-dlp is not installed or not in PATH
    echo Installing yt-dlp via pip...
    pip install yt-dlp
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install yt-dlp
        echo Please install manually from https://github.com/yt-dlp/yt-dlp/releases
        pause
        exit /b 1
    )
) else (
    echo ✓ yt-dlp is installed
)

echo.
echo Checking FFmpeg installation...
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg is not installed or not in PATH
    echo Please download FFmpeg from https://ffmpeg.org/download.html
    echo and add it to your system PATH
    pause
) else (
    echo ✓ FFmpeg is installed
)

echo.
echo Installing backend dependencies...
cd backend
if exist package.json (
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        pause
        exit /b 1
    ) else (
        echo ✓ Backend dependencies installed
    )
) else (
    echo ERROR: backend/package.json not found
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ../frotend
if exist package.json (
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    ) else (
        echo ✓ Frontend dependencies installed
    )
) else (
    echo ERROR: frotend/package.json not found
    pause
    exit /b 1
)

echo.
echo ================================
echo Setup completed successfully!
echo ================================
echo.
echo To start the application:
echo 1. Open first terminal and run: cd backend && npm run dev
echo 2. Open second terminal and run: cd frotend && npm run dev
echo 3. Open http://localhost:5173 in your browser
echo.
pause
