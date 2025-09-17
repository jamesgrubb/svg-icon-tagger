
import React from 'react';
import type { AITaggedIcon } from '../types';
import IconCard from './IconCard';

interface IconGridProps {
  icons: AITaggedIcon[];
}

const IconGrid: React.FC<IconGridProps> = ({ icons }) => {
  if (icons.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>No icons found matching your search.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {icons.map((icon) => (
        <IconCard key={icon.id} icon={icon} />
      ))}
    </div>
  );
};

export default IconGrid;
