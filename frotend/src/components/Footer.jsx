import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-black/20 backdrop-blur-lg border-t border-white/10 mt-16">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-300 text-sm">
            <p>&copy; 2025 Spotify Downloader. For personal use only.</p>
          </div>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="text-gray-400 text-xs">
              <p>Powered by yt-dlp & FFmpeg</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Server Status: Online</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-gray-400 text-xs text-center">
            <strong>Note:</strong> This tool requires yt-dlp and FFmpeg to be installed on the server. 
            Make sure you have the necessary permissions to download content.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
