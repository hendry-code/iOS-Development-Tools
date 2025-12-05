import React, { useState, useEffect } from 'react';
import { OutputFormat, ConversionMode } from '../types';
import { Smartphone, Copy, Download } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

// Custom Apple Icon since Lucide might not have a perfect one, or use a generic one
const Apple = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} height="1em" width="1em">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.12-1.62 1.35.09 2.38.74 3.08 1.62-2.79 1.47-2.29 5.88.62 7.06-.59 1.76-1.47 3.53-2.9 5.17zm-4.85-16c.44-1.32 1.76-2.47 3.24-2.47.09 1.18-.59 2.5-1.47 3.24-.88.88-2.2 1.47-3.24 1.32-.15-1.18.59-2.09 1.47-2.09z" />
    </svg>
);

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
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex-shrink-0 ${isActive
            ? 'bg-gray-700 text-white shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
    >{children}</button>
);

const SubTabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode; }> = ({ isActive, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1 text-xs font-medium rounded-md focus:outline-none transition-colors duration-150 flex-shrink-0 ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 bg-gray-800 hover:bg-gray-700'
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
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-md border border-transparent hover:border-gray-700 transition-all group">
            <span className="text-sm font-mono text-gray-300">{fileName}</span>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={handleCopy} title="Copy" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
                    {copied ? <span className="text-xs px-1 text-green-400">Copied</span> : <Copy size={14} />}
                </button>
                <button onClick={handleDownload} title="Download" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
                    <Download size={14} />
                </button>
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
            return <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed"><p>Output will appear here</p></div>
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg mb-4 flex-shrink-0 w-fit">
                    <TabButton isActive={activeTab === OutputFormat.IOS} onClick={() => setActiveTab(OutputFormat.IOS)}>
                        <Apple className="w-4 h-4" /><span>{OutputFormat.IOS}</span>
                    </TabButton>
                    <TabButton isActive={activeTab === OutputFormat.ANDROID} onClick={() => setActiveTab(OutputFormat.ANDROID)}>
                        <Smartphone className="w-4 h-4" /><span>{OutputFormat.ANDROID}</span>
                    </TabButton>
                </div>
                <div className="flex-grow overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900/50">
                    {activeTab === OutputFormat.IOS && <CodeBlock content={iosOutput} language="JSON" fileName="Localizable.xcstrings" />}
                    {activeTab === OutputFormat.ANDROID && (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-nowrap overflow-x-auto space-x-2 p-2 border-b border-gray-800 flex-shrink-0">
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
            return <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed"><p>Output files will appear here</p></div>
        }

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 p-1 bg-gray-800/50 rounded-lg mb-4 flex-shrink-0 w-fit">
                    <TabButton isActive={activeTab === OutputFormat.IOS} onClick={() => setActiveTab(OutputFormat.IOS)}>
                        <Apple className="w-4 h-4" /><span>iOS</span>
                    </TabButton>
                    <TabButton isActive={activeTab === OutputFormat.ANDROID} onClick={() => setActiveTab(OutputFormat.ANDROID)}>
                        <Smartphone className="w-4 h-4" /><span>Android</span>
                    </TabButton>
                </div>
                <div className="flex-grow flex flex-col min-h-0 rounded-lg border border-gray-700/50 bg-gray-900/50 overflow-hidden">
                    {activeTab === OutputFormat.IOS && (
                        <div className="flex-grow overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {Object.entries(generatedStrings)
                                .sort(([fileNameA], [fileNameB]) => fileNameA.localeCompare(fileNameB))
                                .map(([fileName, content]) => <FileListItem key={fileName} fileName={fileName} content={content} />)}
                        </div>
                    )}
                    {activeTab === OutputFormat.ANDROID && (
                        <div className="h-full flex flex-col">
                            <div className="flex flex-nowrap overflow-x-auto space-x-2 p-2 border-b border-gray-800 flex-shrink-0">
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
        <div className="flex flex-col p-4 bg-gray-800/30 backdrop-blur-md rounded-xl h-full overflow-hidden border border-gray-700/50 shadow-xl">
            {props.conversionMode === 'stringsToCatalog' ? renderStringsToCatalog() : renderCatalogToStrings()}
        </div>
    );
};