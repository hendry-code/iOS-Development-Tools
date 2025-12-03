import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, UploadIcon, CloseIcon, SaveIcon, CombineIcon } from './icons';
import { LanguageFile } from '../types';
import { mergeStringsIntoCatalog } from '../services/converter';

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
        if (event.target) event.target.value = '';
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
                        <CombineIcon className="w-5 h-5 text-red-500" />
                        <h1 className="text-md font-bold text-slate-200">Merge Strings into Catalog</h1>
                    </div>
                </div>
                <div className="flex-1"></div>
            </header>

            <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* Input Panel */}
                <div className="flex flex-col bg-black/30 p-4 rounded-lg h-full overflow-hidden border border-slate-700 shadow-lg space-y-4">

                    {/* Source Catalog Section */}
                    <div className="flex-shrink-0">
                        <h2 className="text-lg font-semibold text-slate-100 mb-2">1. Source Catalog (.xcstrings)</h2>
                        <div className="bg-slate-900/50 rounded-md shadow-inner border border-slate-700 p-2">
                            {sourceCatalog ? (
                                <div className="flex items-center justify-between p-2 bg-slate-800 rounded-md">
                                    <span className="text-sm font-mono text-slate-300 truncate pr-2" title={sourceCatalog.name}>{sourceCatalog.name}</span>
                                    <button onClick={() => setSourceCatalog(null)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><CloseIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-4 text-slate-400 border-2 border-dashed border-slate-700 rounded-md hover:border-slate-500 transition-colors cursor-pointer" onClick={() => catalogInputRef.current?.click()}>
                                    <div className="text-center">
                                        <UploadIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Click to upload .xcstrings</p>
                                    </div>
                                </div>
                            )}
                            <input type="file" ref={catalogInputRef} onChange={handleCatalogUpload} accept=".xcstrings" className="hidden" />
                        </div>
                    </div>

                    {/* Strings Files Section */}
                    <div className="flex-grow flex flex-col min-h-0">
                        <h2 className="text-lg font-semibold text-slate-100 mb-2">2. Translations (.strings)</h2>
                        <div className="flex-grow overflow-y-auto bg-slate-900/50 rounded-md shadow-inner border border-slate-700 p-2 space-y-2">
                            {stringsFiles.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-700 rounded-md hover:border-slate-500 transition-colors cursor-pointer" onClick={() => stringsInputRef.current?.click()}>
                                    <div className="text-center">
                                        <UploadIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Click to upload .strings files</p>
                                    </div>
                                </div>
                            ) : (
                                stringsFiles.map((file) => (
                                    <div key={file.name} className="flex items-center justify-between p-2 bg-slate-800 rounded-md">
                                        <span className="text-sm font-mono text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                                        <div className="flex items-center space-x-2">
                                            <input type="text" value={file.langCode} onChange={(e) => handleLangCodeChange(file.name, e.target.value)} placeholder="lang" className="w-20 text-sm p-1 bg-slate-700 border border-slate-600 rounded-md focus:ring-1 focus:ring-red-500 focus:outline-none" />
                                            <button onClick={() => handleRemoveStringsFile(file.name)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><CloseIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-2 flex justify-end">
                            <button onClick={() => stringsInputRef.current?.click()} className="text-sm text-red-400 hover:text-red-300 flex items-center space-x-1">
                                <UploadIcon className="w-4 h-4" /> <span>Add more files</span>
                            </button>
                            <input type="file" ref={stringsInputRef} onChange={handleStringsUpload} accept=".strings" className="hidden" multiple />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-400 flex-shrink-0">{error}</p>}

                    <div className="flex-shrink-0 pt-2">
                        <button onClick={handleMerge} disabled={isLoading || !sourceCatalog || stringsFiles.length === 0} className="w-full py-3 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-900 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all">
                            {isLoading ? 'Merging...' : 'Merge Files'}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col bg-black/30 p-4 rounded-lg h-full overflow-hidden border border-slate-700 shadow-lg">
                    <h2 className="text-lg font-semibold text-slate-100 mb-3 flex-shrink-0">Output (.xcstrings)</h2>
                    <div className="flex-grow relative bg-slate-900/50 rounded-md shadow-inner border border-slate-700 overflow-hidden">
                        {mergedOutput ? (
                            <textarea
                                readOnly
                                value={mergedOutput}
                                className="w-full h-full p-4 bg-transparent text-slate-300 font-mono text-xs resize-none focus:outline-none"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                                Output will appear here...
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end flex-shrink-0">
                        <button onClick={handleDownload} disabled={!mergedOutput} className="flex items-center space-x-2 px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all">
                            <SaveIcon className="w-4 h-4" />
                            <span>Download Result</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
