import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, X, Save, Merge, FileText, Plus, AlertCircle } from 'lucide-react';
import { LanguageFile } from '../types';
import { mergeStringsIntoCatalog } from '../services/converter';
import { DragDropZone } from './DragDropZone';

interface MergeStringsViewProps {
    onBack: () => void;
}

const guessLangCode = (fileName: string): string => {
    const name = fileName.toLowerCase().replace(/\.(strings|stringsdict)$/, '');
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

export const MergeStringsView: React.FC<MergeStringsViewProps> = ({ onBack }) => {
    const [sourceCatalog, setSourceCatalog] = useState<LanguageFile | null>(null);
    const [stringsFiles, setStringsFiles] = useState<LanguageFile[]>([]);
    const [mergedOutput, setMergedOutput] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const catalogInputRef = useRef<HTMLInputElement>(null);
    const stringsInputRef = useRef<HTMLInputElement>(null);

    const handleCatalogUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError(null);
        try {
            const read = await readFile(file);
            setSourceCatalog(read);
        } catch (err) {
            setError("Failed to read the catalog file.");
        }
        if (event.target) event.target.value = '';
    };

    const handleStringsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        await processStringsFiles(selectedFiles);
        if (event.target) event.target.value = '';
    };

    const processStringsFiles = async (selectedFiles: FileList) => {
        setError(null);
        try {
            const promises = Array.from(selectedFiles).map(readFile);
            const newlyReadFiles = await Promise.all(promises);
            const existingFileNames = new Set(stringsFiles.map(f => f.name));
            const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));
            if (uniqueNewFiles.length > 0) setStringsFiles([...stringsFiles, ...uniqueNewFiles]);
        } catch (err) {
            setError("Failed to read one or more strings files.");
        }
    }

    const handleCatalogDropped = async (files: FileList) => {
        const file = files[0];
        if (!file) return;
        setError(null);
        try {
            const read = await readFile(file);
            setSourceCatalog(read);
        } catch (err) {
            setError("Failed to read the catalog file.");
        }
    };

    const handleStringsDropped = async (files: FileList) => {
        await processStringsFiles(files);
    };

    const handleRemoveStringsFile = (fileName: string) => {
        setStringsFiles(stringsFiles.filter(f => f.name !== fileName));
    };

    const handleLangCodeChange = (fileName: string, newLangCode: string) => {
        setStringsFiles(stringsFiles.map(f => f.name === fileName ? { ...f, langCode: newLangCode } : f));
    };

    const handleMerge = () => {
        if (!sourceCatalog) return;
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                const result = mergeStringsIntoCatalog(sourceCatalog.content, stringsFiles);
                setMergedOutput(result);
            } catch (e: any) {
                setError(e.message || "An error occurred during the merge.");
            } finally {
                setIsLoading(false);
            }
        }, 500);
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

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
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
                        Merge Strings
                    </h1>
                    <p className="text-slate-400 text-sm">Merge .strings translations into .xcstrings catalog</p>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Panel: Inputs */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-y-auto bg-slate-900/50 flex flex-col">

                    {/* Source Catalog Section */}
                    <div className="flex-shrink-0 mb-6">
                        <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center uppercase tracking-wider">
                            1. Source Catalog
                        </h2>
                        <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-2">
                            <DragDropZone
                                onFilesDropped={handleCatalogDropped}
                                className="w-full"
                                isDraggingClass="border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/50"
                            >
                                {sourceCatalog ? (
                                    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 group">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3 flex-shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-200 truncate pr-2" title={sourceCatalog.name}>
                                                {sourceCatalog.name}
                                            </span>
                                        </div>
                                        <button onClick={() => setSourceCatalog(null)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-lg hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                                        onClick={() => catalogInputRef.current?.click()}
                                    >
                                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-500/10 transition-colors">
                                            <Upload className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" />
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium">Upload .xcstrings</p>
                                    </div>
                                )}
                            </DragDropZone>
                            <input type="file" ref={catalogInputRef} onChange={handleCatalogUpload} accept=".xcstrings" className="hidden" />
                        </div>
                    </div>

                    {/* Strings Files Section */}
                    <div className="flex-grow flex flex-col min-h-0 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                2. Translations
                            </h2>
                            {stringsFiles.length > 0 && (
                                <button onClick={() => setStringsFiles([])} className="text-xs text-rose-400 hover:text-rose-300">
                                    Clear All
                                </button>
                            )}
                        </div>

                        <DragDropZone
                            onFilesDropped={handleStringsDropped}
                            className="flex-grow flex flex-col min-h-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800/20"
                            isDraggingClass="border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/50"
                        >
                            <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[200px]">
                                {stringsFiles.length === 0 ? (
                                    <div
                                        className="h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-800/30 transition-colors"
                                        onClick={() => stringsInputRef.current?.click()}
                                    >
                                        <p className="text-sm text-slate-500 mb-1">No translation files added</p>
                                        <p className="text-xs text-slate-600">Drag & drop or click to upload</p>
                                    </div>
                                ) : (
                                    stringsFiles.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group">
                                            <div className="flex-1 min-w-0 mr-2">
                                                <p className="text-sm text-slate-200 truncate" title={file.name}>{file.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={file.langCode}
                                                    onChange={(e) => handleLangCodeChange(file.name, e.target.value)}
                                                    placeholder="lang"
                                                    className="w-14 text-xs py-1 px-1.5 bg-slate-900 border border-slate-600 rounded text-slate-300 focus:text-white focus:border-indigo-500 focus:outline-none text-center"
                                                />
                                                <button onClick={() => handleRemoveStringsFile(file.name)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DragDropZone>
                        <div className="mt-2 text-right">
                            <button onClick={() => stringsInputRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-end gap-1 ml-auto px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors">
                                <Plus size={14} /> Add files
                            </button>
                            <input type="file" ref={stringsInputRef} onChange={handleStringsUpload} accept=".strings" className="hidden" multiple />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2">
                            <AlertCircle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-rose-300">{error}</p>
                        </div>
                    )}

                    <div className="flex-shrink-0 pt-2 mt-auto">
                        <button
                            onClick={handleMerge}
                            disabled={isLoading || !sourceCatalog || stringsFiles.length === 0}
                            className="w-full py-3.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Merging...' : (
                                <>
                                    <Merge size={18} /> Merge Files
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Output */}
                <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Output Result</h2>
                        {mergedOutput && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-emerald-900 bg-emerald-400 rounded-lg hover:bg-emerald-300 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                            >
                                <Save size={14} />
                                <span>Download .xcstrings</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
                        {mergedOutput ? (
                            <textarea
                                readOnly
                                value={mergedOutput}
                                className="w-full h-full p-6 bg-transparent text-slate-300 font-mono text-sm resize-none focus:outline-none custom-scrollbar leading-relaxed"
                                spellCheck={false}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Merge size={48} className="mb-4" />
                                <p className="text-lg font-medium">Ready to merge</p>
                                <p className="text-sm">Upload files to start processing</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
