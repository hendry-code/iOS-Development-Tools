import React, { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';

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
    <div className="relative bg-gray-900/50 rounded-lg h-full flex flex-col border border-gray-700/50">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-800/50 rounded-t-lg border-b border-gray-700/50">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{language}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1.5 rounded-md hover:bg-gray-700/50"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1.5 rounded-md hover:bg-gray-700/50"
            title={`Download ${fileName}`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <pre className="p-4 text-sm text-gray-300 overflow-auto flex-grow custom-scrollbar font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
};