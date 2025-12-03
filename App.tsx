
import React, { useState } from 'react';
import { ViewMode } from './types';
import { Dashboard } from './components/Dashboard';
import { CombineStringsView } from './components/CombineStringsView';
import { ExtractCatalogView } from './components/ExtractCatalogView';
import { AITranslatorView } from './components/AITranslatorView';
import { PropertiesConverterView } from './components/ConverterView';
import { FileEditorView } from './components/FileEditorView';
import { KeyRenamerView } from './components/KeyRenamerView';
import { MergeStringsView } from './components/MergeStringsView';


function App() {
  const [view, setView] = useState<ViewMode>('dashboard');

  const renderView = () => {
    switch (view) {
      case 'combine':
        return <CombineStringsView onBack={() => setView('dashboard')} />;
      case 'extract':
        return <ExtractCatalogView onBack={() => setView('dashboard')} />;
      case 'translator':
        return <AITranslatorView onBack={() => setView('dashboard')} />;
      case 'properties':
        return <PropertiesConverterView onBack={() => setView('dashboard')} />;
      case 'editor':
        return <FileEditorView onBack={() => setView('dashboard')} />;
      case 'renamer':
        return <KeyRenamerView onBack={() => setView('dashboard')} />;
      case 'merge':
        return <MergeStringsView onBack={() => setView('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard setView={setView} />;
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-4 sm:p-8">
      {renderView()}
    </main>
  );
}

export default App;
