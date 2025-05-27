# Spotify Downloader

A modern web application for downloading high-quality music from Spotify URLs using React, Tailwind CSS, Express.js, yt-dlp, and FFmpeg.

## Features

- **🎵 Multiple Quality Options**: MP3 (192-320 kbps), FLAC (16/24-bit), WAV (24-bit)
- **🎨 Automatic Cover Art**: Downloads and embeds album artwork in MP3/FLAC files
- **📁 Organized Downloads**: Creates folders for playlists and albums
- **🎼 High-Quality Audio**: Support for FLAC 24-bit/44.1kHz downloads
- **📝 Metadata Preservation**: Automatic metadata embedding (title, artist, album, etc.)
- **💻 Modern UI**: Beautiful, responsive interface with Tailwind CSS
- **📦 Support for**: Individual tracks, playlists, and albums
- **⏱️ Real-time Progress**: Download status and progress tracking

## Prerequisites

Before running this application, you need to install:

### 1. yt-dlp
```bash
# Windows (using pip)
pip install yt-dlp

# Or download the executable from: https://github.com/yt-dlp/yt-dlp/releases
```

### 2. FFmpeg
```bash
# Windows: Download from https://ffmpeg.org/download.html
# Add FFmpeg to your system PATH

# Verify installation
ffmpeg -version
```

### 3. Node.js
Download and install from: https://nodejs.org/

## Installation

1. **Clone or setup the project structure**:
```
spotify_downloader/
├── backend/
└── frontend/
```

2. **Backend Setup**:
```bash
cd backend
npm install
```

3. **Frontend Setup**:
```bash
cd frontend
npm install
```

## Running the Application

1. **Start the Backend Server**:
```bash
cd backend
npm run dev
```
The server will run on `http://localhost:3001`

2. **Start the Frontend Development Server**:
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

## Usage

1. Open your browser and navigate to `http://localhost:5173`
2. Paste a Spotify URL (track, playlist, or album)
3. Select your preferred audio quality
4. Click "Download Music"
5. Wait for processing and download the file

## Supported URLs

- **Tracks**: `https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh`
- **Playlists**: `https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd`
- **Albums**: `https://open.spotify.com/album/4yP0hdKOZPNshxUOjY0cZj`

## Audio Quality Options

| Format | Quality | Bit Depth | Sample Rate | Cover Art | File Size |
|--------|---------|-----------|-------------|-----------|-----------|
| MP3 | 320 kbps | - | 44.1 kHz | ✅ | Medium |
| MP3 | 256 kbps | - | 44.1 kHz | ✅ | Medium |
| MP3 | 192 kbps | - | 44.1 kHz | ✅ | Small |
| FLAC | Lossless | 24-bit | 44.1 kHz | ✅ | Large |
| FLAC | Lossless | 16-bit | 44.1 kHz | ✅ | Large |
| WAV | Uncompressed | 24-bit | 44.1 kHz | ❌ | Very Large |

## Important Notes

- **Legal Compliance**: This tool is for personal use only. Ensure you have the right to download the content.
- **Rate Limiting**: Be respectful of YouTube's rate limits
- **Dependencies**: Make sure yt-dlp and FFmpeg are properly installed and accessible from command line
- **Storage**: High-quality downloads can be large (FLAC/WAV files)

## Troubleshooting

### Common Issues

1. **"yt-dlp not found"**:
   - Ensure yt-dlp is installed and in your system PATH
   - Try running `yt-dlp --version` in command prompt

2. **"FFmpeg not found"**:
   - Download FFmpeg and add to system PATH
   - Verify with `ffmpeg -version`

3. **"Server connection failed"**:
   - Make sure the backend server is running on port 3001
   - Check for any firewall restrictions

4. **Download fails**:
   - The track might not be available on YouTube
   - Try a different quality setting
   - Check your internet connection

## 🎨 Cover Art & Organization

### **Automatic Cover Art Embedding**
- **MP3 & FLAC**: Cover art is automatically downloaded from Spotify and embedded
- **High Quality**: Downloads the highest resolution artwork available (up to 640x640px)
- **Smart Fallback**: Music downloads continue even if cover art fails

### **Organized File Structure**
```
downloads/
├── My_Awesome_Playlist/           # Playlist folder
│   ├── 01_-_Artist_-_Song1.mp3   # Numbered tracks with cover art
│   ├── 02_-_Artist_-_Song2.mp3
│   └── 03_-_Artist_-_Song3.mp3
├── Album_Name/                    # Album folder
│   ├── 01_-_Artist_-_Track1.mp3  # Album tracks with cover art
│   └── 02_-_Artist_-_Track2.mp3
└── Artist_-_Single_Song.mp3      # Single tracks
```

### **Cover Art Configuration** (Optional)
Add to your `.env` file:
```env
ENABLE_COVER_ART=true              # Enable/disable cover art
MAX_COVER_ART_SIZE=5242880         # Max size (5MB default)
COVER_ART_TIMEOUT=10000            # Timeout (10s default)
```

## API Endpoints

- `POST /download` - Start a download with cover art
- `GET /progress/:jobId` - Track download progress
- `GET /downloads-list` - List organized downloads
- `GET /config` - Check server configuration
- `GET /health` - Check server status
- `GET /downloads/**` - Serve downloaded files

## Troubleshooting

1. **"FFmpeg not found"**:
   - Make sure FFmpeg is installed and added to your system PATH
   - Restart your terminal/command prompt after installation

2. **"yt-dlp not found"**:
   - Install yt-dlp using pip: `pip install yt-dlp`
   - Or download the executable and add to PATH

3. **"Server connection failed"**:
   - Make sure the backend server is running on port 3001
   - Check for any firewall restrictions

4. **Download fails**:
   - The track might not be available on YouTube
   - Try a different quality setting
   - Check your internet connection

5. **Cover art not showing**:
   - Only MP3 and FLAC formats support embedded cover art
   - Some albums may not have cover art available
   - Check `ENABLE_COVER_ART=true` in your `.env` file

## Future Enhancements

- [x] ✅ Spotify API integration for metadata
- [x] ✅ Batch download support  
- [x] ✅ Download progress tracking
- [x] ✅ Organized folder structure
- [x] ✅ Automatic cover art embedding
- [ ] User authentication
- [ ] Download history
- [ ] ZIP download for playlists
- [ ] Lyrics embedding
- [ ] Custom naming patterns

## License

This project is for educational purposes only. Please respect copyright laws and only download content you have the right to access.
