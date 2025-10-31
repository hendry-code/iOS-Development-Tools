import React from 'react';
import { ViewMode } from '../types';
import { SparklesIcon, CombineIcon, ExtractIcon } from './icons';

interface DashboardProps {
    setView: (view: ViewMode) => void;
}

const FeatureTile: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}> = ({ icon, title, description, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group relative w-full h-full p-6 text-left bg-white/60 dark:bg-slate-800/50 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg transition-all duration-300 ease-in-out hover:bg-white/90 dark:hover:bg-slate-800/80 hover:border-violet-500/50 dark:hover:border-violet-500/50 hover:shadow-violet-500/10 dark:hover:shadow-violet-500/10 hover:-translate-y-1"
        >
            <div className="flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg group-hover:bg-violet-100 dark:group-hover:bg-violet-600/50 group-hover:text-violet-500 dark:group-hover:text-violet-300 group-hover:border-violet-300 dark:group-hover:border-violet-500 transition-all duration-300">
                {icon}
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
             <div className="absolute bottom-4 right-4 text-xs font-semibold text-slate-500 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors duration-300">
                Launch Tool &rarr;
            </div>
        </button>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    return (
        <div className="w-full max-w-5xl">
            <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    iOS Development Tools
                </h1>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                    A powerful suite of tools designed to accelerate your iOS and Android development workflow, from localization management to AI-powered translations.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* <FeatureTile
                    icon={<SparklesIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                    title="AI Translator"
                    description="Upload a base English .strings file and use AI to translate it into multiple languages. Export as individual files or a combined iOS String Catalog."
                    onClick={() => setView('translator')}
                /> */}
                <FeatureTile
                    icon={<CombineIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                    title="Create String Catalog"
                    description="Combine multiple `.strings` (key-value) and `.stringsdict` (plurals) files into a single iOS String Catalog (`.xcstrings`) and Android XML files."
                    onClick={() => setView('combine')}
                />
                <FeatureTile
                    icon={<ExtractIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />}
                    title="Extract from Catalog"
                    description="Deconstruct an iOS String Catalog (.xcstrings) file into individual .strings files and Android XML files for each language."
                    onClick={() => setView('extract')}
                />
            </div>
        </div>
    );
};