import React, { useState, useEffect } from 'react';
import { OutputFormat, ConversionMode } from '../types';
import { AppleIcon, AndroidIcon, CopyIcon, DownloadIcon } from './icons';
import { CodeBlock } from './CodeBlock';

interface OutputPanelProps {
  conversionMode: ConversionMode;
  // For stringsToCatalog mode
  iosOutput: string;
  // androidOutputs used by both modes now
  androidOutputs: Record<string, string>;
  // activeTab used by both modes now
  activeTab: OutputFormat;
  // setActiveTab used by both modes now
  setActiveTab: (tab: OutputFormat) => void;
  // For catalogToStrings mode
  generatedStrings: Record<string, string>;
}

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ isActive, onClick, children }) => (
  <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500 transition-all duration-200 flex-shrink-0 ${
      isActive ? 'bg-white/50 dark:bg-slate-800/50 text-violet-600 dark:text-violet-400 border-b-2 border-violet-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
    }`}
  >{children}</button>
);

const SubTabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode; }> = ({ isActive, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none transition-colors duration-150 flex-shrink-0 ${
        isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-300/50 dark:hover:bg-slate-600/50'
      }`}>{children}</button>
);

const FileListItem: React.FC<{ fileName: string; content: string }> = ({ fileName, content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    return (
        <div className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-800/60 rounded-md">
            <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{fileName}</span>
            <div className="flex items-center space-x-2">
                <button onClick={handleCopy} title="Copy" className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-md transition-colors">{copied ? <span className="text-xs px-1">Copied!</span> : <CopyIcon className="w-4 h-4" />}</button>
                <button onClick={handleDownload} title="Download" className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-md transition-colors"><DownloadIcon className="w-4 h-4" /></button>
            </div>
        </div>
    );
};


export const OutputPanel: React.FC<OutputPanelProps> = (props) => {
    
    // --- RENDER FOR stringsToCatalog ---
    const renderStringsToCatalog = () => {
        const { iosOutput, androidOutputs, activeTab, setActiveTab } = props;
        const [activeAndroidLang, setActiveAndroidLang] = useState('');
        const androidLangs = Object.keys(androidOutputs);
        const hasIosOutput = iosOutput.length > 0;
        const hasAndroidOutput = androidLangs.length > 0;
        const hasOutput = hasIosOutput || hasAndroidOutput;

        useEffect(() => {
            if (hasAndroidOutput && !androidLangs.includes(activeAndroidLang)) {
                setActiveAndroidLang(androidLangs[0]);
            } else if (!hasAndroidOutput) {
                setActiveAndroidLang('');
            }
        }, [androidLangs, activeAndroidLang, hasAndroidOutput]);

        if (!hasOutput) {
            return <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 rounded-b-lg"><p>Output will appear here.</p></div>
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex flex-nowrap overflow-x-auto border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <TabButton isActive={activeTab === OutputFormat.IOS} onClick={() => setActiveTab(OutputFormat.IOS)}><AppleIcon className="w-4 h-4" /><span>{OutputFormat.IOS}</span></TabButton>
                    <TabButton isActive={activeTab === OutputFormat.ANDROID} onClick={() => setActiveTab(OutputFormat.ANDROID)}><AndroidIcon className="w-4 h-4" /><span>{OutputFormat.ANDROID}</span></TabButton>
                </div>
                <div className="flex-grow pt-3 overflow-hidden">
                    {activeTab === OutputFormat.IOS && <CodeBlock content={iosOutput} language="JSON" fileName="Localizable.xcstrings" />}
                    {activeTab === OutputFormat.ANDROID && (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-nowrap overflow-x-auto space-x-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-md mb-2 flex-shrink-0">
                                {androidLangs.map(lang => <SubTabButton key={lang} isActive={lang === activeAndroidLang} onClick={() => setActiveAndroidLang(lang)}>{lang}</SubTabButton>)}
                            </div>
                            <CodeBlock content={androidOutputs[activeAndroidLang] || ''} language="XML" fileName={`strings-${activeAndroidLang}.xml`} />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- RENDER FOR catalogToStrings ---
    const renderCatalogToStrings = () => {
        const { generatedStrings, androidOutputs, activeTab, setActiveTab } = props;
        const [activeAndroidLang, setActiveAndroidLang] = useState('');

        const iosFiles = Object.keys(generatedStrings);
        const androidLangs = Object.keys(androidOutputs);
        const hasOutput = iosFiles.length > 0 || androidLangs.length > 0;

        useEffect(() => {
            if (androidLangs.length > 0 && !androidLangs.includes(activeAndroidLang)) {
                setActiveAndroidLang(androidLangs[0]);
            } else if (androidLangs.length === 0) {
                setActiveAndroidLang('');
            }
        }, [androidLangs, activeAndroidLang]);

        if (!hasOutput) {
            return <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 rounded-b-lg"><p>Output files will appear here.</p></div>
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex flex-nowrap overflow-x-auto border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <TabButton isActive={activeTab === OutputFormat.IOS} onClick={() => setActiveTab(OutputFormat.IOS)}>
                        <AppleIcon className="w-4 h-4" /><span>iOS (.strings, .stringsdict)</span>
                    </TabButton>
                    <TabButton isActive={activeTab === OutputFormat.ANDROID} onClick={() => setActiveTab(OutputFormat.ANDROID)}>
                        <AndroidIcon className="w-4 h-4" /><span>Android (XML)</span>
                    </TabButton>
                </div>
                <div className="flex-grow pt-3 flex flex-col min-h-0">
                    {activeTab === OutputFormat.IOS && (
                        <div className="flex-grow overflow-y-auto bg-slate-100/50 dark:bg-slate-900/50 rounded-md shadow-inner border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                           {Object.entries(generatedStrings)
                                .sort(([fileNameA], [fileNameB]) => fileNameA.localeCompare(fileNameB))
                                .map(([fileName, content]) => <FileListItem key={fileName} fileName={fileName} content={content} />)}
                        </div>
                    )}
                     {activeTab === OutputFormat.ANDROID && (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-nowrap overflow-x-auto space-x-2 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 rounded-md mb-2 flex-shrink-0">
                                {androidLangs.map(lang => <SubTabButton key={lang} isActive={lang === activeAndroidLang} onClick={() => setActiveAndroidLang(lang)}>{lang}</SubTabButton>)}
                            </div>
                            <CodeBlock content={androidOutputs[activeAndroidLang] || ''} language="XML" fileName={`strings-${activeAndroidLang}.xml`} />
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="flex flex-col p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg h-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
            {props.conversionMode === 'stringsToCatalog' ? renderStringsToCatalog() : renderCatalogToStrings()}
        </div>
    );
};