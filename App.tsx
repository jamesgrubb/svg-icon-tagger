import React, { useState, useEffect, useCallback } from 'react';
import type { AITaggedIcon, ExtractedIcon } from './types';
import { getIconDescription } from './services/geminiService';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import SearchBar from './components/SearchBar';
import IconGrid from './components/IconGrid';
import Spinner from './components/Spinner';

/**
 * Safely encodes a string to Base64, handling Unicode characters correctly.
 * @param str The string to encode.
 * @returns The Base64 encoded string.
 */
const b64EncodeUnicode = (str: string) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    (match, p1) => String.fromCharCode(parseInt(p1, 16))
  ));
}

/**
 * Converts an SVG data URI to a PNG data URI by drawing it on a canvas.
 * @param svgDataUri The data URI of the SVG image.
 * @param width The desired width of the output PNG.
 * @param height The desired height of the output PNG.
 * @returns A promise that resolves with the PNG data URI.
 */
const convertSvgToPngDataUri = (svgDataUri: string, width: number = 128, height: number = 128): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const pngDataUri = canvas.toDataURL('image/png');
        resolve(pngDataUri);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (err) => {
      console.error("Failed to load SVG image for conversion:", err, svgDataUri.substring(0, 100));
      reject(new Error(`Failed to load SVG image for conversion.`));
    };
    img.src = svgDataUri;
  });
};


/**
 * Extracts individual icons from an SVG sprite string by analyzing its structure.
 * It prioritizes `<symbol>` tags, then falls back to top-level `<g>` tags,
 * and finally treats the entire file as a single icon if no structure is found.
 */
const extractIconsByStructure = (svgContent: string, fileName: string): ExtractedIcon[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgElement = doc.documentElement;

  if (svgElement.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    console.error("Uploaded file is not a valid SVG.");
    return [];
  }

  // Strategy 1: Look for <symbol> elements (common in icon sprites)
  const symbols = Array.from(doc.querySelectorAll('symbol'));
  if (symbols.length > 0) {
    return symbols.map((symbol, index) => {
      const id = symbol.id || `${fileName.replace(/\.svg$/, '')}-symbol-${index}`;
      const viewBox = symbol.getAttribute('viewBox') || '0 0 24 24';
      const newSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${symbol.innerHTML}</svg>`;
      const altText = symbol.querySelector('title')?.textContent?.trim();
      return {
        id,
        svgString: newSvgString,
        dataUri: `data:image/svg+xml;base64,${b64EncodeUnicode(newSvgString)}`,
        altText,
      };
    });
  }

  // For other strategies, we need to render the SVG off-screen to calculate bounding boxes
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.visibility = 'hidden';
  tempContainer.style.width = '1px'; // Some browsers need dimensions
  tempContainer.style.height = '1px';
  document.body.appendChild(tempContainer);
  
  const liveSvg = svgElement.cloneNode(true) as SVGSVGElement;
  tempContainer.appendChild(liveSvg);
  
  let extractedIcons: ExtractedIcon[] = [];

  // Strategy 2: Look for top-level <g> elements (another common sprite technique)
  // Fix: Specify the element type for querySelectorAll to ensure `g` is typed as SVGGElement.
  // This resolves the `parentElement` type mismatch and removes the need for later casting.
  const groups = Array.from(liveSvg.querySelectorAll<SVGGElement>('g'));
  // FIX: Replaced `parentElement` with `parentNode` to resolve a TypeScript type error.
  // `g.parentElement` is typed as `HTMLElement`, which has no overlap with `liveSvg`'s `SVGSVGElement` type, causing an invalid comparison.
  // `g.parentNode` is correctly typed as `Node`, which is a valid supertype for the comparison.
  const topLevelGroups = groups.filter(g => g.parentNode === liveSvg);
  
  if (topLevelGroups.length > 1) { // Process only if there's more than one group, suggesting a sprite
      extractedIcons = topLevelGroups.map((g, index) => {
      try {
        const { x, y, width, height } = g.getBBox();
        if (width === 0 || height === 0) return null; // Skip empty/invisible groups

        const id = g.id || `${fileName.replace(/\.svg$/, '')}-group-${index}`;
        const viewBox = `${x} ${y} ${width} ${height}`;
        const altText = g.querySelector('title')?.textContent?.trim();
        
        const newSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${g.innerHTML}</svg>`;

        return {
          id,
          svgString: newSvgString,
          dataUri: `data:image/svg+xml;base64,${b64EncodeUnicode(newSvgString)}`,
          altText,
        };
      } catch(e) {
        console.warn('Could not process a group element, it might be invisible.', e);
        return null;
      }
    // FIX: The type predicate `(icon): icon is ExtractedIcon` was causing a TS inference error.
    // Removing it allows TypeScript's structural typing to correctly handle the type narrowing.
    }).filter((icon) => icon !== null);
  }

  document.body.removeChild(tempContainer);

  // Strategy 3: If no symbols or groups were extracted, assume it's a single icon file
  if (extractedIcons.length === 0) {
      const altText = svgElement.querySelector('title')?.textContent?.trim();
      return [{
          id: `${fileName.replace(/\.svg$/, '')}-single-0`,
          svgString: svgContent,
          dataUri: `data:image/svg+xml;base64,${b64EncodeUnicode(svgContent)}`,
          altText
      }];
  }

  return extractedIcons;
};


const App: React.FC = () => {
  const [allIcons, setAllIcons] = useState<AITaggedIcon[]>([]);
  const [displayedIcons, setDisplayedIcons] = useState<AITaggedIcon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const resetState = () => {
    setAllIcons([]);
    setDisplayedIcons([]);
    setSearchQuery('');
  };

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    resetState();
    setLoading(true);
    setLoadingMessage('Analyzing SVG structure...');

    const svgContent = await file.text();
    
    try {
      const extracted = extractIconsByStructure(svgContent, file.name);

      if (extracted.length === 0) {
        setLoadingMessage('Analysis complete, but no distinct icons were found. This can happen with empty or non-standard SVG structures.');
        setTimeout(() => setLoading(false), 4000);
        return;
      }
      
      const taggedIcons: AITaggedIcon[] = [];
      for (let i = 0; i < extracted.length; i++) {
        const icon = extracted[i];
        setLoadingMessage(`Analyzing icon ${i + 1} of ${extracted.length} with AI...`);
        try {
          // Convert SVG to PNG for reliable AI vision analysis
          const pngDataUri = await convertSvgToPngDataUri(icon.dataUri);
          const aiData = await getIconDescription(pngDataUri, icon.altText);
          const newTaggedIcon = { ...icon, ...aiData };
          taggedIcons.push(newTaggedIcon);
          // Update state progressively
          setAllIcons(prev => [...prev, newTaggedIcon]);
          setDisplayedIcons(prev => [...prev, newTaggedIcon]);
        } catch (error) {
          console.error(`Failed to process icon ${icon.id}:`, error);
          const failedIcon = { ...icon, title: icon.id, keywords: ['failed', 'error'] };
          taggedIcons.push(failedIcon);
          setAllIcons(prev => [...prev, failedIcon]);
          setDisplayedIcons(prev => [...prev, failedIcon]);
        }
      }

      setLoading(false);
      setLoadingMessage('');
    } catch (error) {
      console.error("Error during SVG processing:", error);
      setLoadingMessage('A critical error occurred during processing. The file might be corrupted.');
      setTimeout(() => setLoading(false), 4000);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setDisplayedIcons(allIcons);
      return;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = allIcons.filter(icon =>
      icon.title.toLowerCase().includes(lowerCaseQuery) ||
      icon.id.toLowerCase().includes(lowerCaseQuery) ||
      icon.keywords.some(kw => kw.toLowerCase().includes(lowerCaseQuery))
    );
    setDisplayedIcons(filtered);
  }, [searchQuery, allIcons]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center space-y-8">
          {!loading && allIcons.length === 0 && (
            <FileUpload onFileSelect={processFile} disabled={loading} />
          )}

          {loading && (
            <div className="flex flex-col items-center space-y-4 text-center p-8">
              <Spinner />
              <p className="text-lg font-medium text-purple-300">Processing Icons</p>
              <p className="text-gray-400">{loadingMessage}</p>
            </div>
          )}

          {allIcons.length > 0 && (
            <>
              <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} disabled={allIcons.length === 0} />
              <IconGrid icons={displayedIcons} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
