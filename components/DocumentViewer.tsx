import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
// Fix: Corrected the import path for FileSystemItem from '../types' instead of the hook file.
import { Document, Annotation, ItemType, AnnotationType, FileSystemItem } from '../types';
import { extractText, summarizeText, convertTextToJson, convertToJpg, getDefinition } from '../services/geminiService';
import Icon from './ui/Icon';

// Configure the PDF worker from a CDN
pdfjs.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

interface DocumentViewerProps {
  document: Document;
  onClose: () => void;
  onUpdateDocument: (updatedDoc: Document) => void;
  onAddItem: (item: Omit<FileSystemItem, 'id'>) => void;
}

interface SelectionInfo {
    text: string;
    startIndex: number;
    endIndex: number;
    rect: DOMRect;
    isOverlapping: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-2 h-2 rounded-full bg-current animate-pulse [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 rounded-full bg-current animate-pulse [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
    </div>
);

const DictionaryModal: React.FC<{word: string, definition: string, isLoading: boolean, onClose: () => void}> = ({word, definition, isLoading, onClose}) => (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-light-primary dark:text-dark-primary">{word}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="close" size={20}/></button>
            </div>
            {isLoading ? <LoadingSpinner/> : <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant whitespace-pre-wrap">{definition}</p>}
        </div>
    </div>
);

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, onUpdateDocument, onAddItem }) => {
  const [activeTab, setActiveTab] = useState('viewer');
  const [noteInput, setNoteInput] = useState('');
  const [aiContent, setAiContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [pendingAnnotation, setPendingAnnotation] = useState<SelectionInfo | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // PDF & Image Viewer state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{startIndex: number, endIndex: number}[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  
  // Dictionary state
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [isDictLoading, setIsDictLoading] = useState(false);


  const isImage = document.fileType.startsWith('image/');
  const isText = document.fileType === 'text/plain';
  const isPdf = document.fileType === 'application/pdf';

  useEffect(() => {
    // Reset state on document change
    Object.values(statesToReset).forEach(resetFn => resetFn());
  }, [document]);
  
  const statesToReset = {
      note: () => setNoteInput(''),
      ai: () => setAiContent(''),
      error: () => setError(''),
      selection: () => setSelectionInfo(null),
      pending: () => setPendingAnnotation(null),
      pdfPages: () => setNumPages(null),
      pdfPageNum: () => setPageNumber(1),
      pdfError: () => setPdfError(null),
      zoom: () => setZoom(1),
      search: () => { setSearchTerm(''); setSearchResults([]); setCurrentResultIndex(-1); }
  };

  useEffect(() => {
    if (searchTerm && isText) {
        const regex = new RegExp(searchTerm, 'gi');
        const results = [];
        let match;
        while ((match = regex.exec(document.content)) !== null) {
            results.push({ startIndex: match.index, endIndex: match.index + match[0].length });
        }
        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : -1);
    } else {
        setSearchResults([]);
        setCurrentResultIndex(-1);
    }
  }, [searchTerm, document.content, isText]);

  useEffect(() => {
    if (currentResultIndex !== -1 && viewerRef.current) {
        const element = viewerRef.current.querySelector('[data-is-current-search="true"]');
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentResultIndex]);

  const handleNextResult = () => {
    if (searchResults.length > 0) {
        setCurrentResultIndex(prev => (prev + 1) % searchResults.length);
    }
  };

  const handlePrevResult = () => {
      if (searchResults.length > 0) {
          setCurrentResultIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
      }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => { setNumPages(numPages); setPdfError(null); };
  const onDocumentLoadError = (error: Error) => setPdfError(`Failed to load PDF: ${error.message}`);
  const goToPrevPage = () => setPageNumber(oldPage => Math.max(oldPage - 1, 1));
  const goToNextPage = () => setPageNumber(oldPage => Math.min(oldPage + 1, numPages || 1));
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  
  const handleDownload = () => {
      const link = window.document.createElement('a');
      link.href = `data:${document.fileType};base64,${document.content}`;
      link.download = document.name;
      link.click();
  };

  const handleOpenInNewTab = () => {
      const newWindow = window.open();
      if (newWindow) {
          if (isImage || isPdf) {
              newWindow.document.write(`<iframe src="data:${document.fileType};base64,${document.content}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
          } else {
              newWindow.document.write(`<pre>${document.content}</pre>`);
          }
      }
  };

  const handleTextSelection = () => {
    if (!contentRef.current) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preSelectionRange = window.document.createRange();
        preSelectionRange.selectNodeContents(contentRef.current);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startIndex = preSelectionRange.toString().length;
        const endIndex = startIndex + range.toString().length;

        if (range.toString().trim() === '') {
            setSelectionInfo(null);
            return;
        }

        const isOverlapping = document.annotations.some(anno => 
            (startIndex < anno.endIndex && endIndex > anno.startIndex)
        );

        setSelectionInfo({
            text: range.toString(),
            startIndex,
            endIndex,
            rect: range.getBoundingClientRect(),
            isOverlapping
        });
    } else {
        setTimeout(() => {
            if (!window.getSelection()?.toString()) {
                setSelectionInfo(null);
            }
        }, 200);
    }
  };

  const handleAddAnnotation = (type: AnnotationType, note?: string) => {
    const targetSelection = pendingAnnotation || selectionInfo;
    if (!targetSelection) return;
    const newAnnotation: Annotation = { id: `anno_${Date.now()}`, type, text: targetSelection.text, startIndex: targetSelection.startIndex, endIndex: targetSelection.endIndex, ...(note && { note }) };
    onUpdateDocument({...document, annotations: [...document.annotations, newAnnotation]});
    setSelectionInfo(null); setPendingAnnotation(null); setNoteInput('');
  };

  const handleDeleteAnnotation = (annotationId: string) => onUpdateDocument({ ...document, annotations: document.annotations.filter(a => a.id !== annotationId) });
  const handleHighlight = () => handleAddAnnotation(AnnotationType.HIGHLIGHT);
  const handleStartAddNote = () => { if (selectionInfo) { setPendingAnnotation(selectionInfo); setActiveTab('annotations'); setSelectionInfo(null); } };
  
  const handleDictionaryLookup = async () => {
      if(!selectionInfo) return;
      setDictionaryWord(selectionInfo.text);
      setIsDictLoading(true);
      setDefinition('');
      try {
          const result = await getDefinition(selectionInfo.text);
          setDefinition(result);
      } catch (e) {
          setDefinition(e instanceof Error ? e.message : 'Could not fetch definition.');
      } finally {
          setIsDictLoading(false);
          setSelectionInfo(null);
      }
  };

  const runAiFeature = async (feature: (content: string, mimeType?: string) => Promise<string>, content: string, mimeType?: string) => {
    setIsLoading(true); setError(''); setAiContent(''); setActiveTab('ai-tools');
    try {
      const result = await feature(content, mimeType);
      setAiContent(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally { setIsLoading(false); }
  };
  
  const handleConversion = async (targetFormat: 'json' | 'jpg') => {
    setIsLoading(true); setError(''); setAiContent(''); setActiveTab('ai-tools');
    try {
        let newContent: string;
        let newDoc: Omit<Document, 'id'>;
        const originalName = document.name.substring(0, document.name.lastIndexOf('.'));
        if (targetFormat === 'json') {
            newContent = await convertTextToJson(document.content, document.fileType);
            newDoc = { name: `${originalName}.json`, type: ItemType.DOCUMENT, parentId: document.parentId, fileType: 'application/json', content: newContent, size: newContent.length, createdAt: new Date().toISOString(), isLocked: false, isEncrypted: false, annotations: [] };
        } else {
            newContent = await convertToJpg(document.content, document.fileType);
            newDoc = { name: `${originalName}.jpg`, type: ItemType.DOCUMENT, parentId: document.parentId, fileType: 'image/jpeg', content: newContent, size: newContent.length * 0.75, createdAt: new Date().toISOString(), isLocked: false, isEncrypted: false, annotations: [] };
        }
        onAddItem(newDoc);
        setAiContent(`Successfully converted to ${targetFormat}. New file "${newDoc.name}" created.`);
    } catch (e) { setError(e instanceof Error ? e.message : `An unknown error occurred during conversion.`); } 
    finally { setIsLoading(false); }
  };

  const renderProcessedContent = useMemo(() => {
    if (!isText) return null;
    const { content, annotations } = document;
    const markers = [...annotations, ...searchResults.map((r, i) => ({...r, type: 'SEARCH', id: `search-${i}`, isCurrent: i === currentResultIndex}))];
    markers.sort((a, b) => a.startIndex - b.startIndex);

    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    markers.forEach((marker) => {
        if (marker.startIndex > lastIndex) {
            parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, marker.startIndex)}</span>);
        }
        let className = '';
        let extraProps: { [key: string]: any } = {};
        if (marker.type === AnnotationType.HIGHLIGHT) className = 'bg-yellow-300/40';
        else if (marker.type === AnnotationType.NOTE) className = 'border-b-2 border-blue-400/60';
        else if (marker.type === 'SEARCH') {
            className = (marker as any).isCurrent ? 'bg-orange-400/50 ring-2 ring-orange-500 rounded' : 'bg-orange-300/40 rounded';
            if ((marker as any).isCurrent) {
                extraProps['data-is-current-search'] = 'true';
            }
        }
        parts.push(<span key={marker.id} className={className} title={(marker as Annotation).note} {...extraProps}>{content.substring(marker.startIndex, marker.endIndex)}</span>);
        lastIndex = marker.endIndex;
    });

    if (lastIndex < content.length) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }, [document, isText, searchResults, currentResultIndex]);

  const renderContent = () => {
    if (isImage) return <img src={`data:${document.fileType};base64,${document.content}`} alt={document.name} className="max-h-full max-w-full object-contain transition-transform duration-200" style={{transform: `scale(${zoom})`}} />;
    if (isText) return <div ref={contentRef} onMouseUp={handleTextSelection} className="whitespace-pre-wrap p-4 text-light-onSurface dark:text-dark-onSurface bg-light-surface dark:bg-dark-surface rounded-lg select-text cursor-text">{renderProcessedContent}</div>;
    if (isPdf) return (
        <div className="flex flex-col h-full w-full items-center"><div className="flex-1 overflow-auto w-full flex justify-center"><PdfDocument file={`data:application/pdf;base64,${document.content}`} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading={<LoadingSpinner />} error={pdfError || 'Failed to load PDF file.'}><PdfPage pageNumber={pageNumber} scale={zoom}/></PdfDocument></div>
            {numPages && (<div className="flex items-center justify-center gap-4 p-2 bg-light-surface dark:bg-dark-surface rounded-full mt-2 shadow-md"><button onClick={goToPrevPage} disabled={pageNumber <= 1} className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="chevronLeft" size={20}/></button><p className="text-sm font-medium tabular-nums">Page {pageNumber} of {numPages}</p><button onClick={goToNextPage} disabled={pageNumber >= numPages} className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="chevronRight" size={20}/></button></div>)}
            {pdfError && <p className="text-sm text-red-500 mt-2">{pdfError}</p>}
        </div>)
    return <p>Unsupported file type: {document.fileType}</p>;
  };
  
  const popoverStyle: React.CSSProperties = selectionInfo && viewerRef.current ? { position: 'absolute', top: `${selectionInfo.rect.top - viewerRef.current.getBoundingClientRect().top - 50}px`, left: `${selectionInfo.rect.left - viewerRef.current.getBoundingClientRect().left + selectionInfo.rect.width / 2}px`, transform: 'translateX(-50%)' } : { display: 'none' };
  
  return (
    <div className="flex h-full">
      {dictionaryWord && <DictionaryModal word={dictionaryWord} definition={definition} isLoading={isDictLoading} onClose={() => setDictionaryWord('')}/>}
      <div className="flex-1 flex flex-col p-4 bg-light-background dark:bg-dark-background">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><button onClick={onClose} className="p-2 rounded-full hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="arrowLeft" /></button><Icon name={isImage ? 'image' : isText ? 'text' : 'pdf'} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" /><h1 className="text-xl font-medium">{document.name}</h1></div>
          <div className="flex items-center gap-2 p-1 bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-full">
            {(isImage || isPdf) && <><button onClick={handleZoomOut} className="p-2 rounded-full hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="zoomOut" size={18}/></button><button onClick={handleZoomIn} className="p-2 rounded-full hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="zoomIn" size={18}/></button><div className="w-px h-5 bg-light-outline/30 dark:bg-dark-outline/30 mx-1"></div></>}
            <button onClick={handleDownload} className="p-2 rounded-full hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="download" size={18}/></button>
            <button onClick={handleOpenInNewTab} className="p-2 rounded-full hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="externalLink" size={18}/></button>
            {isText && <><div className="w-px h-5 bg-light-outline/30 dark:bg-dark-outline/30 mx-1"></div><div className="flex items-center"><input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="px-3 py-1 text-sm bg-transparent focus:outline-none w-24" /><span className="text-xs opacity-60 pr-1">{searchResults.length > 0 ? `${currentResultIndex + 1}/${searchResults.length}`: '0/0'}</span><button onClick={handlePrevResult} disabled={searchResults.length === 0} className="p-1 rounded-full disabled:opacity-50 hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="chevronLeft" size={16}/></button><button onClick={handleNextResult} disabled={searchResults.length === 0} className="p-1 rounded-full disabled:opacity-50 hover:bg-light-surface/80 dark:hover:bg-dark-surface/80"><Icon name="chevronRight" size={16}/></button></div></>}
          </div>
        </header>
        <div ref={viewerRef} className="relative flex-1 bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-2xl flex items-center justify-center overflow-auto p-4">
          {renderContent()}
          {selectionInfo && isText && (
            <div style={popoverStyle} className="z-10 flex items-center gap-1 p-1 bg-light-surface dark:bg-dark-surface rounded-full shadow-lg border border-light-outline/20 dark:border-dark-outline/20">
              <button 
                onClick={handleHighlight} 
                disabled={selectionInfo.isOverlapping}
                title={selectionInfo.isOverlapping ? "Selection overlaps an existing annotation." : "Highlight"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant disabled:opacity-50 disabled:cursor-not-allowed">
                  <Icon name="highlight" size={16}/> Highlight
              </button>
              <div className="w-px h-4 bg-light-outline/30 dark:bg-dark-outline/30"></div>
              <button 
                onClick={handleStartAddNote} 
                disabled={selectionInfo.isOverlapping}
                title={selectionInfo.isOverlapping ? "Selection overlaps an existing annotation." : "Add Note"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant disabled:opacity-50 disabled:cursor-not-allowed">
                  <Icon name="note" size={16}/> Add Note
              </button>
              <div className="w-px h-4 bg-light-outline/30 dark:bg-dark-outline/30"></div>
              <button onClick={handleDictionaryLookup} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm hover:bg-light-surfaceVariant dark:hover:bg-dark-surfaceVariant"><Icon name="dictionary" size={16}/> Dictionary</button>
            </div>
          )}
        </div>
      </div>
      <div className="w-80 border-l border-light-surfaceVariant dark:border-dark-surfaceVariant flex flex-col">
        <div className="flex border-b border-light-surfaceVariant dark:border-dark-surfaceVariant"><button onClick={() => setActiveTab('viewer')} className={`flex-1 p-3 text-sm font-medium ${activeTab === 'viewer' ? 'border-b-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary' : ''}`}>Details</button><button onClick={() => setActiveTab('annotations')} className={`flex-1 p-3 text-sm font-medium ${activeTab === 'annotations' ? 'border-b-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary' : ''}`}>Annotations</button><button onClick={() => setActiveTab('ai-tools')} className={`flex-1 p-3 text-sm font-medium ${activeTab === 'ai-tools' ? 'border-b-2 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary' : ''}`}>AI Tools</button></div>
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'viewer' && (<div><h3 className="font-medium mb-2">Properties</h3><div className="text-sm space-y-2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant"><p><strong>Type:</strong> {document.fileType}</p><p><strong>Size:</strong> {(document.size / 1024).toFixed(2)} KB</p><p><strong>Created:</strong> {new Date(document.createdAt).toLocaleDateString()}</p><p><strong>Encrypted:</strong> {document.isEncrypted ? 'Yes' : 'No'}</p><p><strong>Locked:</strong> {document.isLocked ? 'Yes' : 'No'}</p></div></div>)}
          {activeTab === 'annotations' && (<div><h3 className="font-medium mb-4">Annotations</h3>{pendingAnnotation && (<div className="mb-4 p-3 bg-light-primaryContainer/30 dark:bg-dark-primaryContainer/30 rounded-lg"><p className="text-xs italic border-l-2 border-light-primary dark:border-dark-primary pl-2 mb-2">"{pendingAnnotation.text}"</p><textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Add a note..." className="w-full p-2 rounded bg-light-surface dark:bg-dark-surface text-sm border border-light-outline dark:border-dark-outline"></textarea><button onClick={() => handleAddAnnotation(AnnotationType.NOTE, noteInput)} className="mt-2 w-full text-sm bg-light-primary text-light-onPrimary dark:bg-dark-primary dark:text-dark-onPrimary py-2 rounded-lg">Add Note</button></div>)}{!isText && (<div className="mb-4 p-3 text-sm text-center bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-lg text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Annotations are only available for plain text documents.</div>)}<div className="space-y-3">{document.annotations.map(anno => (<div key={anno.id} className="group p-3 bg-light-surfaceVariant dark:bg-dark-surfaceVariant rounded-lg relative"><div className="flex items-start gap-2"><Icon name={anno.type === AnnotationType.HIGHLIGHT ? 'highlight' : 'note'} size={16} className="mt-0.5 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant flex-shrink-0" /><div className="flex-1">{anno.type === AnnotationType.NOTE && <p className="text-sm font-medium">{anno.note}</p>}<p className="text-xs italic mt-1 opacity-70 border-l-2 border-light-outline pl-2">"{anno.text}"</p></div></div><button onClick={() => handleDeleteAnnotation(anno.id)} className="absolute top-2 right-2 p-1 rounded-full bg-light-surface/50 dark:bg-dark-surface/50 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="delete" size={14} className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant" /></button></div>))}{document.annotations.length === 0 && <p className="text-sm text-center text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant py-4">No annotations yet.</p>}</div></div>)}
          {activeTab === 'ai-tools' && (<div className="space-y-4"><h3 className="font-medium mb-2">AI Processing</h3><div className="grid grid-cols-1 gap-3">{(isImage || isPdf) && <button onClick={() => runAiFeature(extractText, document.content || '', document.fileType)} className="flex items-center gap-2 p-3 text-sm text-left rounded-lg bg-light-secondaryContainer dark:bg-dark-secondaryContainer hover:opacity-90"><Icon name="ocr"/> Extract Text (OCR)</button>}<button onClick={() => runAiFeature(summarizeText, document.content || '', (isImage || isPdf) ? document.fileType : undefined)} className="flex items-center gap-2 p-3 text-sm text-left rounded-lg bg-light-secondaryContainer dark:bg-dark-secondaryContainer hover:opacity-90"><Icon name="summarize"/> Summarize Document</button></div><hr className="border-light-surfaceVariant dark:border-dark-surfaceVariant" /><h3 className="font-medium mb-2">Conversions</h3><div className="grid grid-cols-1 gap-3">{(isText || isPdf) && <button onClick={() => handleConversion('json')} className="flex items-center gap-2 p-3 text-sm text-left rounded-lg bg-light-tertiaryContainer dark:bg-dark-tertiaryContainer hover:opacity-90"><Icon name="convert"/> Convert to JSON</button>}{(isImage || isPdf) && <button onClick={() => handleConversion('jpg')} className="flex items-center gap-2 p-3 text-sm text-left rounded-lg bg-light-tertiaryContainer dark:bg-dark-tertiaryContainer hover:opacity-90"><Icon name="convert"/> Convert to JPG</button>}</div>{(isLoading || error || aiContent) && (<div className="mt-4 p-4 rounded-lg bg-light-surface dark:bg-dark-surface min-h-[100px] relative">{isLoading && <div className="absolute inset-0 flex items-center justify-center"><LoadingSpinner/></div>}{error && <p className="text-sm text-red-500">{error}</p>}{aiContent && <pre className="text-xs whitespace-pre-wrap">{aiContent}</pre>}</div>)}</div>)}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
