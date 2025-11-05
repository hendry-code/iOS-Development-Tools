import React, { useState, useEffect } from 'react';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import {
  parseStringCatalog,
  generateAllStringsFiles,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { SaveIcon, FolderIcon, TrashIcon, ArrowLeftIcon, ExtractIcon } from './icons';

const PROJECT_STORAGE_KEY = 'stringsExporterProject_extract';

interface ExtractCatalogViewProps {
  onBack: () => void;
}

export const ExtractCatalogView: React.FC<ExtractCatalogViewProps> = ({ onBack }) => {
  const [catalogFile, setCatalogFile] = useState<LanguageFile | null>(null);
  const [generatedStrings, setGeneratedStrings] = useState<Record<string, string>>({});
  const [androidOutputs, setAndroidOutputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<OutputFormat>(OutputFormat.IOS);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedProject, setHasSavedProject] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedProject = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (savedProject) {
      setHasSavedProject(true);
      handleLoadProject();
    }
  }, []);

  const clearAllOutputs = () => {
    setGeneratedStrings({});
    setAndroidOutputs({});
  }

  const handleConvert = (catalog?: LanguageFile | null) => {
    setIsLoading(true);
    setError(null);
    clearAllOutputs();

    setTimeout(() => {
      try {
        const fileToProcess = catalog || catalogFile;
        if (!fileToProcess) return;
        const { parsedData, languages } = parseStringCatalog(fileToProcess.content);
        setGeneratedStrings(generateAllStringsFiles(parsedData, languages));
        setAndroidOutputs(generateAllAndroidXml(parsedData, languages));
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred during conversion.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleCatalogFileChange = (file: LanguageFile | null) => {
    setCatalogFile(file);
    handleConvert(file);
  }

  const handleSaveProject = () => {
    const projectData = {
      catalogFile,
      generatedStrings,
      androidOutputs,
      activeTab,
    };
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectData));
    setHasSavedProject(true);
    setSaveStatus('Saved!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleLoadProject = () => {
    const savedProject = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (savedProject) {
      try {
        const data = JSON.parse(savedProject);
        setCatalogFile(data.catalogFile || null);
        setGeneratedStrings(data.generatedStrings || {});
        setAndroidOutputs(data.androidOutputs || {});
        setActiveTab(data.activeTab || OutputFormat.IOS);
        setError(null);
      } catch (e) {
        setError("Failed to load project. The saved data might be corrupted.");
        localStorage.removeItem(PROJECT_STORAGE_KEY);
        setHasSavedProject(false);
      }
    }
  };

  const handleClearProject = () => {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    setCatalogFile(null);
    clearAllOutputs();
    setActiveTab(OutputFormat.IOS);
    setError(null);
    setHasSavedProject(false);
  };

  return (
    <div className="w-full max-w-7xl h-[90vh] min-h-[700px] flex flex-col bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-700">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex-1">
          <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 hover:text-red-500 transition-colors">
             <ArrowLeftIcon className="w-5 h-5" />
             <span className="text-sm font-semibold">Dashboard</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-2">
                <ExtractIcon className="w-5 h-5 text-red-500" />
                <h1 className="text-md font-bold text-slate-200">Extract from Catalog</h1>
            </div>
        </div>
        <div className="flex-1 flex justify-end items-center space-x-2">
          <span className="text-xs text-green-400 font-medium transition-opacity duration-300 w-12 text-right">{saveStatus}</span>
          <button onClick={handleSaveProject} title="Save Project" className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 rounded-lg transition-colors"><SaveIcon className="w-5 h-5" /></button>
          <button onClick={handleLoadProject} disabled={!hasSavedProject} title="Load Project" className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><FolderIcon className="w-5 h-5" /></button>
          <button onClick={handleClearProject} title="Clear Project" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        <InputPanel
          conversionMode="catalogToStrings"
          files={[]}
          onFilesChange={() => {}}
          catalogFile={catalogFile}
          onCatalogFileChange={handleCatalogFileChange}
          onConvert={() => handleConvert()}
          isLoading={isLoading}
          error={error}
          setError={setError}
        />
        <OutputPanel
          conversionMode="catalogToStrings"
          iosOutput=""
          androidOutputs={androidOutputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          generatedStrings={generatedStrings}
        />
      </div>
    </div>
  );
}