import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, AlertCircle, Code, Sparkles } from 'lucide-react';
import { convertJsonToSwift, ConverterOptions } from '../services/swiftConverter';
import { CodeBlock } from './CodeBlock'; // Reusing CodeBlock

interface JsonToSwiftViewProps {
    onBack: () => void;
}

// --- Sample Data ---
const SAMPLE_JSON_INPUT = JSON.stringify({
    user_name: 'Jane Doe',
    email_address: 'jane@example.com',
    age: 28,
    is_premium: true,
    profile_image: null,
    address: {
        street_name: '123 Main St',
        city: 'San Francisco',
        zip_code: '94105',
    },
    tags: ['developer', 'designer'],
    recent_orders: [
        {
            order_id: 1001,
            total_amount: 49.99,
            is_delivered: false,
        },
    ],
}, null, 2);

export const JsonToSwiftView: React.FC<JsonToSwiftViewProps> = ({ onBack }) => {
    const [jsonInput, setJsonInput] = useState<string>('');
    const [swiftOutput, setSwiftOutput] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [options, setOptions] = useState<ConverterOptions>({
        rootName: 'Welcome',
        allOptional: false,
        generateCodingKeys: true
    });

    useEffect(() => {
        if (!jsonInput.trim()) {
            setSwiftOutput('');
            setError(null);
            return;
        }

        const timer = setTimeout(() => {
            // Validate JSON
            try {
                // Just check if it parses to show valid/invalid state, 
                // but the converter also handles parsing errors gracefully.
                JSON.parse(jsonInput);
                setError(null);
                const result = convertJsonToSwift(jsonInput, options);
                setSwiftOutput(result);
            } catch (e: any) {
                setError(e.message);
                // Still try to convert to show the error comment from converter if we want, 
                // or just clear output. 
                // The converter returns "// Error ..." on failure, so we can just run it.
                const result = convertJsonToSwift(jsonInput, options);
                setSwiftOutput(result);
            }
        }, 500); // Debounce

        return () => clearTimeout(timer);
    }, [jsonInput, options]);

    const handleExecuteSample = () => {
        setJsonInput(SAMPLE_JSON_INPUT);
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
                            <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <Code className="w-4 h-4 text-orange-400" />
                            </div>
                            JSON to Swift Codable
                        </h1>
                    </div>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={handleExecuteSample}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-lg font-semibold active:scale-95 transition-all text-sm"
                        title="Load sample JSON with nested objects, arrays, and nulls"
                    >
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Execute Sample</span>
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 min-h-0">

                {/* Left Column: Input & Settings */}
                <div className="flex flex-col gap-3 min-h-0">

                    {/* Settings Panel */}
                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            <Settings className="w-3.5 h-3.5" /> Configuration
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Root Struct Name</label>
                                <input
                                    type="text"
                                    value={options.rootName}
                                    onChange={(e) => setOptions({ ...options, rootName: e.target.value || 'Welcome' })}
                                    className="w-full px-2.5 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
                                    placeholder="Welcome"
                                />
                            </div>

                            <div className="flex flex-col justify-center gap-2 pt-1 md:pt-0">
                                <label className="flex items-center gap-2 cursor-pointer group select-none">
                                    <div className={`w-8 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${options.generateCodingKeys ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${options.generateCodingKeys ? 'translate-x-3' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={options.generateCodingKeys}
                                        onChange={(e) => setOptions({ ...options, generateCodingKeys: e.target.checked })}
                                    />
                                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Generate CodingKeys</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group select-none">
                                    <div className={`w-8 h-5 flex items-center rounded-full p-1 transition-colors duration-200 ${options.allOptional ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                        <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${options.allOptional ? 'translate-x-3' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={options.allOptional}
                                        onChange={(e) => setOptions({ ...options, allOptional: e.target.checked })}
                                    />
                                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Force Optionals</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* JSON Input */}
                    <div className="flex-grow flex flex-col min-h-0 relative">
                        <div className="absolute top-0 right-0 p-2 z-10 pointer-events-none">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/90 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Invalid JSON
                                </div>
                            )}
                        </div>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder={`Paste your JSON here...\n\nExample:\n{\n  "user_name": "John Doe",\n  "age": 30,\n  "is_admin": false\n}`}
                            className={`w-full h-full bg-slate-900/50 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-orange-500/50'} rounded-xl p-4 font-mono text-sm text-slate-300 focus:ring-2 ${error ? 'focus:ring-red-500/20' : 'focus:ring-orange-500/20'} focus:outline-none resize-none custom-scrollbar transition-all leading-relaxed`}
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Right Column: Swift Output */}
                <div className="flex-grow min-h-0">
                    <CodeBlock
                        content={swiftOutput}
                        language="Swift"
                        fileName={`${options.rootName}.swift`}
                    />
                </div>
            </div>
        </div>
    );
};
