
import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, CloseIcon, KeyIcon, TrashIcon, UploadIcon, SparklesIcon } from './icons';
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
        <div className="w-full max-w-7xl h-[90vh] min-h-[700px] flex flex-col bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-700">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
                <div className="flex-1">
                    <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </button>
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="flex items-center space-x-2">
                        <KeyIcon className="w-5 h-5 text-red-500" />
                        <h1 className="text-md font-bold text-slate-200">Key Renamer</h1>
                    </div>
                </div>
                <div className="flex-1 flex justify-end">
                     <button onClick={handleClearAll} title="Clear All" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* Inputs Column */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    
                    {/* Source File Input */}
                    <div className="bg-black/30 p-4 rounded-lg border border-slate-700 shadow-lg">
                        <h2 className="text-sm font-semibold text-slate-100 mb-2 flex justify-between">
                            <span>1. Source File</span>
                            <span className="text-xs text-slate-400 font-normal self-center">(e.g. albanian.strings)</span>
                        </h2>
                        {sourceFile ? (
                             <div className="flex items-center justify-between p-2 bg-slate-800 rounded-md border border-slate-600">
                                <span className="text-sm font-mono text-slate-300 truncate pr-2">{sourceFile.name}</span>
                                <button onClick={() => setSourceFile(null)} className="text-slate-400 hover:text-red-500"><CloseIcon className="w-4 h-4"/></button>
                            </div>
                        ) : (
                            <button onClick={() => sourceInputRef.current?.click()} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-md hover:bg-slate-800/50 hover:border-red-500/50 transition-all text-slate-400 text-sm">
                                <UploadIcon className="w-4 h-4 mr-2"/> Upload Source .strings
                            </button>
                        )}
                        <input type="file" ref={sourceInputRef} onChange={handleSourceUpload} accept=".strings" className="hidden" />
                    </div>

                    {/* Key Comparable Input */}
                    <div className="bg-black/30 p-4 rounded-lg border border-slate-700 shadow-lg">
                        <h2 className="text-sm font-semibold text-slate-100 mb-2 flex justify-between">
                            <span>2. Key-Comparable File</span>
                            <span className="text-xs text-slate-400 font-normal self-center">(e.g. OldLocalizable.strings)</span>
                        </h2>
                        <p className="text-xs text-slate-500 mb-2">Used to map Source Keys to values.</p>
                        {keyCompFile ? (
                             <div className="flex items-center justify-between p-2 bg-slate-800 rounded-md border border-slate-600">
                                <span className="text-sm font-mono text-slate-300 truncate pr-2">{keyCompFile.name}</span>
                                <button onClick={() => setKeyCompFile(null)} className="text-slate-400 hover:text-red-500"><CloseIcon className="w-4 h-4"/></button>
                            </div>
                        ) : (
                            <button onClick={() => keyCompInputRef.current?.click()} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-md hover:bg-slate-800/50 hover:border-red-500/50 transition-all text-slate-400 text-sm">
                                <UploadIcon className="w-4 h-4 mr-2"/> Upload Key-Comparable
                            </button>
                        )}
                        <input type="file" ref={keyCompInputRef} onChange={handleKeyCompUpload} accept=".strings" className="hidden" />
                    </div>

                    {/* Value Comparable Inputs */}
                    <div className="bg-black/30 p-4 rounded-lg border border-slate-700 shadow-lg flex-grow flex flex-col">
                        <h2 className="text-sm font-semibold text-slate-100 mb-2 flex justify-between">
                            <span>3. Value-Comparable Files</span>
                            <span className="text-xs text-slate-400 font-normal self-center">(NewLocalizable files)</span>
                        </h2>
                         <p className="text-xs text-slate-500 mb-2">Used to find new keys based on matching values.</p>
                        
                        <div className="flex-grow overflow-y-auto space-y-2 mb-2 min-h-[100px] max-h-[300px]">
                            {valCompFiles.map(f => (
                                <div key={f.name} className="flex items-center justify-between p-2 bg-slate-800 rounded-md border border-slate-600">
                                    <span className="text-sm font-mono text-slate-300 truncate pr-2">{f.name}</span>
                                    <button onClick={() => removeValCompFile(f.name)} className="text-slate-400 hover:text-red-500"><CloseIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                            {valCompFiles.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No files uploaded yet.</p>}
                        </div>

                        <button onClick={() => valCompInputRef.current?.click()} className="w-full flex items-center justify-center p-3 border border-slate-600 bg-slate-800/50 rounded-md hover:bg-slate-700 transition-all text-slate-300 text-sm">
                            <UploadIcon className="w-4 h-4 mr-2"/> Add Files
                        </button>
                        <input type="file" ref={valCompInputRef} onChange={handleValCompUpload} accept=".strings" multiple className="hidden" />
                    </div>
                    
                    <button 
                        onClick={processRenaming} 
                        disabled={isLoading || !sourceFile || !keyCompFile || valCompFiles.length === 0}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span>Process Renaming</span>
                            </>
                        )}
                    </button>
                     {error && <p className="text-sm text-red-400 mt-2 text-center bg-red-900/20 p-2 rounded border border-red-900/50">{error}</p>}

                </div>

                {/* Output Column */}
                <div className="flex flex-col bg-black/30 p-4 rounded-lg border border-slate-700 shadow-lg overflow-hidden">
                    <h2 className="text-lg font-semibold text-slate-100 mb-3 flex-shrink-0">Output & Logs</h2>
                    
                    {outputContent ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="flex-1 min-h-0 mb-4">
                                <CodeBlock 
                                    content={outputContent} 
                                    language="strings" 
                                    fileName={`Renamed_${sourceFile?.name || 'result.strings'}`} 
                                />
                            </div>
                            <div className="h-1/3 min-h-[150px] flex flex-col bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
                                <div className="px-3 py-2 bg-slate-800 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Change Log
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-slate-300 space-y-1">
                                    {renameLog.map((log, i) => (
                                        <div key={i} className="border-b border-slate-800/50 pb-1 last:border-0">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900/50 rounded-lg">
                            <p>Upload files and process to see results.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
