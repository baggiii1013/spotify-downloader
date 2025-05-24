import React, { useState } from 'react';

const DownloadForm = () => {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [quality, setQuality] = useState('mp3-320');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadResult, setDownloadResult] = useState(null);
  const [error, setError] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [isCheckingProgress, setIsCheckingProgress] = useState(false);

  const qualityOptions = [
    { value: 'mp3-320', label: 'MP3 320 kbps', description: 'High quality MP3' },
    { value: 'mp3-256', label: 'MP3 256 kbps', description: 'Good quality MP3' },
    { value: 'mp3-192', label: 'MP3 192 kbps', description: 'Standard quality MP3' },
    { value: 'flac-24-44', label: 'FLAC 24-bit/44.1kHz', description: 'Lossless ultra-high quality' },
    { value: 'flac-16-44', label: 'FLAC 16-bit/44.1kHz', description: 'Lossless CD quality' },
    { value: 'wav-24-44', label: 'WAV 24-bit/44.1kHz', description: 'Uncompressed ultra-high quality' }
  ];

  const validateSpotifyUrl = (url) => {
    const spotifyRegex = /spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/;
    return spotifyRegex.test(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDownloadResult(null);

    if (!spotifyUrl.trim()) {
      setError('Please enter a Spotify URL');
      return;
    }

    if (!validateSpotifyUrl(spotifyUrl)) {
      setError('Please enter a valid Spotify URL (track, playlist, or album)');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotifyUrl: spotifyUrl.trim(),
          quality
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDownloadResult(data);
      } else {
        setError(data.error || 'Download failed');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };
  const getUrlType = (url) => {
    if (url.includes('/track/')) return 'Track';
    if (url.includes('/playlist/')) return 'Playlist';
    if (url.includes('/album/')) return 'Album';
    return 'Unknown';
  };

  const checkProgress = async (jobId) => {
    setIsCheckingProgress(true);
    try {
      const response = await fetch(`http://localhost:3001/progress/${jobId}`);
      const data = await response.json();
      
      if (response.ok) {
        setProgressData(data);
      } else {
        setError(data.error || 'Failed to get progress');
      }
    } catch (err) {
      setError('Failed to check progress');
    } finally {
      setIsCheckingProgress(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Download Your Music</h2>
          <p className="text-gray-300">
            Paste your Spotify URL and choose your preferred quality
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label htmlFor="spotify-url" className="block text-sm font-medium text-gray-200 mb-2">
              Spotify URL
            </label>
            <div className="relative">
              <input
                type="url"
                id="spotify-url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/track/..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              />
              {spotifyUrl && validateSpotifyUrl(spotifyUrl) && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-100 bg-green-500/20 rounded-full">
                    {getUrlType(spotifyUrl)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quality Selection */}
          <div>
            <label htmlFor="quality" className="block text-sm font-medium text-gray-200 mb-2">
              Audio Quality
            </label>
            <select
              id="quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            >
              {qualityOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !spotifyUrl.trim()}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </div>
            ) : (
              'Download Music'
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}        {/* Success Display */}
        {downloadResult && (
          <div className="mt-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div className="flex-1">
                {downloadResult.type === 'single' ? (
                  <>
                    <p className="text-green-200 font-medium">Download completed successfully!</p>
                    <div className="mt-2 text-sm text-green-300">
                      <p><strong>Track:</strong> {downloadResult.trackInfo?.title || 'Unknown'}</p>
                      <p><strong>Artist:</strong> {downloadResult.trackInfo?.artist || 'Unknown'}</p>
                      <p><strong>File:</strong> {downloadResult.filename}</p>
                    </div>
                    <a
                      href={`http://localhost:3001${downloadResult.downloadUrl}`}
                      download
                      className="inline-flex items-center mt-3 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-md transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                      </svg>
                      Download File
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-green-200 font-medium">Batch download started!</p>
                    <div className="mt-2 text-sm text-green-300">
                      <p><strong>Job ID:</strong> {downloadResult.jobId}</p>
                      <p><strong>Total Tracks:</strong> {downloadResult.totalTracks}</p>
                      <p><strong>Collection:</strong> {downloadResult.collectionInfo?.name}</p>
                    </div>
                    <button
                      onClick={() => checkProgress(downloadResult.jobId)}
                      className="inline-flex items-center mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200"
                    >
                      Check Progress
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>        )}

        {/* Progress Display */}
        {progressData && (
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="flex-1">
                <p className="text-blue-200 font-medium">Download Progress</p>
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-blue-300 mb-1">
                    <span>{progressData.status}</span>
                    <span>{progressData.completed}/{progressData.total} completed</span>
                  </div>
                  <div className="w-full bg-blue-900/50 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressData.progress}%` }}
                    ></div>
                  </div>
                  {progressData.failed > 0 && (
                    <p className="text-red-300 text-xs mt-1">{progressData.failed} tracks failed</p>
                  )}
                </div>
                {progressData.downloadedFiles && progressData.downloadedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-blue-200 text-sm font-medium mb-2">Downloaded Files:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {progressData.downloadedFiles.map((file, index) => (
                        <a
                          key={index}
                          href={`http://localhost:3001${file.downloadUrl}`}
                          download
                          className="block text-xs text-blue-300 hover:text-blue-200 underline"
                        >
                          {file.filename}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => checkProgress(progressData.jobId)}
                  disabled={isCheckingProgress}
                  className="inline-flex items-center mt-3 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200"
                >
                  {isCheckingProgress ? 'Checking...' : 'Refresh Progress'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-lg font-medium text-blue-200 mb-2">How it works</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Paste any Spotify track, playlist, or album URL</li>
            <li>• Choose your preferred audio quality (MP3, FLAC, or WAV)</li>
            <li>• We find and download the highest quality version available</li>
            <li>• All metadata is preserved (title, artist, album, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DownloadForm;
