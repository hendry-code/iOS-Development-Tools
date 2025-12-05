import React, { useState, useEffect } from 'react';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import {
  mergeAndParseStrings,
  generateIosStringCatalog,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { Save, FolderOpen, Trash2, ArrowLeft, Combine } from 'lucide-react';

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
    <div className="flex flex-col h-full space-y-6 p-8">
      <header className="flex items-center justify-between pb-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors group" title="Back to Dashboard">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Combine className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Combine Strings</h1>
              <p className="text-xs text-gray-400">Merge multiple files into a catalog</p>
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
          conversionMode="stringsToCatalog"
          files={languageFiles}
          onFilesChange={handleFilesChange}
          catalogFile={null}
          onCatalogFileChange={() => { }}
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