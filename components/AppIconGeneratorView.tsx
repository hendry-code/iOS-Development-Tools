import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    ArrowLeft, Upload, Check, Loader2, Download, Image as ImageIcon,
    AlertTriangle, Palette, Grid3X3, MonitorSmartphone, Plus, X,
    Moon, Sun, Droplets, Globe, Info, ChevronDown, ChevronUp, Layers,
    FileImage, ClipboardList
} from 'lucide-react';
import {
    generateAppIcons, validateImage, flattenAlpha, buildAssetSummary,
    Platform, ImageValidation, AssetSummaryEntry, IconAppearance, GenerateOptions,
} from '../services/appIconGenerator';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppIconGeneratorViewProps {
    onBack: () => void;
}

// ─── Squircle clip-path (iOS superellipse approximation) ──────────────────────

const SQUIRCLE_CLIP_PATH = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50,0 C77,0 100,0 100,23 C100,50 100,50 100,77 C100,100 77,100 50,100 C23,100 0,100 0,77 C0,50 0,50 0,23 C0,0 23,0 50,0Z'/%3E%3C/svg%3E")`;

// ─── Live preview sizes ───────────────────────────────────────────────────────

const PREVIEW_SIZES = [
    { label: '180px (60@3x)', size: 180 },
    { label: '120px (60@2x)', size: 120 },
    { label: '80px (40@2x)', size: 80 },
    { label: '58px (29@2x)', size: 58 },
    { label: '40px (20@2x)', size: 40 },
    { label: '29px', size: 29 },
    { label: '16px', size: 16 },
];

// ─── Variant type ─────────────────────────────────────────────────────────────

interface IconVariant {
    id: string;
    name: string;
    file: File | null;
    previewUrl: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AppIconGeneratorView: React.FC<AppIconGeneratorViewProps> = ({ onBack }) => {
    // Core state
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({
        iphone: true,
        ipad: true,
        watch: true,
        mac: false,
        web: false,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // F1 — Squircle preview
    const [showSquircle, setShowSquircle] = useState(true);

    // F2 — Validation
    const [validation, setValidation] = useState<ImageValidation | null>(null);

    // F3 — Background color for alpha flatten
    const [bgColor, setBgColor] = useState('#FFFFFF');

    // F4 — Live size grid
    const [showSizeGrid, setShowSizeGrid] = useState(false);

    // F5 — Single size mode (Xcode 15+)
    const [singleSize, setSingleSize] = useState(false);

    // F6 — Batch mode
    const [batchMode, setBatchMode] = useState(false);
    const [batchFiles, setBatchFiles] = useState<{ file: File; previewUrl: string }[]>([]);
    const batchInputRef = useRef<HTMLInputElement>(null);

    // F7 — iOS 18 appearance variants
    const [enableAppearances, setEnableAppearances] = useState(false);
    const [darkFile, setDarkFile] = useState<File | null>(null);
    const [darkPreview, setDarkPreview] = useState<string | null>(null);
    const [tintedFile, setTintedFile] = useState<File | null>(null);
    const [tintedPreview, setTintedPreview] = useState<string | null>(null);
    const darkInputRef = useRef<HTMLInputElement>(null);
    const tintedInputRef = useRef<HTMLInputElement>(null);

    // F8 — Alternate icon variants
    const [variants, setVariants] = useState<IconVariant[]>([]);

    // F10 — Asset summary
    const [assetSummary, setAssetSummary] = useState<AssetSummaryEntry[] | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);

    // ─── File handling ────────────────────────────────────────────────────────

    const handleFile = useCallback((selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            alert('Please upload an image file (PNG or JPG).');
            return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setAssetSummary(null);
        setShowSummary(false);
        setGeneratedBlob(null);
    }, []);

    // Run validation whenever file changes (F2)
    useEffect(() => {
        if (!file) {
            setValidation(null);
            return;
        }
        let cancelled = false;
        validateImage(file).then(v => {
            if (!cancelled) setValidation(v);
        });
        return () => { cancelled = true; };
    }, [file]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); };
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (batchMode) {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            addBatchFiles(files);
        } else if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (batchMode) {
            const files = Array.from(e.target.files || []);
            addBatchFiles(files);
        } else if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
        }
        // Reset value so re-uploading the same file works
        e.target.value = '';
    };

    const openFileDialog = () => fileInputRef.current?.click();
    const togglePlatform = (p: Platform) => setPlatforms(prev => ({ ...prev, [p]: !prev[p] }));

    // F6 — Batch helpers
    const addBatchFiles = (files: File[]) => {
        const newEntries = files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }));
        setBatchFiles(prev => [...prev, ...newEntries]);
    };
    const removeBatchFile = (index: number) => {
        setBatchFiles(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].previewUrl);
            next.splice(index, 1);
            return next;
        });
    };

    // F3 — Flatten alpha
    const handleFlattenAlpha = async () => {
        if (!file) return;
        try {
            const flattened = await flattenAlpha(file, bgColor);
            setFile(flattened);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(flattened));
        } catch (err) {
            console.error('Flatten failed', err);
        }
    };

    // F7 — Appearance file handlers
    const handleAppearanceFile = (type: 'dark' | 'tinted', selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) return;
        if (type === 'dark') {
            setDarkFile(selectedFile);
            if (darkPreview) URL.revokeObjectURL(darkPreview);
            setDarkPreview(URL.createObjectURL(selectedFile));
        } else {
            setTintedFile(selectedFile);
            if (tintedPreview) URL.revokeObjectURL(tintedPreview);
            setTintedPreview(URL.createObjectURL(selectedFile));
        }
    };

    // F8 — Variant helpers
    const addVariant = () => {
        setVariants(prev => [...prev, { id: crypto.randomUUID(), name: '', file: null, previewUrl: null }]);
    };
    const removeVariant = (id: string) => {
        setVariants(prev => {
            const v = prev.find(x => x.id === id);
            if (v?.previewUrl) URL.revokeObjectURL(v.previewUrl);
            return prev.filter(x => x.id !== id);
        });
    };
    const updateVariantName = (id: string, name: string) => {
        setVariants(prev => prev.map(v => v.id === id ? { ...v, name } : v));
    };
    const updateVariantFile = (id: string, f: File) => {
        setVariants(prev => prev.map(v => {
            if (v.id !== id) return v;
            if (v.previewUrl) URL.revokeObjectURL(v.previewUrl);
            return { ...v, file: f, previewUrl: URL.createObjectURL(f) };
        }));
    };

    // ─── Generate ─────────────────────────────────────────────────────────────

    const handleGenerate = async () => {
        if (batchMode) {
            await handleBatchGenerate();
            return;
        }
        if (!file) return;

        setIsGenerating(true);
        setProgress(0);
        setAssetSummary(null);
        setShowSummary(false);

        try {
            const appearances: Partial<Record<IconAppearance, File>> = {};
            if (enableAppearances) {
                if (darkFile) appearances.dark = darkFile;
                if (tintedFile) appearances.tinted = tintedFile;
            }

            const options: GenerateOptions = {
                singleSize,
                appearances: Object.keys(appearances).length > 0 ? appearances : undefined,
            };

            // Generate main icon set
            const { blob: mainBlob, summary: mainSummary } = await generateAppIcons(
                file, platforms, (p) => setProgress(p), options,
            );

            // Generate alternate variants (F8) and merge zips
            if (variants.length > 0 && variants.some(v => v.file && v.name.trim())) {
                const JSZipModule = (await import('jszip')).default;
                const mainZip = await JSZipModule.loadAsync(mainBlob);

                for (const variant of variants) {
                    if (!variant.file || !variant.name.trim()) continue;
                    const { blob: variantBlob } = await generateAppIcons(
                        variant.file, platforms, undefined,
                        { ...options, variantName: variant.name.trim() },
                    );
                    const variantZip = await JSZipModule.loadAsync(variantBlob);
                    // Copy all files from variant zip into main zip
                    for (const [path, zipEntry] of Object.entries(variantZip.files)) {
                        if (!zipEntry.dir) {
                            const content = await zipEntry.async('blob');
                            mainZip.file(path, content);
                        }
                    }
                }

                const mergedBlob = await mainZip.generateAsync({ type: 'blob' });
                setGeneratedBlob(mergedBlob);
            } else {
                setGeneratedBlob(mainBlob);
            }

            setAssetSummary(mainSummary);
            setShowSummary(true);
        } catch (error) {
            console.error('Failed to generate icons', error);
            alert('Failed to generate icons. See console for details.');
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    // F6 — Batch generate
    const handleBatchGenerate = async () => {
        if (batchFiles.length === 0) return;

        setIsGenerating(true);
        setProgress(0);

        try {
            const JSZipModule = (await import('jszip')).default;
            const masterZip = new JSZipModule();

            for (let i = 0; i < batchFiles.length; i++) {
                const entry = batchFiles[i];
                const baseName = entry.file.name.replace(/\.[^.]+$/, '');
                const folderName = `${baseName}-AppIcon`;

                const { blob } = await generateAppIcons(
                    entry.file, platforms,
                    (p) => {
                        const overallProgress = Math.round(((i + (p / 100)) / batchFiles.length) * 100);
                        setProgress(overallProgress);
                    },
                    { singleSize },
                );

                // Merge into master zip under a unique folder
                const itemZip = await JSZipModule.loadAsync(blob);
                for (const [path, zipEntry] of Object.entries(itemZip.files)) {
                    if (!zipEntry.dir) {
                        const content = await zipEntry.async('blob');
                        masterZip.file(`${folderName}/${path}`, content);
                    }
                }
            }

            const finalBlob = await masterZip.generateAsync({ type: 'blob' });
            downloadBlob(finalBlob, 'AppIcons-Batch.zip');
        } catch (error) {
            console.error('Batch generation failed', error);
            alert('Batch generation failed. See console for details.');
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };

    // ─── Download helpers ─────────────────────────────────────────────────────

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownload = () => {
        if (generatedBlob) {
            downloadBlob(generatedBlob, 'AppIcon.appiconset.zip');
        }
    };

    // ─── Computed ─────────────────────────────────────────────────────────────

    const hasSelectedPlatform = singleSize || Object.values(platforms).some(v => v);
    const canGenerate = batchMode
        ? batchFiles.length > 0 && hasSelectedPlatform
        : !!file && hasSelectedPlatform;

    // ─── Platform display labels ──────────────────────────────────────────────

    const platformLabels: Record<Platform, string> = {
        iphone: 'iPhone',
        ipad: 'iPad',
        watch: 'watchOS',
        mac: 'macOS',
        web: 'Web / Favicon',
    };

    const platformIcons: Record<Platform, React.ReactNode> = {
        iphone: <MonitorSmartphone size={14} />,
        ipad: <MonitorSmartphone size={14} />,
        watch: <MonitorSmartphone size={14} />,
        mac: <MonitorSmartphone size={14} />,
        web: <Globe size={14} />,
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-5xl flex items-center justify-between mb-8">
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
                <div className="w-20" />
            </div>

            {/* F10 — Summary Modal */}
            {showSummary && assetSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-lg font-bold text-white">Generated Assets Summary</h2>
                            </div>
                            <button onClick={() => setShowSummary(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 p-5">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-700">
                                        <th className="text-left py-2 pr-4">Filename</th>
                                        <th className="text-left py-2 pr-4">Dimensions</th>
                                        <th className="text-left py-2 pr-4">Platform</th>
                                        <th className="text-left py-2">Appearance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetSummary.map((entry, i) => (
                                        <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="py-2 pr-4 font-mono text-xs text-indigo-300">{entry.filename}</td>
                                            <td className="py-2 pr-4 text-slate-300">{entry.width}×{entry.height}</td>
                                            <td className="py-2 pr-4 text-slate-300">{entry.platform}</td>
                                            <td className="py-2 text-slate-400">{entry.appearance || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-slate-500 mt-3">{assetSummary.length} files total</p>
                        </div>
                        <div className="p-5 border-t border-slate-700 flex gap-3">
                            <button
                                onClick={handleDownload}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Download size={18} />
                                Download ZIP
                            </button>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* ════════════ LEFT COLUMN ════════════ */}
                <div className="space-y-5">

                    {/* F6 — Batch Mode Toggle */}
                    <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                        <button
                            onClick={() => setBatchMode(!batchMode)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${batchMode ? 'bg-indigo-600' : 'bg-slate-600'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${batchMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <Layers size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Batch Mode</span>
                        <span className="text-xs text-slate-500 ml-auto">Generate for multiple icons at once</span>
                    </div>

                    {/* Dropzone */}
                    {batchMode ? (
                        /* F6 — Batch dropzone */
                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => batchInputRef.current?.click()}
                            className={`min-h-[160px] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center ${isDragActive
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800'
                                }`}
                        >
                            <input
                                type="file"
                                ref={batchInputRef}
                                onChange={onFileInputChange}
                                accept="image/png, image/jpeg"
                                multiple
                                className="hidden"
                            />
                            <Upload className={`w-8 h-8 mb-2 ${isDragActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                            <p className="text-sm text-slate-400">Drop multiple images or click to browse</p>
                        </div>
                    ) : (
                        /* Standard single-file dropzone */
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
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="w-full h-full object-contain opacity-50 group-hover:opacity-30 transition-opacity absolute inset-0 rounded-2xl"
                                        style={showSquircle ? {
                                            clipPath: SQUIRCLE_CLIP_PATH,
                                            WebkitClipPath: SQUIRCLE_CLIP_PATH,
                                            width: '85%',
                                            height: '85%',
                                            margin: 'auto',
                                            inset: 0,
                                        } : undefined}
                                    />
                                    <div className="z-10 bg-slate-900/80 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
                                        <p className="text-sm font-medium text-white mb-1">{file?.name}</p>
                                        {validation && (
                                            <p className="text-xs text-slate-400 mb-1">
                                                {validation.width}×{validation.height}px
                                            </p>
                                        )}
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
                                        Drag and drop your 1024×1024 PNG here, or click to browse.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* F6 — Batch file list */}
                    {batchMode && batchFiles.length > 0 && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                {batchFiles.length} file{batchFiles.length === 1 ? '' : 's'} queued
                            </p>
                            {batchFiles.map((entry, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2">
                                    <img src={entry.previewUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                    <span className="text-sm text-slate-300 truncate flex-1">{entry.file.name}</span>
                                    <button onClick={() => removeBatchFile(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* F1 — Squircle Toggle */}
                    {!batchMode && previewUrl && (
                        <label className="flex items-center gap-2 px-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showSquircle}
                                onChange={(e) => setShowSquircle(e.target.checked)}
                                className="accent-indigo-500"
                            />
                            <span className="text-sm text-slate-400">Show iOS mask (squircle)</span>
                        </label>
                    )}

                    {/* F2 — Validation Warnings */}
                    {!batchMode && validation && validation.warnings.length > 0 && (
                        <div className="space-y-2">
                            {validation.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-200">{w}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* F3 — Alpha Flatten */}
                    {!batchMode && validation?.hasAlpha && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Palette size={16} className="text-violet-400" />
                                <h3 className="text-sm font-semibold text-slate-300">Remove Transparency</h3>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Fill transparent areas with a solid color to prevent black backgrounds.
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-mono"
                                    placeholder="#FFFFFF"
                                />
                                <button
                                    onClick={handleFlattenAlpha}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Flatten
                                </button>
                            </div>
                        </div>
                    )}

                    {/* F7 — iOS 18 Appearance Variants */}
                    {!batchMode && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <button
                                    onClick={() => setEnableAppearances(!enableAppearances)}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${enableAppearances ? 'bg-indigo-600' : 'bg-slate-600'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enableAppearances ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                                <span className="text-sm font-medium text-slate-300">iOS 18 Appearance Variants</span>
                            </div>

                            {enableAppearances && (
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    {/* Dark variant */}
                                    <div
                                        onClick={() => darkInputRef.current?.click()}
                                        className={`rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all ${darkFile
                                            ? 'border-indigo-500/50 bg-slate-900'
                                            : 'border-slate-700 hover:border-indigo-500/30 hover:bg-slate-800'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            ref={darkInputRef}
                                            onChange={(e) => e.target.files?.[0] && handleAppearanceFile('dark', e.target.files[0])}
                                            accept="image/png, image/jpeg"
                                            className="hidden"
                                        />
                                        {darkPreview ? (
                                            <img src={darkPreview} alt="Dark" className="w-12 h-12 rounded-lg mx-auto mb-2 object-cover" />
                                        ) : (
                                            <Moon size={20} className="mx-auto mb-2 text-slate-500" />
                                        )}
                                        <p className="text-xs font-medium text-slate-400">Dark</p>
                                    </div>
                                    {/* Tinted variant */}
                                    <div
                                        onClick={() => tintedInputRef.current?.click()}
                                        className={`rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all ${tintedFile
                                            ? 'border-indigo-500/50 bg-slate-900'
                                            : 'border-slate-700 hover:border-indigo-500/30 hover:bg-slate-800'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            ref={tintedInputRef}
                                            onChange={(e) => e.target.files?.[0] && handleAppearanceFile('tinted', e.target.files[0])}
                                            accept="image/png, image/jpeg"
                                            className="hidden"
                                        />
                                        {tintedPreview ? (
                                            <img src={tintedPreview} alt="Tinted" className="w-12 h-12 rounded-lg mx-auto mb-2 object-cover" />
                                        ) : (
                                            <Droplets size={20} className="mx-auto mb-2 text-slate-500" />
                                        )}
                                        <p className="text-xs font-medium text-slate-400">Tinted</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Platforms */}
                    {!singleSize && (
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
                                        <div className="flex items-center gap-1.5">
                                            {platformIcons[p]}
                                            <span className="font-medium">{platformLabels[p]}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* F5 — Single Size Toggle */}
                    <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                        <button
                            onClick={() => setSingleSize(!singleSize)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${singleSize ? 'bg-emerald-600' : 'bg-slate-600'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${singleSize ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <FileImage size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-300">Single-size asset (Xcode 15+)</span>
                    </div>
                    {singleSize && (
                        <div className="flex items-start gap-2 px-3 -mt-2">
                            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-300/70">
                                Generates a single 1024×1024 universal icon. Only works with iOS 17+ / Xcode 15+.
                            </p>
                        </div>
                    )}

                    {/* F8 — Alternate Icon Variants */}
                    {!batchMode && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Alternate Icons</h3>
                                <button
                                    onClick={addVariant}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                                >
                                    <Plus size={12} />
                                    Add Variant
                                </button>
                            </div>
                            {variants.length === 0 && (
                                <p className="text-xs text-slate-500">No alternate icon variants configured.</p>
                            )}
                            <div className="space-y-2">
                                {variants.map(v => (
                                    <div key={v.id} className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3">
                                        {/* Variant file picker */}
                                        <div
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/png, image/jpeg';
                                                input.onchange = (e) => {
                                                    const f = (e.target as HTMLInputElement).files?.[0];
                                                    if (f) updateVariantFile(v.id, f);
                                                };
                                                input.click();
                                            }}
                                            className="w-10 h-10 rounded-lg border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors shrink-0 overflow-hidden"
                                        >
                                            {v.previewUrl ? (
                                                <img src={v.previewUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon size={16} className="text-slate-500" />
                                            )}
                                        </div>
                                        {/* Variant name */}
                                        <input
                                            type="text"
                                            value={v.name}
                                            onChange={(e) => updateVariantName(v.id, e.target.value)}
                                            placeholder="Variant name (e.g. Holiday)"
                                            className="flex-1 bg-transparent border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-indigo-500/50 focus:outline-none"
                                        />
                                        <button onClick={() => removeVariant(v.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════ RIGHT COLUMN ════════════ */}
                <div className="flex flex-col gap-6">

                    {/* F4 — Live Size Grid Preview */}
                    <div className="flex-grow bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 flex flex-col relative overflow-hidden">
                        {/* Toggle */}
                        {!batchMode && previewUrl && (
                            <button
                                onClick={() => setShowSizeGrid(!showSizeGrid)}
                                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 mb-4 self-start transition-colors"
                            >
                                <Grid3X3 size={14} />
                                <span>{showSizeGrid ? 'Hide' : 'Show'} size preview</span>
                                {showSizeGrid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}

                        {showSizeGrid && previewUrl ? (
                            /* Live size grid */
                            <div className="flex flex-wrap items-end justify-center gap-4">
                                {PREVIEW_SIZES.map((ps) => (
                                    <div key={ps.size} className="flex flex-col items-center gap-1">
                                        <img
                                            src={previewUrl}
                                            alt={ps.label}
                                            style={{
                                                width: ps.size > 100 ? ps.size / 2 : ps.size,
                                                height: ps.size > 100 ? ps.size / 2 : ps.size,
                                                ...(showSquircle ? {
                                                    clipPath: SQUIRCLE_CLIP_PATH,
                                                    WebkitClipPath: SQUIRCLE_CLIP_PATH,
                                                } : { borderRadius: ps.size * 0.22 }),
                                            }}
                                            className="object-cover"
                                        />
                                        <span className="text-[10px] text-slate-500">{ps.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Default static placeholder */
                            <div className="flex flex-col items-center justify-center flex-1">
                                <div className="flex flex-wrap items-end justify-center gap-4 mb-8 opacity-50 grayscale pointer-events-none select-none">
                                    <div className="w-24 h-24 bg-slate-700 rounded-xl" />
                                    <div className="w-16 h-16 bg-slate-700 rounded-lg" />
                                    <div className="w-12 h-12 bg-slate-700 rounded-md" />
                                    <div className="w-8 h-8 bg-slate-700 rounded-md" />
                                </div>

                                <div className="relative z-10 text-center">
                                    <h3 className="text-xl font-semibold text-white mb-2">Ready to Generate</h3>
                                    <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                        We will generate the <code className="text-indigo-300">AppIcon.appiconset</code> folder containing all required sizes and the <code className="text-indigo-300">Contents.json</code> manifest.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={!canGenerate || isGenerating}
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
                                <span>{batchMode ? 'Generate Batch & Download ZIP' : 'Generate & Download ZIP'}</span>
                            </>
                        )}
                    </button>

                    {!batchMode && !file && (
                        <p className="text-center text-sm text-slate-500">Please upload an image first</p>
                    )}
                    {batchMode && batchFiles.length === 0 && (
                        <p className="text-center text-sm text-slate-500">Please add at least one image</p>
                    )}
                </div>
            </div>
        </div>
    );
};
