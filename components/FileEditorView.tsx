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
    <div className="flex flex-col h-full bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-gray-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-md font-semibold text-white font-mono">{file?.name}</span>
          <button onClick={() => setShowFind(!showFind)} className={`p-2 rounded-lg transition-colors ${showFind ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50'}`} title="Find & Replace">
            <Search className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 border border-gray-600 rounded-md shadow-sm hover:bg-gray-600/50 transition-all" title="Upload New File">
            <Upload className="w-4 h-4" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings" className="hidden" />
          <button onClick={handleDownload} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700/50 border border-gray-600 rounded-md shadow-sm hover:bg-gray-600/50 transition-all" title="Download File">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleCloseFile} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Close File">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFind && (
        <div className="bg-gray-800/80 p-2 rounded-md mb-2 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm transition-all duration-300 border border-gray-700/50">
          <div className="flex items-center space-x-2">
            <input type="text" placeholder="Find" value={findTerm} onChange={(e) => setFindTerm(e.target.value)} className="w-full text-sm p-1.5 bg-gray-900 border border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-white" />
            <span className="text-gray-400 text-xs px-1 whitespace-nowrap w-24 text-center">
              {findTerm && allMatches.length > 0 ? `${currentMatchIndex === -1 ? '-' : currentMatchIndex + 1} / ${allMatches.length}` : findTerm ? '0 results' : ''}
            </span>
            <button onClick={handleFindPrev} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300" title="Previous match"><ChevronUp size={14} /></button>
            <button onClick={handleFindNext} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300" title="Next match"><ChevronDown size={14} /></button>
          </div>
          <div className="flex items-center space-x-2">
            <input type="text" placeholder="Replace" value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} className="w-full text-sm p-1.5 bg-gray-900 border border-gray-700 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none text-white" />
            <button onClick={handleReplace} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md whitespace-nowrap text-gray-300 text-xs">Replace</button>
            <button onClick={handleReplaceAll} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md whitespace-nowrap text-gray-300 text-xs">All</button>
          </div>
        </div>
      )}

      <div className="flex-grow relative bg-gray-900/50 rounded-md shadow-inner border border-gray-700 font-mono text-sm leading-6">
        <div
          ref={backdropRef}
          className="absolute inset-0 w-full h-full p-4 overflow-auto pointer-events-none whitespace-pre-wrap break-words text-gray-300"
        >
          {highlightedContent}
        </div>
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onScroll={handleScroll}
          className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none focus:outline-none"
          style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
          spellCheck="false"
          aria-label="File content editor"
        />
      </div>
    </div>
  );

  const renderUploadPrompt = () => (
    <DragDropZone
      onFilesDropped={handleFilesDropped}
      className="flex flex-col items-center justify-center h-full"
      isDraggingClass="border-blue-500 bg-blue-500/10"
    >
      <label className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-800/30 hover:border-blue-500/50 hover:bg-gray-700/30 transition-all group">
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <div className="p-4 bg-gray-800 rounded-full mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-400 transition-colors" />
          </div>
          <p className="mb-2 text-lg font-semibold text-gray-300">Drag & Drop or Click to upload</p>
          <p className="text-xs text-gray-500">Supports .strings, .xml, .properties, etc.</p>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings" className="hidden" />
      </label>
      {error && <p className="text-sm text-red-400 mt-4 bg-red-500/10 px-4 py-2 rounded-md border border-red-500/20">{error}</p>}
    </DragDropZone>
  );

  return (
    <div className="flex flex-col min-h-screen md:h-full space-y-6 p-4 md:p-8">
      <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <FileEdit className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">File Editor</h1>
              <p className="text-xs text-gray-400">Edit localization files directly</p>
            </div>
          </div>
        </div>
      </header>
      <div className="flex-grow min-h-[500px] md:min-h-0">
        {file ? renderEditor() : renderUploadPrompt()}
      </div>
    </div>
  );
};
