import React, { useState, useEffect, useRef } from 'react';
import {
  mergeAndParseStrings,
  generateIosStringCatalog,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { Save, FolderOpen, Trash2, ArrowLeft, Combine, Plus, X, FileText, Upload, Download } from 'lucide-react';
import { DragDropZone } from './DragDropZone';

const PROJECT_STORAGE_KEY = 'stringsExporterProject_combine';

interface CombineStringsViewProps {
  onBack: () => void;
}

const guessLangCode = (fileName: string): string => {
  const name = fileName.toLowerCase().replace(/\.(strings|stringsdict|xml)$/, '');
  const lprojMatch = name.match(/([a-z]{2,3}(-[a-z0-9]+)?)\.lproj/);
  if (lprojMatch) return lprojMatch[1];
  const simpleMatch = name.match(/^[a-z]{2,3}(-[a-z0-9]+)?$/);
  if (simpleMatch) return simpleMatch[0];
  return '';
}

export const CombineStringsView: React.FC<CombineStringsViewProps> = ({ onBack }) => {
  const [languageFiles, setLanguageFiles] = useState<LanguageFile[]>([]);
  const [iosOutput, setIosOutput] = useState('');
  const [androidOutputs, setAndroidOutputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<OutputFormat>(OutputFormat.IOS);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const readFile = (file: File): Promise<LanguageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          content: reader.result as string,
          langCode: guessLangCode(file.name),
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const handleFilesChange = (newFiles: LanguageFile[]) => {
    setLanguageFiles(newFiles);
    handleConvert(newFiles);
  };

  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      const promises = Array.from(selectedFiles).map(readFile);
      const newlyReadFiles = await Promise.all(promises);
      const existingFileNames = new Set(languageFiles.map(f => f.name));
      const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));
      if (uniqueNewFiles.length > 0) {
        handleFilesChange([...languageFiles, ...uniqueNewFiles]);
      }
    } catch (err) {
      setError("Failed to read files.");
    }
    if (event.target) event.target.value = '';
  };

  const handleFilesDropped = async (files: FileList) => {
    try {
      const promises = Array.from(files).map(readFile);
      const newlyReadFiles = await Promise.all(promises);
      const existingFileNames = new Set(languageFiles.map(f => f.name));
      const uniqueNewFiles = newlyReadFiles.filter(f => !existingFileNames.has(f.name));
      if (uniqueNewFiles.length > 0) {
        handleFilesChange([...languageFiles, ...uniqueNewFiles]);
      }
    } catch (err) {
      setError("Failed to read files.");
    }
  };

  const removeFile = (name: string) => {
    handleFilesChange(languageFiles.filter(f => f.name !== name));
  }

  const handleLangCodeChange = (fileName: string, newLangCode: string) => {
    const newFiles = languageFiles.map(f => f.name === fileName ? { ...f, langCode: newLangCode } : f);
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

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderOutputContent = () => {
    if (!iosOutput && Object.keys(androidOutputs).length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
          <Combine size={48} className="mb-4" />
          <p className="text-lg font-medium">Ready to combine</p>
          <p className="text-sm">Upload files to generate catalog</p>
        </div>
      );
    }

    if (activeTab === OutputFormat.IOS) {
      return (
        <div className="h-full flex flex-col">
          {iosOutput && (
            <div className="flex justify-end mb-2 p-2 bg-slate-800/50 rounded-lg">
              <button
                onClick={() => handleDownload(iosOutput, 'Localizable.xcstrings')}
                className="flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-slate-200 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-all active:scale-95"
              >
                <Download size={14} />
                <span>Download .xcstrings</span>
              </button>
            </div>
          )}
          <div className="flex-1 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden relative">
            {iosOutput ? (
              <textarea
                readOnly
                value={iosOutput}
                className="w-full h-full p-4 bg-transparent text-slate-300 font-mono text-xs resize-none focus:outline-none custom-scrollbar"
              />
            ) : (
              <div className="p-4 text-center text-slate-500">No iOS catalog generated.</div>
            )}
          </div>
        </div>
      )
    } else {
      return (
        <div className="h-full overflow-y-auto custom-scrollbar p-1">
          {Object.entries(androidOutputs).length > 0 ? (
            Object.entries(androidOutputs).map(([lang, content]) => (
              <div key={lang} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    values-{lang}/strings.xml
                  </h3>
                  <button
                    onClick={() => handleDownload(content, `strings-${lang}.xml`)}
                    className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-all active:scale-95"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                  <textarea
                    readOnly
                    value={content}
                    className="w-full h-32 p-3 bg-transparent text-slate-300 font-mono text-xs resize-y focus:outline-none custom-scrollbar"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500">No Android strings generated.</div>
          )}
        </div>
      );
    }
  };


  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Combine Strings
          </h1>
          <p className="text-slate-400 text-sm">Merge multiple files into a catalog</p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <span className="text-xs text-green-400 font-medium transition-opacity duration-300 w-12 text-right">{saveStatus}</span>
          <button onClick={handleSaveProject} title="Save Project" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Save size={18} /></button>
          <button onClick={handleLoadProject} disabled={!hasSavedProject} title="Load Project" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><FolderOpen size={18} /></button>
          <button onClick={handleClearProject} title="Clear Project" className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Input Panel */}
        <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-y-auto bg-slate-900/50 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Input Files
            </h2>
            {languageFiles.length > 0 && (
              <button onClick={handleClearProject} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>

          <DragDropZone
            onFilesDropped={handleFilesDropped}
            className="flex-grow flex flex-col min-h-[150px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800/20"
            isDraggingClass="border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/50"
          >
            <div className="flex-grow overflow-y-auto p-2 space-y-2 h-full custom-scrollbar">
              {languageFiles.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full text-slate-500 cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Upload size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Drag & Drop files</p>
                </div>
              ) : (
                languageFiles.map(file => (
                  <div key={file.name} className="flex items-center justify-between p-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg group transition-colors border border-slate-700 hover:border-slate-600">
                    <div className="flex-1 min-w-0 mr-2">
                      <span className="text-sm font-mono text-slate-300 truncate block" title={file.name}>{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={file.langCode}
                        onChange={(e) => handleLangCodeChange(file.name, e.target.value)}
                        placeholder="lang"
                        className="w-14 text-xs py-1 px-1.5 bg-slate-900 border border-slate-600 rounded text-slate-300 focus:text-white focus:border-blue-500 focus:outline-none text-center"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={() => removeFile(file.name)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DragDropZone>

          {error && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Add Files</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFilesUpload} accept=".strings,.stringsdict,.xml" className="hidden" multiple />

            <button
              onClick={() => handleConvert()}
              disabled={isLoading || languageFiles.length === 0}
              className="w-full px-6 py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              {isLoading ? 'Processing...' : 'Combine Strings'}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Results</h2>
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab(OutputFormat.IOS)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === OutputFormat.IOS ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                iOS catalog
              </button>
              <button
                onClick={() => setActiveTab(OutputFormat.ANDROID)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === OutputFormat.ANDROID ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Android (.xml)
              </button>
            </div>
          </div>

          <div className="flex-1 rounded-xl relative shadow-inner overflow-hidden">
            {renderOutputContent()}
          </div>
        </div>
      </div>
    </div>
  );
}