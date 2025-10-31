
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { UploadIcon, CloseIcon } from './icons';
import { LanguageFile, ConversionMode } from '../types';

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
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
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
      if (event.target) event.target.value = '';
    };

    const handleRemoveFile = (fileName: string) => {
      onFilesChange(files.filter(f => f.name !== fileName));
    };
    
    const handleLangCodeChange = (fileName: string, newLangCode: string) => {
      onFilesChange(files.map(f => f.name === fileName ? { ...f, langCode: newLangCode } : f));
    };

    return (
        <>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex-shrink-0">Input (.strings, .stringsdict)</h2>
            {files.length > 0 && (
                <div className="mb-2 flex-shrink-0">
                    <input
                        type="text"
                        placeholder="Search files by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-sm p-2 bg-slate-100 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-violet-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        aria-label="Search input files"
                    />
                </div>
            )}
            <div className="flex-grow overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700 p-2 space-y-2 min-h-[150px]">
                {files.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400"><p>Upload files to begin.</p></div>
                ) : filteredFiles.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400"><p>No files match your search.</p></div>
                ) : (
                    filteredFiles.map((file) => (
                        <div key={file.name} className="flex items-center justify-between p-2 bg-white/70 dark:bg-slate-800/60 rounded-md">
                            <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate pr-2" title={file.name}>{file.name}</span>
                            <div className="flex items-center space-x-2">
                                <input type="text" value={file.langCode} onChange={(e) => handleLangCodeChange(file.name, e.target.value)} placeholder="lang" className="w-20 text-sm p-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-violet-500 focus:outline-none" aria-label={`Language code for ${file.name}`}/>
                                <button onClick={() => handleRemoveFile(file.name)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><CloseIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {error && <p className="text-sm text-red-400 mt-2 flex-shrink-0">{error}</p>}
            <div className="flex items-center justify-between mt-4 flex-shrink-0">
                <button onClick={handleUploadClick} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-200/70 dark:hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-violet-500 transition-all">
                    <UploadIcon className="w-4 h-4" /><span>Upload Files</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".strings,.stringsdict" className="hidden" multiple />
                <button onClick={onConvert} disabled={isLoading || files.length === 0} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-md shadow-sm hover:bg-violet-700 disabled:bg-violet-600/50 dark:disabled:bg-violet-800/50 disabled:text-slate-100 dark:disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-violet-500 transition-all">
                    {isLoading ? 'Converting...' : 'Convert'}
                </button>
            </div>
        </>
    );
  }

  // --- RENDER FOR catalogToStrings ---
  const renderCatalogToStrings = () => {
    const { catalogFile, onCatalogFileChange, onConvert, isLoading, error, setError } = props;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError(null);
        try {
            const read = await readFile(file);
            onCatalogFileChange(read);
        } catch (err) {
            setError("An error occurred while reading the file.");
        }
        if (event.target) event.target.value = '';
    };

    return (
        <>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex-shrink-0">Input (.xcstrings)</h2>
            <div className="flex-grow overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700 p-2 space-y-2 min-h-[150px]">
                {catalogFile ? (
                     <div className="flex items-center justify-between p-2 bg-white/70 dark:bg-slate-800/60 rounded-md h-full">
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate pr-2" title={catalogFile.name}>{catalogFile.name}</span>
                        <button onClick={() => onCatalogFileChange(null)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"><CloseIcon className="w-4 h-4" /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400"><p>Upload an .xcstrings file to begin.</p></div>
                )}
            </div>
            {error && <p className="text-sm text-red-400 mt-2 flex-shrink-0">{error}</p>}
            <div className="flex items-center justify-between mt-4 flex-shrink-0">
                <button onClick={handleUploadClick} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm hover:bg-slate-200/70 dark:hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-violet-500 transition-all">
                    <UploadIcon className="w-4 h-4" /><span>Upload File</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xcstrings" className="hidden" />
                <button onClick={onConvert} disabled={isLoading || !catalogFile} className="px-6 py-2 text-sm font-semibold text-white bg-violet-600 rounded-md shadow-sm hover:bg-violet-700 disabled:bg-violet-600/50 dark:disabled:bg-violet-800/50 disabled:text-slate-100 dark:disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-violet-500 transition-all">
                    {isLoading ? 'Converting...' : 'Convert'}
                </button>
            </div>
        </>
    );
  }

  return (
    <div className="flex flex-col bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg h-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      {props.conversionMode === 'stringsToCatalog' ? renderStringsToCatalog() : renderCatalogToStrings()}
    </div>
  );
};