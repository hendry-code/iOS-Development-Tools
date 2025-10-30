import React, { useState, useMemo } from 'react';
import { LANGUAGES } from '../constants/languages';

interface LanguageSelectorProps {
    selected: string[];
    onChange: (selected: string[]) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleToggle = (langCode: string) => {
        const newSelected = selected.includes(langCode)
            ? selected.filter(code => code !== langCode)
            : [...selected, langCode];
        onChange(newSelected);
    };
    
    const filteredLanguages = useMemo(() => {
        if (!searchTerm) return LANGUAGES;
        return LANGUAGES.filter(lang => 
            lang.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            lang.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return (
        <div className="flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700 h-full overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Search languages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm p-2 bg-slate-200/50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-violet-500 focus:outline-none"
                />
            </div>
            <div className="flex-grow overflow-y-auto p-2">
                {filteredLanguages.map(lang => (
                    <label key={lang.code} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selected.includes(lang.code)}
                            onChange={() => handleToggle(lang.code)}
                            className="w-4 h-4 text-violet-600 bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{lang.name} <span className="text-slate-500 dark:text-slate-500">({lang.code})</span></span>
                    </label>
                ))}
            </div>
            <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                {selected.length} language(s) selected
            </div>
        </div>
    );
};