import React, { useState } from 'react';
import { LanguageFile, ParsedMultiLanguageStrings, ParsedStrings } from '../types';
import { ArrowLeftIcon, CloseIcon, DownloadIcon, SparklesIcon, UploadIcon } from './icons';
import { LanguageSelector } from './LanguageSelector';
import { parseStringsFile, generateAllStringsFiles, generateIosStringCatalog } from '../services/converter';
import { translateStrings } from '../services/gemini';
import { CodeBlock } from './CodeBlock';

interface AITranslatorViewProps {
  onBack: () => void;
}

const readFile = (file: File): Promise<LanguageFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            name: file.name,
            content: reader.result as string,
            langCode: 'en', // Assume base is English
        });
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};

const FileListItem: React.FC<{ langCode: string; content: string }> = ({ langCode, content }) => {
    const fileName = `${langCode}.strings`;
    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };
    return (
        <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/60 rounded-md">
            <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{fileName}</span>
            <button onClick={handleDownload} title="Download" className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-md transition-colors"><DownloadIcon className="w-4 h-4" /></button>
        </div>
    );
};

export const AITranslatorView: React.FC<AITranslatorViewProps> = ({ onBack }) => {
    const [baseFile, setBaseFile] = useState<LanguageFile | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');
    
    // Outputs
    const [translatedStringsFiles, setTranslatedStringsFiles] = useState<Record<string, string>>({});
    const [iosCatalogOutput, setIosCatalogOutput] = useState<string>('');
    const hasOutput = Object.keys(translatedStringsFiles).length > 0;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError(null);
        setBaseFile(null);
        setTranslatedStringsFiles({});
        setIosCatalogOutput('');
        try {
            const read = await readFile(file);
            setBaseFile(read);
        } catch (err) {
            setError("Error reading the base .strings file.");
        }
    };

    const handleTranslate = async () => {
        if (!baseFile || selectedLanguages.length === 0) {
            setError("Please upload a base file and select at least one language.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setProgress('Parsing base file...');
        try {
            const parsedBaseStrings = parseStringsFile(baseFile.content);

            setProgress(`Translating into ${selectedLanguages.length} language(s)...`);
            const translatedData = await translateStrings(parsedBaseStrings, selectedLanguages);
            
            setProgress('Generating output files...');
            const allStringsFiles = generateAllStringsFiles(translatedData, selectedLanguages);
            setTranslatedStringsFiles(allStringsFiles);

            // For iOS Catalog, we need to merge the base English with the translations
            const combinedData: ParsedMultiLanguageStrings = {};
            Object.keys(parsedBaseStrings).forEach(key => {
                combinedData[key] = { en: parsedBaseStrings[key] };
                selectedLanguages.forEach(lang => {
                    if (translatedData[lang]?.[key]) {
                        combinedData[key][lang] = translatedData[lang][key];
                    }
                });
            });
            const catalog = generateIosStringCatalog(combinedData, 'en');
            setIosCatalogOutput(catalog);

        } catch (e: any) {
            setError(e.message || "An unexpected error occurred during translation.");
        } finally {
            setIsLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="w-full max-w-7xl h-[90vh] min-h-[700px] flex flex-col bg-white/60 dark:bg-slate-800/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex-1">
                    <button onClick={onBack} className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </button>
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="flex items-center space-x-2">
                        <SparklesIcon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                        <h1 className="text-md font-bold text-slate-900 dark:text-slate-200">AI Translator</h1>
                    </div>
                </div>
                <div className="flex-1" />
            </header>

            <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                {/* --- INPUT & CONTROLS --- */}
                <div className="flex flex-col bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">1. Upload Base File</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Upload your English-language `.strings` file.</p>
                        <div className="p-2 bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700">
                            {baseFile ? (
                                <div className="flex items-center justify-between p-2 bg-white/70 dark:bg-slate-800/60 rounded-md">
                                    <span className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate pr-2">{baseFile.name}</span>
                                    <button onClick={() => setBaseFile(null)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-500 rounded-full"><CloseIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                 <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-200/30 dark:bg-slate-800/30 hover:bg-slate-200/50 dark:hover:bg-slate-700/30">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadIcon className="w-8 h-8 mb-3 text-slate-400 dark:text-slate-500" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Click to upload</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleFileChange} accept=".strings" />
                                </label>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-grow flex flex-col min-h-0">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">2. Select Languages</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Choose the languages you want to translate to.</p>
                        <LanguageSelector selected={selectedLanguages} onChange={setSelectedLanguages} />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">3. Generate</h2>
                         <button onClick={handleTranslate} disabled={isLoading || !baseFile || selectedLanguages.length === 0} className="w-full flex justify-center items-center space-x-2 px-6 py-3 text-sm font-semibold text-white bg-violet-600 rounded-md shadow-sm hover:bg-violet-700 disabled:bg-violet-600/50 dark:disabled:bg-violet-800/50 disabled:text-slate-100 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-all">
                            {isLoading ? <span>{progress}</span> : <><SparklesIcon className="w-5 h-5" /><span>Translate Strings</span></>}
                        </button>
                        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
                    </div>
                </div>

                {/* --- OUTPUT --- */}
                <div className="flex flex-col p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg space-y-4 overflow-hidden">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex-shrink-0">Output Files</h2>
                    {!hasOutput ? (
                         <div className="flex-grow flex items-center justify-center h-full text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg">
                            <p>Translations will appear here.</p>
                        </div>
                    ) : (
                       <div className="flex-grow flex flex-col space-y-4 overflow-hidden min-h-0">
                            <div>
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">Individual .strings Files</h3>
                                <div className="max-h-60 overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                                    {Object.entries(translatedStringsFiles).map(([lang, content]) => (
                                        <FileListItem key={lang} langCode={lang} content={content} />
                                    ))}
                                </div>
                            </div>
                             <div className="flex-grow flex flex-col min-h-0">
                                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">iOS String Catalog (.xcstrings)</h3>
                                <CodeBlock content={iosCatalogOutput} language="JSON" fileName="Translated.xcstrings" />
                            </div>
                       </div>
                    )}
                </div>
            </div>
        </div>
    );
};