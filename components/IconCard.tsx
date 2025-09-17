
import React, { useState } from 'react';
import type { AITaggedIcon } from '../types';

interface IconCardProps {
  icon: AITaggedIcon;
}

const IconCard: React.FC<IconCardProps> = ({ icon }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(icon.svgString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center justify-between transition-all duration-300 hover:bg-gray-700/70 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 group">
      <div className="w-20 h-20 p-2 flex items-center justify-center bg-gray-900/50 rounded-md mb-4">
        <img src={icon.dataUri} alt={icon.title} className="w-full h-full object-contain" />
      </div>
      <div className="text-center flex-grow">
        <p className="font-semibold text-sm text-purple-300 capitalize">{icon.title}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {icon.keywords.slice(0, 3).map((keyword, index) => (
            <span key={index} className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
              {keyword}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={copyToClipboard}
        className="mt-4 w-full text-center text-xs font-medium py-2 rounded-md transition-colors duration-200 bg-gray-700 text-gray-300 group-hover:bg-purple-600 group-hover:text-white"
      >
        {copied ? 'Copied!' : 'Copy SVG'}
      </button>
    </div>
  );
};

export default IconCard;
