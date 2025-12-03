
import React from 'react';
import { ViewMode } from '../types';
import { SparklesIcon, CombineIcon, ExtractIcon, PropertiesIcon, EditIcon, KeyIcon } from './icons';

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
            className="group relative w-full h-full p-6 text-left bg-slate-900/70 backdrop-blur-lg border border-slate-700 rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:bg-slate-800/90 hover:border-red-500/70 hover:shadow-xl hover:shadow-red-500/20 hover:-translate-y-1"
        >
            <div className="flex items-center justify-center w-12 h-12 bg-red-900/50 border border-red-500/30 rounded-lg group-hover:bg-red-800/70 transition-all duration-300">
                {icon}
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-100">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{description}</p>
            <div className="absolute bottom-6 right-6 text-sm font-semibold text-red-500 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                Get Started &rarr;
            </div>
        </button>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
    return (
        <div className="w-full max-w-5xl">
            <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
                    iOS & Android Localization Tools
                </h1>
                <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto">
                    A powerful suite of tools designed to accelerate your iOS and Android development workflow, from localization management to AI-powered translations.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* <FeatureTile
                    icon={<SparklesIcon className="w-6 h-6 text-red-400" />}
                    title="AI Translator"
                    description="Automatically translate your base language `.strings` file into multiple languages using AI. Export as individual files or a complete String Catalog."
                    onClick={() => setView('translator')}
                /> */}
                <FeatureTile
                    icon={<CombineIcon className="w-6 h-6 text-red-400" />}
                    title="Combine to String Catalog"
                    description="Merge multiple `.strings` and `.stringsdict` files into a single, powerful `.xcstrings` catalog for iOS and generate corresponding Android XML files."
                    onClick={() => setView('combine')}
                />
                <FeatureTile
                    icon={<CombineIcon className="w-6 h-6 text-red-400" />}
                    title="Merge Strings into Catalog"
                    description="Merge translations from `.strings` files into an existing `.xcstrings` catalog for matching keys."
                    onClick={() => setView('merge')}
                />
                <FeatureTile
                    icon={<ExtractIcon className="w-6 h-6 text-red-400" />}
                    title="Extract from String Catalog"
                    description="Deconstruct an `.xcstrings` catalog into its constituent `.strings` files and Android XML files for all supported languages."
                    onClick={() => setView('extract')}
                />
                <FeatureTile
                    icon={<PropertiesIcon className="w-6 h-6 text-red-400" />}
                    title="Convert to .properties"
                    description="Convert iOS (.strings, .stringsdict) and Android (.xml) localization files into Java `.properties` files for cross-platform use."
                    onClick={() => setView('properties')}
                />
                <FeatureTile
                    icon={<KeyIcon className="w-6 h-6 text-red-400" />}
                    title="Key Renamer"
                    description="Rename keys in a .strings file by cross-referencing values through a sequence of comparable files."
                    onClick={() => setView('renamer')}
                />
                <FeatureTile
                    icon={<EditIcon className="w-6 h-6 text-red-400" />}
                    title="File Editor"
                    description="A lightweight editor for localization files. Upload, edit, find, replace, and download your `.strings`, `.xml`, `.properties` and other files."
                    onClick={() => setView('editor')}
                />
            </div>
        </div>
    );
};
