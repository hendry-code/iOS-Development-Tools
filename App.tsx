import React, { useState, useEffect } from 'react';
import { ViewMode } from './types';
import { Dashboard } from './components/Dashboard';
import { CombineStringsView } from './components/CombineStringsView';
import { ExtractCatalogView } from './components/ExtractCatalogView';
import { AITranslatorView } from './components/AITranslatorView';
import { SunIcon, MoonIcon } from './components/icons';

function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.theme === 'dark') {
      return true;
    }
    if (typeof window !== 'undefined' && !('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const renderView = () => {
    switch (view) {
      case 'combine':
        return <CombineStringsView onBack={() => setView('dashboard')} />;
      case 'extract':
        return <ExtractCatalogView onBack={() => setView('dashboard')} />;
      case 'translator':
        return <AITranslatorView onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard setView={setView} />;
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-4 sm:p-8 text-slate-800 dark:text-slate-300 transition-colors duration-300">
       <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
        aria-label="Toggle theme"
      >
        {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
      </button>

      {renderView()}
    </main>
  );
}

export default App;
