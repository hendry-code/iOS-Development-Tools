import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { LanguageFile, ConversionMode } from '../types';
import { DragDropZone } from './DragDropZone';

interface InputPanelProps {
    conversionMode: ConversionMode;
    // For stringsToCatalog mode
    files: LanguageFile[];
    onFilesChange: (files: LanguageFile[]) => void;
    // For catalogToStrings mode
    catalogFile: LanguageFile | null;
    onCatalogFileChange: (file: LanguageFile | null) => void;
    // Common
    onConvert: () => void;
    isLoading: boolean;
    error: string | null;
    setError: (error: string | null) => void;
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


export const InputPanel: React.FC<InputPanelProps> = (props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Reset search term if we are in stringsToCatalog mode and all files are removed
        if (props.conversionMode === 'stringsToCatalog' && props.files.length === 0 && searchTerm) {
            setSearchTerm('');
        }
    }, [props.files, props.conversionMode, searchTerm]);


    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // --- RENDER FOR stringsToCatalog ---
    const renderStringsToCatalog = () => {
        const { files, onFilesChange, onConvert, isLoading, error, setError } = props;

        const filteredFiles = useMemo(() => {
            if (!searchTerm) return files;
            return files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [files, searchTerm]);

        const processFiles = async (selectedFiles: FileList | null) => {
            if (!selectedFiles || selectedFiles.length === 0) return;
            setError(null);
            try {
                const promises = Array.from(selectedFiles).map(readFile);
                const newlyReadFiles = await Promise.all(promises);
                const existingFileNames = new Set(files.map(f => f.name));
                const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));
                if (uniqueNewFiles.length > 0) onFilesChange([...files, ...uniqueNewFiles]);
            } catch (err) {
                setError("An error occurred while reading one or more files.");
            }
        }

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
            await processFiles(event.target.files);
            if (event.target) event.target.value = '';
        };

        const handleFilesDropped = async (droppedFiles: FileList) => {
            await processFiles(droppedFiles);
        };

        const handleRemoveFile = (fileName: string) => {
            onFilesChange(files.filter(f => f.name !== fileName));
        };

        const handleLangCodeChange = (fileName: string, newLangCode: string) => {
            onFilesChange(files.map(f => f.name === fileName ? { ...f, langCode: newLangCode } : f));
        };

        return (
            <>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Input Files (.strings, .stringsdict)</h2>
                {files.length > 0 && (
                    <div className="mb-2 flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-sm px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none placeholder:text-gray-600 text-white transition-all"
                        />
                    </div>
                )}
                <DragDropZone
                    onFilesDropped={handleFilesDropped}
                    className="flex-grow flex flex-col min-h-[150px] overflow-hidden"
                    isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                >
                    <div className="flex-grow overflow-y-auto bg-gray-900/30 rounded-lg border border-gray-800 p-2 space-y-2 h-full custom-scrollbar transition-colors">
                        {files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Upload size={24} className="opacity-50" />
                                <p className="text-sm">Drag & Drop or Upload files</p>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500"><p>No files match your search.</p></div>
                        ) : (
                            filteredFiles.map((file) => (
                                <div key={file.name} className="flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800 rounded-md group transition-colors border border-transparent hover:border-gray-700">
                                    <span className="text-sm font-mono text-gray-300 truncate pr-2" title={file.name}>{file.name}</span>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="text"
                                            value={file.langCode}
                                            onChange={(e) => handleLangCodeChange(file.name, e.target.value)}
                                            placeholder="lang"
                                            className="w-16 text-xs p-1 bg-gray-900 border border-gray-700 rounded text-gray-400 focus:text-white focus:border-blue-500 focus:outline-none text-center"
                                        />
                                        <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DragDropZone>
                {error && <p className="text-xs text-red-400 mt-2 flex-shrink-0 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
                <div className="flex items-center justify-between mt-4 flex-shrink-0 gap-3">
                    <button onClick={handleUploadClick} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all active:scale-95">
                        <Upload size={16} /><span>Add Files</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict" className="hidden" multiple />
                    <button
                        onClick={onConvert}
                        disabled={isLoading || files.length === 0}
                        className="flex-1 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {isLoading ? 'Processing...' : 'Convert Files'}
                    </button>
                </div>
            </>
        );
    }

    // --- RENDER FOR catalogToStrings ---
    const renderCatalogToStrings = () => {
        const { catalogFile, onCatalogFileChange, onConvert, isLoading, error, setError } = props;

        const processFile = async (file: File) => {
            setError(null);
            try {
                const read = await readFile(file);
                onCatalogFileChange(read);
            } catch (err) {
                setError("An error occurred while reading the file.");
            }
        }

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await processFile(file);
            if (event.target) event.target.value = '';
        };

        const handleFilesDropped = async (droppedFiles: FileList) => {
            const file = droppedFiles[0];
            if (!file) return;
            await processFile(file);
        }

        return (
            <>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex-shrink-0 uppercase tracking-wider">Input Catalog (.xcstrings)</h2>
                <DragDropZone
                    onFilesDropped={handleFilesDropped}
                    className="flex-grow flex flex-col min-h-[150px] overflow-hidden"
                    isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
                >
                    <div className="flex-grow overflow-y-auto bg-gray-900/30 rounded-lg border border-gray-800 p-2 space-y-2 h-full custom-scrollbar transition-colors">
                        {catalogFile ? (
                            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md border border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <span className="text-xs font-bold">XC</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 truncate" title={catalogFile.name}>{catalogFile.name}</span>
                                </div>
                                <button onClick={() => onCatalogFileChange(null)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                                <Upload size={24} className="opacity-50" />
                                <p className="text-sm">Drag & Drop or Upload .xcstrings file</p>
                            </div>
                        )}
                    </div>
                </DragDropZone>
                {error && <p className="text-xs text-red-400 mt-2 flex-shrink-0 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
                <div className="flex items-center justify-between mt-4 flex-shrink-0 gap-3">
                    <button onClick={handleUploadClick} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 hover:text-white transition-all active:scale-95">
                        <Upload size={16} /><span>Select File</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xcstrings" className="hidden" />
                    <button
                        onClick={onConvert}
                        disabled={isLoading || !catalogFile}
                        className="flex-1 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {isLoading ? 'Processing...' : 'Extract Catalog'}
                    </button>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col bg-gray-800/30 backdrop-blur-md p-4 rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl">
            {props.conversionMode === 'stringsToCatalog' ? renderStringsToCatalog() : renderCatalogToStrings()}
        </div>
    );
};