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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;
        setError(null);
        try {
            const promises = Array.from(selectedFiles).map(readFileContent);
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
        if (event.target) event.target.value = '';
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
        <div className="flex flex-col h-full space-y-6 p-8">
            <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <FileJson className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Convert to .properties</h1>
                            <p className="text-xs text-gray-400">Convert iOS/Android files to Java properties</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleClearProject} title="Clear All" className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </header>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Input Panel */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Input Files</h2>
                    <div className="flex-grow overflow-y-auto bg-gray-900/30 rounded-lg border border-gray-800 p-2 space-y-2 min-h-[150px] custom-scrollbar">
                        {inputFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Upload size={24} className="opacity-50" />
                                <p className="text-sm">Upload files to begin</p>
                            </div>
                        ) : (
                            inputFiles.map(file => (
                                <div key={file.name} className="flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800 rounded-md group transition-colors border border-transparent hover:border-gray-700">
                                    <span className="text-sm font-mono text-gray-300 truncate pr-2" title={file.name}>{file.name}</span>
                                    <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    {error && <p className="text-xs text-red-400 mt-2 flex-shrink-0 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
                    <div className="flex items-center justify-between mt-4 flex-shrink-0 gap-3">
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all active:scale-95">
                            <Upload size={16} />
                            <span>Add Files</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml" className="hidden" multiple />
                        <button onClick={() => handleConvert(inputFiles)} disabled={isLoading || inputFiles.length === 0} className="flex-1 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                            {isLoading ? 'Processing...' : 'Convert'}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Output (.properties)</h2>
                    <div className="flex-grow overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900/50">
                        {outputContent ? (
                            <CodeBlock
                                content={outputContent}
                                language="properties"
                                fileName="strings.properties"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
                                <p>Output will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};