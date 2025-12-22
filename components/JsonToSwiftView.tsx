import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, AlertCircle, Code } from 'lucide-react';
import { convertJsonToSwift, ConverterOptions } from '../services/swiftConverter';
import { CodeBlock } from './CodeBlock'; // Reusing CodeBlock

interface JsonToSwiftViewProps {
    onBack: () => void;
}

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

    return (
        <div className="flex flex-col h-full bg-gray-900/50 backdrop-blur-xl p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-lg border border-orange-500/30">
                                <Code className="w-5 h-5 text-orange-400" />
                            </div>
                            JSON to Swift Codable
                        </h1>
                        <p className="text-sm text-gray-400 ml-1">Generate production-ready Swift models instantly.</p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

                {/* Left Column: Input & Settings */}
                <div className="flex flex-col gap-4 min-h-0">

                    {/* Settings Panel */}
                    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">
                            <Settings className="w-4 h-4" /> Configuration
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">Root Struct Name</label>
                                <input
                                    type="text"
                                    value={options.rootName}
                                    onChange={(e) => setOptions({ ...options, rootName: e.target.value || 'Welcome' })}
                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:outline-none transition-all placeholder:text-gray-600 font-mono"
                                    placeholder="Welcome"
                                />
                            </div>

                            <div className="flex flex-col justify-center gap-3 pt-4 md:pt-0">
                                <label className="flex items-center gap-3 cursor-pointer group select-none">
                                    <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${options.generateCodingKeys ? 'bg-orange-500' : 'bg-gray-700'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${options.generateCodingKeys ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={options.generateCodingKeys}
                                        onChange={(e) => setOptions({ ...options, generateCodingKeys: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Generate CodingKeys</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group select-none">
                                    <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${options.allOptional ? 'bg-orange-500' : 'bg-gray-700'}`}>
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${options.allOptional ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={options.allOptional}
                                        onChange={(e) => setOptions({ ...options, allOptional: e.target.checked })}
                                    />
                                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Force Optionals</span>
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
                            className={`w-full h-full bg-gray-900/50 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-gray-700 focus:border-orange-500/50'} rounded-xl p-4 font-mono text-sm text-gray-300 focus:ring-2 ${error ? 'focus:ring-red-500/20' : 'focus:ring-orange-500/20'} focus:outline-none resize-none custom-scrollbar transition-all leading-relaxed`}
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
