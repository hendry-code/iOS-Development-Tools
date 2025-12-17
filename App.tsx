

import React, { useState } from 'react';
import { ViewMode } from './types';

import { Dashboard } from './components/Dashboard';
import { CombineStringsView } from './components/CombineStringsView';
import { ExtractCatalogView } from './components/ExtractCatalogView';
import { PropertiesConverterView } from './components/ConverterView';
import { FileEditorView } from './components/FileEditorView';
import { KeyRenamerView } from './components/KeyRenamerView';
import { MergeStringsView } from './components/MergeStringsView';

import { StringsAnalyserView } from './components/StringsAnalyserView';
import { JsonConverterView } from './components/JsonConverterView';
import { XmlConverterView } from './components/XmlConverterView';


import { ThemeProvider } from './src/context/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  const [view, setView] = useState<ViewMode>('dashboard');

  const renderView = () => {
    switch (view) {
      case 'combine':
        return <CombineStringsView onBack={() => setView('dashboard')} />;
      case 'extract':
        return <ExtractCatalogView onBack={() => setView('dashboard')} />;
      case 'properties':
        return <PropertiesConverterView onBack={() => setView('dashboard')} />;
      case 'editor':
        return <FileEditorView onBack={() => setView('dashboard')} />;
      case 'renamer':
        return <KeyRenamerView onBack={() => setView('dashboard')} />;
      case 'merge':
        return <MergeStringsView onBack={() => setView('dashboard')} />;

      case 'analyser':
        return <StringsAnalyserView onBack={() => setView('dashboard')} />;
      case 'json-converter':
        return <JsonConverterView onBack={() => setView('dashboard')} />;
      case 'xml-converter':
        return <XmlConverterView onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard setView={setView} />;
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen w-full bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30 dark:selection:bg-red-500/30 overflow-x-hidden transition-colors duration-300 flex flex-col">
        {renderView()}
      </div>
    </ThemeProvider>
  );
}

export default App;
