
import React, { useState } from 'react';
import { ViewMode } from './types';

import { Dashboard } from './components/Dashboard';
import { CombineStringsView } from './components/CombineStringsView';
import { ExtractCatalogView } from './components/ExtractCatalogView';
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
    <div className="h-screen w-full bg-transparent text-slate-100 font-sans selection:bg-red-500/30 overflow-hidden">
      {renderView()}
    </div>
  );
}

export default App;
