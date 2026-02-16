import React, { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Upload, Trash2, Copy, FileText, Terminal, Code2, File, Info, X, Check, Sparkles } from 'lucide-react';
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

declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<any>;
    }
}

// --- Sample Data ---
const SAMPLE_SOURCE_FILE = {
    name: 'sample_apps.json',
    content: JSON.stringify([
        { name: 'PhotoSync Pro', version: '3.2.1', platform: 'iOS', downloads: 142500, rating: 4.7 },
        { name: 'TaskFlow', version: '1.8.0', platform: 'iOS', downloads: 89300, rating: 4.5 },
        { name: 'BudgetWise', version: '2.0.4', platform: 'iPadOS', downloads: 51200, rating: 4.2 },
        { name: 'FitTrack Elite', version: '5.1.0', platform: 'iOS', downloads: 230000, rating: 4.9 },
        { name: 'NoteVault', version: '1.3.2', platform: 'macOS', downloads: 34800, rating: 4.0 }
    ], null, 2),
    size: 0, // will be calculated
    type: 'json'
};
SAMPLE_SOURCE_FILE.size = new Blob([SAMPLE_SOURCE_FILE.content]).size;

const SAMPLE_SCRIPT = `// 📊 App Analytics Report
// This script demonstrates how to read uploaded files,
// parse JSON data, and produce a formatted report.

const file = files[0];
const apps = JSON.parse(file.content);

console.log("📁 Processing: " + file.name);
console.log("   Found " + apps.length + " apps\\n");

// Calculate stats
const totalDownloads = apps.reduce((sum, a) => sum + a.downloads, 0);
const avgRating = (apps.reduce((sum, a) => sum + a.rating, 0) / apps.length).toFixed(1);
const topApp = apps.reduce((best, a) => a.downloads > best.downloads ? a : best);

console.log("📈 Total Downloads: " + totalDownloads.toLocaleString());
console.log("⭐ Average Rating:  " + avgRating);
console.log("🏆 Top App:         " + topApp.name + " (" + topApp.downloads.toLocaleString() + " downloads)");
console.log("");

// Per-app breakdown
apps.sort((a, b) => b.downloads - a.downloads);
apps.forEach((app, i) => {
    const bar = "█".repeat(Math.round(app.downloads / totalDownloads * 30));
    console.log((i + 1) + ". " + app.name.padEnd(16) + " v" + app.version + "  ⭐" + app.rating + "  " + bar + " " + app.downloads.toLocaleString());
});

// Return a summary object
return {
    file: file.name,
    totalApps: apps.length,
    totalDownloads,
    averageRating: parseFloat(avgRating),
    topApp: topApp.name
};
`;

export const ScriptRunnerView: React.FC<ScriptRunnerViewProps> = ({ onBack }) => {
    const [files, setFiles] = useState<ScriptFile[]>([]);
    const [script, setScript] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
    const [showHelp, setShowHelp] = useState(false);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
    const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
    const [isPyodideLoading, setIsPyodideLoading] = useState(false);
    const [pyodide, setPyodide] = useState<any>(null);

    const [isRunningSample, setIsRunningSample] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scriptInputRef = useRef<HTMLInputElement>(null);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleCopySnippet = (id: string, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const loadPyodideRuntime = async () => {
        if (pyodide) return pyodide;

        setIsPyodideLoading(true);
        try {
            if (!window.loadPyodide) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                document.body.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            const py = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
            });
            setPyodide(py);
            return py;
        } catch (err: any) {
            console.error('Failed to load Pyodide:', err);
            setConsoleOutput(prev => [...prev, `[SYSTEM ERROR] Failed to load Python environment: ${err.message}`]);
            throw err;
        } finally {
            setIsPyodideLoading(false);
        }
    };

    const handleRun = async () => {
        setConsoleOutput([]);
        setOutput('');

        if (language === 'javascript') {
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
        } else {
            // Python execution
            try {
                const py = await loadPyodideRuntime();

                // Redirect Python stdout to our console
                py.setStdout({
                    batched: (msg: string) => {
                        setConsoleOutput(prev => [...prev, msg]);
                    }
                });

                // Convert files to Python-friendly structure
                const filesData = files.map(f => ({
                    name: f.name,
                    content: f.content,
                    size: f.size,
                    type: f.type
                }));

                // Make files available in Python global scope
                py.globals.set("files_js", filesData);

                // Bootstrap script to convert js proxy to python list of dicts
                await py.runPythonAsync(`
import js
files = []
for f in js.files_js:
    files.append({
        "name": f.name,
        "content": f.content,
        "size": f.size,
        "type": f.type
    })
`);

                const result = await py.runPythonAsync(script);

                if (result !== undefined) {
                    setOutput(String(result));
                } else {
                    setOutput('Script executed successfully (no return value)');
                }

            } catch (err: any) {
                setConsoleOutput(prev => [...prev, `[PYTHON ERROR]: ${err.message}`]);
            }
        }
    };

    const handleExecuteSample = useCallback(() => {
        setIsRunningSample(true);

        // Build the sample file object
        const sampleFile: ScriptFile = {
            id: 'sample_' + Date.now(),
            name: SAMPLE_SOURCE_FILE.name,
            content: SAMPLE_SOURCE_FILE.content,
            size: SAMPLE_SOURCE_FILE.size,
            type: SAMPLE_SOURCE_FILE.type
        };

        // Set UI state
        setLanguage('javascript');
        setFiles([sampleFile]);
        setScript(SAMPLE_SCRIPT);

        // Execute the sample script directly (avoid stale closures)
        try {
            const logs: string[] = [];
            const safeConsole = {
                log: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                info: (...args: any[]) => logs.push(args.map(a => String(a)).join(' ')),
                warn: (...args: any[]) => logs.push("[WARN] " + args.map(a => String(a)).join(' ')),
                error: (...args: any[]) => logs.push("[ERROR] " + args.map(a => String(a)).join(' ')),
            };

            const runScript = new Function('files', 'console', SAMPLE_SCRIPT);
            const result = runScript([sampleFile], safeConsole);

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
            setConsoleOutput([`[EXECUTION ERROR]: ${err.message}`]);
        } finally {
            setIsRunningSample(false);
        }
    }, []);

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
                    <span className="text-sm font-semibold">Script</span>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'javascript' | 'python')}
                        className="ml-2 bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                    </select>
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
                                    <ul className="space-y-4">
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-bold">files</code>
                                            <div className="mt-1 text-slate-400 mb-2">Array of file objects currently loaded.</div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-slate-400 overflow-x-auto border border-slate-800">
                                                {files.length > 0 ? `// Example based on your uploaded file:
[
  {
    name: "${files[0].name}",
    type: "${files[0].type}",
    size: ${files[0].size},
    content: "${files[0].content.substring(0, 50).replace(/\n/g, '\\n')}..."
  }${files.length > 1 ? `,\n  ... (${files.length - 1} more files)` : ''}
]` : `// No files loaded. Example structure:
[
  {
    name: "example.json",
    type: "json", 
    size: 1024,
    content: "..."
  }
]`}
                                            </pre>
                                        </li>
                                        <li>
                                            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-bold">console</code>
                                            <div className="mt-1 text-slate-400">Standard console methods: <code>log</code>, <code>warn</code>, <code>error</code>, <code>info</code></div>
                                        </li>
                                    </ul>
                                </div>

                            </div>

                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="font-bold text-white mb-2">Code Snippets ({language === 'javascript' ? 'JavaScript' : 'Python'})</h3>

                                {language === 'javascript' ? (
                                    // JavaScript Snippets
                                    <>
                                        {files.length > 0 && files[0].type === 'json' ? (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">JSON Processing</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('json', `files.forEach(f => {
  if (f.type === 'json') {
    const data = JSON.parse(f.content);
    console.log("Parsed " + f.name);
    // ... work with data
  }
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'json'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'json' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(f => {
  if (f.type === 'json') {
    const data = JSON.parse(f.content);
    console.log("Parsed " + f.name);
    // ... work with data
  }
});`}
                                                </pre>
                                            </div>
                                        ) : files.length > 0 && (files[0].type === 'strings' || files[0].type === 'xcstrings') ? (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">Strings Parsing</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('strings', `files.forEach(f => {
  const lines = f.content.split('\\n');
  console.log("Reading " + f.name + ": " + lines.length + " lines");
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'strings'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'strings' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(f => {
  const lines = f.content.split('\\n');
  console.log("Reading " + f.name + ": " + lines.length + " lines");
});`}
                                                </pre>
                                            </div>
                                        ) : (
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-xs font-bold text-indigo-300 uppercase">General Iteration</div>
                                                    <button
                                                        onClick={() => handleCopySnippet('general', `files.forEach(file => {
  console.log("Processing " + file.name);
});`)}
                                                        className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'general'
                                                            ? 'bg-green-500/20 text-green-400'
                                                            : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Copy Snippet"
                                                    >
                                                        {copiedSnippet === 'general' ? (
                                                            <>
                                                                <Check size={12} />
                                                                <span className="text-[10px] font-bold">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <Copy size={12} />
                                                        )}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                    {`files.forEach(file => {
  console.log("Processing " + file.name);
});`}
                                                </pre>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Python Snippets
                                    <>
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-bold text-indigo-300 uppercase">General Iteration</div>
                                                <button
                                                    onClick={() => handleCopySnippet('py_general', `for file in files:
    print(f"Processing {file['name']} ({file['size']} bytes)")
`)}
                                                    className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'py_general'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                        }`}
                                                    title="Copy Snippet"
                                                >
                                                    {copiedSnippet === 'py_general' ? (
                                                        <>
                                                            <Check size={12} />
                                                            <span className="text-[10px] font-bold">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                {`for file in files:
    print(f"Processing {file['name']} ({file['size']} bytes)")`}
                                            </pre>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-bold text-indigo-300 uppercase">JSON Processing</div>
                                                <button
                                                    onClick={() => handleCopySnippet('py_json', `import json

for f in files:
    if f['type'] == 'json':
        data = json.loads(f['content'])
        print(f"Parsed {f['name']} keys: {list(data.keys())}")`)}
                                                    className={`p-1 rounded flex items-center gap-1.5 transition-all ${copiedSnippet === 'py_json'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                                                        }`}
                                                    title="Copy Snippet"
                                                >
                                                    {copiedSnippet === 'py_json' ? (
                                                        <>
                                                            <Check size={12} />
                                                            <span className="text-[10px] font-bold">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                </button>
                                            </div>
                                            <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-green-300 overflow-x-auto">
                                                {`import json

for f in files:
    if f['type'] == 'json':
        data = json.loads(f['content'])
        print(f"Parsed {f['name']} keys: {list(data.keys())}")`}
                                            </pre>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <Editor
                    height="100%"
                    defaultLanguage={language}
                    language={language}
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
                        onClick={handleExecuteSample}
                        className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-lg font-semibold active:scale-95 transition-all text-sm"
                        title="Load a sample file and script, then auto-run to see how Script Runner works"
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Execute Sample</span>
                    </button>
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
