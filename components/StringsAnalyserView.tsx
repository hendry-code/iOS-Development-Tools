
import React, { useState, useRef } from 'react';
import { ArrowLeft, Languages, AlertCircle, CheckCircle, AlertTriangle, Copy, FileText, Search, Upload, X, Trash2, ScanSearch, Calculator, Download } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import { LanguageFile } from '../types';
import { analyzeStrings, StringsAnalysisResult } from '../services/stringsAnalyser';
import { calculateTotalWords, WordCountResult, FileWordCount } from '../services/wordCounter';

interface StringsAnalyserViewProps {
    onBack: () => void;
}

const guessLangCode = (fileName: string): string => {
    const name = fileName.toLowerCase().replace(/\.(strings|stringsdict|xcstrings|xml)$/, '');
    const lprojMatch = name.match(/([a-z]{2,3}(-[a-z0-9]+)?)\.lproj/);
    if (lprojMatch) return lprojMatch[1];
    const simpleMatch = name.match(/^[a-z]{2,3}(-[a-z0-9]+)?$/);
    if (simpleMatch) return simpleMatch[0];
    return '';
}

const readFile = (file: File): Promise<LanguageFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            content: reader.result as string,
            langCode: guessLangCode(file.name),
        });
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

export const StringsAnalyserView: React.FC<StringsAnalyserViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<LanguageFile[]>([]);
    const [result, setResult] = useState<StringsAnalysisResult | null>(null);
    const [wordCountResult, setWordCountResult] = useState<WordCountResult | null>(null);
    const [activeTab, setActiveTab] = useState<'languages' | 'duplicates' | 'wordcount'>('languages');

    // File Selection State
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectedPendingFiles, setSelectedPendingFiles] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const handleFilesChange = (newFiles: LanguageFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            const analysis = analyzeStrings(newFiles);
            setResult(analysis);
            const wordEffect = calculateTotalWords(newFiles);
            setWordCountResult(wordEffect);
        } else {
            setResult(null);
            setWordCountResult(null);
        }
    };

    const processFiles = async (selectedFiles: File[] | FileList | null) => {
        if (!selectedFiles) return;
        const fileList = Array.isArray(selectedFiles) ? selectedFiles : Array.from(selectedFiles);
        if (fileList.length === 0) return;

        try {
            const promises = fileList.map(readFile);
            const newlyReadFiles = await Promise.all(promises);
            const existingFileNames = new Set(files.map(f => f.name));
            const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));

            if (uniqueNewFiles.length > 0) {
                handleFilesChange([...files, ...uniqueNewFiles]);
            }
        } catch (err) {
            console.error("Error reading files", err);
        }
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        await processFiles(event.target.files);
        if (event.target) event.target.value = '';
    };

    const handleFilesDropped = async (droppedFiles: FileList | File[]) => { // Updated type to accept File[] from DragDropZone
        const fileList = Array.isArray(droppedFiles) ? droppedFiles : Array.from(droppedFiles);
        // Filter for supported types
        const relevantFiles = fileList.filter(f =>
            f.name.endsWith('.xcstrings') ||
            f.name.endsWith('.xml') ||
            f.name.endsWith('.xliff')
        );

        if (relevantFiles.length === 0) return;

        // Logic: If it looks like a folder drop (multiple files or explicit folder structure) or just many files,
        // let the user confirm. 
        // Specifically for .xcloc, we definitely want to show what we found.
        // If just 1 file, maybe auto-add? 
        // Let's assume if > 1 we show the modal to be safe and precise.

        if (relevantFiles.length > 1) {
            setPendingFiles(relevantFiles);
            setSelectedPendingFiles(new Set(relevantFiles.map(f => f.name))); // Select all by default
            setShowSelectionModal(true);
        } else {
            await processFiles(relevantFiles);
        }
    };

    const handleConfirmSelection = async () => {
        const filesToProcess = pendingFiles.filter(f => selectedPendingFiles.has(f.name));
        setShowSelectionModal(false);
        setPendingFiles([]);
        await processFiles(filesToProcess);
    };

    const togglePendingFile = (name: string) => {
        const newSet = new Set(selectedPendingFiles);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setSelectedPendingFiles(newSet);
    };

    const removeFile = (name: string) => {
        handleFilesChange(files.filter(f => f.name !== name));
    };

    const clearAll = () => {
        handleFilesChange([]);
    }

    const handleDownloadReport = () => {
        if (!result) return;
        const report = {
            summary: {
                totalKeys: result.totalKeys,
                totalLanguages: result.totalLanguages,
                totalDuplicates: result.duplicates.length,
                totalLooseDuplicates: result.looseDuplicates.length,
                totalWords: wordCountResult?.totalWords || 0
            },
            languages: result.languages,
            duplicates: result.duplicates,
            looseDuplicates: result.looseDuplicates,
            wordCounts: wordCountResult?.fileCounts
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'strings-analysis-report.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans relative">
            {/* Modal for File Selection */}
            {showSelectionModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white flex items-center">
                                <ScanSearch className="mr-3 text-indigo-400" size={24} />
                                Select Files to Import
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                We found multiple supported files. Select which ones you want to analyze.
                            </p>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                            {pendingFiles.map(file => (
                                <div
                                    key={file.name}
                                    onClick={() => togglePendingFile(file.name)}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors border mb-1 ${selectedPendingFiles.has(file.name)
                                        ? 'bg-indigo-600/20 border-indigo-500/50'
                                        : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-700/50'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${selectedPendingFiles.has(file.name)
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-slate-500'
                                        }`}>
                                        {selectedPendingFiles.has(file.name) && <CheckCircle size={14} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center">
                                            <FileText size={14} className="mr-2 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-200 truncate">{file.name}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 ml-6">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-700 flex justify-end space-x-3 bg-slate-800/50 rounded-b-2xl">
                            <button
                                onClick={() => { setShowSelectionModal(false); setPendingFiles([]); }}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSelection}
                                disabled={selectedPendingFiles.size === 0}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Import {selectedPendingFiles.size} Files
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                    aria-label="Go back"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        Strings Analyser
                    </h1>
                    <p className="text-slate-400 text-sm">Detailed analysis for .xcstrings, .xml, .xcloc (xliff)</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
                {/* Left Panel: Input */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-visible md:overflow-y-auto bg-slate-900/50 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Input Files
                        </h2>
                        {files.length > 0 && (
                            <button onClick={clearAll} className="text-xs text-rose-400 hover:text-rose-300 flex items-center">
                                <Trash2 size={12} className="mr-1" /> Clear
                            </button>
                        )}
                    </div>

                    <DragDropZone
                        onFilesDropped={handleFilesDropped as any} // Cast to any or fix prop type in DragDropZone, but we updated implementation
                        className="flex-shrink-0 mb-4"
                        isDraggingClass="border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/50"
                    >
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 transition-all hover:border-slate-600 hover:bg-slate-800/30 flex flex-col items-center justify-center text-center cursor-pointer min-h-[200px]"
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                accept=".xcstrings,.xml,.xliff"
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                {...({ webkitdirectory: "", directory: "" } as any)}
                            />
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <Upload size={24} className="text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-200 mb-1">Upload Files</h3>
                            <p className="text-sm text-slate-500 max-w-[200px] mb-4">
                                Drag & drop .xcstrings, .xml files or .xcloc folders
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    folderInputRef.current?.click();
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30 transition-all"
                            >
                                Upload
                            </button>
                        </div>
                    </DragDropZone>

                    {/* File List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {files.map(file => (
                            <div key={file.name} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all group">
                                <div className="flex items-center overflow-hidden">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0 ${file.name.endsWith('.xcstrings') ? 'bg-purple-500/20 text-purple-400' :
                                        file.name.endsWith('.xliff') ? 'bg-indigo-500/20 text-indigo-400' :
                                            'bg-orange-500/20 text-orange-400'
                                        }`}>
                                        <FileText size={16} />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-slate-200 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-slate-500">{file.content.length.toLocaleString()} bytes</p>
                                    </div>
                                </div>
                                <button onClick={() => removeFile(file.name)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Analysis Report */}
                <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 border-t md:border-t-0 border-slate-800">
                    {!result ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <ScanSearch size={64} className="mb-4" />
                            <p className="text-xl font-light">Upload files to generate analysis</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={handleDownloadReport}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm font-bold text-slate-200 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={16} />
                                    <span>Export Report</span>
                                </button>
                            </div>
                            {/* Summary Cards */}
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-slate-400 text-sm font-medium">Total Keys</h3>
                                            <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                                <FileText size={16} />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-white tracking-tight">{result.totalKeys}</p>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">Across all files</div>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-slate-400 text-sm font-medium">Languages</h3>
                                            <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                                                <Languages size={16} />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-white tracking-tight">{result.totalLanguages}</p>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">Target locales</div>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-slate-400 text-sm font-medium">
                                                {activeTab === 'wordcount' ? 'Translated Words' : 'Translated Keys'}
                                            </h3>
                                            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                                                <CheckCircle size={16} />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-white tracking-tight">
                                            {activeTab === 'wordcount' && wordCountResult
                                                ? wordCountResult.translated.toLocaleString()
                                                : result.languages.reduce((acc, l) => acc + l.translatedCount, 0).toLocaleString()
                                            }
                                        </p>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        {activeTab === 'wordcount' ? 'Total translated words' : 'Total translated keys'}
                                    </div>
                                </div>

                                <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-slate-400 text-sm font-medium">
                                                {activeTab === 'wordcount' ? 'Pending Words' : 'Pending Keys'}
                                            </h3>
                                            <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400">
                                                <AlertCircle size={16} />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold text-white tracking-tight">
                                            {activeTab === 'wordcount' && wordCountResult
                                                ? wordCountResult.nonTranslated.toLocaleString()
                                                : result.languages.reduce((acc, l) => acc + l.pendingCount + l.missingCount, 0).toLocaleString()
                                            }
                                        </p>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500">
                                        {activeTab === 'wordcount' ? 'Missing or pending words' : 'Missing or pending keys'}
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex items-center justify-between">
                                    <div>
                                        <h3 className="text-slate-400 text-sm font-medium mb-1">Duplicate Values</h3>
                                        <p className="text-2xl font-bold text-white tracking-tight">{result.duplicates.length}</p>
                                        <p className="text-xs text-slate-500">+ {result.looseDuplicates.length} potential matches</p>
                                    </div>
                                    <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                                        <Copy size={24} />
                                    </div>
                                </div>

                                {wordCountResult && (
                                    <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-2xl shadow-lg flex items-center justify-between">
                                        <div>
                                            <h3 className="text-slate-400 text-sm font-medium mb-1">Total Words</h3>
                                            <p className="text-2xl font-bold text-white tracking-tight">{wordCountResult.totalWords.toLocaleString()}</p>
                                            <p className="text-xs text-slate-500">Estimated volume</p>
                                        </div>
                                        <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400">
                                            <Calculator size={24} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl mb-6 inline-flex border border-slate-800">
                                <button
                                    onClick={() => setActiveTab('languages')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'languages'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Language Breakdown
                                </button>
                                <button
                                    onClick={() => setActiveTab('duplicates')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'duplicates'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Duplicate Detection
                                </button>
                                <button
                                    onClick={() => setActiveTab('wordcount')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'wordcount'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Word Count
                                </button>
                            </div>

                            {/* Content */}
                            <div className="bg-slate-800/20 border border-slate-800 rounded-2xl overflow-hidden">
                                {activeTab === 'languages' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800/50 border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                                    <th className="px-6 py-4">Language</th>
                                                    <th className="px-6 py-4 text-center">Completion</th>
                                                    <th className="px-6 py-4 text-right">Translated</th>
                                                    <th className="px-6 py-4 text-right">Pending</th>
                                                    <th className="px-6 py-4 text-right">Missing</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {result.languages.map((lang) => (
                                                    <tr key={lang.langCode} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-white flex items-center">
                                                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 text-xs font-bold text-slate-300">
                                                                {lang.langCode.toUpperCase().slice(0, 2)}
                                                            </div>
                                                            {lang.langCode}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center">
                                                                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden mr-3">
                                                                    <div
                                                                        className={`h-full rounded-full ${lang.percentComplete === 100
                                                                            ? 'bg-emerald-500'
                                                                            : lang.percentComplete > 50
                                                                                ? 'bg-amber-500'
                                                                                : 'bg-rose-500'
                                                                            }`}
                                                                        style={{ width: `${lang.percentComplete}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-medium text-slate-400 w-8">
                                                                    {Math.round(lang.percentComplete)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                                            {lang.translatedCount}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-amber-400 font-medium">
                                                            {lang.pendingCount}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-rose-400 font-medium">
                                                            {lang.missingCount}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'duplicates' && (
                                    <div className="divide-y divide-slate-800">
                                        <div className="p-4 bg-slate-800/30 border-b border-slate-700">
                                            <h3 className="font-semibold text-white flex items-center">
                                                <AlertTriangle size={18} className="text-amber-500 mr-2" />
                                                Identical Values
                                            </h3>
                                            <p className="text-sm text-slate-400 mt-1">Values used by multiple keys (Exact match)</p>
                                        </div>
                                        {result.duplicates.length === 0 ? (
                                            <div className="p-12 text-center text-slate-500">
                                                <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500/50" />
                                                <p>No exact duplicates found.</p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[500px] overflow-y-auto">
                                                {result.duplicates.map((dup, idx) => (
                                                    <div key={idx} className="p-6 hover:bg-slate-800/20 transition-colors group">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="bg-slate-700/50 rounded-lg p-3 text-slate-200 font-mono text-sm break-all max-w-[80%] border border-slate-700">
                                                                "{dup.value}"
                                                            </div>
                                                            <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-1 rounded-md font-medium border border-rose-500/30">
                                                                {dup.count} occurrences
                                                            </span>
                                                        </div>
                                                        <div className="pl-4 border-l-2 border-slate-700">
                                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Used in Keys:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {dup.keys.map(k => (
                                                                    <span key={k} className="text-xs bg-slate-800 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">
                                                                        {k}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Loose Duplicates Section */}
                                        <div className="p-4 bg-slate-800/30 border-b border-slate-700 border-t border-slate-800 mt-4">
                                            <h3 className="font-semibold text-white flex items-center">
                                                <Search size={18} className="text-cyan-500 mr-2" />
                                                Potential Matches (Loose)
                                            </h3>
                                            <p className="text-sm text-slate-400 mt-1">Case-insensitive / Whitespace differences</p>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {result.looseDuplicates.length === 0 ? (
                                                <div className="p-8 text-center text-slate-500">No loose matches found.</div>
                                            ) : (
                                                result.looseDuplicates
                                                    .filter(ld => !result.duplicates.find(d => d.value.trim().toLowerCase() === ld.value)) // Filter exacts if strictly needed, or show all
                                                    .map((dup, idx) => (
                                                        <div key={idx} className="p-4 hover:bg-slate-800/20 transition-colors border-b border-slate-800/50">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-400 italic font-mono text-sm">~ "{dup.value}"</span>
                                                                <span className="text-cyan-500 text-xs font-bold">{dup.count} variants</span>
                                                            </div>
                                                            <div className="mt-2 text-xs text-slate-500">
                                                                In keys: {dup.keys.join(', ')}
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>

                                    </div>
                                )}

                                {activeTab === 'wordcount' && wordCountResult && (
                                    <div className="p-6">
                                        <div className="flex flex-col items-center justify-center py-8 border-b border-slate-700/50 mb-6">
                                            <span className="text-slate-400 text-sm mb-2">Total Words Across All Files</span>
                                            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 drop-shadow-lg">
                                                {wordCountResult.totalWords.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {Object.entries(wordCountResult.fileCounts).map(([name, count]: [string, FileWordCount]) => (
                                                <div key={name} className="flex flex-col p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-300 font-medium truncate max-w-[40%]">{name}</span>
                                                        <div className="flex space-x-4 text-xs">
                                                            <span className="text-emerald-400 font-medium">{count.translated.toLocaleString()} Translated</span>
                                                            <span className="text-rose-400 font-medium">{count.nonTranslated.toLocaleString()} Pending</span>
                                                            <span className="text-teal-400 font-bold border-l border-slate-700 pl-4">{count.total.toLocaleString()} Total</span>
                                                        </div>
                                                    </div>
                                                    {count.byLanguage && (
                                                        <div className="mt-3 pl-4 border-l-2 border-slate-700/50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                            {Object.entries(count.byLanguage).map(([lang, langCount]) => (
                                                                <div key={lang} className="flex flex-col text-xs bg-slate-900/30 p-2 rounded border border-slate-700/30">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-slate-400 font-medium">{lang}</span>
                                                                        <span className="text-slate-200 font-bold">{langCount.total.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-emerald-500/70">{langCount.translated.toLocaleString()} T</span>
                                                                        {langCount.pending > 0 && (
                                                                            <span className="text-rose-500/70">{langCount.pending.toLocaleString()} P</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
