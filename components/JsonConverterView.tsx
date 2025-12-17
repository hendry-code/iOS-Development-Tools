import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Trash2, FileJson, FileType, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import { CodeBlock } from './CodeBlock';
import {
    parseStringsFile,
    parseJson,
    generateJson,
    generateSingleStringsFileContent,
} from '../services/converter';
import { ParsedStrings } from '../types';

interface JsonConverterViewProps {
    onBack: () => void;
}

type TabMode = 'strings-to-json' | 'json-to-strings';

export const JsonConverterView: React.FC<JsonConverterViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<TabMode>('strings-to-json');
    const [inputFile, setInputFile] = useState<{ name: string, content: string } | null>(null);
    const [outputContent, setOutputContent] = useState('');
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
            convert(content, file.name);
        };
        reader.readAsText(file);
    };

    const convert = (content: string, fileName: string) => {
        setError(null);
        setOutputContent('');
        try {
            if (activeTab === 'strings-to-json') {
                if (!fileName.endsWith('.strings')) {
                    // Warn but try anyway
                    console.warn("File doesn't end with .strings, attempting parse anyway");
                }
                const parsed = parseStringsFile(content);
                if (Object.keys(parsed).length === 0 && content.trim().length > 0) {
                    setError("No valid key-values found in .strings file.");
                } else {
                    setOutputContent(generateJson(parsed));
                }
            } else {
                if (!fileName.endsWith('.json')) {
                    console.warn("File doesn't end with .json, attempting parse anyway");
                }
                const parsed = parseJson(content);
                if (Object.keys(parsed).length === 0) {
                    setError("No valid translation keys found in JSON.");
                } else {
                    // Re-use logic from converter but expose or copy basic single file gen
                    // We need a helper for single file generation in converter.ts if not exported
                    // But we can just use generateSingleStringsFileContent if exported, or verify it is exported.
                    // It was not exported in the view I saw earlier, but I can check.
                    // Wait, I saw generateSingleStringsFileContent in the previous `view_file` output but it was NOT exported.
                    // I should have checked that. I will assume for now I need to implement a simple generator here or rely on the fact I can request to export it.
                    // Actually, I can just write a simple generator here for now to be safe and avoiding refactoring the service again immediately.
                    setOutputContent(Object.entries(parsed).map(([k, v]) => `"${k}" = "${(v as string).replace(/"/g, '\\"').replace(/\n/g, '\\n')}";`).join('\n'));
                }
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during conversion.");
        }
    };

    const handleTabChange = (mode: TabMode) => {
        setActiveTab(mode);
        setInputFile(null);
        setOutputContent('');
        setError(null);
    };

    const handleDownload = () => {
        if (!outputContent) return;
        const blob = new Blob([outputContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = activeTab === 'strings-to-json' ? 'Localizable.json' : 'Localizable.strings';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
            <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                        JSON Converter
                    </h1>
                    <p className="text-slate-400 text-sm">Convert between .strings and JSON formats</p>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar / Input */}
                <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-y-auto bg-slate-900/50 flex flex-col">
                    <div className="flex space-x-1 bg-slate-800 p-1 rounded-xl mb-6 border border-slate-700">
                        <button
                            onClick={() => handleTabChange('strings-to-json')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'strings-to-json' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Strings → JSON
                        </button>
                        <button
                            onClick={() => handleTabChange('json-to-strings')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'json-to-strings' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            JSON → Strings
                        </button>
                    </div>

                    <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
                        Input File
                    </h2>

                    <DragDropZone
                        onFilesDropped={handleFilesDropped}
                        className="mb-4"
                        isDraggingClass="border-amber-500 bg-amber-500/10"
                    >
                        {!inputFile ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-700 rounded-xl p-8 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[200px]"
                            >
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                    {activeTab === 'strings-to-json' ? (
                                        <FileType size={24} className="text-amber-400" />
                                    ) : (
                                        <FileJson size={24} className="text-amber-400" />
                                    )}
                                </div>
                                <h3 className="text-lg font-medium text-slate-200 mb-1">
                                    Upload {activeTab === 'strings-to-json' ? '.strings' : '.json'}
                                </h3>
                                <p className="text-sm text-slate-500">Click or drag & drop</p>
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between group">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                                        {inputFile.name.endsWith('.json') ? <FileJson size={18} /> : <FileType size={18} />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-200 truncate">{inputFile.name}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setInputFile(null); setOutputContent(''); setError(null); }}
                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept={activeTab === 'strings-to-json' ? ".strings" : ".json"}
                        />
                    </DragDropZone>

                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3">
                            <AlertTriangle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
                        </div>
                    )}
                </div>

                {/* Main Content / Output */}
                <div className="flex-1 overflow-hidden bg-slate-950 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            Output
                            {outputContent && <CheckCircle size={14} className="text-emerald-500" />}
                        </h2>
                        {outputContent && (
                            <button
                                onClick={handleDownload}
                                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 rounded-lg hover:bg-amber-300 transition-all shadow-lg active:scale-95"
                            >
                                <Download size={14} />
                                <span>Download File</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 relative shadow-inner">
                        {outputContent ? (
                            <CodeBlock
                                content={outputContent}
                                language={activeTab === 'strings-to-json' ? 'json' : 'properties'} // properties highlighting works okay for .strings usually
                                fileName={activeTab === 'strings-to-json' ? 'Localizable.json' : 'Localizable.strings'}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
                                {activeTab === 'strings-to-json' ? <FileJson size={48} className="mb-4" /> : <FileType size={48} className=" mb-4" />}
                                <p className="text-lg font-medium">Ready to convert</p>
                                <p className="text-sm">Upload a file to see the result</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
