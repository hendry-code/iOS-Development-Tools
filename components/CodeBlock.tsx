
import React, { useState } from 'react';
import { CopyIcon, DownloadIcon } from './icons';

interface CodeBlockProps {
  content: string;
  language: string;
  fileName: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, language, fileName }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative bg-gray-800 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-700/50 rounded-t-lg">
        <span className="text-sm text-gray-400">{language}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1.5 rounded-md hover:bg-gray-600"
            title="Copy to clipboard"
          >
            {copied ? <span className="text-xs">Copied!</span> : <CopyIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1.5 rounded-md hover:bg-gray-600"
            title={`Download ${fileName}`}
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <pre className="p-4 text-sm text-white overflow-auto flex-grow">
        <code>{content}</code>
      </pre>
    </div>
  );
};
