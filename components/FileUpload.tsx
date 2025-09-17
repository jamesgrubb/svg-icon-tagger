
import React from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "image/svg+xml") {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`w-full max-w-2xl mx-auto p-8 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer transition-colors duration-300
        ${disabled ? 'cursor-not-allowed bg-gray-800' : 'hover:border-purple-500 hover:bg-gray-800/50'}`}
      onClick={!disabled ? handleClick : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".svg"
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-4">
         <svg className={`w-12 h-12 ${disabled ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        <p className={`text-lg font-semibold ${disabled ? 'text-gray-600' : 'text-gray-300'}`}>
          Drop your SVG sprite here or click to browse
        </p>
        <p className={`${disabled ? 'text-gray-700' : 'text-gray-500'}`}>Only .svg files are accepted</p>
      </div>
    </div>
  );
};

export default FileUpload;
