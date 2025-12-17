import React, { useState, useRef } from 'react';
import { ParsedStrings } from '../types';
import {
    parseStringsFile,
    parseStringsDictFile,
    parseAndroidXml,
    generatePropertiesFile,
} from '../services/converter';
import {
    ArrowLeft,
    X,
    FileJson,
    Trash2,
    Upload,
} from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { DragDropZone } from './DragDropZone';

interface PropertiesConverterViewProps {
    onBack: () => void;
}

const readFileContent = (file: File): Promise<{ name: string; content: string }> => {
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

export const PropertiesConverterView: React.FC<PropertiesConverterViewProps> = ({ onBack }) => {
    const [inputFiles, setInputFiles] = useState<{ name: string, content: string }[]>([]);
    const [outputContent, setOutputContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFiles = async (filesToProcess: FileList | null) => {
        if (!filesToProcess || filesToProcess.length === 0) return;
        setError(null);
        try {
            const promises = Array.from(filesToProcess).map(readFileContent);
            const newlyReadFiles = await Promise.all(promises);
            const existingFileNames = new Set(inputFiles.map(f => f.name));
            const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));
            if (uniqueNewFiles.length > 0) {
                const updatedFiles = [...inputFiles, ...uniqueNewFiles];
                setInputFiles(updatedFiles);
                handleConvert(updatedFiles);
            }
        } catch (err) {
            setError("An error occurred while reading one or more files.");
        }
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        await processFiles(event.target.files);
        if (event.target) event.target.value = '';
    };

    const handleFilesDropped = async (files: FileList) => {
        await processFiles(files);
    };

    const handleRemoveFile = (fileName: string) => {
        const updatedFiles = inputFiles.filter(f => f.name !== fileName);
        setInputFiles(updatedFiles);
        handleConvert(updatedFiles);
    };

    const handleConvert = (filesToProcess: { name: string, content: string }[]) => {
        if (filesToProcess.length === 0) {
            setOutputContent('');
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        setTimeout(() => {
            try {
                const allStrings: ParsedStrings = {};
                for (const file of filesToProcess) {
                    let parsed: ParsedStrings = {};
                    if (file.name.endsWith('.strings')) {
                        parsed = parseStringsFile(file.content);
                    } else if (file.name.endsWith('.stringsdict')) {
                        parsed = parseStringsDictFile(file.content);
                    } else if (file.name.endsWith('.xml')) {
                        parsed = parseAndroidXml(file.content);
                    } else {
                        // Skip unsupported files
                        continue;
                    }
                    Object.assign(allStrings, parsed);
                }

                if (Object.keys(allStrings).length === 0) {
                    setError("No localizable strings found in the uploaded files.");
                    setOutputContent('');
                } else {
                    setOutputContent(generatePropertiesFile(allStrings));
                }
            } catch (e: any) {
                setError(e.message || 'An unexpected error occurred during conversion.');
                setOutputContent('');
            } finally {
                setIsLoading(false);
            }
        }, 300);
    };

    const handleClearProject = () => {
        setInputFiles([]);
        setOutputContent('');
        setError(null);
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
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                        Properties Converter
                    </h1>
                    <p className="text-slate-400 text-sm">Convert iOS/Android files to Java properties</p>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
                {/* Input Panel */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-visible md:overflow-y-auto bg-slate-900/50 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Input Files
                        </h2>
                        {inputFiles.length > 0 && (
                            <button onClick={handleClearProject} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                                <Trash2 size={12} /> Clear All
                            </button>
                        )}
                    </div>

                    <DragDropZone
                        onFilesDropped={handleFilesDropped}
                        className="flex-grow flex flex-col min-h-[150px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800/20"
                        isDraggingClass="border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/50"
                    >
                        <div className="flex-grow overflow-y-auto p-2 space-y-2 h-full custom-scrollbar">
                            {inputFiles.length === 0 ? (
                                <div
                                    className="flex flex-col items-center justify-center h-full text-slate-500 cursor-pointer hover:bg-slate-800/30 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                        <Upload size={20} className="text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-400">Drag & Drop files</p>
                                    <p className="text-xs text-slate-600 mt-1">.strings, .stringsdict, .xml</p>
                                </div>
                            ) : (
                                inputFiles.map(file => (
                                    <div key={file.name} className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg group transition-colors border border-slate-700 hover:border-slate-600">
                                        <span className="text-sm font-mono text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                                        <button onClick={() => handleRemoveFile(file.name)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </DragDropZone>

                    {error && (
                        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <p className="text-xs text-rose-300">{error}</p>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:text-white transition-all active:scale-95"
                        >
                            <Upload size={16} />
                            <span>Add Files</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml" className="hidden" multiple />

                        <button
                            onClick={() => handleConvert(inputFiles)}
                            disabled={isLoading || inputFiles.length === 0}
                            className="w-full px-6 py-3.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            {isLoading ? 'Processing...' : 'Convert to Properties'}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-400 mb-3 flex-shrink-0 uppercase tracking-wider">Output Result</h2>
                    <div className="flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-inner relative">
                        {outputContent ? (
                            <CodeBlock
                                content={outputContent}
                                language="properties"
                                fileName="strings.properties"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <FileJson size={48} className="mb-4" />
                                <p className="text-lg font-medium">Ready to convert</p>
                                <p className="text-sm">Upload files to generate properties</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};