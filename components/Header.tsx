
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 text-center bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
      <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
        SVG Icon AI Tagger
      </h1>
      <p className="mt-2 text-md text-gray-400">
        Upload an SVG sprite to automatically tag and search your icons.
      </p>
    </header>
  );
};

export default Header;
