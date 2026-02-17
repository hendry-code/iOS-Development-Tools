import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, X, Download, Search, Upload, ChevronUp, ChevronDown,
  CaseSensitive, Regex, WholeWord, RotateCcw, RotateCw, Info,
  AlertTriangle, Check, Code, Columns, FileText, Plus, Hash,
  Copy, Scissors, Trash2, ClipboardPaste, CopyPlus, Languages, CheckSquare, Square, Zap, Loader2
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

// Large file threshold — files above this size activate performance mode
const LARGE_FILE_THRESHOLD = 512 * 1024; // 512 KB

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

// Check if file is .xcstrings
const isXcstringsFile = (filename: string): boolean => {
  return filename.endsWith('.xcstrings');
};

// Extract all unique language codes from xcstrings JSON content
const extractXcstringsLanguages = (content: string): { languages: string[]; sourceLanguage: string } => {
  try {
    const parsed = JSON.parse(content);
    const sourceLanguage = parsed.sourceLanguage || 'en';
    const languageSet = new Set<string>();

    if (parsed.strings && typeof parsed.strings === 'object') {
      for (const key of Object.keys(parsed.strings)) {
        const localizations = parsed.strings[key]?.localizations;
        if (localizations && typeof localizations === 'object') {
          for (const lang of Object.keys(localizations)) {
            languageSet.add(lang);
          }
        }
      }
    }

    const languages = Array.from(languageSet).sort((a, b) => {
      // Source language always first
      if (a === sourceLanguage) return -1;
      if (b === sourceLanguage) return 1;
      return a.localeCompare(b);
    });

    return { languages, sourceLanguage };
  } catch {
    return { languages: [], sourceLanguage: 'en' };
  }
};

// Get display name for a language code
const getLanguageDisplayName = (code: string): string => {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
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
  const [diffPreparing, setDiffPreparing] = useState(false);
  const [diffResult, setDiffResult] = useState<{ type: 'add' | 'remove' | 'unchanged'; originalLine?: string; currentLine?: string; originalNum?: number; currentNum?: number }[] | null>(null);
  const diffLeftRef = useRef<HTMLDivElement>(null);
  const diffRightRef = useRef<HTMLDivElement>(null);
  const [diffSyncingScroll, setDiffSyncingScroll] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showErrors, setShowErrors] = useState(false);

  // Delete Languages state
  const [showDeleteLanguages, setShowDeleteLanguages] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [deletionProgress, setDeletionProgress] = useState<number | null>(null); // null = not deleting

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; percent: number; size: number } | null>(null);

  // Undo/Redo state
  const [history, setHistory] = useState<Map<string, HistoryState[]>>(new Map());
  const [historyIndex, setHistoryIndex] = useState<Map<string, number>>(new Map());

  // Get active file
  const activeFile = useMemo(() => {
    return openFiles.find(f => f.id === activeFileId) || null;
  }, [openFiles, activeFileId]);

  const editedContent = activeFile?.content || '';
  const fileType = activeFile ? getFileType(activeFile.name) : 'text';
  const isLargeFile = editedContent.length > LARGE_FILE_THRESHOLD;

  // Scroll tracking for virtualized line numbers
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const [editorHeight, setEditorHeight] = useState(600);

  // Debounced validation/stats state for large files
  const [debouncedValidationErrors, setDebouncedValidationErrors] = useState<ValidationError[]>([]);
  const [debouncedFileStats, setDebouncedFileStats] = useState({ lines: 0, chars: 0, words: 0, keys: 0, size: 0 });

  // Validation errors — synchronous for small files, debounced for large
  const syncValidationErrors = useMemo(() => {
    if (isLargeFile || !activeFile) return [];
    return validateContent(editedContent, fileType);
  }, [editedContent, fileType, activeFile, isLargeFile]);

  useEffect(() => {
    if (!isLargeFile || !activeFile) {
      setDebouncedValidationErrors([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      setDebouncedValidationErrors(validateContent(editedContent, fileType));
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [editedContent, fileType, activeFile, isLargeFile]);

  const validationErrors = isLargeFile ? debouncedValidationErrors : syncValidationErrors;

  // File statistics — synchronous for small files, debounced for large
  const syncFileStats = useMemo(() => {
    if (isLargeFile) return { lines: 0, chars: 0, words: 0, keys: 0, size: 0 };
    const lines = editedContent.split('\n').length;
    const chars = editedContent.length;
    const words = editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;
    const keys = countKeys(editedContent, fileType);
    const size = new Blob([editedContent]).size;
    return { lines, chars, words, keys, size };
  }, [editedContent, fileType, isLargeFile]);

  useEffect(() => {
    if (!isLargeFile) {
      setDebouncedFileStats(syncFileStats);
      return;
    }
    const timeoutId = setTimeout(() => {
      const lines = editedContent.split('\n').length;
      const chars = editedContent.length;
      const words = editedContent.trim() ? editedContent.trim().split(/\s+/).length : 0;
      // Skip deep key counting for large files — too expensive
      const size = new Blob([editedContent]).size;
      setDebouncedFileStats({ lines, chars, words, keys: 0, size });
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [editedContent, isLargeFile, syncFileStats]);

  const fileStats = isLargeFile ? debouncedFileStats : syncFileStats;

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

  // Add to history on content change (debounced — longer delay for large files)
  useEffect(() => {
    if (!activeFile) return;

    const debounceMs = isLargeFile ? 1500 : 500;
    const maxHistory = isLargeFile ? 20 : 100;

    const timeoutId = setTimeout(() => {
      const currentHistory = history.get(activeFile.id) || [];
      const currentIndex = historyIndex.get(activeFile.id) || 0;
      const lastState = currentHistory[currentIndex];

      if (lastState && lastState.content !== editedContent) {
        const newHistory = [...currentHistory.slice(0, currentIndex + 1), {
          content: editedContent,
          cursorPosition: textareaRef.current?.selectionStart || 0
        }];
        const trimmedHistory = newHistory.slice(-maxHistory);
        setHistory(prev => new Map(prev).set(activeFile.id, trimmedHistory));
        setHistoryIndex(prev => new Map(prev).set(activeFile.id, trimmedHistory.length - 1));
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [editedContent, activeFile, history, historyIndex, isLargeFile]);

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
        setShowDeleteLanguages(false);
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

    // Track upload progress for larger files
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress({ fileName: selectedFile.name, percent, size: e.total });
      }
    };

    reader.onloadstart = () => {
      setUploadProgress({ fileName: selectedFile.name, percent: 0, size: selectedFile.size });
    };

    reader.onload = () => {
      const content = reader.result as string;
      const newFile: LoadedFile = {
        id: generateId(),
        name: selectedFile.name,
        originalContent: content,
        content: content,
      };
      setUploadProgress(prev => prev ? { ...prev, percent: 100 } : null);
      // Brief delay to show 100% before clearing
      setTimeout(() => {
        setOpenFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
        setUploadProgress(null);
      }, 300);
    };
    reader.onerror = () => {
      setError('An error occurred while reading the file.');
      setUploadProgress(null);
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
      const { scrollTop, clientHeight } = textareaRef.current;

      // Track scroll position for virtualized line numbers
      setEditorScrollTop(scrollTop);
      setEditorHeight(clientHeight);

      if (!isLargeFile && backdropRef.current) {
        backdropRef.current.scrollTop = scrollTop;
        backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
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

  // Xcstrings language info (memoized)
  const xcstringsInfo = useMemo(() => {
    if (!activeFile || !isXcstringsFile(activeFile.name)) return null;
    return extractXcstringsLanguages(editedContent);
  }, [activeFile, editedContent]);

  // Delete Languages handlers
  const handleOpenDeleteLanguages = () => {
    setSelectedLanguages(new Set());
    setDeletionComplete(false);
    setDeletedCount(0);
    setShowDeleteLanguages(true);
  };

  const handleToggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => {
      const next = new Set(prev);
      if (next.has(lang)) {
        next.delete(lang);
      } else {
        next.add(lang);
      }
      return next;
    });
  };

  const handleSelectAllLanguages = () => {
    if (!xcstringsInfo) return;
    const nonSource = xcstringsInfo.languages.filter(l => l !== xcstringsInfo.sourceLanguage);
    if (selectedLanguages.size === nonSource.length) {
      setSelectedLanguages(new Set());
    } else {
      setSelectedLanguages(new Set(nonSource));
    }
  };

  const handleDeleteLanguages = () => {
    if (!activeFile || selectedLanguages.size === 0) return;

    try {
      const parsed = JSON.parse(editedContent);

      if (parsed.strings && typeof parsed.strings === 'object') {
        const allKeys = Object.keys(parsed.strings);
        const totalKeys = allKeys.length;
        let processedKeys = 0;

        setDeletionProgress(0);

        // Process deletion in chunks to allow progress updates
        const chunkSize = Math.max(1, Math.floor(totalKeys / 20));

        const processChunk = (startIdx: number) => {
          const endIdx = Math.min(startIdx + chunkSize, totalKeys);

          for (let i = startIdx; i < endIdx; i++) {
            const localizations = parsed.strings[allKeys[i]]?.localizations;
            if (localizations && typeof localizations === 'object') {
              for (const lang of selectedLanguages) {
                delete localizations[lang];
              }
            }
            processedKeys++;
          }

          const percent = Math.round((processedKeys / totalKeys) * 100);
          setDeletionProgress(percent);

          if (endIdx < totalKeys) {
            // Schedule next chunk
            requestAnimationFrame(() => processChunk(endIdx));
          } else {
            // All done — finalize
            setTimeout(() => {
              const updatedJson = JSON.stringify(parsed, null, 2);
              setEditedContent(updatedJson);
              setDeletedCount(selectedLanguages.size);
              setDeletionProgress(null);
              setDeletionComplete(true);
            }, 200);
          }
        };

        // Start chunked processing
        requestAnimationFrame(() => processChunk(0));
      } else {
        setDeletionProgress(null);
        setDeletionComplete(true);
        setDeletedCount(selectedLanguages.size);
      }
    } catch {
      setError('Failed to parse xcstrings file for language deletion.');
      setDeletionProgress(null);
      setShowDeleteLanguages(false);
    }
  };

  const handleDownloadAndClose = () => {
    handleDownload();
    setShowDeleteLanguages(false);
    setDeletionComplete(false);
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

  // Line numbers component — virtualized for large files
  const totalLineCount = useMemo(() => {
    return editedContent.split('\n').length;
  }, [editedContent]);

  const lineNumbers = useMemo(() => {
    if (!isLargeFile) {
      // Small files: render all line numbers directly
      return (
        <>
          {Array.from({ length: totalLineCount }, (_, i) => (
            <div key={i} className="text-right pr-3 text-slate-500 select-none" style={{ height: lineHeight }}>
              {i + 1}
            </div>
          ))}
        </>
      );
    }

    // Large files: only render visible lines + buffer
    const buffer = 30;
    const firstVisible = Math.max(0, Math.floor(editorScrollTop / lineHeight) - buffer);
    const visibleCount = Math.ceil(editorHeight / lineHeight) + buffer * 2;
    const lastVisible = Math.min(totalLineCount - 1, firstVisible + visibleCount);
    const totalHeight = totalLineCount * lineHeight;

    return (
      <div style={{ height: totalHeight, position: 'relative' }}>
        {Array.from({ length: lastVisible - firstVisible + 1 }, (_, idx) => {
          const lineNum = firstVisible + idx;
          return (
            <div
              key={lineNum}
              className="text-right pr-3 text-slate-500 select-none"
              style={{ height: lineHeight, position: 'absolute', top: lineNum * lineHeight, right: 0, left: 0 }}
            >
              {lineNum + 1}
            </div>
          );
        })}
      </div>
    );
  }, [editedContent, lineHeight, isLargeFile, editorScrollTop, editorHeight, totalLineCount]);

  // Diff view — fast index-based comparison + virtualized rendering
  const [diffScrollTop, setDiffScrollTop] = useState(0);
  const [diffContainerHeight, setDiffContainerHeight] = useState(600);
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0, unchanged: 0 });

  const computeDiff = useCallback(() => {
    if (!activeFile) return;
    setDiffPreparing(true);
    setShowDiff(true);

    // Use requestAnimationFrame to let the loader paint first
    requestAnimationFrame(() => {
      setTimeout(() => {
        const originalLines = activeFile.originalContent.split('\n');
        const currentLines = editedContent.split('\n');
        const maxLen = Math.max(originalLines.length, currentLines.length);

        // Fast O(n) index-based comparison — no LCS needed
        type DiffLine = { type: 'unchanged' | 'modified' | 'added' | 'removed'; originalNum: number; currentNum: number; originalText: string; currentText: string };
        const lines: DiffLine[] = [];
        let added = 0, removed = 0, unchanged = 0;

        for (let i = 0; i < maxLen; i++) {
          const oLine = i < originalLines.length ? originalLines[i] : undefined;
          const cLine = i < currentLines.length ? currentLines[i] : undefined;

          if (oLine !== undefined && cLine !== undefined) {
            if (oLine === cLine) {
              lines.push({ type: 'unchanged', originalNum: i + 1, currentNum: i + 1, originalText: oLine, currentText: cLine });
              unchanged++;
            } else {
              lines.push({ type: 'modified', originalNum: i + 1, currentNum: i + 1, originalText: oLine, currentText: cLine });
              added++; removed++;
            }
          } else if (oLine !== undefined) {
            lines.push({ type: 'removed', originalNum: i + 1, currentNum: -1, originalText: oLine, currentText: '' });
            removed++;
          } else if (cLine !== undefined) {
            lines.push({ type: 'added', originalNum: -1, currentNum: i + 1, originalText: '', currentText: cLine });
            added++;
          }
        }

        setDiffResult(lines as any);
        setDiffStats({ added, removed, unchanged });
        setDiffPreparing(false);
      }, 30);
    });
  }, [activeFile, editedContent]);

  // Toggle diff with async compute
  const toggleDiff = useCallback(() => {
    if (showDiff) {
      setShowDiff(false);
      setDiffResult(null);
      setDiffPreparing(false);
    } else {
      computeDiff();
    }
  }, [showDiff, computeDiff]);

  // Sync scroll between diff panels
  const handleDiffScroll = useCallback((source: 'left' | 'right') => {
    if (diffSyncingScroll) return;
    setDiffSyncingScroll(true);
    const from = source === 'left' ? diffLeftRef.current : diffRightRef.current;
    const to = source === 'left' ? diffRightRef.current : diffLeftRef.current;
    if (from && to) {
      to.scrollTop = from.scrollTop;
      to.scrollLeft = from.scrollLeft;
      setDiffScrollTop(from.scrollTop);
      // Measure container height on first scroll
      if (diffContainerHeight !== from.clientHeight) {
        setDiffContainerHeight(from.clientHeight);
      }
    }
    requestAnimationFrame(() => setDiffSyncingScroll(false));
  }, [diffSyncingScroll, diffContainerHeight]);

  // Diff view component with virtualized rendering
  const renderDiff = () => {
    if (!activeFile) return null;

    // Loading state
    if (diffPreparing || !diffResult) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-800">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Preparing diff view...</p>
          </div>
        </div>
      );
    }

    const totalLines = diffResult.length;
    const rowHeight = lineHeight || 24;

    // Virtualization: only render visible lines + buffer
    const bufferLines = 20;
    const startLine = Math.max(0, Math.floor(diffScrollTop / rowHeight) - bufferLines);
    const visibleCount = Math.ceil(diffContainerHeight / rowHeight) + bufferLines * 2;
    const endLine = Math.min(totalLines, startLine + visibleCount);

    const topSpacerHeight = startLine * rowHeight;
    const bottomSpacerHeight = Math.max(0, (totalLines - endLine) * rowHeight);
    const visibleLines = diffResult.slice(startLine, endLine) as { type: 'unchanged' | 'modified' | 'added' | 'removed'; originalNum: number; currentNum: number; originalText: string; currentText: string }[];

    return (
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-slate-800">
        {/* Diff Stats Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/70 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-slate-400 font-medium">Changes:</span>
            {diffStats.added > 0 && <span className="text-emerald-400 font-semibold">+{diffStats.added} added</span>}
            {diffStats.removed > 0 && <span className="text-rose-400 font-semibold">−{diffStats.removed} removed</span>}
            <span className="text-slate-500">{diffStats.unchanged} unchanged</span>
          </div>
          {diffStats.added === 0 && diffStats.removed === 0 && (
            <span className="text-xs text-slate-500 italic">No changes detected</span>
          )}
        </div>

        {/* Diff Panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Original Panel */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-700">
            <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original</span>
            </div>
            <div
              ref={diffLeftRef}
              className="flex-1 overflow-auto font-mono text-sm custom-scrollbar"
              onScroll={() => handleDiffScroll('left')}
            >
              <div style={{ height: topSpacerHeight }} />
              {visibleLines.map((line, vi) => {
                const i = startLine + vi;
                const isRemoved = line.type === 'removed';
                const isModified = line.type === 'modified';
                const isAdded = line.type === 'added';
                return (
                  <div
                    key={i}
                    className={`flex ${isRemoved || isModified ? 'bg-rose-500/15' : isAdded ? 'bg-emerald-500/5' : ''}`}
                    style={{ height: rowHeight }}
                  >
                    <div className={`w-12 text-right pr-3 select-none flex-shrink-0 border-r border-slate-800 ${isRemoved || isModified ? 'text-rose-400/60' : isAdded ? 'text-slate-600' : 'text-slate-500'}`} style={{ lineHeight: `${rowHeight}px` }}>
                      {line.originalNum > 0 ? line.originalNum : ' '}
                    </div>
                    <div className="w-6 flex items-center justify-center flex-shrink-0" style={{ lineHeight: `${rowHeight}px` }}>
                      {(isRemoved || isModified) && <span className="text-xs font-bold text-rose-400">−</span>}
                    </div>
                    <div className={`flex-1 px-3 whitespace-pre overflow-hidden text-ellipsis ${isRemoved || isModified ? 'text-rose-300' : isAdded ? 'text-slate-600' : 'text-slate-300'}`} style={{ lineHeight: `${rowHeight}px` }}>
                      {line.originalText || ' '}
                    </div>
                  </div>
                );
              })}
              <div style={{ height: bottomSpacerHeight }} />
            </div>
          </div>

          {/* Current Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current</span>
            </div>
            <div
              ref={diffRightRef}
              className="flex-1 overflow-auto font-mono text-sm custom-scrollbar"
              onScroll={() => handleDiffScroll('right')}
            >
              <div style={{ height: topSpacerHeight }} />
              {visibleLines.map((line, vi) => {
                const i = startLine + vi;
                const isAdded = line.type === 'added';
                const isModified = line.type === 'modified';
                const isRemoved = line.type === 'removed';
                return (
                  <div
                    key={i}
                    className={`flex ${isAdded || isModified ? 'bg-emerald-500/15' : isRemoved ? 'bg-rose-500/5' : ''}`}
                    style={{ height: rowHeight }}
                  >
                    <div className={`w-12 text-right pr-3 select-none flex-shrink-0 border-r border-slate-800 ${isAdded || isModified ? 'text-emerald-400/60' : isRemoved ? 'text-slate-600' : 'text-slate-500'}`} style={{ lineHeight: `${rowHeight}px` }}>
                      {line.currentNum > 0 ? line.currentNum : ' '}
                    </div>
                    <div className="w-6 flex items-center justify-center flex-shrink-0" style={{ lineHeight: `${rowHeight}px` }}>
                      {(isAdded || isModified) && <span className="text-xs font-bold text-emerald-400">+</span>}
                    </div>
                    <div className={`flex-1 px-3 whitespace-pre overflow-hidden text-ellipsis ${isAdded || isModified ? 'text-emerald-300' : isRemoved ? 'text-slate-600' : 'text-slate-300'}`} style={{ lineHeight: `${rowHeight}px` }}>
                      {line.currentText || ' '}
                    </div>
                  </div>
                );
              })}
              <div style={{ height: bottomSpacerHeight }} />
            </div>
          </div>
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
            onClick={toggleDiff}
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
          {activeFile && isXcstringsFile(activeFile.name) && (
            <>
              <div className="h-6 w-px bg-slate-700 mx-1" />
              <button
                onClick={handleOpenDeleteLanguages}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors border border-rose-500/20"
                title="Delete Languages"
              >
                <Languages className="w-4 h-4" />
                <span className="text-xs font-medium">Delete Languages</span>
              </button>
            </>
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

      {/* Delete Languages Modal */}
      {showDeleteLanguages && xcstringsInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { if (!deletionComplete) setShowDeleteLanguages(false); }}>
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-rose-500/15 rounded-xl flex items-center justify-center">
                  <Languages className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Languages</h3>
                  <p className="text-xs text-slate-400">{activeFile?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteLanguages(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!deletionComplete ? (
              <>
                {/* Select All / Count */}
                <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 border-b border-slate-700/50">
                  <button
                    onClick={handleSelectAllLanguages}
                    className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    {selectedLanguages.size === xcstringsInfo.languages.filter(l => l !== xcstringsInfo.sourceLanguage).length && selectedLanguages.size > 0
                      ? <CheckSquare className="w-4 h-4 text-indigo-400" />
                      : <Square className="w-4 h-4 text-slate-500" />}
                    <span>Select All</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    {xcstringsInfo.languages.length} language{xcstringsInfo.languages.length !== 1 ? 's' : ''} found
                    {selectedLanguages.size > 0 && <span className="text-rose-400 ml-2">({selectedLanguages.size} selected)</span>}
                  </span>
                </div>

                {/* Language List */}
                <div className="max-h-80 overflow-y-auto px-2 py-2 custom-scrollbar">
                  {xcstringsInfo.languages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Languages className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No languages found in this file.</p>
                    </div>
                  ) : (
                    xcstringsInfo.languages.map(lang => {
                      const isSource = lang === xcstringsInfo.sourceLanguage;
                      const isSelected = selectedLanguages.has(lang);
                      return (
                        <div
                          key={lang}
                          onClick={() => !isSource && handleToggleLanguage(lang)}
                          className={`flex items-center justify-between px-4 py-3 mx-2 mb-1 rounded-xl transition-all cursor-pointer ${isSource
                            ? 'bg-slate-700/30 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/20'
                              : 'hover:bg-slate-700/50 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center space-x-3">
                            {isSource ? (
                              <div className="w-5 h-5 rounded bg-slate-600/50 flex items-center justify-center">
                                <Check className="w-3 h-3 text-slate-500" />
                              </div>
                            ) : isSelected ? (
                              <CheckSquare className="w-5 h-5 text-rose-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500" />
                            )}
                            <div>
                              <span className="font-mono text-sm font-semibold text-white">{lang}</span>
                              <span className="text-slate-400 text-sm ml-2">{getLanguageDisplayName(lang)}</span>
                            </div>
                          </div>
                          {isSource && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                              Source
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer / Delete Button */}
                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Source language cannot be deleted</p>
                  <button
                    onClick={handleDeleteLanguages}
                    disabled={selectedLanguages.size === 0 || deletionProgress !== null}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedLanguages.size > 0 && deletionProgress === null
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedLanguages.size > 0 ? `(${selectedLanguages.size})` : ''}</span>
                  </button>
                </div>

                {/* Deletion Progress Overlay */}
                {deletionProgress !== null && (
                  <div className="absolute inset-0 bg-slate-800/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10 p-8">
                    <Loader2 className="w-10 h-10 text-rose-400 animate-spin mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Deleting Languages...</h4>
                    <p className="text-sm text-slate-400 mb-5">
                      Removing {selectedLanguages.size} language{selectedLanguages.size !== 1 ? 's' : ''} from all keys
                    </p>
                    <div className="w-full max-w-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Progress</span>
                        <span className="text-xs font-mono text-rose-400 font-bold">{deletionProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-200 ease-out"
                          style={{ width: `${deletionProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Post-Deletion Success View */
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Languages Deleted</h4>
                <p className="text-slate-400 text-sm mb-6">
                  Successfully removed {deletedCount} language{deletedCount !== 1 ? 's' : ''} from the file.
                </p>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setShowDeleteLanguages(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
                  >
                    Continue Editing
                  </button>
                  <button
                    onClick={handleDownloadAndClose}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Updated File</span>
                  </button>
                </div>
              </div>
            )}
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
        <div className="flex-1 flex bg-slate-900/50 rounded-lg shadow-inner border border-slate-800 font-mono text-sm leading-6 overflow-hidden">
          {/* Line Numbers */}
          <div
            ref={lineNumbersRef}
            className="w-12 bg-slate-900/80 border-r border-slate-800 overflow-hidden flex-shrink-0 pt-4"
            style={{ lineHeight: `${lineHeight}px` }}
          >
            {lineNumbers}
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Textarea — always visible text, no syntax highlighting overlay */}
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onScroll={handleScroll}
              onContextMenu={handleContextMenu}
              className="absolute inset-0 w-full h-full p-4 bg-transparent text-slate-300 caret-white resize-none focus:outline-none custom-scrollbar whitespace-pre"
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                letterSpacing: 'normal',
                wordSpacing: 'normal',
                tabSize: 2,
                border: 'none',
                outline: 'none',
              }}
              spellCheck="false"
              wrap="off"
              aria-label="File content editor"
            />
          </div>
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

      {/* Upload Progress Overlay */}
      {uploadProgress && (
        <div className="mt-6 w-full max-w-md">
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                {uploadProgress.percent < 100
                  ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  : <Check className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{uploadProgress.fileName}</p>
                <p className="text-xs text-slate-400">
                  {uploadProgress.percent < 100 ? 'Loading file...' : 'Complete!'}
                  {' · '}
                  {uploadProgress.size < 1024
                    ? `${uploadProgress.size} B`
                    : uploadProgress.size < 1024 * 1024
                      ? `${(uploadProgress.size / 1024).toFixed(1)} KB`
                      : `${(uploadProgress.size / 1024 / 1024).toFixed(1)} MB`}
                </p>
              </div>
              <span className="text-sm font-mono font-bold text-indigo-400">{uploadProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${uploadProgress.percent < 100
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  }`}
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

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
