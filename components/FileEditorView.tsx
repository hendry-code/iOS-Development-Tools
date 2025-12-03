import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeftIcon, CloseIcon, DownloadIcon, EditIcon, SearchIcon, UploadIcon } from './icons';

interface FileEditorViewProps {
  onBack: () => void;
}

interface LoadedFile {
  name: string;
  content: string;
}

export const FileEditorView: React.FC<FileEditorViewProps> = ({ onBack }) => {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Find & Replace state
  const [showFind, setShowFind] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [lineHeight, setLineHeight] = useState(24); // Default, will be calculated

  useEffect(() => {
    if (file) {
      setEditedContent(file.content);
    } else {
      setEditedContent('');
    }
    // Reset find/replace on new file
    setShowFind(false);
    setFindTerm('');
    setReplaceTerm('');
    setCurrentMatchIndex(-1);
  }, [file]);

  useEffect(() => {
    // Calculate line height when editor is available
    if (textareaRef.current) {
        const computedStyle = window.getComputedStyle(textareaRef.current);
        const lh = parseFloat(computedStyle.lineHeight);
        if (lh) setLineHeight(lh);
    }
  }, [file]); // Re-calculate if a new file is loaded

  const allMatches = useMemo(() => {
    if (!findTerm || !editedContent) return [];
    const safeFindTerm = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safeFindTerm, 'gi');
    const matches: number[] = [];
    let match;
    while ((match = regex.exec(editedContent)) !== null) {
      matches.push(match.index);
    }
    return matches;
  }, [editedContent, findTerm]);

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [findTerm]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setFile({
        name: selectedFile.name,
        content: reader.result as string,
      });
    };
    reader.onerror = () => {
      setError('An error occurred while reading the file.');
      setFile(null);
    };
    reader.readAsText(selectedFile);
    if (event.target) event.target.value = ''; // Allow re-uploading the same file
  };
  
  const handleDownload = () => {
    if (!file) return;
    const blob = new Blob([editedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleCloseFile = () => {
    setFile(null);
  }

  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
        backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };
  
  const scrollToIndex = (charIndex: number) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const textBefore = editedContent.substring(0, charIndex);
    const lineCount = (textBefore.match(/\n/g) || []).length;
    const desiredScrollTop = lineCount * lineHeight;
    const textareaHeight = textarea.clientHeight;
    
    // Scroll to position, trying to center it vertically in the viewport
    const centeredScrollTop = desiredScrollTop - (textareaHeight / 2) + (lineHeight / 2);
    textarea.scrollTop = Math.max(0, centeredScrollTop); // Ensure we don't scroll to a negative value
    handleScroll();
  };

  const handleFindNext = () => {
    if (allMatches.length === 0 || !textareaRef.current) return;
    const newIndex = currentMatchIndex === -1 ? 0 : (currentMatchIndex + 1) % allMatches.length;
    setCurrentMatchIndex(newIndex);
    
    const matchPos = allMatches[newIndex];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(matchPos, matchPos + findTerm.length);
    scrollToIndex(matchPos);
  };

  const handleFindPrev = () => {
    if (allMatches.length === 0 || !textareaRef.current) return;
    const newIndex = currentMatchIndex <= 0 ? allMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    
    const matchPos = allMatches[newIndex];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(matchPos, matchPos + findTerm.length);
    scrollToIndex(matchPos);
  };
  
  const handleReplace = () => {
    if (allMatches.length === 0 || !textareaRef.current) return;
    
    let indexToReplace = currentMatchIndex;

    // If no match is "active" or selection is stale, find the next one first
    if (indexToReplace === -1 || textareaRef.current.selectionStart !== allMatches[indexToReplace]) {
        handleFindNext();
        return;
    }

    const start = textareaRef.current.selectionStart;
    const newContent = editedContent.substring(0, start) + replaceTerm + editedContent.substring(start + findTerm.length);
    setEditedContent(newContent);
    
    // After state update, find the next match based on the old position
    setTimeout(() => {
        if (!findTerm || !textareaRef.current) return;
        
        // Recalculate matches on the new content
        const safeFindTerm = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeFindTerm, 'gi');
        const newMatches: number[] = [];
        let match;
        while ((match = regex.exec(newContent)) !== null) {
          newMatches.push(match.index);
        }

        if (newMatches.length === 0) {
            setCurrentMatchIndex(-1);
            return;
        }

        // Find the first match at or after where the replacement ended
        let nextMatchIdxInArray = newMatches.findIndex(pos => pos >= (start + replaceTerm.length));
        
        // If nothing found after, wrap around to the first one
        if (nextMatchIdxInArray === -1) {
            nextMatchIdxInArray = 0;
        }

        const matchPos = newMatches[nextMatchIdxInArray];
        setCurrentMatchIndex(nextMatchIdxInArray);
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(matchPos, matchPos + findTerm.length);
        scrollToIndex(matchPos);
    }, 0);
  };
  
  const handleReplaceAll = () => {
      if (!findTerm) return;
      const safeFindTerm = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeFindTerm, 'gi');

      if (editedContent.match(regex)) {
        const newContent = editedContent.replace(regex, replaceTerm);
        setEditedContent(newContent);
      } else {
          alert(`'${findTerm}' not found.`);
      }
  };

  const highlightedContent = useMemo(() => {
    if (!findTerm || allMatches.length === 0) {
      return editedContent;
    }

    let lastIndex = 0;
    const parts: (string | React.ReactElement)[] = [];
    
    allMatches.forEach((matchIndex, i) => {
      // Add text before the match
      if (matchIndex > lastIndex) {
        parts.push(editedContent.substring(lastIndex, matchIndex));
      }
      
      const matchText = editedContent.substring(matchIndex, matchIndex + findTerm.length);
      const isCurrent = i === currentMatchIndex;
      
      parts.push(
        <mark key={i} className={`p-0 m-0 rounded-sm ${isCurrent ? 'bg-amber-500/60' : 'bg-red-500/40'}`}>
          {matchText}
        </mark>
      );
      
      lastIndex = matchIndex + findTerm.length;
    });

    // Add remaining text after the last match
    if (lastIndex < editedContent.length) {
      parts.push(editedContent.substring(lastIndex));
    }

    return <>{parts}</>;
  }, [editedContent, findTerm, currentMatchIndex, allMatches]);


  const renderEditor = () => (
    <div className="flex flex-col h-full bg-black/30 p-4 rounded-lg border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center space-x-4">
                <span className="text-md font-semibold text-slate-100 font-mono">{file?.name}</span>
                <button onClick={() => setShowFind(!showFind)} className={`p-2 rounded-lg transition-colors ${showFind ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-slate-700/50'}`} title="Find & Replace">
                    <SearchIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="flex items-center space-x-2">
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 border border-slate-600 rounded-md shadow-sm hover:bg-slate-600/50 transition-all" title="Upload New File">
                    <UploadIcon className="w-4 h-4" />
                </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings" className="hidden" />
                <button onClick={handleDownload} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 border border-slate-600 rounded-md shadow-sm hover:bg-slate-600/50 transition-all" title="Download File">
                    <DownloadIcon className="w-4 h-4" />
                </button>
                <button onClick={handleCloseFile} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Close File">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {showFind && (
            <div className="bg-slate-800/80 p-2 rounded-md mb-2 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm transition-all duration-300">
                <div className="flex items-center space-x-2">
                    <input type="text" placeholder="Find" value={findTerm} onChange={(e) => setFindTerm(e.target.value)} className="w-full text-sm p-1.5 bg-slate-700 border border-slate-600 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none"/>
                    <span className="text-slate-400 text-xs px-1 whitespace-nowrap w-24 text-center">
                        {findTerm && allMatches.length > 0 ? `${currentMatchIndex === -1 ? '-' : currentMatchIndex + 1} / ${allMatches.length}` : findTerm ? '0 results' : ''}
                    </span>
                    <button onClick={handleFindPrev} className="p-1.5 bg-slate-700/80 hover:bg-slate-600/80 rounded-md" title="Previous match">↑</button>
                    <button onClick={handleFindNext} className="p-1.5 bg-slate-700/80 hover:bg-slate-600/80 rounded-md" title="Next match">↓</button>
                </div>
                <div className="flex items-center space-x-2">
                    <input type="text" placeholder="Replace" value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} className="w-full text-sm p-1.5 bg-slate-700 border border-slate-600 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none"/>
                    <button onClick={handleReplace} className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/80 rounded-md whitespace-nowrap">Replace</button>
                    <button onClick={handleReplaceAll} className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/80 rounded-md whitespace-nowrap">All</button>
                </div>
            </div>
        )}

        <div className="flex-grow relative bg-slate-900/50 rounded-md shadow-inner border border-slate-700 font-mono text-sm leading-6">
             <div
                ref={backdropRef}
                className="absolute inset-0 w-full h-full p-4 overflow-auto pointer-events-none whitespace-pre-wrap break-words"
             >
                {highlightedContent}
            </div>
             <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onScroll={handleScroll}
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none focus:outline-none"
                style={{fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit'}}
                spellCheck="false"
                aria-label="File content editor"
            />
        </div>
    </div>
  );

  const renderUploadPrompt = () => (
    <div className="flex flex-col items-center justify-center h-full">
        <label className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/30 hover:border-red-500/50 hover:bg-slate-700/30 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <UploadIcon className="w-10 h-10 mb-4 text-slate-500" />
                <p className="mb-2 text-lg font-semibold text-slate-300">Click to upload a file</p>
                <p className="text-xs text-slate-400">Supports .strings, .xml, .properties, etc.</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings" className="hidden" />
        </label>
         {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
    </div>
  );

  return (
    <div className="w-full max-w-7xl h-[90vh] min-h-[700px] flex flex-col bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-700">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex-1">
          <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="text-sm font-semibold">Dashboard</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-center space-x-2">
            <EditIcon className="w-5 h-5 text-red-500" />
            <h1 className="text-md font-bold text-slate-200">File Editor</h1>
          </div>
        </div>
        <div className="flex-1" />
      </header>
      <div className="flex-grow p-4 overflow-hidden">
        {file ? renderEditor() : renderUploadPrompt()}
      </div>
    </div>
  );
};
