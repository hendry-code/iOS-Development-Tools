import React, { useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import ReactJson from 'react-json-view';
import {
    Copy,
    Download,
    Trash2,
    FileJson,
    FileCode,
    LayoutList,
    Braces,
    AlignLeft,
    Minimize2,
    ArrowLeft,
    Upload,
    Link,
    AlertCircle,
    Maximize2,
    Minimize
} from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import {
    formatJson,
    minifyJson,
    validateJson,
    jsonToXml,
    jsonToYaml,
    jsonToCsv,
    ValidationResult
} from '../services/jsonFormatterService';

interface JsonFormatterViewProps {
    onBack: () => void;
}

export function JsonFormatterView({ onBack }: JsonFormatterViewProps) {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<ValidationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'code' | 'tree'>('code');
    const [isLoading, setIsLoading] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);

    // State for Tree View collapse level: true=all, false=none, integer=depth
    const [treeCollapsed, setTreeCollapsed] = useState<boolean | number>(1);

    // Ref for Monaco Editor instance
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    const handleInputChange = (value: string | undefined) => {
        const newValue = value || '';
        setInput(newValue);
        if (newValue.trim()) {
            const validation = validateJson(newValue);
            setError(validation.isValid ? null : validation);
        } else {
            setError(null);
        }
    };

    const handleFormat = (spaces: number) => {
        if (!input.trim()) return;
        try {
            const formatted = formatJson(input, spaces);
            setOutput(formatted);
            setError(null);
            // Auto-expand tree when formatting
            setTreeCollapsed(1);
        } catch (e: any) {
            setError({ isValid: false, error: e.message });
        }
    };

    const handleMinify = () => {
        if (!input.trim()) return;
        try {
            const minified = minifyJson(input);
            setOutput(minified);
            setError(null);
        } catch (e: any) {
            setError({ isValid: false, error: e.message });
        }
    };

    const handleConvert = (type: 'xml' | 'yaml' | 'csv') => {
        if (!input.trim()) return;
        try {
            let result = '';
            switch (type) {
                case 'xml': result = jsonToXml(input); break;
                case 'yaml': result = jsonToYaml(input); break;
                case 'csv': result = jsonToCsv(input); break;
            }
            setOutput(result);
            setActiveTab('code'); // XML/YAML/CSV are best viewed as code
            setError(null);
        } catch (e: any) {
            setError({ isValid: false, error: e.message });
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(output);
    };

    const handleDownload = () => {
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formatted.txt'; // Could be improved to detect extension
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearAll = () => {
        setInput('');
        setOutput('');
        setError(null);
    };

    const handleFileUpload = (files: FileList) => {
        const file = files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setInput(content);
            // Auto-validate and maybe format
            const validation = validateJson(content);
            setError(validation.isValid ? null : validation);
            if (validation.isValid) {
                // Optional: Auto-format on load? maybe not.
            }
        };
        reader.readAsText(file);
    };

    const handleUrlLoad = async () => {
        if (!urlInput) return;
        setIsLoading(true);
        try {
            const res = await fetch(urlInput);
            const text = await res.text();
            setInput(text);
            const validation = validateJson(text);
            setError(validation.isValid ? null : validation);
            setShowUrlInput(false);
        } catch (e) {
            setError({ isValid: false, error: 'Failed to fetch from URL' });
        } finally {
            setIsLoading(false);
        }
    }

    const handleExpandAll = () => {
        if (activeTab === 'code') {
            editorRef.current?.trigger('anyString', 'editor.unfoldAll');
        } else {
            setTreeCollapsed(false);
        }
    };

    const handleCollapseAll = () => {
        if (activeTab === 'code') {
            editorRef.current?.trigger('anyString', 'editor.foldAll');
        } else {
            setTreeCollapsed(true);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg shadow-lg">
                            <Braces size={20} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
                            JSON Beautifier
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${showUrlInput ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                    >
                        <Link size={14} /> Load URL
                    </button>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/50 rounded-md transition-all"
                    >
                        <Trash2 size={14} /> Clear
                    </button>
                </div>
            </header>

            {/* URL Input Bar */}
            {showUrlInput && (
                <div className="bg-slate-800/50 border-b border-slate-700 p-3 px-6 flex items-center gap-2 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://api.example.com/data.json"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlLoad()}
                    />
                    <button
                        onClick={handleUrlLoad}
                        disabled={isLoading}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Loading...' : 'Fetch'}
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Input Section */}
                <div className="w-1/2 flex flex-col border-r border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700/50 bg-slate-800/30">
                        <span className="text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider">Input</span>
                        <div className="flex gap-2">
                            <label className="cursor-pointer p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Upload File">
                                <input type="file" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} accept=".json" />
                                <Upload size={16} />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <DragDropZone
                            onFilesDropped={handleFileUpload}
                            className="h-full w-full"
                            isDraggingClass="bg-indigo-500/10 border-2 border-indigo-500 border-dashed"
                        >
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={input}
                                onChange={handleInputChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </DragDropZone>
                    </div>

                    {/* Validation Status Bar */}
                    <div className={`h-8 border-t border-slate-700 flex items-center px-4 text-xs font-medium ${error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {error ? (
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>Invalid JSON: {error.error}</span>
                            </div>
                        ) : input.trim() ? (
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span>Valid JSON</span>
                            </div>
                        ) : (
                            <span className="text-slate-500">Ready</span>
                        )}
                    </div>
                </div>

                {/* Toolbar (Middle Column) */}
                <div className="w-16 bg-slate-800 flex flex-col items-center py-4 gap-4 border-r border-slate-700 z-20 shadow-xl">
                    <div className="flex flex-col gap-2 w-full px-2">
                        <div className="text-[10px] text-center text-slate-500 font-bold uppercase mb-1">Format</div>
                        <button onClick={() => handleFormat(2)} className="p-2 rounded hover:bg-indigo-600 bg-slate-700 transition-all text-slate-300 hover:text-white flex flex-col items-center gap-1 group" title="Beautify (2 spaces)">
                            <AlignLeft size={18} />
                            <span className="text-[10px]">2sp</span>
                        </button>
                        <button onClick={() => handleFormat(4)} className="p-2 rounded hover:bg-indigo-600 bg-slate-700 transition-all text-slate-300 hover:text-white flex flex-col items-center gap-1" title="Beautify (4 spaces)">
                            <AlignLeft size={18} />
                            <span className="text-[10px]">4sp</span>
                        </button>
                        <button onClick={handleMinify} className="p-2 rounded hover:bg-indigo-600 bg-slate-700 transition-all text-slate-300 hover:text-white flex flex-col items-center gap-1" title="Minify">
                            <Minimize2 size={18} />
                            <span className="text-[10px]">Mini</span>
                        </button>
                    </div>

                    <div className="w-8 h-[1px] bg-slate-700 my-1"></div>

                    <div className="flex flex-col gap-2 w-full px-2">
                        <div className="text-[10px] text-center text-slate-500 font-bold uppercase mb-1">Convert</div>
                        <button onClick={() => handleConvert('xml')} className="p-2 rounded hover:bg-teal-600 bg-slate-700 transition-all text-slate-300 hover:text-white text-[10px] font-bold">XML</button>
                        <button onClick={() => handleConvert('yaml')} className="p-2 rounded hover:bg-teal-600 bg-slate-700 transition-all text-slate-300 hover:text-white text-[10px] font-bold">YAML</button>
                        <button onClick={() => handleConvert('csv')} className="p-2 rounded hover:bg-teal-600 bg-slate-700 transition-all text-slate-300 hover:text-white text-[10px] font-bold">CSV</button>
                    </div>
                </div>

                {/* Output Section */}
                <div className="w-1/2 flex flex-col bg-slate-900/50">
                    <div className="flex items-center justify-between p-2 border-b border-slate-700/50 bg-slate-800/30">
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('code')}
                                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <FileCode size={14} /> Code
                            </button>
                            <button
                                onClick={() => setActiveTab('tree')}
                                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'tree' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <LayoutList size={14} /> Tree
                            </button>
                        </div>
                        <div className="flex gap-1 items-center">
                            <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>
                            <button onClick={handleExpandAll} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Expand All">
                                <Maximize2 size={16} />
                            </button>
                            <button onClick={handleCollapseAll} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Collapse All">
                                <Minimize size={16} />
                            </button>
                            <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>
                            <button onClick={handleCopy} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Copy to Clipboard">
                                <Copy size={16} />
                            </button>
                            <button onClick={handleDownload} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Download">
                                <Download size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'code' ? (
                            <Editor
                                height="100%"
                                defaultLanguage="json" // Default to JSON, but language should ideally match content type (XML/YAML etc)
                                language={output.startsWith('<') ? 'xml' : output.startsWith('---') ? 'yaml' : 'json'}
                                theme="vs-dark"
                                value={output}
                                onMount={handleEditorDidMount}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    folding: true,
                                }}
                            />
                        ) : (
                            <div className="h-full overflow-auto p-4 bg-[#1e1e1e]">
                                {output ? (
                                    (() => {
                                        try {
                                            const json = JSON.parse(output);
                                            return <ReactJson
                                                src={json}
                                                theme="ocean"
                                                // If treeCollapsed is boolean, use it. If number, use collapsed={number}.
                                                // react-json-view collapsed=true means all collapsed, false means all expanded.
                                                // So if we want Expand All (false), we pass false. If Collapse All (true), we pass true.
                                                collapsed={treeCollapsed}
                                                displayDataTypes={true}
                                                style={{ backgroundColor: 'transparent' }}
                                            />;
                                        } catch {
                                            return <div className="text-slate-500 text-sm flex flex-col items-center justify-center h-full">
                                                <p>Output is not valid JSON.</p>
                                                <p className="text-xs mt-1">Tree view only works for JSON content.</p>
                                            </div>
                                        }
                                    })()
                                ) : (
                                    <div className="text-slate-600 text-sm flex items-center justify-center h-full">Output is empty</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
