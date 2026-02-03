import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Binary, Copy, Check, ArrowRightLeft, AlertCircle, Clock, Key, Link2, Code2, Hash } from 'lucide-react';
import {
    EncodingMode,
    encode,
    decode,
    jwtDecode,
    JWTDecoded
} from '../services/encodingService';

interface EncodingToolViewProps {
    onBack: () => void;
}

type Direction = 'encode' | 'decode';

interface TabConfig {
    id: EncodingMode;
    label: string;
    icon: React.ReactNode;
    supportsEncode: boolean;
    placeholder: {
        input: string;
        output: string;
    };
}

const TABS: TabConfig[] = [
    {
        id: 'base64',
        label: 'Base64',
        icon: <Binary className="w-4 h-4" />,
        supportsEncode: true,
        placeholder: {
            input: 'Enter text to encode/decode...',
            output: 'Result will appear here...'
        }
    },
    {
        id: 'url',
        label: 'URL',
        icon: <Link2 className="w-4 h-4" />,
        supportsEncode: true,
        placeholder: {
            input: 'Enter URL or text with special characters...',
            output: 'Encoded/decoded URL...'
        }
    },
    {
        id: 'html',
        label: 'HTML',
        icon: <Code2 className="w-4 h-4" />,
        supportsEncode: true,
        placeholder: {
            input: 'Enter HTML with special characters...',
            output: 'Escaped/unescaped HTML...'
        }
    },
    {
        id: 'hex',
        label: 'Hex',
        icon: <Hash className="w-4 h-4" />,
        supportsEncode: true,
        placeholder: {
            input: 'Enter text or hex string...',
            output: 'Hexadecimal representation...'
        }
    },
    {
        id: 'jwt',
        label: 'JWT',
        icon: <Key className="w-4 h-4" />,
        supportsEncode: false,
        placeholder: {
            input: 'Paste your JWT token here...',
            output: 'Decoded header and payload...'
        }
    },
];

export const EncodingToolView: React.FC<EncodingToolViewProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState<EncodingMode>('base64');
    const [direction, setDirection] = useState<Direction>('encode');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [jwtInfo, setJwtInfo] = useState<JWTDecoded | null>(null);

    const currentTab = TABS.find(t => t.id === activeTab)!;

    // Process input
    const processInput = useCallback(() => {
        if (!input.trim()) {
            setOutput('');
            setError(null);
            setJwtInfo(null);
            return;
        }

        // Special handling for JWT
        if (activeTab === 'jwt') {
            try {
                const decoded = jwtDecode(input.trim());
                setJwtInfo(decoded);
                setOutput(JSON.stringify({ header: decoded.header, payload: decoded.payload }, null, 2));
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to decode JWT');
                setOutput('');
                setJwtInfo(null);
            }
            return;
        }

        // Standard encode/decode
        const result = direction === 'encode'
            ? encode(input, activeTab)
            : decode(input, activeTab);

        if (result.success) {
            setOutput(result.result);
            setError(null);
        } else {
            setError(result.error || 'Operation failed');
            setOutput('');
        }
    }, [input, activeTab, direction]);

    // Debounced processing
    useEffect(() => {
        const timer = setTimeout(processInput, 150);
        return () => clearTimeout(timer);
    }, [processInput]);

    // Reset when tab changes
    useEffect(() => {
        setInput('');
        setOutput('');
        setError(null);
        setJwtInfo(null);
        // JWT is decode-only
        if (activeTab === 'jwt') {
            setDirection('decode');
        }
    }, [activeTab]);

    // Copy to clipboard
    const handleCopy = async () => {
        if (!output) return;
        await navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Paste from clipboard
    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        setInput(text);
    };

    // Swap input/output
    const handleSwap = () => {
        if (!output || activeTab === 'jwt') return;
        setInput(output);
        setDirection(prev => prev === 'encode' ? 'decode' : 'encode');
    };

    // Format date for JWT display
    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return date.toLocaleString();
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all active:scale-95 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <Binary className="w-4 h-4 text-indigo-400" />
                            </div>
                            Encoding Tool
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Direction Toggle (not for JWT) */}
                    {currentTab.supportsEncode && (
                        <div className="flex items-center gap-3">
                            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1">
                                <button
                                    onClick={() => setDirection('encode')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${direction === 'encode'
                                            ? 'bg-indigo-500 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Encode
                                </button>
                                <button
                                    onClick={() => setDirection('decode')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${direction === 'decode'
                                            ? 'bg-indigo-500 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Decode
                                </button>
                            </div>
                            <button
                                onClick={handleSwap}
                                disabled={!output}
                                className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Swap input/output"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Input/Output Areas */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Input */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Input
                                </label>
                                <button
                                    onClick={handlePaste}
                                    className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                                >
                                    Paste from clipboard
                                </button>
                            </div>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={currentTab.placeholder.input}
                                className="w-full h-64 p-4 bg-slate-800/80 border border-slate-700 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                                spellCheck={false}
                            />
                        </div>

                        {/* Output */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Output
                                </label>
                                <button
                                    onClick={handleCopy}
                                    disabled={!output}
                                    className={`flex items-center gap-1.5 text-xs transition-colors ${copied
                                            ? 'text-green-400'
                                            : output
                                                ? 'text-slate-500 hover:text-indigo-400'
                                                : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <textarea
                                value={output}
                                readOnly
                                placeholder={currentTab.placeholder.output}
                                className={`w-full h-64 p-4 bg-slate-800/50 border rounded-xl font-mono text-sm resize-none focus:outline-none ${error
                                        ? 'border-red-500/50 text-red-400'
                                        : 'border-slate-700 text-slate-100'
                                    }`}
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* JWT Info Panel */}
                    {activeTab === 'jwt' && jwtInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Token Status */}
                            <div className={`p-4 rounded-xl border ${jwtInfo.isExpired
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-green-500/10 border-green-500/30'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className={`w-4 h-4 ${jwtInfo.isExpired ? 'text-red-400' : 'text-green-400'}`} />
                                    <span className={`text-sm font-semibold ${jwtInfo.isExpired ? 'text-red-400' : 'text-green-400'}`}>
                                        {jwtInfo.isExpired ? 'Expired' : 'Valid'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    {jwtInfo.isExpired ? 'This token has expired' : 'Token has not expired'}
                                </p>
                            </div>

                            {/* Issued At */}
                            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Issued At (iat)</p>
                                <p className="text-sm font-mono text-slate-300">{formatDate(jwtInfo.issuedAt)}</p>
                            </div>

                            {/* Expires At */}
                            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Expires At (exp)</p>
                                <p className="text-sm font-mono text-slate-300">{formatDate(jwtInfo.expiresAt)}</p>
                            </div>
                        </div>
                    )}

                    {/* Quick Examples */}
                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Quick Examples
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {activeTab === 'base64' && (
                                <>
                                    <ExampleButton label="Hello World" onClick={() => setInput('Hello World')} />
                                    <ExampleButton label="SGVsbG8gV29ybGQ=" onClick={() => { setInput('SGVsbG8gV29ybGQ='); setDirection('decode'); }} />
                                </>
                            )}
                            {activeTab === 'url' && (
                                <>
                                    <ExampleButton label="hello world" onClick={() => setInput('hello world')} />
                                    <ExampleButton label="https://example.com?q=test value" onClick={() => setInput('https://example.com?q=test value')} />
                                </>
                            )}
                            {activeTab === 'html' && (
                                <>
                                    <ExampleButton label="<script>alert('XSS')</script>" onClick={() => setInput("<script>alert('XSS')</script>")} />
                                    <ExampleButton label="5 > 3 && 2 < 4" onClick={() => setInput('5 > 3 && 2 < 4')} />
                                </>
                            )}
                            {activeTab === 'hex' && (
                                <>
                                    <ExampleButton label="Hello" onClick={() => setInput('Hello')} />
                                    <ExampleButton label="48656c6c6f" onClick={() => { setInput('48656c6c6f'); setDirection('decode'); }} />
                                </>
                            )}
                            {activeTab === 'jwt' && (
                                <ExampleButton
                                    label="Sample JWT"
                                    onClick={() => setInput('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')}
                                />
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// Helper component for example buttons
const ExampleButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <button
        onClick={onClick}
        className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:border-slate-600 transition-all truncate max-w-[200px]"
        title={label}
    >
        {label}
    </button>
);
