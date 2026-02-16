import React, { useState, useEffect } from 'react';
import {
  parseStringCatalog,
  generateAllStringsFiles,
  generateAllAndroidXml,
} from '../services/converter';
import { OutputFormat, LanguageFile } from '../types';
import { Save, FolderOpen, Trash2, ArrowLeft, FileOutput, X, Download, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { DragDropZone } from './DragDropZone';

const PROJECT_STORAGE_KEY = 'stringsExporterProject_extract';

interface ExtractCatalogViewProps {
  onBack: () => void;
}

// --- Sample Data ---
const SAMPLE_XCSTRINGS = JSON.stringify({
  sourceLanguage: 'en',
  strings: {
    welcome_title: {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: 'Welcome' } },
        es: { stringUnit: { state: 'translated', value: 'Bienvenido' } },
        fr: { stringUnit: { state: 'translated', value: 'Bienvenue' } },
      },
    },
    login_button: {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: 'Sign In' } },
        es: { stringUnit: { state: 'translated', value: 'Iniciar sesi\u00f3n' } },
        fr: { stringUnit: { state: 'translated', value: 'Se connecter' } },
      },
    },
    logout_button: {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: 'Sign Out' } },
        es: { stringUnit: { state: 'translated', value: 'Cerrar sesi\u00f3n' } },
        fr: { stringUnit: { state: 'translated', value: 'Se d\u00e9connecter' } },
      },
    },
    settings_title: {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: 'Settings' } },
        es: { stringUnit: { state: 'translated', value: 'Ajustes' } },
        fr: { stringUnit: { state: 'translated', value: 'Param\u00e8tres' } },
      },
    },
    delete_confirm: {
      extractionState: 'manual',
      localizations: {
        en: { stringUnit: { state: 'translated', value: 'Are you sure you want to delete?' } },
        es: { stringUnit: { state: 'translated', value: '\u00bfEst\u00e1s seguro de que quieres eliminar?' } },
        fr: { stringUnit: { state: 'translated', value: '\u00cates-vous s\u00fbr de vouloir supprimer ?' } },
      },
    },
    items_count: {
      extractionState: 'manual',
      localizations: {
        en: {
          variations: {
            plural: {
              one: { stringUnit: { state: 'translated', value: '%d item' } },
              other: { stringUnit: { state: 'translated', value: '%d items' } },
            },
          },
        },
        es: {
          variations: {
            plural: {
              one: { stringUnit: { state: 'translated', value: '%d elemento' } },
              other: { stringUnit: { state: 'translated', value: '%d elementos' } },
            },
          },
        },
      },
    },
  },
  version: '1.0',
}, null, 2);

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

  const handleExecuteSample = () => {
    const sampleFile: LanguageFile = {
      name: 'SampleCatalog.xcstrings',
      content: SAMPLE_XCSTRINGS,
      langCode: '',
    };
    handleCatalogFileChange(sampleFile);
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



  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const isIOS = activeTab === OutputFormat.IOS;
    const sourceData = isIOS ? generatedStrings : androidOutputs;

    if (Object.keys(sourceData).length === 0) return;

    Object.entries(sourceData).forEach(([filename, content]) => {
      // For Android, filename key is language code, we need to construct path
      if (!isIOS) {
        zip.file(`values-${filename}/strings.xml`, content as string);
      } else {
        zip.file(filename, content as string);
      }
    });

    try {
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isIOS ? 'ios-strings.zip' : 'android-strings.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error("Failed to generate zip", e);
      setError("Failed to generate zip file.");
    }
  };

  const renderOutputContent = () => {
    if (!generatedStrings && Object.keys(androidOutputs).length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50">
          <FileOutput size={48} className="mb-4" />
          <p className="text-lg font-medium">Ready to extract</p>
          <p className="text-sm">Upload a catalog to generate files</p>
        </div>
      );
    }

    if (activeTab === OutputFormat.IOS) {
      return (
        <div className="h-full overflow-y-auto custom-scrollbar p-1">
          {Object.entries(generatedStrings).length > 0 ? (
            Object.entries(generatedStrings).map(([fileName, content]) => (
              <div key={fileName} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                    {fileName}
                  </h3>
                  <button
                    onClick={() => handleDownload(content as string, fileName)}
                    className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-all active:scale-95"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                  <textarea
                    readOnly
                    value={content as string}
                    className="w-full h-32 p-3 bg-transparent text-slate-300 font-mono text-xs resize-y focus:outline-none custom-scrollbar"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500">No iOS strings generated.</div>
          )}
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
                    onClick={() => handleDownload(content as string, `strings-${lang}.xml`)}
                    className="flex items-center space-x-1 px-2 py-1 text-[10px] font-bold text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-all active:scale-95"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </button>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                  <textarea
                    readOnly
                    value={content as string}
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
    <div className="flex flex-col min-h-screen md:h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 mr-4 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Extract Catalog
          </h1>
          <p className="text-slate-400 text-sm">Extract strings from .xcstrings to legacy formats</p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={handleExecuteSample}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-400/60 rounded-lg font-semibold active:scale-95 transition-all text-sm"
            title="Load a sample .xcstrings catalog and auto-extract to see how it works"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Execute Sample</span>
          </button>
          <span className="text-xs text-emerald-400 font-medium transition-opacity duration-300 w-12 text-right">{saveStatus}</span>
          <button onClick={handleSaveProject} title="Save Project" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"><Save size={18} /></button>
          <button onClick={handleLoadProject} disabled={!hasSavedProject} title="Load Project" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><FolderOpen size={18} /></button>
          <button onClick={handleClearProject} title="Clear Project" className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
        {/* Input Panel */}
        <div className="w-full md:w-1/3 md:max-w-md p-6 border-r border-slate-700 overflow-visible md:overflow-y-auto bg-slate-900/50 flex flex-col min-h-0">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Source Catalog
          </h2>

          <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-2 mb-4">
            <DragDropZone
              onFilesDropped={(files) => {
                if (files[0]) handleCatalogFileChange({ name: files[0].name, content: '', langCode: '' }); // Simplified, usually need to read content
                // Actually, we should use the same logic as MergeView: read and set
                const reader = new FileReader();
                reader.onload = (e) => {
                  if (files[0]) handleCatalogFileChange({ name: files[0].name, content: e.target?.result as string, langCode: '' });
                };
                if (files[0]) reader.readAsText(files[0]);
              }}
              className="w-full"
              isDraggingClass="border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50"
            >
              {catalogFile ? (
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 group">
                  <div className="flex items-center overflow-hidden">
                    <div className="w-8 h-8 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center mr-3 flex-shrink-0">
                      <FileOutput size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-200 truncate pr-2" title={catalogFile.name}>
                      {catalogFile.name}
                    </span>
                  </div>
                  <button onClick={() => setCatalogFile(null)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-lg hover:border-purple-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".xcstrings"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => handleCatalogFileChange({ name: file.name, content: ev.target?.result as string, langCode: '' });
                        reader.readAsText(file);
                      }
                    }}
                  />
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-500/10 transition-colors">
                    <FolderOpen size={20} className="text-slate-500 group-hover:text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Upload .xcstrings</p>
                </div>
              )}
            </DragDropZone>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          <button
            onClick={() => handleConvert()}
            disabled={isLoading || !catalogFile}
            className="w-full mt-auto py-3.5 text-sm font-bold text-white bg-purple-600 rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Extracting...' : 'Extract Strings'}
          </button>
        </div>

        {/* Output Panel */}
        <div className="w-full md:flex-1 min-h-[500px] md:min-h-0 md:h-full overflow-visible md:overflow-y-auto bg-slate-950 p-6 flex flex-col border-t md:border-t-0 border-slate-800">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Extraction Results</h2>
            <div className="flex items-center space-x-3">
              {(Object.keys(generatedStrings).length > 0 || Object.keys(androidOutputs).length > 0) && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg shadow hover:bg-indigo-500 transition-all active:scale-95"
                  title="Download all files as ZIP"
                >
                  <Download size={14} />
                  <span>Download All (Zip)</span>
                </button>
              )}
              <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab(OutputFormat.IOS)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === OutputFormat.IOS ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  iOS (.strings)
                </button>
                <button
                  onClick={() => setActiveTab(OutputFormat.ANDROID)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === OutputFormat.ANDROID ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Android (.xml)
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 relative shadow-inner overflow-hidden">
            {renderOutputContent()}
          </div>
        </div>
      </div>
    </div>
  );
};