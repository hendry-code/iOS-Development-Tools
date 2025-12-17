import React, { useState, useRef } from 'react';
import { ArrowLeft, X, Type, Trash2, Upload, Sparkles, FileText, FileJson, Download } from 'lucide-react';
import { parseStringsFile } from '../services/converter';
import { ParsedStrings } from '../types';
import { DragDropZone } from './DragDropZone';

interface KeyRenamerViewProps {
    onBack: () => void;
}

interface LoadedFile {
    name: string;
    content: string;
}

const readFile = (file: File): Promise<LoadedFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            content: reader.result as string,
        });
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

export const KeyRenamerView: React.FC<KeyRenamerViewProps> = ({ onBack }) => {
    const [sourceFile, setSourceFile] = useState<LoadedFile | null>(null);
    const [keyCompFile, setKeyCompFile] = useState<LoadedFile | null>(null);
    const [valCompFiles, setValCompFiles] = useState<LoadedFile[]>([]);

    const [outputContent, setOutputContent] = useState('');
    const [renameLog, setRenameLog] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Refs for file inputs
    const sourceInputRef = useRef<HTMLInputElement>(null);
    const keyCompInputRef = useRef<HTMLInputElement>(null);
    const valCompInputRef = useRef<HTMLInputElement>(null);

    const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                const file = await readFile(e.target.files[0]);
                setSourceFile(file);
                setError(null);
            } catch (err) { setError("Error reading source file"); }
        }
        if (e.target) e.target.value = '';
    };

    const handleKeyCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                const file = await readFile(e.target.files[0]);
                setKeyCompFile(file);
                setError(null);
            } catch (err) { setError("Error reading key-comparable file"); }
        }
        if (e.target) e.target.value = '';
    };

    const handleValCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            await processValCompFiles(e.target.files);
        }
        if (e.target) e.target.value = '';
    };

    const processValCompFiles = async (fileList: FileList) => {
        try {
            const promises = Array.from(fileList).map(readFile);
            const files = await Promise.all(promises);
            setValCompFiles(prev => {
                const existingNames = new Set(prev.map(f => f.name));
                const newFiles = files.filter(f => !existingNames.has(f.name));
                return [...prev, ...newFiles];
            });
            setError(null);
        } catch (err) { setError("Error reading value-comparable files"); }
    }

    const handleSourceDropped = async (files: FileList) => {
        if (files[0]) {
            try {
                const file = await readFile(files[0]);
                setSourceFile(file);
                setError(null);
            } catch (err) { setError("Error reading source file"); }
        }
    };

    const handleKeyCompDropped = async (files: FileList) => {
        if (files[0]) {
            try {
                const file = await readFile(files[0]);
                setKeyCompFile(file);
                setError(null);
            } catch (err) { setError("Error reading key-comparable file"); }
        }
    };

    const handleValCompDropped = async (files: FileList) => {
        await processValCompFiles(files);
    };

    const removeValCompFile = (name: string) => {
        setValCompFiles(prev => prev.filter(f => f.name !== name));
    };

    const handleClearAll = () => {
        setSourceFile(null);
        setKeyCompFile(null);
        setValCompFiles([]);
        setOutputContent('');
        setRenameLog([]);
        setError(null);
    };

    const processRenaming = () => {
        if (!sourceFile || !keyCompFile || valCompFiles.length === 0) {
            setError("Please upload all required files (Source, Key-Comparable, and at least one Value-Comparable).");
            return;
        }

        setIsLoading(true);
        setError(null);
        setRenameLog([]);

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                // Parse all files
                const sourceData = parseStringsFile(sourceFile.content);
                const keyCompData = parseStringsFile(keyCompFile.content);
                const valCompDatas = valCompFiles.map(f => parseStringsFile(f.content));

                const logs: string[] = [];
                const newSourceData: ParsedStrings = {};

                // Helper to escape string for .strings file output
                const escape = (str: string) => str.replace(/"/g, '\\"').replace(/\n/g, '\\n');

                Object.entries(sourceData).forEach(([srcKey, srcValue]) => {
                    // Step 1: Look up sourceKey in KeyComparable
                    const intermediateValue = keyCompData[srcKey];

                    let newKey = srcKey;
                    let foundMatch = false;

                    if (intermediateValue && typeof intermediateValue === 'string') {
                        // Step 2 & 3: Look for intermediateValue in ValueComparable files
                        for (const valCompData of valCompDatas) {
                            // Find matching value
                            const foundEntry = Object.entries(valCompData).find(([_, val]) => val === intermediateValue);

                            if (foundEntry) {
                                newKey = foundEntry[0];
                                foundMatch = true;
                                logs.push(`Renamed "${srcKey}" -> "${newKey}" (via value: "${intermediateValue.substring(0, 20)}${intermediateValue.length > 20 ? '...' : ''}")`);
                                break; // Stop after first match
                            }
                        }
                    }

                    if (!foundMatch && intermediateValue) {
                        // logs.push(`Skipped "${srcKey}": Value found in comparison file but not matched in value files.`);
                    } else if (!intermediateValue) {
                        // logs.push(`Skipped "${srcKey}": Key not found in comparison file.`);
                    }

                    newSourceData[newKey] = srcValue;
                });

                // Generate Output
                const generatedContent = Object.entries(newSourceData)
                    .map(([key, value]) => `"${key}" = "${escape(value as string)}";`)
                    .join('\n');

                setOutputContent(generatedContent);
                setRenameLog(logs.length > 0 ? logs : ["No keys were renamed based on the provided files."]);

            } catch (err: any) {
                setError(`An error occurred during processing: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    const handleDownload = () => {
        if (!outputContent) return;
        const blob = new Blob([outputContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Renamed.strings';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans">
            <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                    aria-label="Go back"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                        Key Renamer
                    </h1>
                    <p className="text-slate-400 text-sm">Batch rename keys across files</p>
                </div>
                {/* Clear All Button */}
                {(sourceFile || keyCompFile || valCompFiles.length > 0) && (
                    <button onClick={handleClearAll} className="ml-auto p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 size={20} />
                    </button>
                )}
            </header>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
                {/* Inputs Column */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-visible md:overflow-y-auto bg-slate-900/50 flex flex-col gap-6 custom-scrollbar min-h-0">

                    {/* Source File Input */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">1</span>
                            Source File <span className="text-slate-600 font-normal lowercase">(e.g. albanian.strings)</span>
                        </h2>
                        <DragDropZone
                            onFilesDropped={handleSourceDropped}
                            className={`rounded-xl border border-slate-700 bg-slate-800/20 transition-all ${sourceFile ? 'border-blue-500/30 bg-blue-500/5' : ''}`}
                            isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                        >
                            {sourceFile ? (
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm font-mono text-slate-300 truncate pr-2">{sourceFile.name}</span>
                                    <button onClick={() => setSourceFile(null)} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"><X size={16} /></button>
                                </div>
                            ) : (
                                <div
                                    className="p-6 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-800/30 transition-colors"
                                    onClick={() => sourceInputRef.current?.click()}
                                >
                                    <Upload size={20} className="mb-2 opacity-50" />
                                    <p className="text-sm">Upload Source</p>
                                </div>
                            )}
                            <input type="file" ref={sourceInputRef} onChange={handleSourceUpload} accept=".strings" className="hidden" />
                        </DragDropZone>
                    </div>

                    {/* Key Comparable Input */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">2</span>
                            Key-Comparable <span className="text-slate-600 font-normal lowercase">(e.g. OldLocalizable.strings)</span>
                        </h2>
                        <DragDropZone
                            onFilesDropped={handleKeyCompDropped}
                            className={`rounded-xl border border-slate-700 bg-slate-800/20 transition-all ${keyCompFile ? 'border-purple-500/30 bg-purple-500/5' : ''}`}
                            isDraggingClass="border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
                        >
                            {keyCompFile ? (
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-sm font-mono text-slate-300 truncate pr-2">{keyCompFile.name}</span>
                                    <button onClick={() => setKeyCompFile(null)} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"><X size={16} /></button>
                                </div>
                            ) : (
                                <div
                                    className="p-6 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-800/30 transition-colors"
                                    onClick={() => keyCompInputRef.current?.click()}
                                >
                                    <Upload size={20} className="mb-2 opacity-50" />
                                    <p className="text-sm">Upload Key-Comp</p>
                                </div>
                            )}
                            <input type="file" ref={keyCompInputRef} onChange={handleKeyCompUpload} accept=".strings" className="hidden" />
                        </DragDropZone>
                    </div>

                    {/* Value Comparable Inputs */}
                    <div className="flex-1 flex flex-col min-h-[150px]">
                        <h2 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                            Value-Comparables <span className="text-slate-600 font-normal lowercase">(NewLocalizable files)</span>
                        </h2>
                        <DragDropZone
                            onFilesDropped={handleValCompDropped}
                            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/20 flex flex-col overflow-hidden"
                            isDraggingClass="border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/50"
                        >
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {valCompFiles.length === 0 ? (
                                    <div
                                        className="h-full flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-800/30 transition-colors min-h-[100px]"
                                        onClick={() => valCompInputRef.current?.click()}
                                    >
                                        <Upload size={20} className="mb-2 opacity-50" />
                                        <p className="text-sm">Upload Value-Comps</p>
                                    </div>
                                ) : (
                                    valCompFiles.map(f => (
                                        <div key={f.name} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                            <span className="text-sm font-mono text-slate-300 truncate pr-2">{f.name}</span>
                                            <button onClick={() => removeValCompFile(f.name)} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"><X size={14} /></button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 border-t border-slate-700 bg-slate-800/30">
                                <button
                                    onClick={() => valCompInputRef.current?.click()}
                                    className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                                >
                                    Add Files...
                                </button>
                            </div>
                            <input type="file" ref={valCompInputRef} onChange={handleValCompUpload} accept=".strings" multiple className="hidden" />
                        </DragDropZone>
                    </div>

                    <button
                        onClick={processRenaming}
                        disabled={isLoading || !sourceFile || !keyCompFile || valCompFiles.length === 0}
                        className="w-full py-3.5 text-sm font-bold text-white bg-pink-600 rounded-xl shadow-lg shadow-pink-500/20 hover:bg-pink-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Processing...' : (
                            <>
                                <Sparkles size={16} /> Process Renaming
                            </>
                        )}
                    </button>
                    {error && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <p className="text-xs text-rose-300">{error}</p>
                        </div>
                    )}
                </div>

                {/* Output Column */}
                <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800">
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Output Result</h2>
                        {outputContent && (
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-200 bg-pink-600 rounded-lg hover:bg-pink-500 transition-all active:scale-95 shadow-lg shadow-pink-500/20"
                                >
                                    <Download size={14} />
                                    <span>Download</span>
                                </button>
                            </div>
                        )}
                    </div>


                    <div className="flex-1 flex flex-col gap-6">
                        {/* Result Area */}
                        <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 relative shadow-inner overflow-hidden min-h-[200px]">
                            {outputContent ? (
                                <textarea
                                    readOnly
                                    value={outputContent}
                                    className="w-full h-full p-4 bg-transparent text-slate-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <FileText size={48} className="mb-4" />
                                    <p className="text-lg font-medium">Ready to process</p>
                                    <p className="text-sm">Output will appear here</p>
                                </div>
                            )}
                        </div>

                        {/* Logs Area */}
                        <div className="h-1/3 min-h-[150px] flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Change Log</span>
                                <span className="text-slate-600">{renameLog.length} entries</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-400 space-y-1 custom-scrollbar">
                                {renameLog.length > 0 ? (
                                    renameLog.map((log, i) => (
                                        <div key={i} className="border-b border-slate-800/50 pb-1 last:border-0">{log}</div>
                                    ))
                                ) : (
                                    <div className="text-slate-600 italic">No changes logged yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
