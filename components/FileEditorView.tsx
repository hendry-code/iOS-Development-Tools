import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, X, Download, Search, Upload, ChevronUp, ChevronDown,
  CaseSensitive, Regex, WholeWord, RotateCcw, RotateCw, Info,
  AlertTriangle, Check, Code, Columns, FileText, Plus, Hash,
  Copy, Scissors, Trash2, ClipboardPaste, CopyPlus
} from 'lucide-react';
import { DragDropZone } from './DragDropZone';

interface FileEditorViewProps {
  onBack: () => void;
}

interface LoadedFile {
  id: string;
  name: string;
  originalContent: string;
  content: string;
}

interface HistoryState {
  content: string;
  cursorPosition: number;
}

interface ValidationError {
  line: number;
  message: string;
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Get file type from extension
const getFileType = (filename: string): 'json' | 'xml' | 'strings' | 'text' => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json' || ext === 'xcstrings') return 'json';
  if (ext === 'xml' || ext === 'stringsdict') return 'xml';
  if (ext === 'strings') return 'strings';
  return 'text';
};

// Validate content based on file type
const validateContent = (content: string, fileType: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (fileType === 'json') {
    try {
      JSON.parse(content);
    } catch (e: unknown) {
      const error = e as Error;
      const match = error.message.match(/position (\d+)/);
      let line = 1;
      if (match) {
        const pos = parseInt(match[1], 10);
        line = (content.substring(0, pos).match(/\n/g) || []).length + 1;
      }
      errors.push({ line, message: error.message });
    }
  } else if (fileType === 'xml') {
    // Basic XML validation
    const openTags: string[] = [];
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const openMatch = line.match(/<(\w+)[^>]*(?<!\/)\s*>/g);
      const closeMatch = line.match(/<\/(\w+)>/g);
      if (openMatch) {
        openMatch.forEach(tag => {
          const name = tag.match(/<(\w+)/)?.[1];
          if (name && !tag.includes('/>')) openTags.push(name);
        });
      }
      if (closeMatch) {
        closeMatch.forEach(tag => {
          const name = tag.match(/<\/(\w+)>/)?.[1];
          if (name && openTags.length > 0 && openTags[openTags.length - 1] === name) {
            openTags.pop();
          } else if (name) {
            errors.push({ line: idx + 1, message: `Unexpected closing tag </${name}>` });
          }
        });
      }
    });
    if (openTags.length > 0) {
      errors.push({ line: lines.length, message: `Unclosed tags: ${openTags.join(', ')}` });
    }
  } else if (fileType === 'strings') {
    // Basic .strings validation
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
        if (trimmed.includes('=') && !trimmed.match(/^\s*"[^"]*"\s*=\s*".*";\s*$/)) {
          if (!trimmed.endsWith(';') && !trimmed.startsWith('/*')) {
            errors.push({ line: idx + 1, message: 'Line should end with semicolon' });
          }
        }
      }
    });
  }

  return errors;
};

// Format content based on file type
const formatContent = (content: string, fileType: string, indent: number = 2): string => {
  if (fileType === 'json') {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, indent);
    } catch {
      return content;
    }
  }
  return content;
};

// Count keys in content
const countKeys = (content: string, fileType: string): number => {
  if (fileType === 'json') {
    try {
      const parsed = JSON.parse(content);
      const countObjectKeys = (obj: unknown): number => {
        if (typeof obj !== 'object' || obj === null) return 0;
        if (Array.isArray(obj)) {
          return obj.reduce((sum, item) => sum + countObjectKeys(item), 0);
        }
        return Object.keys(obj).length + Object.values(obj).reduce((sum: number, val) => sum + countObjectKeys(val), 0);
      };
      return Object.keys(parsed).length;
    } catch {
      return 0;
    }
  } else if (fileType === 'strings') {
    const matches = content.match(/^\s*"[^"]+"\s*=/gm);
    return matches ? matches.length : 0;
  }
  return 0;
};

// Syntax highlighting component
const SyntaxHighlight: React.FC<{ content: string; fileType: string; findTerm: string; matches: number[]; currentMatchIndex: number }> =
  ({ content, fileType, findTerm, matches, currentMatchIndex }) => {

    const highlightSyntax = (text: string): React.ReactNode => {
      if (fileType === 'json') {
        // JSON syntax highlighting
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\d+\.?\d*)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }

          if (match[1]) { // Key
            parts.push(<span key={match.index} className="text-purple-400">{match[1]}</span>);
            parts.push(':');
          } else if (match[2]) { // String value
            parts.push(<span key={match.index} className="text-green-400">{match[2]}</span>);
          } else if (match[3]) { // Number
            parts.push(<span key={match.index} className="text-amber-400">{match[3]}</span>);
          } else if (match[4]) { // Boolean/null
            parts.push(<span key={match.index} className="text-blue-400">{match[4]}</span>);
          } else if (match[5]) { // Brackets/punctuation
            parts.push(<span key={match.index} className="text-slate-400">{match[5]}</span>);
          }

          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
      } else if (fileType === 'xml') {
        // XML syntax highlighting
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const regex = /(<\/?)([\w-]+)([^>]*)(\/?>)|<!--[\s\S]*?-->/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }

          if (match[0].startsWith('<!--')) {
            parts.push(<span key={match.index} className="text-slate-500 italic">{match[0]}</span>);
          } else {
            parts.push(
              <span key={match.index}>
                <span className="text-slate-400">{match[1]}</span>
                <span className="text-rose-400">{match[2]}</span>
                <span className="text-amber-400">{match[3]}</span>
                <span className="text-slate-400">{match[4]}</span>
              </span>
            );
          }

          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
      } else if (fileType === 'strings') {
        // .strings syntax highlighting
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const regex = /("(?:[^"\\]|\\.)*")\s*=\s*("(?:[^"\\]|\\.)*")|\/\/.*$|\/\*[\s\S]*?\*\//gm;
        let match;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }

          if (match[1] && match[2]) {
            parts.push(<span key={match.index} className="text-purple-400">{match[1]}</span>);
            parts.push(' = ');
            parts.push(<span key={match.index + 1} className="text-green-400">{match[2]}</span>);
          } else {
            parts.push(<span key={match.index} className="text-slate-500 italic">{match[0]}</span>);
          }

          lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
      }

      return text;
    };

    // Apply search highlighting on top of syntax highlighting
    const applySearchHighlight = (): React.ReactNode => {
      if (!findTerm || matches.length === 0) {
        return highlightSyntax(content);
      }

      let lastIndex = 0;
      const parts: React.ReactNode[] = [];

      matches.forEach((matchIndex, i) => {
        if (matchIndex > lastIndex) {
          parts.push(
            <React.Fragment key={`text-${i}`}>
              {highlightSyntax(content.substring(lastIndex, matchIndex))}
            </React.Fragment>
          );
        }

        const matchText = content.substring(matchIndex, matchIndex + findTerm.length);
        const isCurrent = i === currentMatchIndex;

        parts.push(
          <mark
            key={`match-${i}`}
            className={`p-0 m-0 rounded-sm ${isCurrent ? 'bg-amber-500/60 text-white' : 'bg-rose-500/40 text-white'}`}
          >
            {matchText}
          </mark>
        );

        lastIndex = matchIndex + findTerm.length;
      });

      if (lastIndex < content.length) {
        parts.push(
          <React.Fragment key="text-end">
            {highlightSyntax(content.substring(lastIndex))}
          </React.Fragment>
        );
      }

      return <>{parts}</>;
    };

    return <>{applySearchHighlight()}</>;
  };

export const FileEditorView: React.FC<FileEditorViewProps> = ({ onBack }) => {
  // Multi-tab state
  const [openFiles, setOpenFiles] = useState<LoadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Find & Replace state
  const [showFind, setShowFind] = useState(false);
  const [findTerm, setFindTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [lineHeight, setLineHeight] = useState(24);

  // UI state
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineValue, setGoToLineValue] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showErrors, setShowErrors] = useState(false);

  // Undo/Redo state
  const [history, setHistory] = useState<Map<string, HistoryState[]>>(new Map());
  const [historyIndex, setHistoryIndex] = useState<Map<string, number>>(new Map());

  // Get active file
  const activeFile = useMemo(() => {
    return openFiles.find(f => f.id === activeFileId) || null;
  }, [openFiles, activeFileId]);

  const editedContent = activeFile?.content || '';
  const fileType = activeFile ? getFileType(activeFile.name) : 'text';

  // Validation errors
  const validationErrors = useMemo(() => {
    if (!activeFile) return [];
    return validateContent(editedContent, fileType);
  }, [editedContent, fileType, activeFile]);

  // File statistics
  const fileStats = useMemo(() => {
    const lines = editedContent.split('\n').length;
    const chars = editedContent.length;
    const words = editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;
    const keys = countKeys(editedContent, fileType);
    const size = new Blob([editedContent]).size;
    return { lines, chars, words, keys, size };
  }, [editedContent, fileType]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback((file: LoadedFile) => {
    return file.content !== file.originalContent;
  }, []);

  const anyUnsavedChanges = useMemo(() => {
    return openFiles.some(f => hasUnsavedChanges(f));
  }, [openFiles, hasUnsavedChanges]);

  // Update content for active file
  const setEditedContent = useCallback((newContent: string) => {
    if (!activeFileId) return;

    setOpenFiles(prev => prev.map(f =>
      f.id === activeFileId ? { ...f, content: newContent } : f
    ));
  }, [activeFileId]);

  // Initialize history when file opens
  useEffect(() => {
    if (activeFile && !history.has(activeFile.id)) {
      setHistory(prev => new Map(prev).set(activeFile.id, [{ content: activeFile.content, cursorPosition: 0 }]));
      setHistoryIndex(prev => new Map(prev).set(activeFile.id, 0));
    }
  }, [activeFile, history]);

  // Add to history on content change (debounced)
  useEffect(() => {
    if (!activeFile) return;

    const timeoutId = setTimeout(() => {
      const currentHistory = history.get(activeFile.id) || [];
      const currentIndex = historyIndex.get(activeFile.id) || 0;
      const lastState = currentHistory[currentIndex];

      if (lastState && lastState.content !== editedContent) {
        const newHistory = [...currentHistory.slice(0, currentIndex + 1), {
          content: editedContent,
          cursorPosition: textareaRef.current?.selectionStart || 0
        }];
        // Keep last 100 states
        const trimmedHistory = newHistory.slice(-100);
        setHistory(prev => new Map(prev).set(activeFile.id, trimmedHistory));
        setHistoryIndex(prev => new Map(prev).set(activeFile.id, trimmedHistory.length - 1));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editedContent, activeFile, history, historyIndex]);

  // Calculate line height
  useEffect(() => {
    if (textareaRef.current) {
      const computedStyle = window.getComputedStyle(textareaRef.current);
      const lh = parseFloat(computedStyle.lineHeight);
      if (lh) setLineHeight(lh);
    }
  }, [activeFile]);

  // Find matches
  const allMatches = useMemo(() => {
    if (!findTerm || !editedContent) return [];

    try {
      let pattern = findTerm;

      if (!useRegex) {
        pattern = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const matches: number[] = [];
      let match;

      while ((match = regex.exec(editedContent)) !== null) {
        matches.push(match.index);
        // Prevent infinite loop for zero-width matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }

      return matches;
    } catch {
      return [];
    }
  }, [editedContent, findTerm, caseSensitive, useRegex, wholeWord]);

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [findTerm, caseSensitive, useRegex, wholeWord]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'f') {
        e.preventDefault();
        setShowFind(true);
        setTimeout(() => document.getElementById('find-input')?.focus(), 50);
      } else if (modKey && e.key === 'h') {
        e.preventDefault();
        setShowFind(true);
        setTimeout(() => document.getElementById('replace-input')?.focus(), 50);
      } else if (modKey && e.key === 's') {
        e.preventDefault();
        handleDownload();
      } else if (modKey && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        setShowGoToLine(true);
        setTimeout(() => document.getElementById('goto-line-input')?.focus(), 50);
      } else if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((modKey && e.shiftKey && e.key === 'z') || (modKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setShowFind(false);
        setShowGoToLine(false);
        setShowContextMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, history, historyIndex]);

  const handleUndo = () => {
    if (!activeFile) return;
    const currentIndex = historyIndex.get(activeFile.id) || 0;
    const currentHistory = history.get(activeFile.id) || [];

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setHistoryIndex(prev => new Map(prev).set(activeFile.id, newIndex));
      const prevState = currentHistory[newIndex];
      if (prevState) {
        setEditedContent(prevState.content);
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(prevState.cursorPosition, prevState.cursorPosition);
        }, 0);
      }
    }
  };

  const handleRedo = () => {
    if (!activeFile) return;
    const currentIndex = historyIndex.get(activeFile.id) || 0;
    const currentHistory = history.get(activeFile.id) || [];

    if (currentIndex < currentHistory.length - 1) {
      const newIndex = currentIndex + 1;
      setHistoryIndex(prev => new Map(prev).set(activeFile.id, newIndex));
      const nextState = currentHistory[newIndex];
      if (nextState) {
        setEditedContent(nextState.content);
        setTimeout(() => {
          textareaRef.current?.setSelectionRange(nextState.cursorPosition, nextState.cursorPosition);
        }, 0);
      }
    }
  };

  const canUndo = activeFile ? (historyIndex.get(activeFile.id) || 0) > 0 : false;
  const canRedo = activeFile ? (historyIndex.get(activeFile.id) || 0) < ((history.get(activeFile.id) || []).length - 1) : false;

  const processFile = (selectedFile: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const newFile: LoadedFile = {
        id: generateId(),
        name: selectedFile.name,
        originalContent: content,
        content: content,
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    };
    reader.onerror = () => {
      setError('An error occurred while reading the file.');
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => processFile(file));

    if (event.target) event.target.value = '';
  };

  const handleFilesDropped = (files: FileList) => {
    Array.from(files).forEach(file => processFile(file));
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([editedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Mark as saved
    setOpenFiles(prev => prev.map(f =>
      f.id === activeFile.id ? { ...f, originalContent: editedContent } : f
    ));
  };

  const handleCloseFile = (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (file && hasUnsavedChanges(file)) {
      if (!confirm(`"${file.name}" has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    setOpenFiles(prev => prev.filter(f => f.id !== fileId));

    if (activeFileId === fileId) {
      const remaining = openFiles.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }

    // Clean up history
    setHistory(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
    setHistoryIndex(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  };

  const handleBack = () => {
    if (anyUnsavedChanges) {
      if (!confirm('You have unsaved changes. Leave anyway?')) {
        return;
      }
    }
    onBack();
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      if (backdropRef.current) {
        backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  };

  const scrollToLine = (lineNumber: number) => {
    if (!textareaRef.current) return;
    const lines = editedContent.split('\n');
    const targetLine = Math.max(1, Math.min(lineNumber, lines.length));

    let charIndex = 0;
    for (let i = 0; i < targetLine - 1; i++) {
      charIndex += lines[i].length + 1;
    }

    const desiredScrollTop = (targetLine - 1) * lineHeight;
    const textareaHeight = textareaRef.current.clientHeight;
    const centeredScrollTop = desiredScrollTop - (textareaHeight / 2) + (lineHeight / 2);

    textareaRef.current.scrollTop = Math.max(0, centeredScrollTop);
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charIndex, charIndex + lines[targetLine - 1].length);
    handleScroll();
  };

  const scrollToIndex = (charIndex: number) => {
    if (!textareaRef.current) return;
    const textBefore = editedContent.substring(0, charIndex);
    const lineCount = (textBefore.match(/\n/g) || []).length;
    const desiredScrollTop = lineCount * lineHeight;
    const textareaHeight = textareaRef.current.clientHeight;
    const centeredScrollTop = desiredScrollTop - (textareaHeight / 2) + (lineHeight / 2);
    textareaRef.current.scrollTop = Math.max(0, centeredScrollTop);
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
    if (indexToReplace === -1 || textareaRef.current.selectionStart !== allMatches[indexToReplace]) {
      handleFindNext();
      return;
    }

    const start = textareaRef.current.selectionStart;
    const matchLength = useRegex ?
      editedContent.substring(start).match(new RegExp(findTerm, caseSensitive ? '' : 'i'))?.[0]?.length || findTerm.length :
      findTerm.length;

    const newContent = editedContent.substring(0, start) + replaceTerm + editedContent.substring(start + matchLength);
    setEditedContent(newContent);

    setTimeout(() => {
      handleFindNext();
    }, 0);
  };

  const handleReplaceAll = () => {
    if (!findTerm) return;

    try {
      let pattern = findTerm;
      if (!useRegex) {
        pattern = findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      if (wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);

      if (editedContent.match(regex)) {
        const newContent = editedContent.replace(regex, replaceTerm);
        setEditedContent(newContent);
      } else {
        alert(`'${findTerm}' not found.`);
      }
    } catch {
      alert('Invalid regex pattern.');
    }
  };

  const handleGoToLine = () => {
    const lineNum = parseInt(goToLineValue, 10);
    if (!isNaN(lineNum) && lineNum > 0) {
      scrollToLine(lineNum);
      setShowGoToLine(false);
      setGoToLineValue('');
    }
  };

  const handleFormat = () => {
    const formatted = formatContent(editedContent, fileType);
    if (formatted !== editedContent) {
      setEditedContent(formatted);
    }
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCopyLine = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const lines = editedContent.split('\n');
    let charCount = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      charCount += lines[i].length + 1;
    }

    navigator.clipboard.writeText(lines[lineIndex]);
    setShowContextMenu(false);
  };

  const handleDuplicateLine = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const lines = editedContent.split('\n');
    let charCount = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      charCount += lines[i].length + 1;
    }

    const newLines = [...lines];
    newLines.splice(lineIndex + 1, 0, lines[lineIndex]);
    setEditedContent(newLines.join('\n'));
    setShowContextMenu(false);
  };

  const handleDeleteLine = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const lines = editedContent.split('\n');
    let charCount = 0;
    let lineIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      charCount += lines[i].length + 1;
    }

    const newLines = lines.filter((_, i) => i !== lineIndex);
    setEditedContent(newLines.join('\n'));
    setShowContextMenu(false);
  };

  const handleCut = () => {
    document.execCommand('cut');
    setShowContextMenu(false);
  };

  const handleCopy = () => {
    document.execCommand('copy');
    setShowContextMenu(false);
  };

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    document.execCommand('insertText', false, text);
    setShowContextMenu(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  // Line numbers component
  const lineNumbers = useMemo(() => {
    const lines = editedContent.split('\n');
    return lines.map((_, i) => (
      <div key={i} className="text-right pr-3 text-slate-500 select-none" style={{ height: lineHeight }}>
        {i + 1}
      </div>
    ));
  }, [editedContent, lineHeight]);

  // Diff view component
  const renderDiff = () => {
    if (!activeFile) return null;

    const originalLines = activeFile.originalContent.split('\n');
    const currentLines = editedContent.split('\n');

    return (
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-4 border-r border-slate-700">
          <div className="text-xs text-slate-400 mb-2 font-semibold">Original</div>
          <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
            {originalLines.map((line, i) => {
              const isDifferent = currentLines[i] !== line;
              return (
                <div
                  key={i}
                  className={`${isDifferent ? 'bg-rose-500/20 text-rose-300' : ''}`}
                  style={{ minHeight: lineHeight }}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="text-xs text-slate-400 mb-2 font-semibold">Current</div>
          <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap">
            {currentLines.map((line, i) => {
              const isDifferent = originalLines[i] !== line;
              const isNew = i >= originalLines.length;
              return (
                <div
                  key={i}
                  className={`${isDifferent || isNew ? 'bg-emerald-500/20 text-emerald-300' : ''}`}
                  style={{ minHeight: lineHeight }}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    );
  };

  const renderEditor = () => (
    <div className="flex flex-col h-[80vh] md:h-full bg-slate-950 p-6 border-t md:border-t-0 border-slate-800">
      {/* Tab Bar */}
      {openFiles.length > 0 && (
        <div className="flex items-center space-x-1 mb-3 overflow-x-auto pb-2 flex-shrink-0 border-b border-slate-800">
          {openFiles.map(f => (
            <div
              key={f.id}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors group ${f.id === activeFileId
                  ? 'bg-slate-800 text-white border-b-2 border-indigo-500'
                  : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/50'
                }`}
              onClick={() => setActiveFileId(f.id)}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate max-w-[120px]">
                {hasUnsavedChanges(f) && <span className="text-amber-400 mr-1">●</span>}
                {f.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleCloseFile(f.id); }}
                className="p-0.5 rounded hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Open new file"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFind(!showFind)}
            className={`p-2 rounded-lg transition-colors ${showFind ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Find & Replace (Cmd+F)"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-colors ${canUndo ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'}`}
            title="Undo (Cmd+Z)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-colors ${canRedo ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'}`}
            title="Redo (Cmd+Shift+Z)"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-slate-700 mx-1" />
          <button
            onClick={() => setShowGoToLine(true)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
            title="Go to Line (Cmd+G)"
          >
            <Hash className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            title="File Statistics"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className={`p-2 rounded-lg transition-colors ${showDiff ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            title="Toggle Diff View"
          >
            <Columns className="w-5 h-5" />
          </button>
          {(fileType === 'json') && (
            <button
              onClick={handleFormat}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
              title="Format / Prettify"
            >
              <Code className="w-5 h-5" />
            </button>
          )}
          {validationErrors.length > 0 && (
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">{validationErrors.length}</span>
            </button>
          )}
          {validationErrors.length === 0 && activeFile && (
            <div className="flex items-center space-x-1 px-2 py-1 text-emerald-400">
              <Check className="w-4 h-4" />
              <span className="text-xs">Valid</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md shadow-sm hover:bg-slate-700 transition-all"
            title="Upload New File"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings,.json"
            className="hidden"
            multiple
          />
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md shadow-sm hover:bg-slate-700 transition-all"
            title="Download File (Cmd+S)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => activeFile && handleCloseFile(activeFile.id)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Close File"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && (
        <div className="flex items-center space-x-4 mb-3 p-3 bg-slate-800/50 rounded-lg text-sm flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Lines:</span>
            <span className="text-white font-medium">{fileStats.lines.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Characters:</span>
            <span className="text-white font-medium">{fileStats.chars.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Words:</span>
            <span className="text-white font-medium">{fileStats.words.toLocaleString()}</span>
          </div>
          {fileStats.keys > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Keys:</span>
              <span className="text-white font-medium">{fileStats.keys.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Size:</span>
            <span className="text-white font-medium">
              {fileStats.size < 1024
                ? `${fileStats.size} B`
                : `${(fileStats.size / 1024).toFixed(1)} KB`}
            </span>
          </div>
        </div>
      )}

      {/* Errors Panel */}
      {showErrors && validationErrors.length > 0 && (
        <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex-shrink-0 max-h-32 overflow-auto">
          <div className="text-xs font-semibold text-rose-400 mb-2">Validation Errors</div>
          {validationErrors.map((err, i) => (
            <div
              key={i}
              className="text-sm text-rose-300 cursor-pointer hover:bg-rose-500/20 px-2 py-1 rounded"
              onClick={() => scrollToLine(err.line)}
            >
              <span className="text-rose-400 font-mono">Line {err.line}:</span> {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Find & Replace Panel */}
      {showFind && (
        <div className="bg-slate-800/80 p-2 rounded-lg mb-2 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm transition-all duration-300 border border-slate-700/50">
          <div className="flex items-center space-x-2">
            <input
              id="find-input"
              type="text"
              placeholder="Find"
              value={findTerm}
              onChange={(e) => setFindTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFindNext()}
              className="flex-1 text-sm p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white"
            />
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={`p-1.5 rounded-md transition-colors ${caseSensitive ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              title="Case Sensitive"
            >
              <CaseSensitive size={14} />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={`p-1.5 rounded-md transition-colors ${useRegex ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              title="Use Regex"
            >
              <Regex size={14} />
            </button>
            <button
              onClick={() => setWholeWord(!wholeWord)}
              className={`p-1.5 rounded-md transition-colors ${wholeWord ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              title="Whole Word"
            >
              <WholeWord size={14} />
            </button>
            <span className="text-slate-400 text-xs px-1 whitespace-nowrap w-16 text-center">
              {findTerm && allMatches.length > 0 ? `${currentMatchIndex === -1 ? '-' : currentMatchIndex + 1}/${allMatches.length}` : findTerm ? '0' : ''}
            </span>
            <button onClick={handleFindPrev} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Previous match">
              <ChevronUp size={14} />
            </button>
            <button onClick={handleFindNext} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300" title="Next match">
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="replace-input"
              type="text"
              placeholder="Replace"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
              className="flex-1 text-sm p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white"
            />
            <button onClick={handleReplace} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap text-slate-300 text-xs font-medium">Replace</button>
            <button onClick={handleReplaceAll} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md whitespace-nowrap text-slate-300 text-xs font-medium">All</button>
          </div>
        </div>
      )}

      {/* Go to Line Dialog */}
      {showGoToLine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGoToLine(false)}>
          <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="text-sm text-slate-300 mb-2">Go to Line (1 - {fileStats.lines})</div>
            <div className="flex items-center space-x-2">
              <input
                id="goto-line-input"
                type="number"
                min="1"
                max={fileStats.lines}
                value={goToLineValue}
                onChange={(e) => setGoToLineValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGoToLine()}
                className="w-32 text-sm p-2 bg-slate-900 border border-slate-700 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white"
                autoFocus
              />
              <button
                onClick={handleGoToLine}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-md text-white text-sm font-medium"
              >
                Go
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button onClick={handleCut} className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center space-x-2">
            <Scissors className="w-4 h-4" /><span>Cut</span>
          </button>
          <button onClick={handleCopy} className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center space-x-2">
            <Copy className="w-4 h-4" /><span>Copy</span>
          </button>
          <button onClick={handlePaste} className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center space-x-2">
            <ClipboardPaste className="w-4 h-4" /><span>Paste</span>
          </button>
          <div className="h-px bg-slate-700 my-1" />
          <button onClick={handleCopyLine} className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center space-x-2">
            <Copy className="w-4 h-4" /><span>Copy Line</span>
          </button>
          <button onClick={handleDuplicateLine} className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center space-x-2">
            <CopyPlus className="w-4 h-4" /><span>Duplicate Line</span>
          </button>
          <button onClick={handleDeleteLine} className="w-full px-3 py-1.5 text-left text-sm text-rose-400 hover:bg-slate-700 flex items-center space-x-2">
            <Trash2 className="w-4 h-4" /><span>Delete Line</span>
          </button>
        </div>
      )}

      {/* Editor Area */}
      {showDiff ? renderDiff() : (
        <div className="flex-1 flex relative bg-slate-900/50 rounded-lg shadow-inner border border-slate-800 font-mono text-sm leading-6 overflow-hidden">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="w-12 bg-slate-900/80 border-r border-slate-800 overflow-hidden flex-shrink-0 pt-4"
            style={{ lineHeight: `${lineHeight}px` }}
          >
            {lineNumbers}
          </div>

          {/* Backdrop for syntax highlighting */}
          <div
            ref={backdropRef}
            className="absolute left-12 right-0 top-0 bottom-0 p-4 overflow-auto pointer-events-none whitespace-pre-wrap break-words text-slate-300 custom-scrollbar"
          >
            <SyntaxHighlight
              content={editedContent}
              fileType={fileType}
              findTerm={findTerm}
              matches={allMatches}
              currentMatchIndex={currentMatchIndex}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onScroll={handleScroll}
            onContextMenu={handleContextMenu}
            className="flex-1 p-4 bg-transparent text-transparent caret-white resize-none focus:outline-none custom-scrollbar"
            style={{ fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}
            spellCheck="false"
            aria-label="File content editor"
          />
        </div>
      )}
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
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.strings</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.xml</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.json</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono border border-slate-700">.xcstrings</span>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".strings,.stringsdict,.xml,.localizable,.properties,.xcstrings,.json"
          className="hidden"
          multiple
        />
      </DragDropZone>
      {error && <p className="text-sm text-rose-400 mt-6 bg-rose-500/10 px-6 py-3 rounded-xl border border-rose-500/20 animate-in fade-in slide-in-from-bottom-2">{error}</p>}
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={handleBack}
          className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            File Editor
          </h1>
          <p className="text-slate-400 text-sm">Edit localization files with syntax highlighting & validation</p>
        </div>
        {anyUnsavedChanges && (
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-sm font-medium">Unsaved changes</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:overflow-hidden">
        {openFiles.length > 0 ? renderEditor() : renderUploadPrompt()}
      </div>
    </div>
  );
};
