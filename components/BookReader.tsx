
import React, { useState, useRef, useEffect } from 'react';
import { ReactReader } from 'react-reader';
import { Document, Theme } from '../types';
import Icon from './ui/Icon';

interface BookReaderProps {
  document: Document;
  onClose: () => void;
  theme: Theme;
}

const BookReader: React.FC<BookReaderProps> = ({ document, onClose, theme }) => {
  const [location, setLocation] = useState<string | number>(0);
  const [isTocVisible, setIsTocVisible] = useState(false);
  const renditionRef = useRef<any>(null);
  const [fontSize, setFontSize] = useState(100);

  const epubUrl = `data:application/epub+zip;base64,${document.content}`;

  const applyTheme = (rendition: any) => {
    if (!rendition) return;
    const bookTheme = {
        body: {
          'background-color': theme === Theme.DARK ? '#1C1B1F' : '#FFFBFE',
          'color': theme === Theme.DARK ? '#E6E1E5' : '#1C1B1F',
        }
    };
    rendition.themes.register('custom', bookTheme);
    rendition.themes.select('custom');
  };

  useEffect(() => {
    applyTheme(renditionRef.current);
  }, [theme]);


  const changeFontSize = (delta: number) => {
    const newSize = Math.max(80, Math.min(130, fontSize + delta));
    setFontSize(newSize);
    renditionRef.current?.themes.fontSize(`${newSize}%`);
  };

  return (
    <div className="flex h-full flex-col bg-light-surface dark:bg-dark-surface">
      <header className="flex items-center justify-between p-2 border-b border-light-surfaceVariant dark:border-dark-surfaceVariant z-20 flex-shrink-0">
        <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant">
              <Icon name="arrowLeft" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-md font-medium">{document.name.replace('.epub', '')}</h1>
              <span className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">E-Book Reader</span>
            </div>
        </div>
        <div className="flex items-center gap-2">
             <button onClick={() => changeFontSize(-10)} className="p-2 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="zoomOut" size={18}/></button>
             <span className="text-sm w-10 text-center">{fontSize}%</span>
             <button onClick={() => changeFontSize(10)} className="p-2 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="zoomIn" size={18}/></button>
        </div>
        <button onClick={() => setIsTocVisible(!isTocVisible)} className="p-2 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant">
            <Icon name="more" />
        </button>
      </header>
      <div className="flex-1 h-0 relative">
        <ReactReader
          url={epubUrl}
          location={location}
          locationChanged={(epubcfi: string) => setLocation(epubcfi)}
          getRendition={(rendition) => {
            renditionRef.current = rendition;
            rendition.themes.fontSize(`${fontSize}%`);
            applyTheme(rendition);
          }}
          tocChanged={(toc) => console.log(toc)}
          epubOptions={{
             flow: "paginated",
             manager: "continuous",
          }}
          showToc={isTocVisible}
        />
      </div>
    </div>
  );
};

export default BookReader;
