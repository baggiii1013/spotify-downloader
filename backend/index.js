const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
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

// Configuration
const config = {
    enableCoverArt: process.env.ENABLE_COVER_ART !== 'false', // Default to true
    maxCoverArtSize: parseInt(process.env.MAX_COVER_ART_SIZE) || 5 * 1024 * 1024, // 5MB default
    coverArtTimeout: parseInt(process.env.COVER_ART_TIMEOUT) || 10000 // 10 seconds default
};

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

// Utility function to create safe directory names
function createSafeDirectoryName(name) {
    return name
        .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '') // Remove invalid characters for Windows/Unix
        .replace(/['"]/g, '') // Remove quotes // Replace spaces with underscores
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
        .substring(0, 100); // Limit length to avoid path issues
}

// Download cover art from URL with size and timeout limits
function downloadCoverArt(imageUrl, outputPath) {
    return new Promise((resolve, reject) => {
        if (!imageUrl || !config.enableCoverArt) {
            resolve(null);
            return;
        }

        const file = fs.createWriteStream(outputPath);
        const timeout = setTimeout(() => {
            file.destroy();
            fs.unlink(outputPath, () => {});
            reject(new Error('Cover art download timeout'));
        }, config.coverArtTimeout);
        
        https.get(imageUrl, (response) => {
            clearTimeout(timeout);
            
            if (response.statusCode !== 200) {
                file.destroy();
                fs.unlink(outputPath, () => {});
                reject(new Error(`Failed to download cover art: ${response.statusCode}`));
                return;
            }
            
            const contentLength = parseInt(response.headers['content-length']);
            if (contentLength && contentLength > config.maxCoverArtSize) {
                file.destroy();
                fs.unlink(outputPath, () => {});
                reject(new Error('Cover art file too large'));
                return;
            }
            
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (downloadedSize > config.maxCoverArtSize) {
                    file.destroy();
                    fs.unlink(outputPath, () => {});
                    reject(new Error('Cover art file too large'));
                    return;
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(outputPath);
            });
            
            file.on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            fs.unlink(outputPath, () => {});
            reject(err);
        });
    });
}

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
            spotify_url: track.body.external_urls.spotify,
            album_art_url: track.body.album.images?.[0]?.url || null
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
                fields: 'items(track(id,name,artists,album(name,release_date,images),track_number,duration_ms,external_ids,preview_url,external_urls)),next'
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
                        spotify_url: item.track.external_urls.spotify,
                        album_art_url: item.track.album.images?.[0]?.url || null
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
        const albumArtUrl = album.body.images?.[0]?.url || null;
        
        const tracks = album.body.tracks.items.map(track => ({
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: album.body.name,
            year: album.body.release_date.split('-')[0],
            track_number: track.track_number,
            duration_ms: track.duration_ms,
            isrc: track.external_ids?.isrc,
            preview_url: track.preview_url,
            spotify_url: track.external_urls?.spotify,
            album_art_url: albumArtUrl
        }));
        
        return {
            name: album.body.name,
            artist: album.body.artists.map(artist => artist.name).join(', '),
            tracks,
            total_tracks: tracks.length,
            release_date: album.body.release_date,
            album_art_url: albumArtUrl
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

// Download and convert audio with cover art
function downloadAudio(videoUrl, outputPath, quality, metadata) {
    return new Promise(async (resolve, reject) => {
        const preset = qualityPresets[quality];
        if (!preset) {
            return reject(new Error('Invalid quality preset'));
        }

        const tempPath = outputPath.replace(`.${preset.format}`, '.temp');
        const coverArtPath = outputPath.replace(`.${preset.format}`, '.cover.jpg');
        
        try {
            // Download cover art if available
            let coverArtFile = null;
            if (metadata.album_art_url) {
                try {
                    coverArtFile = await downloadCoverArt(metadata.album_art_url, coverArtPath);
                    console.log(`Downloaded cover art for: ${metadata.title}`);
                } catch (error) {
                    console.log(`Failed to download cover art for ${metadata.title}:`, error.message);
                }
            }

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
                        // Clean up cover art file if exists
                        if (coverArtFile && fs.existsSync(coverArtFile)) {
                            fs.unlinkSync(coverArtFile);
                        }
                        return reject(new Error('Downloaded file not found'));
                    }

                    const downloadedFile = possibleFiles[0];
                    
                    // Build ffmpeg arguments with metadata and cover art
                    const ffmpegArgs = [
                        '-i', downloadedFile
                    ];

                    // Add cover art as input if available
                    if (coverArtFile && fs.existsSync(coverArtFile)) {
                        ffmpegArgs.push('-i', coverArtFile);
                    }

                    // Add codec and quality options
                    ffmpegArgs.push(...preset.ffmpegOptions);

                    // Add metadata
                    ffmpegArgs.push(
                        '-metadata', `title=${metadata.title || 'Unknown'}`,
                        '-metadata', `artist=${metadata.artist || 'Unknown'}`,
                        '-metadata', `album=${metadata.album || 'Unknown'}`,
                        '-metadata', `date=${metadata.year || ''}`,
                        '-metadata', `track=${metadata.track_number || ''}`
                    );

                    // Handle cover art embedding based on format
                    if (coverArtFile && fs.existsSync(coverArtFile)) {
                        if (preset.format === 'mp3') {
                            // For MP3, embed cover art as attached picture
                            ffmpegArgs.push(
                                '-map', '0:a',  // Map audio from first input
                                '-map', '1:v',  // Map video (image) from second input
                                '-c:v', 'mjpeg', // Use MJPEG codec for cover art
                                '-disposition:v', 'attached_pic' // Mark as attached picture
                            );
                        } else if (preset.format === 'flac') {
                            // For FLAC, embed cover art
                            ffmpegArgs.push(
                                '-map', '0:a',  // Map audio from first input
                                '-map', '1:v',  // Map video (image) from second input
                                '-c:v', 'mjpeg', // Use MJPEG codec for cover art
                                '-disposition:v', 'attached_pic' // Mark as attached picture
                            );
                        }
                        // WAV format doesn't support embedded cover art well, so we skip it
                    } else {
                        // No cover art, just map audio
                        ffmpegArgs.push('-map', '0:a');
                    }

                    ffmpegArgs.push('-y', outputPath);

                    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

                    let ffmpegError = '';
                    ffmpeg.stderr.on('data', (data) => {
                        ffmpegError += data.toString();
                    });

                    ffmpeg.on('close', (ffmpegCode) => {
                        // Clean up temp files
                        if (fs.existsSync(downloadedFile)) {
                            fs.unlinkSync(downloadedFile);
                        }
                        if (coverArtFile && fs.existsSync(coverArtFile)) {
                            fs.unlinkSync(coverArtFile);
                        }

                        if (ffmpegCode === 0) {
                            console.log(`Successfully processed: ${metadata.title} with cover art`);
                            resolve(outputPath);
                        } else {
                            console.error('FFmpeg error:', ffmpegError);
                            reject(new Error('FFmpeg conversion failed'));
                        }
                    });

                } else {
                    // Clean up cover art file if exists
                    if (coverArtFile && fs.existsSync(coverArtFile)) {
                        fs.unlinkSync(coverArtFile);
                    }
                    reject(new Error('yt-dlp download failed'));
                }
            });

            ytdlp.stderr.on('data', (data) => {
                console.log('yt-dlp stderr:', data.toString());
            });

        } catch (error) {
            // Clean up cover art file if exists
            if (fs.existsSync(coverArtPath)) {
                fs.unlinkSync(coverArtPath);
            }
            reject(error);
        }
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
        }        if (tracksToDownload.length === 0) {
            return res.status(404).json({ error: 'No tracks found' });
        }

        // Create download directory based on collection type and name
        let downloadSubDir = downloadsDir;
        let downloadUrlPrefix = '/downloads';
        
        if (spotifyInfo.type === 'playlist' || spotifyInfo.type === 'album') {
            const safeDirName = createSafeDirectoryName(collectionInfo.name);
            
            downloadSubDir = path.join(downloadsDir, safeDirName);
            downloadUrlPrefix = `/downloads/${safeDirName}`;
            
            // Create subdirectory if it doesn't exist
            if (!fs.existsSync(downloadSubDir)) {
                fs.mkdirSync(downloadSubDir, { recursive: true });
            }
        }

        // For single track, download immediately
        if (tracksToDownload.length === 1) {
            const track = tracksToDownload[0];
            const searchQuery = `${track.artist} ${track.title}`;
            const videoInfo = await searchYouTube(searchQuery);

            if (!videoInfo || !videoInfo.url) {
                return res.status(404).json({ error: 'Could not find track on YouTube' });
            }

            const safeFilename = `${track.title} - ${track.artist} `
                .replace(/[^a-zA-Z0-9\s\-_]/g, '');
            
            const preset = qualityPresets[quality];
            const outputPath = path.join(downloadSubDir, `${safeFilename}.${preset.format}`);

            await downloadAudio(videoInfo.url, outputPath, quality, track);

            return res.json({
                success: true,
                message: 'Download completed',
                filename: path.basename(outputPath),
                downloadUrl: `${downloadUrlPrefix}/${path.basename(outputPath)}`,
                trackInfo: track,
                type: 'single'
            });
        }

        // For playlist/album, return job ID for progress tracking
        const jobId = Date.now().toString();
        
        // Start download process in background
        downloadPlaylist(jobId, tracksToDownload, quality, collectionInfo, downloadSubDir, downloadUrlPrefix);

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
async function downloadPlaylist(jobId, tracks, quality, collectionInfo, downloadDir, downloadUrlPrefix) {
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
                const safeFilename = `${String(i + 1).padStart(2, '0')} - ${track.title} - ${track.artist}`
                    .replace(/[^a-zA-Z0-9\s\-_]/g, '');
                
                const outputPath = path.join(downloadDir, `${safeFilename}.${preset.format}`);
                
                await downloadAudio(videoInfo.url, outputPath, quality, track);
                
                job.completed++;
                job.downloadedFiles.push({
                    filename: path.basename(outputPath),
                    downloadUrl: `${downloadUrlPrefix}/${path.basename(outputPath)}`,
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

// Route to list downloads organized by folders
app.get('/downloads-list', (req, res) => {
    try {
        const downloads = {};
        
        // Read the downloads directory
        const items = fs.readdirSync(downloadsDir);
        
        items.forEach(item => {
            const itemPath = path.join(downloadsDir, item);
            const stats = fs.statSync(itemPath);
            
            if (stats.isDirectory()) {
                // This is a playlist/album folder
                const files = fs.readdirSync(itemPath)
                    .filter(file => fs.statSync(path.join(itemPath, file)).isFile())
                    .map(file => ({
                        filename: file,
                        downloadUrl: `/downloads/${item}/${file}`,
                        size: fs.statSync(path.join(itemPath, file)).size
                    }));
                
                downloads[item] = {
                    type: 'folder',
                    files: files,
                    count: files.length
                };
            } else if (stats.isFile()) {
                // This is a single track in the root downloads folder
                if (!downloads['_singles']) {
                    downloads['_singles'] = {
                        type: 'singles',
                        files: [],
                        count: 0
                    };
                }
                
                downloads['_singles'].files.push({
                    filename: item,
                    downloadUrl: `/downloads/${item}`,
                    size: stats.size
                });
                downloads['_singles'].count++;
            }
        });
        
        res.json({
            success: true,
            downloads: downloads
        });
    } catch (error) {
        console.error('Error listing downloads:', error);
        res.status(500).json({ error: 'Failed to list downloads' });
    }
});

// Route to get server configuration
app.get('/config', (req, res) => {
    res.json({
        success: true,
        config: {
            enableCoverArt: config.enableCoverArt,
            maxCoverArtSize: config.maxCoverArtSize,
            coverArtTimeout: config.coverArtTimeout,
            supportedFormats: Object.keys(qualityPresets),
            version: '1.1.0'
        }
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
