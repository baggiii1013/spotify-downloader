import React from 'react';

const Header = () => {
  return (
    <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.32 11.28-1.08 15.721 1.621.539.3.719 1.02.42 1.56-.297.479-1.02.659-1.559.36z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Spotify Downloader</h1>
              <p className="text-gray-300 text-sm">High-quality music downloads</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-300 text-sm">Support for FLAC, MP3</p>
            <p className="text-gray-400 text-xs">Up to 24-bit/44.1kHz quality</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
