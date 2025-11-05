import React, { useState, useEffect } from 'react';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import {
  mergeAndParseStrings,
  generateIosStringCatalog,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { SaveIcon, FolderIcon, TrashIcon, ArrowLeftIcon, CombineIcon } from './icons';

const PROJECT_STORAGE_KEY = 'stringsExporterProject_combine';

interface CombineStringsViewProps {
  onBack: () => void;
}

export const CombineStringsView: React.FC<CombineStringsViewProps> = ({ onBack }) => {
  const [languageFiles, setLanguageFiles] = useState<LanguageFile[]>([]);
  const [iosOutput, setIosOutput] = useState('');
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
    setIosOutput('');
    setAndroidOutputs({});
  }

  const handleConvert = (files?: LanguageFile[]) => {
    setIsLoading(true);
    setError(null);
    clearAllOutputs();

    setTimeout(() => {
      try {
        const filesToProcess = files || languageFiles;
        if (filesToProcess.length === 0) return;
        const { parsedData, sourceLanguage, languages } = mergeAndParseStrings(filesToProcess);
        setIosOutput(generateIosStringCatalog(parsedData, sourceLanguage));
        setAndroidOutputs(generateAllAndroidXml(parsedData, languages));
      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred during conversion.');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleFilesChange = (newFiles: LanguageFile[]) => {
    setLanguageFiles(newFiles);
    handleConvert(newFiles);
  };

  const handleSaveProject = () => {
    const projectData = {
      languageFiles,
      iosOutput,
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
        setLanguageFiles(data.languageFiles || []);
        setIosOutput(data.iosOutput || '');
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
    setLanguageFiles([]);
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
                <CombineIcon className="w-5 h-5 text-red-500" />
                <h1 className="text-md font-bold text-slate-200">Create String Catalog</h1>
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
          conversionMode="stringsToCatalog"
          files={languageFiles}
          onFilesChange={handleFilesChange}
          catalogFile={null}
          onCatalogFileChange={() => {}}
          onConvert={() => handleConvert()}
          isLoading={isLoading}
          error={error}
          setError={setError}
        />
        <OutputPanel
          conversionMode="stringsToCatalog"
          iosOutput={iosOutput}
          androidOutputs={androidOutputs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          generatedStrings={{}}
        />
      </div>
    </div>
  );
}