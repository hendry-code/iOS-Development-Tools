import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, X, Download, FileEdit, Search, Upload, ChevronUp, ChevronDown } from 'lucide-react';
import { DragDropZone } from './DragDropZone';

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

  const processFile = (selectedFile: File) => {
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
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
    if (event.target) event.target.value = ''; // Allow re-uploading the same file
  };

  const handleFilesDropped = (files: FileList) => {
    if (files[0]) {
      processFile(files[0]);
    }
  }

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
        <mark key={i} className={`p-0 m-0 rounded-sm ${isCurrent ? 'bg-amber-500/60 text-white' : 'bg-rose-500/40 text-white'}`}>
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
    <div className="flex flex-col h-full bg-slate-950 p-6">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-md font-semibold text-slate-200 font-mono">{file?.name}</span>
          <button onClick={() => setShowFind(!showFind)} className={`p-2 rounded-lg transition-colors ${showFind ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`} title="Find & Replace">
            <Search className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md shadow-sm hover:bg-slate-700 transition-all" title="Upload New File">
            <Upload className="w-4 h-4" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings" className="hidden" />
          <button onClick={handleDownload} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md shadow-sm hover:bg-slate-700 transition-all" title="Download File">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleCloseFile} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Close File">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFind && (
        <div className="bg-slate-800/80 p-2 rounded-lg mb-2 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm transition-all duration-300 border border-slate-700/50">
          <div className="flex items-center space-x-2">
            <input type="text" placeholder="Find" value={findTerm} onChange={(e) => setFindTerm(e.target.value)} className="w-full text-sm p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white" />
            <span className="text-slate-400 text-xs px-1 whitespace-nowrap w-24 text-center">
              {findTerm && allMatches.length > 0 ? `${currentMatchIndex === -1 ? '-' : currentMatchIndex + 1} / ${allMatches.length}` : findTerm ? '0 results' : ''}
            </span>
            <button onClick={handleFindPrev} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Previous match"><ChevronUp size={14} /></button>
            <button onClick={handleFindNext} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Next match"><ChevronDown size={14} /></button>
          </div>
          <div className="flex items-center space-x-2">
            <input type="text" placeholder="Replace" value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} className="w-full text-sm p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white" />
            <button onClick={handleReplace} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap text-slate-300 text-xs font-medium">Replace</button>
            <button onClick={handleReplaceAll} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap text-slate-300 text-xs font-medium">All</button>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-slate-900/50 rounded-lg shadow-inner border border-slate-800 font-mono text-sm leading-6">
        <div
          ref={backdropRef}
          className="absolute inset-0 w-full h-full p-4 overflow-auto pointer-events-none whitespace-pre-wrap break-words text-slate-300 custom-scrollbar"
        >
          {highlightedContent}
        </div>
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none focus:outline-none custom-scrollbar"
          style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
          spellCheck="false"
          aria-label="File content editor"
        />
      </div>
    </div>
  );

  const renderUploadPrompt = () => (
    <div className="flex-1 p-6 flex flex-col items-center justify-center">
      <DragDropZone
        onFilesDropped={handleFilesDropped}
        className="w-full max-w-2xl h-96 flex flex-col items-center justify-center border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/20 hover:border-orange-500/50 hover:bg-slate-800/40 transition-all group"
        isDraggingClass="border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/50"
      >
        <div className="flex flex-col items-center justify-center p-8 text-center" onClick={() => fileInputRef.current?.click()}>
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
            <Upload className="w-10 h-10 text-slate-400 group-hover:text-orange-400 transition-colors" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-slate-200">Upload File to Edit</h3>
          <p className="text-slate-400 mb-6">Drag & Drop or Click to browse</p>
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.strings</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.xml</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.json</span>
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings,.json" className="hidden" />
      </DragDropZone>
      {error && <p className="text-sm text-rose-400 mt-6 bg-rose-500/10 px-6 py-3 rounded-xl border border-rose-500/20 animate-in fade-in slide-in-from-bottom-2">{error}</p>}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            File Editor
          </h1>
          <p className="text-slate-400 text-sm">Edit localization files directly</p>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {file ? renderEditor() : renderUploadPrompt()}
      </div>
    </div>
  );
};
