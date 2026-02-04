import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    ArrowLeft,
    Upload,
    Download,
    Image as ImageIcon,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Smartphone,
    Tablet,
    Check,
    Loader2,
    Plus,
    X,
    Type,
    Palette,
    Settings,
    Eye,
    Layers,
    RotateCcw
} from 'lucide-react';
import {
    Platform,
    DeviceType,
    DeviceSpec,
    BackgroundConfig,
    TextOverlayConfig,
    ExportConfig,
    LayoutConfig,
    UploadedScreenshot,
    IOS_DEVICES,
    ANDROID_DEVICES,
    ALL_DEVICES,
    getDeviceSpec,
    getDevicesByPlatform,
    DEFAULT_BACKGROUND,
    DEFAULT_TEXT_OVERLAY,
    DEFAULT_EXPORT_CONFIG,
    DEFAULT_LAYOUT_CONFIG,
    GRADIENT_PRESETS,
    generateAllScreenshots,
    exportAsZip,
    downloadFile,
    composeScreenshot,
} from '../services/screenshotGenerator';

// ============================================================================
// Types
// ============================================================================

interface ScreenshotGeneratorViewProps {
    onBack: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

const PlatformToggle: React.FC<{
    platform: Platform;
    onChange: (platform: Platform) => void;
}> = ({ platform, onChange }) => (
    <div className="flex bg-white/5 dark:bg-slate-800/50 rounded-xl p-1 border border-white/10 dark:border-slate-700/50">
        <button
            onClick={() => onChange('ios')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ${platform === 'ios'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
        >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            iOS
        </button>
        <button
            onClick={() => onChange('android')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ${platform === 'android'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
        >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.4-.59-2.97-.92-4.65-.92s-3.25.33-4.65.92L5.3 5.67c-.19-.29-.54-.38-.83-.22-.3.16-.43.54-.26.85l1.84 3.18C2.99 11.04 1 13.68 1 16.75h22c0-3.07-1.99-5.71-5.4-7.27zM7 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
            </svg>
            Android
        </button>
    </div>
);

const DeviceCheckbox: React.FC<{
    device: DeviceSpec;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ device, checked, onChange }) => (
    <label
        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 dark:bg-slate-800/30 hover:bg-white/10 dark:hover:bg-slate-800/50 cursor-pointer transition-all duration-200 border border-transparent hover:border-white/10"
        onClick={() => onChange(!checked)}
    >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${checked
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-500'
            : 'border-slate-500 dark:border-slate-600'
            }`}>
            {checked && <Check size={12} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                {device.category === 'phone' ? <Smartphone size={14} className="text-slate-400" /> : <Tablet size={14} className="text-slate-400" />}
                <span className="text-sm text-slate-200 dark:text-slate-300 truncate">{device.name}</span>
            </div>
            <span className="text-xs text-slate-500">{device.displayName}</span>
        </div>
    </label>
);

const ColorPicker: React.FC<{
    color: string;
    onChange: (color: string) => void;
    label: string;
}> = ({ color, onChange, label }) => (
    <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 w-16">{label}</span>
        <div className="relative">
            <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/10 bg-transparent"
            />
        </div>
        <input
            type="text"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
    </div>
);

// ============================================================================
// Main Component
// ============================================================================

export function ScreenshotGeneratorView({ onBack }: ScreenshotGeneratorViewProps) {
    // State
    const [platform, setPlatform] = useState<Platform>('ios');
    const [screenshots, setScreenshots] = useState<UploadedScreenshot[]>([]);
    const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
    const [selectedDevices, setSelectedDevices] = useState<DeviceType[]>(['iphone-16-pro-max']);

    // Per-screenshot settings stored as Maps
    const [screenshotBackgrounds, setScreenshotBackgrounds] = useState<Map<string, BackgroundConfig>>(new Map());
    const [screenshotLayouts, setScreenshotLayouts] = useState<Map<string, LayoutConfig>>(new Map());
    const [screenshotTextOverlays, setScreenshotTextOverlays] = useState<Map<string, TextOverlayConfig>>(new Map());

    const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
    const [zoom, setZoom] = useState(0.75); // 0.75 = 75% = default zoom
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'devices' | 'background' | 'layout' | 'text' | 'export'>('devices');
    const [allPreviews, setAllPreviews] = useState<Map<string, HTMLCanvasElement>>(new Map());
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; scrollLeft: number }>({ x: 0, scrollLeft: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Computed: Get current screenshot's settings (or defaults)
    const background = useMemo(() => {
        if (!selectedScreenshotId) return DEFAULT_BACKGROUND;
        return screenshotBackgrounds.get(selectedScreenshotId) || DEFAULT_BACKGROUND;
    }, [selectedScreenshotId, screenshotBackgrounds]);

    const layoutConfig = useMemo(() => {
        if (!selectedScreenshotId) return DEFAULT_LAYOUT_CONFIG;
        return screenshotLayouts.get(selectedScreenshotId) || DEFAULT_LAYOUT_CONFIG;
    }, [selectedScreenshotId, screenshotLayouts]);

    const textOverlay = useMemo(() => {
        if (!selectedScreenshotId) return DEFAULT_TEXT_OVERLAY;
        return screenshotTextOverlays.get(selectedScreenshotId) || DEFAULT_TEXT_OVERLAY;
    }, [selectedScreenshotId, screenshotTextOverlays]);

    // Setters that update the selected screenshot's settings
    const setBackground = useCallback((updater: BackgroundConfig | ((prev: BackgroundConfig) => BackgroundConfig)) => {
        if (!selectedScreenshotId) return;
        setScreenshotBackgrounds(prev => {
            const newMap = new Map(prev);
            const currentConfig = prev.get(selectedScreenshotId) || DEFAULT_BACKGROUND;
            const newConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
            newMap.set(selectedScreenshotId, newConfig);
            return newMap;
        });
    }, [selectedScreenshotId]);

    const setLayoutConfig = useCallback((updater: LayoutConfig | ((prev: LayoutConfig) => LayoutConfig)) => {
        if (!selectedScreenshotId) return;
        setScreenshotLayouts(prev => {
            const newMap = new Map(prev);
            const currentConfig = prev.get(selectedScreenshotId) || DEFAULT_LAYOUT_CONFIG;
            const newConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
            newMap.set(selectedScreenshotId, newConfig);
            return newMap;
        });
    }, [selectedScreenshotId]);

    const setTextOverlay = useCallback((updater: TextOverlayConfig | ((prev: TextOverlayConfig) => TextOverlayConfig)) => {
        if (!selectedScreenshotId) return;
        setScreenshotTextOverlays(prev => {
            const newMap = new Map(prev);
            const currentConfig = prev.get(selectedScreenshotId) || DEFAULT_TEXT_OVERLAY;
            const newConfig = typeof updater === 'function' ? updater(currentConfig) : updater;
            newMap.set(selectedScreenshotId, newConfig);
            return newMap;
        });
    }, [selectedScreenshotId]);

    // Computed values
    const devices = useMemo(() => getDevicesByPlatform(platform), [platform]);
    const selectedScreenshot = useMemo(
        () => screenshots.find(s => s.id === selectedScreenshotId),
        [screenshots, selectedScreenshotId]
    );
    const previewDevice = useMemo(
        () => getDeviceSpec(selectedDevices[0] || 'iphone-16-pro-max'),
        [selectedDevices]
    );

    // Update preview when settings change - generate for ALL screenshots with their individual settings
    useEffect(() => {
        if (!previewDevice || screenshots.length === 0) {
            setAllPreviews(new Map());
            return;
        }

        let cancelled = false;

        const generateAllPreviews = async () => {
            const newPreviews = new Map<string, HTMLCanvasElement>();

            for (const screenshot of screenshots) {
                if (cancelled) break;
                try {
                    // Get per-screenshot settings (or defaults)
                    const bg = screenshotBackgrounds.get(screenshot.id) || DEFAULT_BACKGROUND;
                    const layout = screenshotLayouts.get(screenshot.id) || DEFAULT_LAYOUT_CONFIG;
                    const text = screenshotTextOverlays.get(screenshot.id) || DEFAULT_TEXT_OVERLAY;

                    const canvas = await composeScreenshot(
                        screenshot,
                        previewDevice,
                        bg,
                        text,
                        layout
                    );
                    newPreviews.set(screenshot.id, canvas);
                } catch (err) {
                    console.error('Failed to generate preview for', screenshot.id, err);
                }
            }

            if (!cancelled) {
                setAllPreviews(newPreviews);
            }
        };

        generateAllPreviews();

        return () => { cancelled = true; };
    }, [screenshots, previewDevice, screenshotBackgrounds, screenshotLayouts, screenshotTextOverlays]);

    // Measure container size for auto-fit
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const updateSize = () => {
            setContainerSize({
                width: container.clientWidth - 32, // subtract minimal padding
                height: container.clientHeight - 32,
            });
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    // Calculate base fit scale (what 100% zoom means)
    const baseFitScale = useMemo(() => {
        const currentPreview = selectedScreenshotId ? allPreviews.get(selectedScreenshotId) : null;
        if (!currentPreview || containerSize.width === 0 || containerSize.height === 0) return 0.3;

        const scaleX = containerSize.width / currentPreview.width;
        const scaleY = containerSize.height / currentPreview.height;
        return Math.min(scaleX, scaleY, 1) * 0.98; // 98% to leave small margin
    }, [selectedScreenshotId, allPreviews, containerSize]);

    // Handle zoom change
    const handleZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    // Drag to scroll handlers
    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!previewContainerRef.current) return;
        setIsPanning(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragStart({
            x: clientX,
            scrollLeft: previewContainerRef.current.scrollLeft
        });
    }, []);

    const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isPanning || !previewContainerRef.current) return;
        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const delta = clientX - dragStart.x;
        previewContainerRef.current.scrollLeft = dragStart.scrollLeft - delta;
    }, [isPanning, dragStart]);

    const handleDragEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Scroll selected screenshot into view
    useEffect(() => {
        if (selectedScreenshotId && previewContainerRef.current) {
            const index = screenshots.findIndex(s => s.id === selectedScreenshotId);
            if (index !== -1) {
                const container = previewContainerRef.current;
                const items = container.querySelectorAll('.screenshot-item');
                if (items[index]) {
                    items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            }
        }
    }, [selectedScreenshotId, screenshots.length]); // Dependencies to ensure it runs when list changes

    // Handlers
    const handleFiles = useCallback((files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

        const newScreenshots: UploadedScreenshot[] = imageFiles.map((file, index) => ({
            id: `screenshot-${Date.now()}-${index}`,
            file,
            previewUrl: URL.createObjectURL(file),
            order: screenshots.length + index,
        }));

        setScreenshots(prev => [...prev, ...newScreenshots]);

        if (!selectedScreenshotId && newScreenshots.length > 0) {
            setSelectedScreenshotId(newScreenshots[0].id);
        }
    }, [screenshots.length, selectedScreenshotId]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    }, [handleFiles]);

    const removeScreenshot = useCallback((id: string) => {
        setScreenshots(prev => {
            const updated = prev.filter(s => s.id !== id);
            // Clean up URL
            const removed = prev.find(s => s.id === id);
            if (removed) URL.revokeObjectURL(removed.previewUrl);
            return updated.map((s, i) => ({ ...s, order: i }));
        });

        if (selectedScreenshotId === id) {
            setSelectedScreenshotId(screenshots.find(s => s.id !== id)?.id || null);
        }
    }, [selectedScreenshotId, screenshots]);

    const clearAllScreenshots = useCallback(() => {
        screenshots.forEach(s => URL.revokeObjectURL(s.previewUrl));
        setScreenshots([]);
        setSelectedScreenshotId(null);
    }, [screenshots]);

    const toggleDevice = useCallback((deviceId: DeviceType) => {
        setSelectedDevices(prev => {
            if (prev.includes(deviceId)) {
                return prev.filter(d => d !== deviceId);
            }
            return [...prev, deviceId];
        });
    }, []);

    const selectAllDevices = useCallback(() => {
        setSelectedDevices(devices.map(d => d.id));
    }, [devices]);

    const deselectAllDevices = useCallback(() => {
        setSelectedDevices([]);
    }, []);

    const navigateScreenshot = useCallback((direction: 'prev' | 'next') => {
        if (screenshots.length === 0) return;
        const currentIndex = screenshots.findIndex(s => s.id === selectedScreenshotId);
        let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0) newIndex = screenshots.length - 1;
        if (newIndex >= screenshots.length) newIndex = 0;
        setSelectedScreenshotId(screenshots[newIndex].id);
    }, [screenshots, selectedScreenshotId]);

    const handleExport = useCallback(async () => {
        if (screenshots.length === 0 || selectedDevices.length === 0) return;

        setIsGenerating(true);
        setProgress(0);
        setProgressMessage('Preparing...');

        try {
            // Generate all screenshots with their individual settings
            const results: any[] = [];
            const totalOperations = screenshots.length * selectedDevices.length;
            let completedOperations = 0;

            for (const screenshot of screenshots) {
                const bg = screenshotBackgrounds.get(screenshot.id) || DEFAULT_BACKGROUND;
                const layout = screenshotLayouts.get(screenshot.id) || DEFAULT_LAYOUT_CONFIG;
                const text = screenshotTextOverlays.get(screenshot.id) || DEFAULT_TEXT_OVERLAY;

                for (const deviceId of selectedDevices) {
                    const device = getDeviceSpec(deviceId);
                    if (!device) continue;

                    setProgress(Math.round((completedOperations / totalOperations) * 100));
                    setProgressMessage(`Generating ${device.name} - Screenshot ${screenshot.order + 1}`);

                    const canvas = await composeScreenshot(
                        screenshot,
                        device,
                        bg,
                        text,
                        layout
                    );

                    const blob = await new Promise<Blob>((resolve, reject) => {
                        canvas.toBlob(
                            (b) => b ? resolve(b) : reject('Failed to convert'),
                            exportConfig.format === 'jpg' ? 'image/jpeg' : 'image/png',
                            exportConfig.quality
                        );
                    });

                    results.push({
                        screenshot,
                        device,
                        blob,
                        filename: `${device.id}_screenshot_${screenshot.order + 1}.${exportConfig.format}`
                    });

                    completedOperations++;
                }
            }

            setProgressMessage('Creating ZIP file...');
            const zipBlob = await exportAsZip(results);

            const date = new Date().toISOString().split('T')[0];
            downloadFile(zipBlob, `app-screenshots-${date}.zip`);

            setProgressMessage('Complete!');
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
                setProgressMessage('');
            }, 1500);
        } catch (error) {
            console.error('Export failed:', error);
            setProgressMessage('Export failed. Please try again.');
            setTimeout(() => {
                setIsGenerating(false);
                setProgress(0);
                setProgressMessage('');
            }, 2000);
        }
    }, [screenshots, selectedDevices, screenshotBackgrounds, screenshotLayouts, screenshotTextOverlays, exportConfig]);

    const applyGradientPreset = useCallback((preset: typeof GRADIENT_PRESETS[0]) => {
        setBackground({
            type: 'gradient',
            gradientStart: preset.start,
            gradientEnd: preset.end,
            gradientAngle: preset.angle,
        });
    }, [setBackground]);

    const resetSettings = useCallback(() => {
        if (!selectedScreenshotId) return;
        setScreenshotBackgrounds(prev => {
            const newMap = new Map(prev);
            newMap.set(selectedScreenshotId, DEFAULT_BACKGROUND);
            return newMap;
        });
        setScreenshotLayouts(prev => {
            const newMap = new Map(prev);
            newMap.set(selectedScreenshotId, DEFAULT_LAYOUT_CONFIG);
            return newMap;
        });
        setScreenshotTextOverlays(prev => {
            const newMap = new Map(prev);
            newMap.set(selectedScreenshotId, DEFAULT_TEXT_OVERLAY);
            return newMap;
        });
    }, [selectedScreenshotId]);

    // Update when platform changes
    useEffect(() => {
        const platformDevices = getDevicesByPlatform(platform);
        setSelectedDevices([platformDevices[0]?.id || 'iphone-16-pro-max']);
    }, [platform]);

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col">
            {/* Header */}
            <header className="shrink-0 flex items-center gap-4 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">App Screenshot Generator</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Create stunning App Store & Play Store screenshots</p>
                </div>
                <button
                    onClick={resetSettings}
                    className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 transition-colors"
                    title="Reset settings"
                >
                    <RotateCcw size={18} />
                </button>
            </header>

            {/* Main Content - Three Panels */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Left Panel - Input */}
                <div className="w-72 shrink-0 min-h-0 border-r border-slate-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-900/30 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200/30 dark:border-slate-700/30">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Upload size={16} />
                            Screenshots
                        </h2>
                    </div>

                    {/* Upload Zone */}
                    <div className="p-4">
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative p-6 rounded-2xl border-2 border-dashed cursor-pointer
                                transition-all duration-300 text-center
                                ${isDragging
                                    ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 bg-white/50 dark:bg-slate-800/30'
                                }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                            <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-400'
                                }`}>
                                <Plus size={24} />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Drop images or <span className="text-blue-500">browse</span>
                            </p>
                        </div>
                    </div>

                    {/* Screenshot Thumbnails */}
                    <div className="flex-1 overflow-y-auto p-4 pt-0">
                        {screenshots.length === 0 ? (
                            <div className="text-center py-8">
                                <ImageIcon size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-sm text-slate-400 dark:text-slate-500">No screenshots yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {screenshots.map((screenshot, index) => (
                                    <div
                                        key={screenshot.id}
                                        onClick={() => setSelectedScreenshotId(screenshot.id)}
                                        className={`
                                            group relative rounded-xl overflow-hidden cursor-pointer
                                            transition-all duration-200 border-2
                                            ${selectedScreenshotId === screenshot.id
                                                ? 'border-blue-500 ring-2 ring-blue-500/20'
                                                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        <img
                                            src={screenshot.previewUrl}
                                            alt={`Screenshot ${index + 1}`}
                                            className="w-full h-24 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeScreenshot(screenshot.id);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-xs">
                                            {index + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Clear All Button */}
                    {screenshots.length > 0 && (
                        <div className="p-4 border-t border-slate-200/30 dark:border-slate-700/30">
                            <button
                                onClick={clearAllScreenshots}
                                className="w-full py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} />
                                Clear All
                            </button>
                        </div>
                    )}
                </div>

                {/* Middle Panel - Preview */}
                <div className="flex-1 min-w-0 flex flex-col bg-slate-100/50 dark:bg-slate-800/20 overflow-hidden">
                    {/* Preview Controls */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/30 dark:border-slate-700/30">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigateScreenshot('prev')}
                                disabled={screenshots.length <= 1}
                                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {selectedScreenshot ? `${screenshots.findIndex(s => s.id === selectedScreenshotId) + 1} / ${screenshots.length}` : '0 / 0'}
                            </span>
                            <button
                                onClick={() => navigateScreenshot('next')}
                                disabled={screenshots.length <= 1}
                                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleZoomChange(Math.max(0.5, zoom - 0.25))}
                                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 transition-colors"
                            >
                                <ZoomOut size={18} />
                            </button>
                            <span className="text-sm text-slate-500 w-14 text-center">{Math.round(zoom * 100)}%</span>
                            <button
                                onClick={() => handleZoomChange(Math.min(3, zoom + 0.25))}
                                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 transition-colors"
                            >
                                <ZoomIn size={18} />
                            </button>
                            {zoom > 1 && (
                                <button
                                    onClick={() => handleZoomChange(1)}
                                    className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors"
                                >
                                    Fit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preview Canvas - Pan-Zoom with Carousel */}
                    {/* Preview Canvas - App Store Style Carousel */}
                    <div
                        ref={previewContainerRef}
                        className={`flex-1 min-h-0 relative flex items-center overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                            }`}
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={handleDragStart}
                        onTouchMove={handleDragMove}
                        onTouchEnd={handleDragEnd}
                    >
                        {screenshots.length === 0 ? (
                            <div className="w-full text-center">
                                <Eye size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-slate-400 dark:text-slate-500">Upload screenshots to preview</p>
                            </div>
                        ) : (
                            <div className="flex items-center px-[50%] py-8 gap-8 min-w-full">
                                {screenshots.map((screenshot, index) => {
                                    const preview = allPreviews.get(screenshot.id);
                                    // If preview is not ready, show a placeholder with same dimensions as device spec or default
                                    const width = preview ? preview.width : (previewDevice?.width || 1000);
                                    const height = preview ? preview.height : (previewDevice?.height || 2000);
                                    const isSelected = selectedScreenshotId === screenshot.id;

                                    return (
                                        <div
                                            key={screenshot.id}
                                            onClick={() => setSelectedScreenshotId(screenshot.id)}
                                            className={`screenshot-item snap-center shrink-0 shadow-2xl rounded-3xl overflow-hidden select-none transition-all duration-300 relative bg-white dark:bg-slate-800 cursor-pointer ${isSelected
                                                ? 'ring-4 ring-blue-500/50 scale-100'
                                                : 'opacity-40 hover:opacity-70 scale-95'
                                                }`}
                                            style={{
                                                width: width * baseFitScale * zoom,
                                                height: height * baseFitScale * zoom,
                                            }}
                                        >
                                            {preview ? (
                                                <img
                                                    src={preview.toDataURL()}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-full object-cover pointer-events-none"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
                                                    <Loader2 size={32} className="animate-spin" />
                                                    <span className="text-sm">Preparing...</span>
                                                </div>
                                            )}
                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {screenshots.length > 0 && !selectedScreenshotId && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="flex items-center gap-3 text-slate-400 bg-white/80 dark:bg-slate-900/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg">
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Generating previews...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Export Settings */}
                <div className="w-80 shrink-0 min-h-0 border-l border-slate-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-900/30 flex flex-col overflow-hidden">
                    {/* Platform Toggle */}
                    <div className="shrink-0 p-4 border-b border-slate-200/30 dark:border-slate-700/30">
                        <PlatformToggle platform={platform} onChange={setPlatform} />
                    </div>

                    {/* Settings Tabs */}
                    <div className="shrink-0 flex border-b border-slate-200/30 dark:border-slate-700/30">
                        {[
                            { id: 'devices', icon: Smartphone, label: 'Devices' },
                            { id: 'background', icon: Palette, label: 'Background' },
                            { id: 'layout', icon: Layers, label: 'Layout' },
                            { id: 'text', icon: Type, label: 'Text' },
                            { id: 'export', icon: Settings, label: 'Export' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSettingsTab(tab.id as any)}
                                className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors border-b-2 ${activeSettingsTab === tab.id
                                    ? 'text-blue-500 border-blue-500'
                                    : 'text-slate-400 border-transparent hover:text-slate-300'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {/* Devices Tab */}
                        {activeSettingsTab === 'devices' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Select Devices</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={selectAllDevices}
                                            className="text-xs text-blue-500 hover:text-blue-400"
                                        >
                                            All
                                        </button>
                                        <span className="text-slate-500">|</span>
                                        <button
                                            onClick={deselectAllDevices}
                                            className="text-xs text-slate-400 hover:text-slate-300"
                                        >
                                            None
                                        </button>
                                    </div>
                                </div>
                                {devices.map(device => (
                                    <DeviceCheckbox
                                        key={device.id}
                                        device={device}
                                        checked={selectedDevices.includes(device.id)}
                                        onChange={() => toggleDevice(device.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Background Tab */}
                        {activeSettingsTab === 'background' && (
                            <div className="space-y-4">
                                {/* Background Type */}
                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Type</span>
                                    <div className="flex gap-2">
                                        {(['solid', 'gradient', 'image'] as const).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setBackground(prev => ({ ...prev, type }))}
                                                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${background.type === type
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 dark:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {background.type === 'solid' && (
                                    <ColorPicker
                                        color={background.color || '#1a1a2e'}
                                        onChange={color => setBackground(prev => ({ ...prev, color }))}
                                        label="Color"
                                    />
                                )}

                                {background.type === 'gradient' && (
                                    <>
                                        <ColorPicker
                                            color={background.gradientStart || '#667eea'}
                                            onChange={color => setBackground(prev => ({ ...prev, gradientStart: color }))}
                                            label="Start"
                                        />
                                        <ColorPicker
                                            color={background.gradientEnd || '#764ba2'}
                                            onChange={color => setBackground(prev => ({ ...prev, gradientEnd: color }))}
                                            label="End"
                                        />
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 w-16">Angle</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="360"
                                                value={background.gradientAngle || 135}
                                                onChange={e => setBackground(prev => ({ ...prev, gradientAngle: Number(e.target.value) }))}
                                                className="flex-1"
                                            />
                                            <span className="text-sm text-slate-400 w-10">{background.gradientAngle || 135}°</span>
                                        </div>

                                        {/* Gradient Presets */}
                                        <div className="space-y-2 pt-2">
                                            <span className="text-xs text-slate-500 uppercase tracking-wider">Presets</span>
                                            <div className="grid grid-cols-4 gap-2">
                                                {GRADIENT_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => applyGradientPreset(preset)}
                                                        className="w-full aspect-square rounded-lg border-2 border-transparent hover:border-white/30 transition-colors overflow-hidden"
                                                        title={preset.name}
                                                        style={{
                                                            background: `linear-gradient(${preset.angle}deg, ${preset.start}, ${preset.end})`
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {background.type === 'image' && (
                                    <div className="space-y-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider">Background Image</span>

                                        {/* Image Preview or Upload */}
                                        {background.imageData ? (
                                            <div className="relative rounded-xl overflow-hidden bg-slate-800/50 aspect-video">
                                                <img
                                                    src={background.imageData}
                                                    alt="Background"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => setBackground(prev => ({ ...prev, imageData: undefined }))}
                                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500/50 cursor-pointer transition-colors bg-white/5 dark:bg-slate-800/30">
                                                <Upload size={32} className="text-slate-400 mb-2" />
                                                <span className="text-sm text-slate-400">Click to upload image</span>
                                                <span className="text-xs text-slate-500 mt-1">JPG, PNG supported</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                setBackground(prev => ({
                                                                    ...prev,
                                                                    imageData: reader.result as string
                                                                }));
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}


                            </div>
                        )}

                        {/* Layout Tab */}
                        {activeSettingsTab === 'layout' && (
                            <div className="space-y-4">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">Layout Settings</span>

                                {/* Scale */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Scale</span>
                                        <span className="text-xs text-slate-500">{Math.round(layoutConfig.scale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.3"
                                        max="1.5"
                                        step="0.05"
                                        value={layoutConfig.scale}
                                        onChange={e => setLayoutConfig(prev => ({ ...prev, scale: Number(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Position X */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Position X</span>
                                        <span className="text-xs text-slate-500">{Math.round(layoutConfig.offsetX * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-0.4"
                                        max="0.4"
                                        step="0.02"
                                        value={layoutConfig.offsetX}
                                        onChange={e => setLayoutConfig(prev => ({ ...prev, offsetX: Number(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Position Y */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">Position Y</span>
                                        <span className="text-xs text-slate-500">{Math.round(layoutConfig.offsetY * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-0.4"
                                        max="0.4"
                                        step="0.02"
                                        value={layoutConfig.offsetY}
                                        onChange={e => setLayoutConfig(prev => ({ ...prev, offsetY: Number(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Frame Toggle */}
                                <label
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 dark:bg-slate-800/30 cursor-pointer hover:bg-white/10 transition-colors"
                                    onClick={() => setLayoutConfig(prev => ({ ...prev, showFrame: !prev.showFrame }))}
                                >
                                    <span className="text-sm text-slate-300">Show Device Frame</span>
                                    <div className={`relative w-10 h-6 rounded-full transition-colors ${layoutConfig.showFrame ? 'bg-blue-500' : 'bg-slate-600'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${layoutConfig.showFrame ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                </label>

                                {/* Reset Button */}
                                <button
                                    onClick={() => setLayoutConfig(DEFAULT_LAYOUT_CONFIG)}
                                    className="w-full py-2 rounded-lg text-xs text-slate-400 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={12} />
                                    Reset Layout
                                </button>
                            </div>
                        )}

                        {/* Text Tab */}
                        {activeSettingsTab === 'text' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Title</span>
                                    <input
                                        type="text"
                                        placeholder="Enter title text..."
                                        value={textOverlay.title || ''}
                                        onChange={e => setTextOverlay(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={textOverlay.titleFontSize}
                                            onChange={e => setTextOverlay(prev => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                                            className="w-20 px-2 py-1.5 rounded-lg bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 focus:outline-none"
                                            min="12"
                                            max="200"
                                        />
                                        <input
                                            type="color"
                                            value={textOverlay.titleColor}
                                            onChange={e => setTextOverlay(prev => ({ ...prev, titleColor: e.target.value }))}
                                            className="w-10 h-8 rounded-lg cursor-pointer border border-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Subtitle</span>
                                    <input
                                        type="text"
                                        placeholder="Enter subtitle text..."
                                        value={textOverlay.subtitle || ''}
                                        onChange={e => setTextOverlay(prev => ({ ...prev, subtitle: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={textOverlay.subtitleFontSize}
                                            onChange={e => setTextOverlay(prev => ({ ...prev, subtitleFontSize: Number(e.target.value) }))}
                                            className="w-20 px-2 py-1.5 rounded-lg bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 focus:outline-none"
                                            min="12"
                                            max="120"
                                        />
                                        <input
                                            type="color"
                                            value={textOverlay.subtitleColor.startsWith('rgba') ? '#cccccc' : textOverlay.subtitleColor}
                                            onChange={e => setTextOverlay(prev => ({ ...prev, subtitleColor: e.target.value }))}
                                            className="w-10 h-8 rounded-lg cursor-pointer border border-white/10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Alignment</span>
                                    <div className="flex gap-2">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                            <button
                                                key={align}
                                                onClick={() => setTextOverlay(prev => ({ ...prev, alignment: align }))}
                                                className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${textOverlay.alignment === align
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 dark:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Export Tab */}
                        {activeSettingsTab === 'export' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Format</span>
                                    <div className="flex gap-2">
                                        {(['png', 'jpg'] as const).map(format => (
                                            <button
                                                key={format}
                                                onClick={() => setExportConfig(prev => ({ ...prev, format }))}
                                                className={`flex-1 py-2 rounded-lg text-sm uppercase transition-all ${exportConfig.format === format
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 dark:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                {format}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {exportConfig.format === 'jpg' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500 uppercase tracking-wider">Quality</span>
                                            <span className="text-sm text-slate-400">{Math.round(exportConfig.quality * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.05"
                                            value={exportConfig.quality}
                                            onChange={e => setExportConfig(prev => ({ ...prev, quality: Number(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Naming</span>
                                    <select
                                        value={exportConfig.namingConvention}
                                        onChange={e => setExportConfig(prev => ({ ...prev, namingConvention: e.target.value as any }))}
                                        className="w-full px-3 py-2.5 rounded-xl bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    >
                                        <option value="device">By Device (device_1.png)</option>
                                        <option value="numbered">Numbered (screenshot_1_device.png)</option>
                                        <option value="custom">Custom Prefix</option>
                                    </select>

                                    {exportConfig.namingConvention === 'custom' && (
                                        <input
                                            type="text"
                                            placeholder="Enter prefix..."
                                            value={exportConfig.customPrefix || ''}
                                            onChange={e => setExportConfig(prev => ({ ...prev, customPrefix: e.target.value }))}
                                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 dark:bg-slate-800/50 border border-white/10 dark:border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Export Button */}
                    <div className="p-4 border-t border-slate-200/30 dark:border-slate-700/30">
                        {isGenerating ? (
                            <div className="space-y-2">
                                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-400">{progressMessage}</p>
                            </div>
                        ) : (
                            <button
                                onClick={handleExport}
                                disabled={screenshots.length === 0 || selectedDevices.length === 0}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-blue-500/25"
                            >
                                <Download size={18} />
                                Export {screenshots.length > 0 ? `${screenshots.length * selectedDevices.length} Screenshots` : 'Screenshots'}
                            </button>
                        )}

                        {screenshots.length > 0 && selectedDevices.length > 0 && !isGenerating && (
                            <p className="text-xs text-center text-slate-500 mt-2">
                                {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''} × {selectedDevices.length} device{selectedDevices.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
