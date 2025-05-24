const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const SpotifyWebApi = require('spotify-web-api-node');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Get access token for Spotify API
async function getSpotifyAccessToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        
        // Refresh token every 50 minutes
        setTimeout(() => {
            getSpotifyAccessToken();
        }, 50 * 60 * 1000);
        
        console.log('Spotify access token obtained');
    } catch (error) {
        console.error('Error getting Spotify access token:', error);
    }
}

// Initialize Spotify token
getSpotifyAccessToken();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Quality presets for audio formats
const qualityPresets = {
    'mp3-320': {
        format: 'mp3',
        quality: '320k',
        ytdlFormat: 'bestaudio',
        ffmpegOptions: ['-c:a', 'libmp3lame', '-b:a', '320k']
    },
    'mp3-256': {
        format: 'mp3',
        quality: '256k',
        ytdlFormat: 'bestaudio',
        ffmpegOptions: ['-c:a', 'libmp3lame', '-b:a', '256k']
    },
    'mp3-192': {
        format: 'mp3',
        quality: '192k',
        ytdlFormat: 'bestaudio',
        ffmpegOptions: ['-c:a', 'libmp3lame', '-b:a', '192k']
    },    'flac-24-44': {
        format: 'flac',
        quality: '24bit-44.1kHz',
        ytdlFormat: 'bestaudio[acodec=flac]/bestaudio',
        ffmpegOptions: ['-c:a', 'flac', '-compression_level', '8', '-ar', '44100', '-sample_fmt', 's32']
    },
    'flac-16-44': {
        format: 'flac',
        quality: '16bit-44.1kHz',
        ytdlFormat: 'bestaudio',
        ffmpegOptions: ['-c:a', 'flac', '-compression_level', '8', '-ar', '44100', '-sample_fmt', 's16']
    },
    'wav-24-44': {
        format: 'wav',
        quality: '24bit-44.1kHz',
        ytdlFormat: 'bestaudio',
        ffmpegOptions: ['-c:a', 'pcm_s24le', '-ar', '44100']
    }
};

// Extract Spotify track/playlist info
function extractSpotifyInfo(url) {
    const spotifyRegex = /spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/;
    const match = url.match(spotifyRegex);
    
    if (match) {
        return {
            type: match[1],
            id: match[2],
            url: url
        };
    }
    return null;
}

// Get track info from Spotify API
async function getSpotifyTrack(trackId) {
    try {
        const track = await spotifyApi.getTrack(trackId);
        return {
            title: track.body.name,
            artist: track.body.artists.map(artist => artist.name).join(', '),
            album: track.body.album.name,
            year: track.body.album.release_date.split('-')[0],
            track_number: track.body.track_number,
            duration_ms: track.body.duration_ms,
            isrc: track.body.external_ids?.isrc,
            preview_url: track.body.preview_url,
            spotify_url: track.body.external_urls.spotify
        };
    } catch (error) {
        throw new Error(`Failed to get track info: ${error.message}`);
    }
}

// Get playlist tracks from Spotify API
async function getSpotifyPlaylist(playlistId) {
    try {
        const playlist = await spotifyApi.getPlaylist(playlistId);
        const tracks = [];
        
        let offset = 0;
        const limit = 50;
        
        do {
            const playlistTracks = await spotifyApi.getPlaylistTracks(playlistId, {
                offset,
                limit,
                fields: 'items(track(id,name,artists,album,track_number,duration_ms,external_ids,preview_url,external_urls)),next'
            });
            
            for (const item of playlistTracks.body.items) {
                if (item.track && item.track.id) {
                    tracks.push({
                        title: item.track.name,
                        artist: item.track.artists.map(artist => artist.name).join(', '),
                        album: item.track.album.name,
                        year: item.track.album.release_date?.split('-')[0] || '',
                        track_number: item.track.track_number,
                        duration_ms: item.track.duration_ms,
                        isrc: item.track.external_ids?.isrc,
                        preview_url: item.track.preview_url,
                        spotify_url: item.track.external_urls.spotify
                    });
                }
            }
            
            offset += limit;
        } while (offset < playlist.body.tracks.total);
        
        return {
            name: playlist.body.name,
            description: playlist.body.description,
            tracks,
            total_tracks: tracks.length
        };
    } catch (error) {
        throw new Error(`Failed to get playlist info: ${error.message}`);
    }
}

// Get album tracks from Spotify API
async function getSpotifyAlbum(albumId) {
    try {
        const album = await spotifyApi.getAlbum(albumId);
        const tracks = album.body.tracks.items.map(track => ({
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: album.body.name,
            year: album.body.release_date.split('-')[0],
            track_number: track.track_number,
            duration_ms: track.duration_ms,
            isrc: track.external_ids?.isrc,
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify
        }));
        
        return {
            name: album.body.name,
            artist: album.body.artists.map(artist => artist.name).join(', '),
            tracks,
            total_tracks: tracks.length,
            release_date: album.body.release_date
        };
    } catch (error) {
        throw new Error(`Failed to get album info: ${error.message}`);
    }
}

// Search for song on YouTube using yt-dlp
function searchYouTube(query) {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', [
            '--dump-json',
            '--no-download',
            '--flat-playlist',
            `ytsearch1:${query}`
        ]);

        let data = '';
        let error = '';

        ytdlp.stdout.on('data', (chunk) => {
            data += chunk.toString();
        });

        ytdlp.stderr.on('data', (chunk) => {
            error += chunk.toString();
        });

        ytdlp.on('close', (code) => {
            if (code === 0) {
                try {
                    const videoInfo = JSON.parse(data.trim());
                    resolve(videoInfo);
                } catch (e) {
                    reject(new Error('Failed to parse video info'));
                }
            } else {
                reject(new Error(error || 'yt-dlp search failed'));
            }
        });
    });
}

// Download and convert audio
function downloadAudio(videoUrl, outputPath, quality, metadata) {
    return new Promise((resolve, reject) => {
        const preset = qualityPresets[quality];
        if (!preset) {
            return reject(new Error('Invalid quality preset'));
        }

        const tempPath = outputPath.replace(`.${preset.format}`, '.temp');
        
        // First, download the audio using yt-dlp
        const ytdlp = spawn('yt-dlp', [
            '-f', preset.ytdlFormat,
            '--extract-audio',
            '--audio-format', 'best',
            '--no-playlist',
            '-o', tempPath,
            videoUrl
        ]);

        ytdlp.on('close', (code) => {
            if (code === 0) {
                // Find the downloaded file (yt-dlp might add extensions)
                const possibleFiles = fs.readdirSync(path.dirname(tempPath))
                    .filter(file => file.startsWith(path.basename(tempPath)))
                    .map(file => path.join(path.dirname(tempPath), file));

                if (possibleFiles.length === 0) {
                    return reject(new Error('Downloaded file not found'));
                }

                const downloadedFile = possibleFiles[0];
                
                // Convert using ffmpeg with metadata
                const ffmpegArgs = [
                    '-i', downloadedFile,
                    ...preset.ffmpegOptions,
                    '-metadata', `title=${metadata.title || 'Unknown'}`,
                    '-metadata', `artist=${metadata.artist || 'Unknown'}`,
                    '-metadata', `album=${metadata.album || 'Unknown'}`,
                    '-metadata', `date=${metadata.year || ''}`,
                    '-metadata', `track=${metadata.track_number || ''}`,
                    '-y',
                    outputPath
                ];

                const ffmpeg = spawn('ffmpeg', ffmpegArgs);

                ffmpeg.on('close', (ffmpegCode) => {
                    // Clean up temp file
                    if (fs.existsSync(downloadedFile)) {
                        fs.unlinkSync(downloadedFile);
                    }

                    if (ffmpegCode === 0) {
                        resolve(outputPath);
                    } else {
                        reject(new Error('FFmpeg conversion failed'));
                    }
                });

                ffmpeg.stderr.on('data', (data) => {
                    console.log('FFmpeg stderr:', data.toString());
                });
            } else {
                reject(new Error('yt-dlp download failed'));
            }
        });

        ytdlp.stderr.on('data', (data) => {
            console.log('yt-dlp stderr:', data.toString());
        });
    });
}

// Route to download from Spotify URL
app.post('/download', async (req, res) => {
    try {
        const { spotifyUrl, quality = 'mp3-320' } = req.body;

        if (!spotifyUrl) {
            return res.status(400).json({ error: 'Spotify URL is required' });
        }

        const spotifyInfo = extractSpotifyInfo(spotifyUrl);
        if (!spotifyInfo) {
            return res.status(400).json({ error: 'Invalid Spotify URL' });
        }

        let tracksToDownload = [];
        let collectionInfo = {};

        if (spotifyInfo.type === 'track') {
            const trackInfo = await getSpotifyTrack(spotifyInfo.id);
            tracksToDownload = [trackInfo];
            collectionInfo = { type: 'track', name: trackInfo.title };
        } else if (spotifyInfo.type === 'playlist') {
            const playlistInfo = await getSpotifyPlaylist(spotifyInfo.id);
            tracksToDownload = playlistInfo.tracks;
            collectionInfo = { type: 'playlist', name: playlistInfo.name, total_tracks: playlistInfo.total_tracks };
        } else if (spotifyInfo.type === 'album') {
            const albumInfo = await getSpotifyAlbum(spotifyInfo.id);
            tracksToDownload = albumInfo.tracks;
            collectionInfo = { type: 'album', name: albumInfo.name, artist: albumInfo.artist, total_tracks: albumInfo.total_tracks };
        }

        if (tracksToDownload.length === 0) {
            return res.status(404).json({ error: 'No tracks found' });
        }

        // For single track, download immediately
        if (tracksToDownload.length === 1) {
            const track = tracksToDownload[0];
            const searchQuery = `${track.artist} ${track.title}`;
            const videoInfo = await searchYouTube(searchQuery);

            if (!videoInfo || !videoInfo.url) {
                return res.status(404).json({ error: 'Could not find track on YouTube' });
            }

            const safeFilename = `${track.artist} - ${track.title}`
                .replace(/[^a-zA-Z0-9\s\-_]/g, '')
                .replace(/\s+/g, '_');
            
            const preset = qualityPresets[quality];
            const outputPath = path.join(downloadsDir, `${safeFilename}.${preset.format}`);

            await downloadAudio(videoInfo.url, outputPath, quality, track);

            return res.json({
                success: true,
                message: 'Download completed',
                filename: path.basename(outputPath),
                downloadUrl: `/downloads/${path.basename(outputPath)}`,
                trackInfo: track,
                type: 'single'
            });
        }

        // For playlist/album, return job ID for progress tracking
        const jobId = Date.now().toString();
        
        // Start download process in background
        downloadPlaylist(jobId, tracksToDownload, quality, collectionInfo);

        res.json({
            success: true,
            message: `Starting download of ${tracksToDownload.length} tracks`,
            jobId,
            collectionInfo,
            totalTracks: tracksToDownload.length,
            type: 'batch'
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Store for tracking download progress
const downloadJobs = new Map();

// Download playlist/album function
async function downloadPlaylist(jobId, tracks, quality, collectionInfo) {
    const job = {
        id: jobId,
        total: tracks.length,
        completed: 0,
        failed: 0,
        status: 'downloading',
        tracks: [],
        downloadedFiles: [],
        collectionInfo
    };
    
    downloadJobs.set(jobId, job);

    const preset = qualityPresets[quality];
    
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        
        try {
            job.status = `Downloading track ${i + 1}/${tracks.length}: ${track.title}`;
            downloadJobs.set(jobId, job);

            const searchQuery = `${track.artist} ${track.title}`;
            const videoInfo = await searchYouTube(searchQuery);

            if (videoInfo && videoInfo.url) {
                const safeFilename = `${String(i + 1).padStart(2, '0')} - ${track.artist} - ${track.title}`
                    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
                    .replace(/\s+/g, '_');
                
                const outputPath = path.join(downloadsDir, `${safeFilename}.${preset.format}`);
                
                await downloadAudio(videoInfo.url, outputPath, quality, track);
                
                job.completed++;
                job.downloadedFiles.push({
                    filename: path.basename(outputPath),
                    downloadUrl: `/downloads/${path.basename(outputPath)}`,
                    track
                });
            } else {
                job.failed++;
                console.log(`Could not find on YouTube: ${track.title} by ${track.artist}`);
            }
        } catch (error) {
            job.failed++;
            console.error(`Error downloading ${track.title}:`, error.message);
        }
        
        job.tracks.push({
            ...track,
            status: job.downloadedFiles.some(f => f.track.title === track.title) ? 'completed' : 'failed'
        });
        
        downloadJobs.set(jobId, job);
    }

    job.status = job.failed > 0 ? 
        `Completed with ${job.failed} failures` : 
        'All downloads completed successfully';
    
    downloadJobs.set(jobId, job);
}

// Route to get download progress
app.get('/progress/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
        jobId,
        status: job.status,
        total: job.total,
        completed: job.completed,
        failed: job.failed,
        progress: Math.round((job.completed / job.total) * 100),
        downloadedFiles: job.downloadedFiles,
        collectionInfo: job.collectionInfo
    });
});

// Route to download all files from a batch job as ZIP
app.get('/download-zip/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = downloadJobs.get(jobId);
    
    if (!job || job.downloadedFiles.length === 0) {
        return res.status(404).json({ error: 'No files to download' });
    }
    
    // For now, just return the list of files
    // In a full implementation, you'd create a ZIP file
    res.json({
        message: 'Batch download ready',
        files: job.downloadedFiles
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Make sure you have yt-dlp and ffmpeg installed and in your PATH');
});
