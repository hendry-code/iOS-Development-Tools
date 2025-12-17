import React, { useState, useRef } from 'react';
import { ArrowLeft, Save, FolderOpen, Trash2, FileType, FileCode, Download, FolderArchive, X } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import JSZip from 'jszip';
import {
    parseStringsFile,
    parseStringsDictFile,
    parseStringCatalog,
    generateSingleAndroidXml,
    generateAllAndroidXml,
} from '../services/converter';

interface XmlConverterViewProps {
    onBack: () => void;
}

export const XmlConverterView: React.FC<XmlConverterViewProps> = ({ onBack }) => {
    const [inputFile, setInputFile] = useState<{ name: string, content: string } | null>(null);
    const [outputs, setOutputs] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) readFile(file);
        if (e.target) e.target.value = '';
    };

    const handleFilesDropped = (files: FileList) => {
        if (files.length > 0) readFile(files[0]);
    };

    const readFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setInputFile({ name: file.name, content });
            // Auto-convert on file load to match modern feel, but can be triggered manually too if needed
            convert(content, file.name);
        };
        reader.readAsText(file);
    };

    const convert = (content: string, fileName: string) => {
        setIsLoading(true);
        setError(null);
        setOutputs({});

        setTimeout(() => {
            try {
                if (fileName.endsWith('.xcstrings')) {
                    const { parsedData, languages } = parseStringCatalog(content);
                    const xmls = generateAllAndroidXml(parsedData, languages);
                    setOutputs(xmls);
                } else if (fileName.endsWith('.strings')) {
                    const parsed = parseStringsFile(content);
                    const xml = generateSingleAndroidXml(parsed);
                    setOutputs({ 'strings.xml': xml });
                } else if (fileName.endsWith('.stringsdict')) {
                    const parsed = parseStringsDictFile(content);
                    const xml = generateSingleAndroidXml(parsed);
                    setOutputs({ 'strings.xml': xml });
                } else {
                    throw new Error("Unsupported file format. Please upload .strings, .stringsdict, or .xcstrings.");
                }
            } catch (err: any) {
                setError(err.message || "An error occurred during conversion.");
            } finally {
                setIsLoading(false);
            }
        }, 300);
    };

    const handleDownloadSingle = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAll = async () => {
        if (Object.keys(outputs).length === 0) return;

        const zip = new JSZip();
        Object.entries(outputs).forEach(([key, content]) => {
            // Check if key is a language code (2-3 chars usually) or a full filename
            if (key === 'strings.xml') {
                zip.file('strings.xml', content as string);
            } else {
                // Assume language code, create folder structure
                zip.folder(`values-${key}`)?.file("strings.xml", content as string);
            }
        });

        try {
            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'android_strings.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e: any) {
            console.error("Failed to generate zip", e);
            setError("Failed to generate zip file.");
        }
    };

    const handleClear = () => {
        setInputFile(null);
        setOutputs({});
        setError(null);
    };

    return (
        <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans">
            <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
                        XML Converter
                    </h1>
                    <p className="text-slate-400 text-sm">Convert .strings, .stringsdict, .xcstrings to Android XML</p>
                </div>
                {/* Placeholder for future save/load actions if aligning strictly with Extract View, 
                     but for now user only asked for UI similarity, not necessarily project persistence. 
                     I will leave the right side clean or add a Clear button. */}
                <div className="ml-auto flex items-center space-x-2">
                    <button onClick={handleClear} title="Clear Project" className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
                {/* Sidebar / Input */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-visible md:overflow-y-auto bg-slate-900/50 flex flex-col min-h-0">
                    <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                        Source File
                    </h2>

                    <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-2 mb-4">
                        <DragDropZone
                            onFilesDropped={handleFilesDropped}
                            className="w-full"
                            isDraggingClass="border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/50"
                        >
                            {inputFile ? (
                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 group">
                                    <div className="flex items-center overflow-hidden">
                                        <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center mr-3 flex-shrink-0">
                                            <FileType size={16} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-200 truncate pr-2" title={inputFile.name}>
                                            {inputFile.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClear();
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-lg hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group relative"
                                >
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-500/10 transition-colors">
                                        <FileType size={20} className="text-slate-500 group-hover:text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
                                        Upload File
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">.xcstrings, .strings, .stringsdict</p>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".strings,.stringsdict,.xcstrings"
                            />
                        </DragDropZone>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                            <p className="text-xs text-rose-300">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={() => inputFile && convert(inputFile.content, inputFile.name)}
                        disabled={isLoading || !inputFile}
                        className="w-full mt-auto py-3.5 text-sm font-bold text-white bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? 'Converting...' : 'Convert to XML'}
                    </button>
                </div>

                {/* Main Content / Output */}
                <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Conversion Results
                        </h2>
                        {Object.keys(outputs).length > 0 && (
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg shadow hover:bg-emerald-500 transition-all active:scale-95"
                            >
                                <FolderArchive size={14} />
                                <span>Download All (ZIP)</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 relative shadow-inner overflow-hidden flex flex-col">
                        {Object.keys(outputs).length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <FileCode size={48} className="mb-4" />
                                <p className="text-lg font-medium">Ready to convert</p>
                                <p className="text-sm">Upload a file to generate XML</p>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto custom-scrollbar p-1">
                                {Object.entries(outputs).map(([key, content]: [string, string]) => {
                                    // Determine display name
                                    const displayName = key === 'strings.xml' ? 'strings.xml' : `values-${key}/strings.xml`;
                                    const downloadName = key === 'strings.xml' ? 'strings.xml' : `strings-${key}.xml`;

                                    return (
                                        <div key={key} className="mb-6 last:mb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                                    {displayName}
                                                </h3>
                                                <button
                                                    onClick={() => handleDownloadSingle(content, downloadName)}
                                                    className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-all active:scale-95"
                                                >
                                                    <Download size={12} />
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                            <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                                                {/* Uses CodeBlock-like styling but as textarea for simple native-like perf, 
                                                    or we can use CodeBlock component if we want syntax highlighting. 
                                                    ExtractCatalogView used textarea. I will use textarea for consistency. */}
                                                <textarea
                                                    readOnly
                                                    value={content}
                                                    className="w-full h-48 p-3 bg-transparent text-slate-300 font-mono text-xs resize-y focus:outline-none custom-scrollbar"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
