import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Check, Loader2, Download, Image as ImageIcon } from 'lucide-react';
import { generateAppIcons, Platform } from '../services/appIconGenerator';

interface AppIconGeneratorViewProps {
    onBack: () => void;
}

export const AppIconGeneratorView: React.FC<AppIconGeneratorViewProps> = ({ onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({
        iphone: true,
        ipad: true,
        watch: true,
        mac: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            alert('Please upload an image file (PNG or JPG).');
            return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const togglePlatform = (p: Platform) => {
        setPlatforms(prev => ({ ...prev, [p]: !prev[p] }));
    };

    const handleGenerate = async () => {
        if (!file) return;

        setIsGenerating(true);
        setProgress(0);

        try {
            const blob = await generateAppIcons(file, platforms, (p) => setProgress(p));

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'AppIcon.appiconset.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate icons', error);
            alert('Failed to generate icons. See console for details.');
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <ImageIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">App Icon Generator</h1>
                </div>
                <div className="w-20" /> {/* Spacer */}
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Input & Config */}
                <div className="space-y-6">
                    {/* Dropzone */}
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={openFileDialog}
                        className={`aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group ${isDragActive
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : file
                                    ? 'border-emerald-500/50 bg-slate-800'
                                    : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={onFileInputChange}
                            accept="image/png, image/jpeg"
                            className="hidden"
                        />

                        {previewUrl ? (
                            <>
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain opacity-50 group-hover:opacity-30 transition-opacity absolute inset-0 rounded-2xl" />
                                <div className="z-10 bg-slate-900/80 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                                    <p className="text-sm font-medium text-white mb-1">{file?.name}</p>
                                    <p className="text-xs text-slate-400">Click or Drag to replace</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className={`w-8 h-8 ${isDragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-200 mb-2">Upload Master Icon</h3>
                                <p className="text-sm text-slate-400 max-w-xs">
                                    Drag and drop your 1024x1024 PNG here, or click to browse.
                                </p>
                            </>
                        )}
                    </div>

                    {/* Platforms */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Target Platforms</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(platforms) as Platform[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => togglePlatform(p)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all active:scale-95 text-left ${platforms[p]
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${platforms[p] ? 'bg-white border-white' : 'border-slate-600'}`}>
                                        {platforms[p] && <Check className="w-3.5 h-3.5 text-indigo-600" strokeWidth={3} />}
                                    </div>
                                    <span className="capitalize font-medium">{p === 'mac' ? 'macOS' : p}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Preview & Action */}
                <div className="flex flex-col gap-6">
                    <div className="flex-grow bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">

                        {/* Simple visual preview representation */}
                        <div className="flex flex-wrap items-end justify-center gap-4 mb-8 opacity-50 grayscale pointer-events-none select-none">
                            <div className="w-24 h-24 bg-slate-700 rounded-xl"></div>
                            <div className="w-16 h-16 bg-slate-700 rounded-lg"></div>
                            <div className="w-12 h-12 bg-slate-700 rounded-md"></div>
                            <div className="w-8 h-8 bg-slate-700 rounded-md"></div>
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-xl font-semibold text-white mb-2">Ready to Generate</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                We will generate the <code>AppIcon.appiconset</code> folder containing all required sizes and the <code>Contents.json</code> manifest.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!file || isGenerating || !Object.values(platforms).some(v => v)}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Generating... {progress}%</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-6 h-6" />
                                <span>Generate & Download ZIP</span>
                            </>
                        )}
                    </button>

                    {!file && (
                        <p className="text-center text-sm text-slate-500">Please upload an image first</p>
                    )}
                </div>
            </div>
        </div>
    );
};
