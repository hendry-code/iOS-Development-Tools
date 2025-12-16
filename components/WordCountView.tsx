
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, X, Calculator, FileText } from 'lucide-react';
import { LanguageFile } from '../types';
import { calculateTotalWords, WordCountResult, FileWordCount } from '../services/wordCounter';

interface WordCountViewProps {
    onBack: () => void;
}

export const WordCountView: React.FC<WordCountViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<LanguageFile[]>([]);
    const [result, setResult] = useState<WordCountResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const readFile = (file: File): Promise<LanguageFile> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                content: reader.result as string,
                langCode: '', // Not needed for word count
            });
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        try {
            const promises = Array.from(selectedFiles).map(readFile);
            const newlyReadFiles = await Promise.all(promises);

            // Filter out duplicates based on name
            const existingNames = new Set(files.map(f => f.name));
            const uniqueNewFiles = newlyReadFiles.filter(f => !existingNames.has(f.name));

            setFiles(prev => [...prev, ...uniqueNewFiles]);
            setResult(null); // Reset result on file change
        } catch (err) {
            console.error("Error reading files:", err);
        }
        if (event.target) event.target.value = '';
    };

    const handleRemoveFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        setResult(null);
    };

    const handleCount = () => {
        setIsLoading(true);
        setTimeout(() => {
            const res = calculateTotalWords(files);
            setResult(res);
            setIsLoading(false);
        }, 500); // Fake delay for UX
    };

    return (
        <div className="flex flex-col min-h-screen md:h-full space-y-6 p-4 md:p-8">
            <header className="flex items-center gap-4 pb-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/20 rounded-lg">
                        <Calculator className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Words Count</h1>
                        <p className="text-xs text-gray-400">Count words in .xcstrings, .strings, .xml, and .stringsdict files</p>
                    </div>
                </div>
            </header>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Input Section */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Input Files</h2>

                    <div className="flex-grow overflow-y-auto bg-gray-900/30 rounded-lg border border-gray-800 p-2 space-y-2 min-h-[150px] custom-scrollbar">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Upload size={24} className="opacity-50" />
                                <p className="text-sm">Upload files to begin</p>
                            </div>
                        ) : (
                            files.map((file) => (
                                <div key={file.name} className="flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800 rounded-md group transition-colors border border-transparent hover:border-gray-700">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                        <span className="text-sm font-mono text-gray-300 truncate" title={file.name}>{file.name}</span>
                                    </div>
                                    <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-4 flex-shrink-0 gap-3">
                        <button onClick={handleUploadClick} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all active:scale-95">
                            <Upload size={16} /><span>Add Files</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xcstrings,.strings,.xml,.stringsdict"
                            className="hidden"
                            multiple
                        />
                        <button
                            onClick={handleCount}
                            disabled={isLoading || files.length === 0}
                            className="flex-1 px-6 py-2 text-sm font-semibold text-white bg-teal-600 rounded-md hover:bg-teal-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-teal-500/20"
                        >
                            {isLoading ? 'Counting...' : 'Count Words'}
                        </button>
                    </div>
                </div>

                {/* Result Section */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl relative">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Results</h2>

                    {result ? (
                        <div className="flex flex-col h-full animate-in fade-in duration-500">
                            <div className="flex flex-col items-center justify-center py-8 border-b border-gray-700/50">
                                <span className="text-gray-400 text-sm mb-2">Total Words</span>
                                <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 drop-shadow-lg">
                                    {result.totalWords.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex-grow overflow-y-auto mt-4 space-y-2 custom-scrollbar">
                                {Object.entries(result.fileCounts).map(([name, count]: [string, FileWordCount]) => (
                                    <div key={name} className="flex flex-col p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-300 truncate max-w-[70%]">{name}</span>
                                            <span className="text-sm font-bold text-teal-400">{count.total.toLocaleString()}</span>
                                        </div>
                                        {count.byLanguage && (
                                            <div className="mt-2 pl-4 border-l-2 border-gray-700/50 space-y-1">
                                                {Object.entries(count.byLanguage).map(([lang, langCount]) => (
                                                    <div key={lang} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-500">{lang}</span>
                                                        <span className="text-gray-400">{langCount.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                                <Calculator size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm">Run word count to see results</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
