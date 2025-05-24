# Setup Instructions for Spotify Downloader

## Quick Setup Guide

### 1. Install Required Tools

#### yt-dlp Installation:
```powershell
# Method 1: Using pip (if Python is installed)
pip install yt-dlp

# Method 2: Download executable
# Go to https://github.com/yt-dlp/yt-dlp/releases
# Download yt-dlp.exe and place it in a folder that's in your PATH
```

#### FFmpeg Installation:
```powershell
# Download from https://ffmpeg.org/download.html
# Extract and add the bin folder to your system PATH
# Verify installation:
ffmpeg -version
```

### 2. Install Dependencies

#### Backend:
```powershell
cd backend
npm install
```

#### Frontend:
```powershell
cd frontend
npm install
```

### 3. Start the Application

#### Terminal 1 - Backend:
```powershell
cd backend
npm run dev
```

#### Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

### 4. Access the Application
- Open http://localhost:5173 in your browser
- Backend API runs on http://localhost:3001

## Testing the Setup

1. Try this sample Spotify track URL:
   ```
   https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
   ```

2. Select any quality and click download

3. If everything works, you'll see a success message and download link

## Troubleshooting

- Make sure both yt-dlp and ffmpeg respond to command line
- Check that both servers are running on the correct ports
- Ensure your firewall allows the connections
