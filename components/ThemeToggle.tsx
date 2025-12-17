import React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from '../src/context/ThemeContext';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300 dark:border-slate-700 shadow-sm">
            <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'light'
                        ? 'bg-white dark:bg-slate-600 text-yellow-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                title="Light Mode"
            >
                <Sun size={16} />
            </button>
            <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'system'
                        ? 'bg-white dark:bg-slate-600 text-blue-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                title="System Preference"
            >
                <Laptop size={16} />
            </button>
            <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'dark'
                        ? 'bg-white dark:bg-slate-600 text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                title="Dark Mode"
            >
                <Moon size={16} />
            </button>
        </div>
    );
}
