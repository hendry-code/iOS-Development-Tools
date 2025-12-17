import React from 'react';
import { ViewMode } from '../types';
import {
    Combine,
    FileOutput,
    FileJson,
    FileEdit,
    Type,
    Merge,
    ArrowRight,
    Calculator,
    ScanSearch
} from 'lucide-react';

interface DashboardProps {
    setView: (view: ViewMode) => void;
}

export function Dashboard({ setView }: DashboardProps) {
    const tools = [
        {
            id: 'combine',
            title: 'Combine Strings',
            description: 'Merge multiple .strings files into a single file',
            icon: Combine,
            color: 'bg-blue-500',
        },
        {
            id: 'extract',
            title: 'Extract Catalog',
            description: 'Extract strings from .xcstrings catalog files',
            icon: FileOutput,
            color: 'bg-purple-500',
        },
        {
            id: 'properties',
            title: 'Properties Converter',
            description: 'Convert .properties files to .strings format',
            icon: FileJson,
            color: 'bg-green-500',
        },
        {
            id: 'editor',
            title: 'File Editor',
            description: 'Edit and manage your localization files',
            icon: FileEdit,
            color: 'bg-orange-500',
        },
        {
            id: 'renamer',
            title: 'Key Renamer',
            description: 'Batch rename keys across multiple files',
            icon: Type,
            color: 'bg-pink-500',
        },
        {
            id: 'merge',
            title: 'Merge Strings',
            description: 'Smart merge with conflict resolution',
            icon: Merge,
            color: 'bg-indigo-500',
        },

        {
            id: 'analyser',
            title: 'Strings Analyser',
            description: 'Deep analysis for .xcstrings and .xml files',
            icon: ScanSearch,
            color: 'bg-indigo-600',
        },
    ];

    return (
        <div className="w-full min-h-screen p-4 md:p-8 flex flex-col items-center justify-center animate-window-open bg-slate-900 text-slate-100 font-sans">
            <header className="text-center mb-16">
                <h1 className="text-5xl sm:text-7xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight mb-6 drop-shadow-2xl">
                    iOS Development Tools
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
                    Professional localization and development utilities.
                </p>
            </header>

            <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => setView(tool.id as ViewMode)}
                            className="group relative p-3 rounded-2xl bg-slate-800/40 border border-slate-700 hover:bg-slate-800/60 transition-all duration-300 text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10 backdrop-blur-sm"
                        >
                            <div className={`w-10 h-10 rounded-lg ${tool.color} bg-opacity-20 flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-all ring-1 ring-white/10`}>
                                <Icon className="text-white" size={20} />
                            </div>

                            <h3 className="text-base font-semibold text-slate-100 mb-1 group-hover:text-indigo-400 transition-colors">
                                {tool.title}
                            </h3>

                            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                                {tool.description}
                            </p>

                            <div className="flex items-center text-[10px] font-medium text-slate-500 group-hover:text-indigo-400 transition-colors">
                                Open Tool <ArrowRight size={10} className="ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
