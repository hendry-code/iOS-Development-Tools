import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Upload, Trash2, Copy, FileText, Terminal, Code2, File, Info, X } from 'lucide-react';
import { DragDropZone } from './DragDropZone';
import { ResizableLayout } from './ResizableLayout';
import { VerticalSplitPane } from './VerticalSplitPane';

interface ScriptRunnerViewProps {
    onBack: () => void;
}

interface ScriptFile {
    id: string;
    name: string;
    content: string;
    size: number;
    type: string;
}

export const ScriptRunnerView: React.FC<ScriptRunnerViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<ScriptFile[]>([]);
    const [script, setScript] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scriptInputRef = useRef<HTMLInputElement>(null);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleRun = () => {
        setConsoleOutput([]);
        setOutput('');

        try {
            const logs: string[] = [];
            const safeConsole = {
                log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                info: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => String(a)).join(' ')),
                error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => String(a)).join(' ')),
            };

            const runScript = new Function('files', 'console', script);
            const result = runScript(files, safeConsole);

            setConsoleOutput(logs);

            if (result !== undefined) {
                if (typeof result === 'object') {
                    setOutput(JSON.stringify(result, null, 2));
                } else {
                    setOutput(String(result));
                }
            } else {
                setOutput('Script executed successfully (no return value)');
            }

        } catch (err: any) {
            setConsoleOutput(prev => [...prev, `[EXECUTION ERROR]: ${err.message}`]);
        }
    };

    const processFiles = (fileList: FileList) => {
        Array.from(fileList).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setFiles(prev => [...prev, {
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        content: reader.result as string,
                        size: file.size,
                        type: file.name.split('.').pop() || 'txt'
                    }]);
                }
            };
            reader.readAsText(file);
        });
    };

    const handleInputFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
        if (e.target) e.target.value = '';
    };

    const handleScriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setScript(reader.result);
                }
            };
            reader.readAsText(file);
        }
        if (e.target) e.target.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    // --- Panel Renderers ---

    const renderFilePanel = () => (
        <div className="flex flex-col h-full bg-slate-900/50">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2 text-slate-300">
                    <File className="text-blue-400" size={16} />
                    <span className="text-sm font-semibold">Source Files ({files.length})</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setFiles([])} title="Clear All" className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} title="Add Files" className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white bg-slate-700/50">
                        <Upload size={14} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleInputFilesChange} />
                </div>
            </div>

            <DragDropZone
                onFilesDropped={processFiles}
                className="flex-1 overflow-y-auto p-2"
                isDraggingClass="bg-indigo-500/10"
            >
                {files.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm pointer-events-none">
                        <Upload size={32} className="mb-2 opacity-50" />
                        <p>Drag & drop files here</p>
                        <p className="text-xs opacity-60 mt-1">or click upload button</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400 font-mono text-xs font-bold uppercase shrink-0">
                                        {file.type.slice(0, 3)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm text-slate-200 truncate font-medium">{file.name}</span>
                                        <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                    className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </DragDropZone>
        </div>
    );

    const renderScriptPanel = () => (
        <div className="flex flex-col h-full relative border-l md:border-l-0 border-r md:border-r-0 border-slate-700">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2 text-slate-300">
                    <Code2 className="text-yellow-400" size={16} />
                    <span className="text-sm font-semibold">Script (JS)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${showHelp ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Info size={14} />
                        <span className="hidden sm:inline">API Help</span>
                    </button>
                    <button onClick={() => scriptInputRef.current?.click()} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white flex items-center gap-1.5 text-xs">
                        <Upload size={14} />
                        <span className="hidden sm:inline">Load Script</span>
                    </button>
                    <input type="file" ref={scriptInputRef} className="hidden" accept=".js,.ts,.txt" onChange={handleScriptFileChange} />
                </div>
            </div>

            <div className="flex-1 relative">
                {showHelp && (
                    <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm p-6 overflow-y-auto">
                        <div className="max-w-xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Info size={20} className="text-indigo-400" /> Scripting API
                                </h2>
                                <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2">Global Variables</h3>
                                    <ul className="space-y-3">
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">files</code>: Array of File objects.
                                        </li>
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">console</code>: Standard console methods.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={script}
                    onChange={(value) => setScript(value || '')}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 }
                    }}
                />
                {!script && !showHelp && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600">
                        <div className="text-center">
                            <p>Type your script here...</p>
                            <p className="text-xs mt-1">or click "Load Script" to upload a file</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderOutputPanel = () => (
        <div className="flex flex-col h-full min-w-[200px]">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="text-green-400" size={16} />
                    <span className="text-sm font-semibold">Output</span>
                </div>
                <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                    title="Copy Output"
                >
                    <Copy size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden bg-black/40">
                <VerticalSplitPane initialTopHeight={30}>
                    {/* Top: Console Logs */}
                    <div className="h-full flex flex-col bg-black/20">
                        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Console</div>
                            <button onClick={() => setConsoleOutput([])} className="text-[10px] text-slate-600 hover:text-slate-400">Clear</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            {consoleOutput.length === 0 ? (
                                <span className="text-slate-700 text-xs italic opacity-50">No console output...</span>
                            ) : (
                                consoleOutput.map((log, i) => (
                                    <div key={i} className="font-mono text-xs text-slate-400 mb-1 border-b border-white/5 pb-1 last:border-0 font-light break-all whitespace-pre-wrap">
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Bottom: Result */}
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/50 border-b border-slate-800 flex-shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Result</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <pre className="font-mono text-xs sm:text-sm text-green-400 whitespace-pre-wrap break-all">
                                {output || <span className="text-slate-700 italic">Script return value will appear here...</span>}
                            </pre>
                        </div>
                    </div>
                </VerticalSplitPane>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
            {/* Header */}
            <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md flex-shrink-0">
                <button onClick={onBack} className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        Script Runner
                    </h1>
                    <p className="text-slate-400 text-sm">run JS/TS scripts on multiple files</p>
                </div>
                <div className="ml-auto flex items-center space-x-3">
                    <button
                        onClick={handleRun}
                        className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-all text-sm sm:text-base"
                    >
                        <Play size={18} fill="currentColor" />
                        <span className="hidden sm:inline ml-2">Run Script</span>
                    </button>
                </div>
            </header>

            {/* Main Content using ResizableLayout */}
            <div className="flex-1 flex overflow-hidden">
                <ResizableLayout>
                    {renderFilePanel()}
                    {renderScriptPanel()}
                    {renderOutputPanel()}
                </ResizableLayout>
            </div>
        </div>
    );
};
