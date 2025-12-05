import React, { useState, useRef } from 'react';
import { ArrowLeft, X, Type, Trash2, Upload, Sparkles, FileText } from 'lucide-react';
import { parseStringsFile } from '../services/converter';
import { CodeBlock } from './CodeBlock';
import { ParsedStrings } from '../types';

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
    };

    const handleKeyCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                const file = await readFile(e.target.files[0]);
                setKeyCompFile(file);
                setError(null);
            } catch (err) { setError("Error reading key-comparable file"); }
        }
    };

    const handleValCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            try {
                const promises = Array.from(e.target.files).map(readFile);
                const files = await Promise.all(promises);
                setValCompFiles(prev => {
                    const existingNames = new Set(prev.map(f => f.name));
                    const newFiles = files.filter(f => !existingNames.has(f.name));
                    return [...prev, ...newFiles];
                });
                setError(null);
            } catch (err) { setError("Error reading value-comparable files"); }
        }
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

    return (
        <div className="flex flex-col h-full space-y-6 p-8">
            {/* Header */}
            <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded-lg">
                            <Type className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Key Renamer</h1>
                            <p className="text-xs text-gray-400">Batch rename keys across files</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleClearAll} title="Clear All" className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Inputs Column */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Source File Input */}
                    <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-gray-700/50 shadow-lg">
                        <h2 className="text-sm font-semibold text-gray-300 mb-3 flex justify-between items-center">
                            <span className="flex items-center gap-2"><FileText size={14} className="text-blue-400" /> 1. Source File</span>
                            <span className="text-xs text-gray-500 font-normal">(e.g. albanian.strings)</span>
                        </h2>
                        {sourceFile ? (
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <span className="text-sm font-mono text-gray-300 truncate pr-2">{sourceFile.name}</span>
                                <button onClick={() => setSourceFile(null)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => sourceInputRef.current?.click()} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl hover:bg-gray-800/50 hover:border-blue-500/50 transition-all text-gray-400 text-sm group">
                                <Upload className="w-4 h-4 mr-2 group-hover:text-blue-400 transition-colors" /> Upload Source .strings
                            </button>
                        )}
                        <input type="file" ref={sourceInputRef} onChange={handleSourceUpload} accept=".strings" className="hidden" />
                    </div>

                    {/* Key Comparable Input */}
                    <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-gray-700/50 shadow-lg">
                        <h2 className="text-sm font-semibold text-gray-300 mb-1 flex justify-between items-center">
                            <span className="flex items-center gap-2"><FileText size={14} className="text-purple-400" /> 2. Key-Comparable File</span>
                            <span className="text-xs text-gray-500 font-normal">(e.g. OldLocalizable.strings)</span>
                        </h2>
                        <p className="text-xs text-gray-500 mb-3 ml-6">Maps Source Keys to values.</p>
                        {keyCompFile ? (
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <span className="text-sm font-mono text-gray-300 truncate pr-2">{keyCompFile.name}</span>
                                <button onClick={() => setKeyCompFile(null)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={16} /></button>
                            </div>
                        ) : (
                            <button onClick={() => keyCompInputRef.current?.click()} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-xl hover:bg-gray-800/50 hover:border-purple-500/50 transition-all text-gray-400 text-sm group">
                                <Upload className="w-4 h-4 mr-2 group-hover:text-purple-400 transition-colors" /> Upload Key-Comparable
                            </button>
                        )}
                        <input type="file" ref={keyCompInputRef} onChange={handleKeyCompUpload} accept=".strings" className="hidden" />
                    </div>

                    {/* Value Comparable Inputs */}
                    <div className="bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-gray-700/50 shadow-lg flex-grow flex flex-col">
                        <h2 className="text-sm font-semibold text-gray-300 mb-1 flex justify-between items-center">
                            <span className="flex items-center gap-2"><FileText size={14} className="text-green-400" /> 3. Value-Comparable Files</span>
                            <span className="text-xs text-gray-500 font-normal">(NewLocalizable files)</span>
                        </h2>
                        <p className="text-xs text-gray-500 mb-3 ml-6">Finds new keys based on matching values.</p>

                        <div className="flex-grow overflow-y-auto space-y-2 mb-3 min-h-[100px] max-h-[300px] custom-scrollbar pr-1">
                            {valCompFiles.map(f => (
                                <div key={f.name} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                    <span className="text-sm font-mono text-gray-300 truncate pr-2">{f.name}</span>
                                    <button onClick={() => removeValCompFile(f.name)} className="text-gray-500 hover:text-red-400 transition-colors"><X size={16} /></button>
                                </div>
                            ))}
                            {valCompFiles.length === 0 && <p className="text-xs text-gray-600 text-center py-8 border-2 border-dashed border-gray-800 rounded-lg">No files uploaded yet.</p>}
                        </div>

                        <button onClick={() => valCompInputRef.current?.click()} className="w-full flex items-center justify-center p-3 border border-gray-700 bg-gray-800/50 rounded-lg hover:bg-gray-700 transition-all text-gray-300 text-sm">
                            <Upload className="w-4 h-4 mr-2" /> Add Files
                        </button>
                        <input type="file" ref={valCompInputRef} onChange={handleValCompUpload} accept=".strings" multiple className="hidden" />
                    </div>

                    <button
                        onClick={processRenaming}
                        disabled={isLoading || !sourceFile || !keyCompFile || valCompFiles.length === 0}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
                    >
                        {isLoading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                <span>Process Renaming</span>
                            </>
                        )}
                    </button>
                    {error && <p className="text-sm text-red-400 mt-2 text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

                </div>

                {/* Output Column */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Output & Logs</h2>

                    {outputContent ? (
                        <div className="flex flex-col h-full overflow-hidden gap-4">
                            <div className="flex-1 min-h-0 rounded-lg border border-gray-700/50 bg-gray-900/50 overflow-hidden">
                                <CodeBlock
                                    content={outputContent}
                                    language="strings"
                                    fileName={`Renamed_${sourceFile?.name || 'result.strings'}`}
                                />
                            </div>
                            <div className="h-1/3 min-h-[150px] flex flex-col bg-gray-900/30 rounded-lg border border-gray-700/50 overflow-hidden">
                                <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700/50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Change Log
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-gray-400 space-y-1 custom-scrollbar">
                                    {renameLog.map((log, i) => (
                                        <div key={i} className="border-b border-gray-800/50 pb-1 last:border-0">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
                            <p>Upload files and process to see results.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
