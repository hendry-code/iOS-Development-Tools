
import React, { useState, useRef } from 'react';
import { ArrowLeft, Copy, Upload, X, Trash2, Search, FileText, Check, Sparkles } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import { LanguageFile } from '../types';
import { findDuplicates, DuplicateResult } from '../services/duplicateFinder';

interface DuplicateFinderViewProps {
    onBack: () => void;
}

const CopyButton = ({ text, className = "" }: { text: string, className?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className={`p-1 hover:bg-slate-700 rounded transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${copied ? 'text-teal-400' : 'text-slate-500 hover:text-white'} ${className}`}
            title="Copy key"
        >
            {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
    );
};

const guessLangCode = (fileName: string): string => {
    const name = fileName.toLowerCase().replace(/\.(strings|stringsdict|xcstrings|xml|json)$/, '');
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

// --- Sample Data ---
// 3 files with cross-file and within-file duplicates:
// - "OK" appears in all 3 files (3 occurrences)
// - "Done" appears in Localizable + Settings (2 occurrences)
// - "Error" appears in Localizable + Settings with different keys (2 occurrences)
// - "Settings" appears in Infoplist + Settings file (2 occurrences)
const SAMPLE_DUP_FILES: LanguageFile[] = [
    {
        name: 'Localizable.strings',
        langCode: 'en',
        content: [
            '"confirm_button" = "OK";',
            '"save_complete" = "Done";',
            '"network_error" = "Error";',
            '"welcome_title" = "Welcome to the App";',
            '"logout_label" = "Sign Out";',
        ].join('\n'),
    },
    {
        name: 'InfoPlist.strings',
        langCode: 'en',
        content: [
            '"CFBundleDisplayName" = "My App";',
            '"NSCameraUsageDescription" = "OK";',
            '"CFBundleName" = "Settings";',
            '"NSLocationUsageDescription" = "We need your location for maps";',
        ].join('\n'),
    },
    {
        name: 'Settings.strings',
        langCode: 'en',
        content: [
            '"dialog_accept" = "OK";',
            '"upload_finished" = "Done";',
            '"general_error" = "Error";',
            '"settings_title" = "Settings";',
            '"theme_label" = "App Theme";',
        ].join('\n'),
    },
];

export const DuplicateFinderView: React.FC<DuplicateFinderViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<LanguageFile[]>([]);
    const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFilesChange = (newFiles: LanguageFile[]) => {
        setFiles(newFiles);
        if (newFiles.length > 0) {
            const results = findDuplicates(newFiles);
            setDuplicates(results);
        } else {
            setDuplicates([]);
        }
    };

    const processFiles = async (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;
        try {
            const promises = Array.from(selectedFiles).map(readFile);
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

    const handleFilesDropped = async (droppedFiles: FileList) => {
        await processFiles(droppedFiles);
    };

    const removeFile = (name: string) => {
        handleFilesChange(files.filter(f => f.name !== name));
    };

    const clearAll = () => {
        handleFilesChange([]);
    }

    const handleExecuteSample = () => {
        handleFilesChange(SAMPLE_DUP_FILES);
    };

    return (
        <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans">
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
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                        Duplicate Value Finder
                    </h1>
                    <p className="text-slate-400 text-sm">Find identical values across multiple files</p>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={handleExecuteSample}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-lg font-semibold active:scale-95 transition-all text-sm"
                        title="Load sample files with duplicate values to see how it works"
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Execute Sample</span>
                    </button>
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
                        onFilesDropped={handleFilesDropped}
                        className="flex-shrink-0 mb-4"
                        isDraggingClass="border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/50"
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
                                accept=".strings,.stringsdict,.xcstrings,.xml,.json"
                            />
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                                <Upload size={24} className="text-teal-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-200 mb-1">Upload Files</h3>
                            <p className="text-sm text-slate-500 max-w-[200px]">
                                Drag & drop files here (.strings, .json, .xml, etc.)
                            </p>
                        </div>
                    </DragDropZone>

                    {/* File List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {files.map(file => (
                            <div key={file.name} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all group">
                                <div className="flex items-center overflow-hidden">
                                    <div className="w-8 h-8 rounded flex items-center justify-center mr-3 flex-shrink-0 bg-teal-500/20 text-teal-400">
                                        <FileText size={16} />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium text-slate-200 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-slate-500">{file.content.length.toLocaleString()} bytes</p>
                                    </div>
                                </div>
                                <button onClick={() => removeFile(file.name)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Analysis Report */}
                <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 border-t md:border-t-0 border-slate-800">
                    {files.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                            <Search size={64} className="mb-4" />
                            <p className="text-xl font-light">Upload files to find duplicates</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center">
                                    <Copy size={24} className="text-teal-400 mr-2" />
                                    Found Duplicates ({duplicates.length})

                                </h3>
                            </div>

                            {duplicates.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800">
                                    <p className="text-lg">No duplicates found across {files.length} file{files.length !== 1 ? 's' : ''}.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {duplicates.map((dup, idx) => (
                                        <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="bg-slate-900/80 rounded-lg p-3 text-slate-200 font-mono text-sm break-all flex-1 mr-4 border border-slate-700">
                                                    "{dup.value}"
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-1 rounded font-bold border border-rose-500/30 whitespace-nowrap">
                                                        {dup.locations.length} times
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pl-4 border-l-2 border-indigo-500/30 space-y-2 mt-2">
                                                {dup.locations.map((loc, i) => (
                                                    <div key={i} className="flex items-center text-xs text-slate-400 font-mono bg-slate-800/50 p-2 rounded justify-between hover:bg-slate-800/80 group/item">
                                                        <div className="flex items-center overflow-hidden mr-2 flex-1">
                                                            <span className="text-indigo-400 font-semibold mr-2 flex-shrink-0">{loc.fileName}</span>
                                                            <span className="text-slate-500 mr-2 flex-shrink-0">→</span>
                                                            <span className="text-slate-300 truncate mr-2" title={loc.key}>{loc.key}</span>
                                                            <CopyButton text={loc.key} className="opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        </div>
                                                        {loc.language && (
                                                            <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ml-auto flex-shrink-0">
                                                                {loc.language}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
