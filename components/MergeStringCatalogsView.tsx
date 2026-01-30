import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Save, Merge, FileText, AlertTriangle, Check, CheckCircle2, Copy, FileJson, Activity, ChevronRight, ChevronDown } from 'lucide-react';
import { LanguageFile } from '../types';
import { analyzeMergeConflicts, mergeStringCatalogs, MergeConflict, MergeReport, isEqual } from '../services/converter';
import { DragDropZone } from './DragDropZone';

interface MergeStringCatalogsViewProps {
    onBack: () => void;
}

const readFile = (file: File): Promise<LanguageFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            content: reader.result as string,
            langCode: 'xcstrings', // Not strictly used for analyzing logic which parses JSON
        });
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

export const MergeStringCatalogsView: React.FC<MergeStringCatalogsViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<LanguageFile[]>([]);
    const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
    const [resolutions, setResolutions] = useState<Record<string, any>>({});
    const [mergedOutput, setMergedOutput] = useState<string>('');
    const [mergeReport, setMergeReport] = useState<MergeReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [activeConflictId, setActiveConflictId] = useState<string | null>(null);
    const [showLogs, setShowLogs] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (files.length > 0) {
            try {
                const { conflicts: newConflicts, sourceLanguageWarnings } = analyzeMergeConflicts(files);
                setConflicts(newConflicts);
                setWarnings(sourceLanguageWarnings);

                // Reset resolutions for keys that correspond to new conflicts or removed keys
                // For simplicity, we can keep valid resolutions if the conflict still exists
                setResolutions(prev => {
                    const next = { ...prev };
                    // If a key is no longer a conflict, we remove it from resolutions (optional, but cleaner)
                    const conflictKeys = new Set(newConflicts.map(c => c.key));
                    Object.keys(next).forEach(k => {
                        if (!conflictKeys.has(k)) delete next[k];
                    });
                    return next;
                });

            } catch (e: any) {
                setError("Error parsing files: " + e.message);
            }
        } else {
            setConflicts([]);
            setWarnings([]);
            setResolutions({});
        }
    }, [files]);

    const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        await processFiles(selectedFiles);
        if (event.target) event.target.value = '';
    };

    const processFiles = async (fileList: FileList) => {
        setError(null);
        try {
            const promises = Array.from(fileList).map(readFile);
            const newFiles = await Promise.all(promises);
            // Append unique files by name
            setFiles(prev => {
                const existingNames = new Set(prev.map(f => f.name));
                const uniqueNew = newFiles.filter(f => !existingNames.has(f.name));
                return [...prev, ...uniqueNew];
            });
        } catch (err) {
            setError("Failed to read files.");
        }
    };

    const handleRemoveFile = (fileName: string) => {
        setFiles(files.filter(f => f.name !== fileName));
    };

    const handleResolve = (key: string, value: any) => {
        setResolutions(prev => ({ ...prev, [key]: value }));
        // Auto-close conflict detail if resolved? Optional.
        // setActiveConflictId(null); 
    };

    const resolveAllWithFile = (fileName: string) => {
        const file = files.find(f => f.name === fileName);
        if (!file) return;

        try {
            const content = JSON.parse(file.content);
            const strings = content.strings || {};

            const newResolutions = { ...resolutions };
            conflicts.forEach(c => {
                if (strings[c.key]) {
                    newResolutions[c.key] = strings[c.key];
                }
            });
            setResolutions(newResolutions);
        } catch (e) {
            console.error("Failed to parse file for bulk resolution", e);
        }
    };

    const handleMerge = () => {
        if (files.length === 0) return;
        try {
            const { outputContent, report } = mergeStringCatalogs(files, resolutions);
            setMergedOutput(outputContent);
            setMergeReport(report);
            setError(null);
        } catch (e: any) {
            setError(e.message || "Merge failed");
        }
    };

    const handleDownload = () => {
        if (!mergedOutput) return;
        const blob = new Blob([mergedOutput], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Merged.xcstrings';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const allConflictsResolved = conflicts.every(c => resolutions[c.key] !== undefined);

    const getVariationPreview = (value: any) => {
        return JSON.stringify(value, null, 2);
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
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Merge String Catalogs
                    </h1>
                    <p className="text-slate-400 text-sm">Combine multiple .xcstrings files with smart conflict resolution</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
                {/* Left Panel: Inputs & Conflicts */}
                <div className="w-full md:w-5/12 p-6 border-r border-slate-700 overflow-y-auto bg-slate-900/50 flex flex-col min-h-0">

                    {/* File Upload Section */}
                    <div className="mb-6 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                1. Source Files
                            </h2>
                            {files.length > 0 && (
                                <button onClick={() => setFiles([])} className="text-xs text-rose-400 hover:text-rose-300">
                                    Clear All
                                </button>
                            )}
                        </div>

                        <DragDropZone
                            onFilesDropped={processFiles}
                            className="w-full flex flex-col min-h-[120px] rounded-xl border border-slate-700 bg-slate-800/20 mb-4"
                            isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                        >
                            {files.length === 0 ? (
                                <div
                                    className="flex-grow flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-slate-800/30 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-2">
                                        <Upload className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium">Upload .xcstrings files</p>
                                </div>
                            ) : (
                                <div className="flex-grow p-2 space-y-2">
                                    {files.map(file => (
                                        <div key={file.name} className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText size={14} className="text-blue-400 flex-shrink-0" />
                                                <span className="text-sm text-slate-200 truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-slate-500 hover:text-rose-400">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded border border-dashed border-blue-500/30 transition-colors"
                                    >
                                        + Add more files
                                    </button>
                                </div>
                            )}
                        </DragDropZone>
                        <input type="file" ref={fileInputRef} onChange={handleFilesUpload} accept=".xcstrings" multiple className="hidden" />
                    </div>

                    {/* Warnings (Source Language Mismatch) */}
                    {warnings.length > 0 && (
                        <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
                                <AlertTriangle size={14} /> Source Language Warnings
                            </h3>
                            <ul className="text-xs text-amber-300 space-y-1 list-disc list-inside">
                                {warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Conflicts Section */}
                    {conflicts.length > 0 && (
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    2. Conflicts <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px]">{conflicts.length}</span>
                                </h2>
                                <span className="text-xs text-slate-500">
                                    {Object.keys(resolutions).length}/{conflicts.length} resolved
                                </span>
                            </div>

                            <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-2 mb-4">
                                {conflicts.map(conflict => {
                                    const isResolved = resolutions[conflict.key] !== undefined;
                                    const isOpen = activeConflictId === conflict.key;

                                    return (
                                        <div key={conflict.key} className={`rounded-xl border transition-all ${isResolved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                                            <div
                                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                                onClick={() => setActiveConflictId(isOpen ? null : conflict.key)}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {isResolved ? (
                                                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                                    ) : (
                                                        <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />
                                                    )}
                                                    <span className="text-sm font-mono text-slate-200 truncate" title={conflict.key}>{conflict.key}</span>
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {isOpen ? 'Close' : 'Review'}
                                                </div>
                                            </div>

                                            {isOpen && (
                                                <div className="p-3 border-t border-slate-700/50 bg-slate-900/50">
                                                    <p className="text-xs text-slate-500 mb-3 block">Select the version to keep:</p>
                                                    <div className="space-y-2">
                                                        {conflict.variations.map((v, i) => {
                                                            const isSelected = isEqual(resolutions[conflict.key], v.value);
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    onClick={() => handleResolve(conflict.key, v.value)}
                                                                    className={`
                                                                        p-2.5 rounded-lg border cursor-pointer transition-all relative
                                                                        ${isSelected
                                                                            ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                                                                            : 'border-slate-700 hover:border-slate-500 bg-slate-800'
                                                                        }
                                                                    `}
                                                                >
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-xs font-medium text-slate-400">{v.fileName}</span>
                                                                        {isSelected && <Check size={12} className="text-emerald-400" />}
                                                                    </div>
                                                                    <pre className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                                                                        {getVariationPreview(v.value)}
                                                                    </pre>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bulk Actions */}
                            <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2">Bulk Resolve using file:</p>
                                <div className="flex flex-wrap gap-2">
                                    {files.map(f => (
                                        <button
                                            key={f.name}
                                            onClick={() => resolveAllWithFile(f.name)}
                                            className="px-2 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors"
                                        >
                                            {f.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Merge Button */}
                    <div className="mt-auto pt-4 border-t border-slate-700">
                        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
                        <button
                            onClick={handleMerge}
                            disabled={files.length < 1 || (conflicts.length > 0 && !allConflictsResolved)}
                            className="w-full py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Merge size={18} />
                            {conflicts.length > 0 && !allConflictsResolved
                                ? `Resolve Conflicts (${conflicts.length - Object.keys(resolutions).length} left)`
                                : 'Merge Catalogs'
                            }
                        </button>
                    </div>

                </div>

                {/* Right Panel: Output & Logs */}
                <div className="w-full md:flex-1 min-h-[400px] md:min-h-0 md:h-full overflow-hidden bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Result & Report</h2>
                        {mergedOutput && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(mergedOutput) }}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Copy to clipboard"
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-emerald-900 bg-emerald-400 rounded-lg hover:bg-emerald-300 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                                >
                                    <Save size={14} />
                                    <span>Download .xcstrings</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
                        {mergedOutput && mergeReport ? (
                            <div className="flex flex-col h-full">
                                {/* Report Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-slate-800/50 bg-slate-900/50">
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total Keys</p>
                                        <p className="text-xl font-bold text-slate-200">{mergeReport.totalKeys}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Merged Keys</p>
                                        <p className="text-xl font-bold text-blue-400">{mergeReport.mergedKeysCount}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Files Processed</p>
                                        <p className="text-xl font-bold text-purple-400">{mergeReport.filesStats.length}</p>
                                    </div>
                                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Missing/Issues</p>
                                        <p className={`text-xl font-bold ${mergeReport.missingKeys.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {mergeReport.missingKeys.length}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-hidden relative">
                                    <textarea
                                        readOnly
                                        value={mergedOutput}
                                        className="w-full h-full p-6 bg-transparent text-slate-300 font-mono text-xs md:text-sm resize-none focus:outline-none custom-scrollbar leading-relaxed"
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Collapsible Logs */}
                                <div className="border-t border-slate-800 bg-slate-900">
                                    <button
                                        onClick={() => setShowLogs(!showLogs)}
                                        className="w-full flex items-center justify-between p-3 text-xs font-medium text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Activity size={14} />
                                            <span>Detailed Merge Logs</span>
                                        </div>
                                        {showLogs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>

                                    {showLogs && (
                                        <div className="h-48 overflow-y-auto p-4 border-t border-slate-800 bg-black/20 font-mono text-[10px] text-slate-400 custom-scrollbar space-y-1">
                                            {mergeReport.filesStats.map(f => (
                                                <div key={f.fileName} className="text-indigo-300 mb-2 pb-2 border-b border-indigo-500/10">
                                                    [{f.fileName}] Keys: {f.keyCount}, Languages: {f.languageCount}
                                                </div>
                                            ))}
                                            {mergeReport.logs.map((log, i) => (
                                                <div key={i} className={`
                                                    ${log.startsWith('WARNING') ? 'text-amber-400' : ''}
                                                    ${log.startsWith('Error') ? 'text-rose-400' : ''}
                                                `}>{log}</div>
                                            ))}
                                            {mergeReport.missingKeys.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-rose-500/20">
                                                    <p className="text-rose-400 font-bold mb-2">Missing / Issue Keys:</p>
                                                    {mergeReport.missingKeys.map((m, k) => (
                                                        <div key={k} className="text-rose-300">- {m.key}: {m.reason}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Merge size={48} className="mb-4" />
                                <p className="text-base font-medium">No merged output yet</p>
                                <p className="text-sm">Upload files and resolve conflicts to generate.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
