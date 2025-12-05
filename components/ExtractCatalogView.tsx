import React, { useState, useEffect } from 'react';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import {
  parseStringCatalog,
  generateAllStringsFiles,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { Save, FolderOpen, Trash2, ArrowLeft, FileOutput } from 'lucide-react';

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
    <div className="flex flex-col h-full space-y-6 p-8">
      <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <FileOutput className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Extract Catalog</h1>
              <p className="text-xs text-gray-400">Extract strings from .xcstrings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-green-400 font-medium transition-opacity duration-300 w-12 text-right">{saveStatus}</span>
          <button onClick={handleSaveProject} title="Save Project" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><Save size={18} /></button>
          <button onClick={handleLoadProject} disabled={!hasSavedProject} title="Load Project" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><FolderOpen size={18} /></button>
          <button onClick={handleClearProject} title="Clear Project" className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"><Trash2 size={18} /></button>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        <InputPanel
          conversionMode="catalogToStrings"
          files={[]}
          onFilesChange={() => { }}
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