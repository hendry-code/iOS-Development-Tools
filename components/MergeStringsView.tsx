import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, X, Save, Merge, FileText, Plus } from 'lucide-react';
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
        <div className="flex flex-col min-h-screen md:h-full space-y-6 p-4 md:p-8">
            <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Merge className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Merge Strings</h1>
                            <p className="text-xs text-gray-400">Merge translations into catalog</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Input Panel */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl min-h-[500px] md:h-full md:overflow-hidden border border-gray-700/50 shadow-lg space-y-4">

                    {/* Source Catalog Section */}
                    <div className="flex-shrink-0">
                        <h2 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">1</div>
                            Source Catalog (.xcstrings)
                        </h2>
                        <div className="bg-gray-900/30 rounded-lg border border-gray-700/50 p-2">
                            <DragDropZone
                                onFilesDropped={handleCatalogDropped}
                                className="w-full h-full"
                                isDraggingClass="border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
                            >
                                {sourceCatalog ? (
                                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md border border-gray-700/50">
                                        <span className="text-sm font-mono text-gray-300 truncate pr-2" title={sourceCatalog.name}>{sourceCatalog.name}</span>
                                        <button onClick={() => setSourceCatalog(null)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <button
                                        className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 hover:border-purple-500/50 transition-all cursor-pointer group"
                                        onClick={() => catalogInputRef.current?.click()}
                                    >
                                        <Upload className="w-6 h-6 mb-2 text-gray-500 group-hover:text-purple-400 transition-colors" />
                                        <p className="text-xs text-gray-400">Drag & Drop or Upload .xcstrings</p>
                                    </button>
                                )}
                            </DragDropZone>
                            <input type="file" ref={catalogInputRef} onChange={handleCatalogUpload} accept=".xcstrings" className="hidden" />
                        </div>
                    </div>

                    {/* Strings Files Section */}
                    <div className="flex-grow flex flex-col min-h-0">
                        <h2 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">2</div>
                            Translations (.strings)
                        </h2>
                        <DragDropZone
                            onFilesDropped={handleStringsDropped}
                            className="flex-grow flex flex-col min-h-0 overflow-hidden"
                            isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                        >
                            <div className="flex-grow overflow-y-auto bg-gray-900/30 rounded-lg border border-gray-700/50 p-2 space-y-2 custom-scrollbar h-full">
                                {stringsFiles.length === 0 ? (
                                    <button
                                        className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg hover:bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer group min-h-[100px]"
                                        onClick={() => stringsInputRef.current?.click()}
                                    >
                                        <Upload className="w-6 h-6 mb-2 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                        <p className="text-xs text-gray-400">Drag & Drop or Upload .strings files</p>
                                    </button>
                                ) : (
                                    stringsFiles.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-md border border-gray-700/50 hover:border-gray-600 transition-colors">
                                            <span className="text-sm font-mono text-gray-300 truncate pr-2" title={file.name}>{file.name}</span>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={file.langCode}
                                                    onChange={(e) => handleLangCodeChange(file.name, e.target.value)}
                                                    placeholder="lang"
                                                    className="w-16 text-xs p-1 bg-gray-900 border border-gray-700 rounded text-gray-400 focus:text-white focus:border-blue-500 focus:outline-none text-center"
                                                />
                                                <button onClick={() => handleRemoveStringsFile(file.name)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><X size={14} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DragDropZone>
                        <div className="mt-2 flex justify-end">
                            <button onClick={() => stringsInputRef.current?.click()} className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 px-2 py-1 rounded hover:bg-blue-500/10 transition-colors">
                                <Plus size={14} /> <span>Add more files</span>
                            </button>
                            <input type="file" ref={stringsInputRef} onChange={handleStringsUpload} accept=".strings" className="hidden" multiple />
                        </div>
                    </div>

                    {error && <p className="text-xs text-red-400 flex-shrink-0 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

                    <div className="flex-shrink-0 pt-2">
                        <button
                            onClick={handleMerge}
                            disabled={isLoading || !sourceCatalog || stringsFiles.length === 0}
                            className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Merging...' : (
                                <>
                                    <Merge size={16} /> Merge Files
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl min-h-[400px] md:h-full md:overflow-hidden border border-gray-700/50 shadow-lg">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Output (.xcstrings)</h2>
                    <div className="flex-grow relative bg-gray-900/50 rounded-lg shadow-inner border border-gray-700/50 overflow-hidden">
                        {mergedOutput ? (
                            <textarea
                                readOnly
                                value={mergedOutput}
                                className="w-full h-full p-4 bg-transparent text-gray-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-sm border-2 border-dashed border-gray-800 rounded-lg m-2">
                                Output will appear here...
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end flex-shrink-0">
                        <button
                            onClick={handleDownload}
                            disabled={!mergedOutput}
                            className="flex items-center space-x-2 px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-lg shadow-green-500/20 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <Save size={16} />
                            <span>Download Result</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
