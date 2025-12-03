import React, { useState, useEffect, useRef } from 'react';
import { ParsedStrings } from '../types';
import {
  parseStringsFile,
  parseStringsDictFile,
  parseAndroidXml,
  generatePropertiesFile,
} from '../services/converter';
import {
  ArrowLeftIcon,
  CloseIcon,
  PropertiesIcon,
  TrashIcon,
  UploadIcon,
} from './icons';
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
    const [inputFiles, setInputFiles] = useState<{name: string, content: string}[]>([]);
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

    const handleConvert = (filesToProcess: {name: string, content: string}[]) => {
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
        <div className="w-full max-w-7xl h-[90vh] min-h-[700px] flex flex-col bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-700">
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
                <div className="flex-1">
                    <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </button>
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="flex items-center space-x-2">
                        <PropertiesIcon className="w-5 h-5 text-red-500" />
                        <h1 className="text-md font-bold text-slate-200">Convert to .properties</h1>
                    </div>
                </div>
                <div className="flex-1 flex justify-end items-center space-x-2">
                    <button onClick={handleClearProject} title="Clear All" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* Input Panel */}
                <div className="flex flex-col bg-black/30 p-4 rounded-lg h-full overflow-hidden border border-slate-700 shadow-lg">
                    <h2 className="text-lg font-semibold text-slate-100 mb-3 flex-shrink-0">Input (.strings, .stringsdict, .xml)</h2>
                    <div className="flex-grow overflow-y-auto bg-slate-900/50 rounded-md shadow-inner border border-slate-700 p-2 space-y-2 min-h-[150px]">
                        {inputFiles.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>Upload files to begin.</p>
                            </div>
                        ) : (
                            inputFiles.map(file => (
                                <div key={file.name} className="flex items-center justify-between p-2 bg-slate-800 rounded-md">
                                    <span className="text-sm font-mono text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                                    <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    {error && <p className="text-sm text-red-400 mt-2 flex-shrink-0">{error}</p>}
                    <div className="flex items-center justify-between mt-4 flex-shrink-0">
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 border border-slate-600 rounded-md shadow-sm hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all">
                            <UploadIcon className="w-4 h-4" />
                            <span>Upload Files</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict,.xml" className="hidden" multiple />
                        <button onClick={() => handleConvert(inputFiles)} disabled={isLoading || inputFiles.length === 0} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-900 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all">
                            {isLoading ? 'Converting...' : 'Convert'}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col p-4 bg-black/30 rounded-lg h-full overflow-hidden border border-slate-700 shadow-lg">
                    <h2 className="text-lg font-semibold text-slate-100 mb-3 flex-shrink-0">Output (.properties)</h2>
                    <div className="flex-grow overflow-hidden">
                        {outputContent ? (
                            <CodeBlock
                                content={outputContent}
                                language="properties"
                                fileName="strings.properties"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900/50 rounded-lg">
                                <p>Output will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};