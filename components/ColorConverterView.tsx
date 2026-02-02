import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Palette, Copy, Check, Pipette, Eye, Contrast, History, Shuffle } from 'lucide-react';
import {
    ColorRGBA,
    parseColor,
    toHex,
    toHexAlpha,
    toRgb,
    toRgba,
    toHsl,
    toHsla,
    toSwiftUIColor,
    toSwiftUIColorModern,
    toAndroidColorInt,
    toAndroidColorXml,
    toJetpackComposeColor,
    toTailwindClass,
    toCssVariable,
    getContrastColor,
    getShadesAndTints,
    getHarmonies,
    getContrastRatio,
    getWCAGRating,
    getAllColorBlindnessSimulations,
    ColorBlindnessType,
    WCAGRating
} from '../services/colorConverter';

interface ColorConverterViewProps {
    onBack: () => void;
}

interface FormatOutput {
    label: string;
    value: string;
    platform?: 'ios' | 'android' | 'web' | 'all';
}

type TabType = 'formats' | 'palette' | 'accessibility';

const HISTORY_KEY = 'color_converter_history';
const MAX_HISTORY = 10;

export const ColorConverterView: React.FC<ColorConverterViewProps> = ({ onBack }) => {
    const [inputValue, setInputValue] = useState('#3B82F6');
    const [color, setColor] = useState<ColorRGBA>({ r: 59, g: 130, b: 246, a: 1 });
    const [alpha, setAlpha] = useState(100);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isValidInput, setIsValidInput] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('formats');

    // Accessibility: contrast checker
    const [contrastBgColor, setContrastBgColor] = useState<ColorRGBA>({ r: 255, g: 255, b: 255, a: 1 });

    // History
    const [colorHistory, setColorHistory] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Parse input and update color
    const parseInput = useCallback((value: string) => {
        const parsed = parseColor(value);
        if (parsed) {
            setColor(parsed);
            setAlpha(Math.round(parsed.a * 100));
            setIsValidInput(true);
        } else {
            setIsValidInput(false);
        }
    }, []);

    // Handle input change with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue.trim()) {
                parseInput(inputValue);
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [inputValue, parseInput]);

    // Update color when alpha slider changes
    useEffect(() => {
        setColor(prev => ({ ...prev, a: alpha / 100 }));
    }, [alpha]);

    // Add to history when color changes (debounced)
    useEffect(() => {
        if (!isValidInput) return;
        const hex = toHex(color);
        const timer = setTimeout(() => {
            setColorHistory(prev => {
                const filtered = prev.filter(h => h !== hex);
                const newHistory = [hex, ...filtered].slice(0, MAX_HISTORY);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
                return newHistory;
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [color, isValidInput]);

    // Handle native color picker change
    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        setInputValue(hex);
        const parsed = parseColor(hex);
        if (parsed) {
            setColor({ ...parsed, a: alpha / 100 });
            setIsValidInput(true);
        }
    };

    // Select color from swatch
    const selectColor = (c: ColorRGBA) => {
        setColor(c);
        setInputValue(toHex(c));
        setAlpha(Math.round(c.a * 100));
    };

    // Generate all format outputs
    const getOutputs = (): FormatOutput[] => {
        return [
            { label: 'HEX', value: toHex(color), platform: 'all' },
            { label: 'HEX (Alpha)', value: toHexAlpha(color), platform: 'all' },
            { label: 'RGB', value: toRgb(color), platform: 'web' },
            { label: 'RGBA', value: toRgba(color), platform: 'web' },
            { label: 'HSL', value: toHsl(color), platform: 'web' },
            { label: 'HSLA', value: toHsla(color), platform: 'web' },
            { label: 'UIColor (UIKit)', value: toSwiftUIColor(color), platform: 'ios' },
            { label: 'Color (SwiftUI)', value: toSwiftUIColorModern(color), platform: 'ios' },
            { label: 'Android Int', value: toAndroidColorInt(color), platform: 'android' },
            { label: 'Android XML', value: toAndroidColorXml(color), platform: 'android' },
            { label: 'Compose Color', value: toJetpackComposeColor(color), platform: 'android' },
            { label: 'Tailwind', value: toTailwindClass(color), platform: 'web' },
            { label: 'CSS Variable', value: toCssVariable(color), platform: 'web' },
        ];
    };

    // Copy to clipboard
    const handleCopy = async (value: string, index: number) => {
        await navigator.clipboard.writeText(value);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
    };

    const contrastTextColor = getContrastColor(color);
    const previewBg = toRgba(color);

    // V2 computed values
    const shadesAndTints = getShadesAndTints(color);
    const harmonies = getHarmonies(color);
    const contrastRatio = getContrastRatio(color, contrastBgColor);
    const wcagRating = getWCAGRating(contrastRatio);
    const colorBlindSimulations = getAllColorBlindnessSimulations(color);

    // Platform badge colors
    const getPlatformStyle = (platform?: string) => {
        switch (platform) {
            case 'ios': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'android': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'web': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const getWcagBadgeStyle = (rating: WCAGRating) => {
        switch (rating) {
            case 'AAA': return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'AA': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
            case 'AA Large': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            default: return 'bg-red-500/20 text-red-400 border-red-500/50';
        }
    };

    const outputs = getOutputs();

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'formats', label: 'Formats', icon: <Copy className="w-4 h-4" /> },
        { id: 'palette', label: 'Palette', icon: <Shuffle className="w-4 h-4" /> },
        { id: 'accessibility', label: 'Accessibility', icon: <Eye className="w-4 h-4" /> },
    ];

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all active:scale-95 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                            <div className="p-1.5 bg-fuchsia-500/10 rounded-lg border border-fuchsia-500/20">
                                <Palette className="w-4 h-4 text-fuchsia-400" />
                            </div>
                            Color Converter
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">

                    {/* Color Preview & Input Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Large Color Preview */}
                        <div className="flex flex-col gap-4">
                            <div
                                className="relative h-40 rounded-2xl border border-slate-700 overflow-hidden shadow-xl transition-all duration-300"
                                style={{ backgroundColor: previewBg }}
                            >
                                {/* Checkerboard pattern for alpha visibility */}
                                <div
                                    className="absolute inset-0 -z-10"
                                    style={{
                                        backgroundImage: `linear-gradient(45deg, #334155 25%, transparent 25%), 
                                                          linear-gradient(-45deg, #334155 25%, transparent 25%), 
                                                          linear-gradient(45deg, transparent 75%, #334155 75%), 
                                                          linear-gradient(-45deg, transparent 75%, #334155 75%)`,
                                        backgroundSize: '20px 20px',
                                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                    }}
                                />

                                {/* Color info overlay */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div
                                        className="text-sm font-mono font-semibold px-3 py-2 rounded-lg backdrop-blur-md"
                                        style={{
                                            color: contrastTextColor,
                                            backgroundColor: contrastTextColor === 'white' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'
                                        }}
                                    >
                                        {toHex(color)} • {Math.round(color.a * 100)}% opacity
                                    </div>
                                </div>
                            </div>

                            {/* Native Color Picker & Alpha */}
                            <div className="flex items-center gap-3">
                                <label className="relative flex-1 cursor-pointer group">
                                    <input
                                        type="color"
                                        value={toHex(color)}
                                        onChange={handlePickerChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all">
                                        <Pipette className="w-4 h-4 text-fuchsia-400" />
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                            Pick Color
                                        </span>
                                    </div>
                                </label>

                                {/* Alpha Slider */}
                                <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Alpha</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={alpha}
                                        onChange={(e) => setAlpha(Number(e.target.value))}
                                        className="flex-1 accent-fuchsia-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-mono text-slate-300 w-10 text-right">{alpha}%</span>
                                </div>
                            </div>

                            {/* History */}
                            {colorHistory.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <History className="w-3.5 h-3.5 text-slate-500" />
                                    <div className="flex gap-1.5 flex-wrap">
                                        {colorHistory.map((hex, i) => (
                                            <button
                                                key={`${hex}-${i}`}
                                                onClick={() => setInputValue(hex)}
                                                className="w-7 h-7 rounded-lg border border-slate-600 hover:border-fuchsia-500 hover:scale-110 transition-all shadow-sm"
                                                style={{ backgroundColor: hex }}
                                                title={hex}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Field & RGB Sliders */}
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                    Enter any color format
                                </label>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="#FF5733, rgb(255, 87, 51), hsl(11, 100%, 60%)"
                                    className={`w-full px-4 py-3 bg-slate-800/80 border rounded-xl text-lg font-mono transition-all focus:outline-none focus:ring-2 ${isValidInput
                                        ? 'border-slate-700 focus:border-fuchsia-500 focus:ring-fuchsia-500/30'
                                        : 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30'
                                        }`}
                                    spellCheck={false}
                                />
                                {!isValidInput && inputValue.trim() && (
                                    <p className="mt-2 text-xs text-red-400">
                                        Could not parse color. Try HEX, RGB, RGBA, HSL, or HSLA format.
                                    </p>
                                )}
                            </div>

                            {/* RGB Sliders */}
                            <div className="space-y-2">
                                {(['r', 'g', 'b'] as const).map((channel) => (
                                    <div key={channel} className="flex items-center gap-3">
                                        <span className={`text-xs font-bold uppercase w-4 ${channel === 'r' ? 'text-red-400' :
                                            channel === 'g' ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                            {channel}
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="255"
                                            value={color[channel]}
                                            onChange={(e) => {
                                                const newColor = { ...color, [channel]: Number(e.target.value) };
                                                setColor(newColor);
                                                setInputValue(toHex(newColor));
                                            }}
                                            className={`flex-1 cursor-pointer ${channel === 'r' ? 'accent-red-500' :
                                                channel === 'g' ? 'accent-green-500' : 'accent-blue-500'
                                                }`}
                                        />
                                        <span className="text-sm font-mono text-slate-400 w-8 text-right">
                                            {color[channel]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-slate-700 pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'formats' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {outputs.map((output, index) => (
                                <div
                                    key={output.label}
                                    className="group flex items-center gap-3 p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-slate-600 transition-all"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-slate-400">{output.label}</span>
                                            {output.platform && (
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getPlatformStyle(output.platform)}`}>
                                                    {output.platform === 'ios' ? 'iOS' :
                                                        output.platform === 'android' ? 'Android' :
                                                            output.platform === 'web' ? 'Web' : 'All'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-mono text-white truncate" title={output.value}>
                                            {output.value}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(output.value, index)}
                                        className={`p-2 rounded-lg transition-all ${copiedIndex === index
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-slate-700/50 text-slate-400 hover:bg-fuchsia-500/20 hover:text-fuchsia-400'
                                            }`}
                                        title="Copy to clipboard"
                                    >
                                        {copiedIndex === index ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'palette' && (
                        <div className="space-y-6">
                            {/* Shades & Tints */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Shades & Tints
                                </h3>
                                <div className="flex gap-1 rounded-xl overflow-hidden">
                                    {shadesAndTints.map((shade, i) => (
                                        <button
                                            key={i}
                                            onClick={() => selectColor(shade)}
                                            className={`flex-1 h-14 transition-all hover:scale-y-110 ${i === 5 ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                                            style={{ backgroundColor: toRgba(shade) }}
                                            title={toHex(shade)}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-slate-500 uppercase tracking-wider">
                                    <span>Lighter</span>
                                    <span>Base</span>
                                    <span>Darker</span>
                                </div>
                            </div>

                            {/* Harmonies */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Complementary */}
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Complementary</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => selectColor(color)} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(color) }} title={toHex(color)} />
                                        <button onClick={() => selectColor(harmonies.complementary)} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.complementary) }} title={toHex(harmonies.complementary)} />
                                    </div>
                                </div>

                                {/* Analogous */}
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Analogous</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => selectColor(harmonies.analogous[0])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.analogous[0]) }} />
                                        <button onClick={() => selectColor(color)} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(color) }} />
                                        <button onClick={() => selectColor(harmonies.analogous[1])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.analogous[1]) }} />
                                    </div>
                                </div>

                                {/* Triadic */}
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Triadic</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => selectColor(color)} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(color) }} />
                                        <button onClick={() => selectColor(harmonies.triadic[0])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.triadic[0]) }} />
                                        <button onClick={() => selectColor(harmonies.triadic[1])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.triadic[1]) }} />
                                    </div>
                                </div>

                                {/* Split Complementary */}
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Split Complementary</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => selectColor(harmonies.splitComplementary[0])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.splitComplementary[0]) }} />
                                        <button onClick={() => selectColor(color)} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(color) }} />
                                        <button onClick={() => selectColor(harmonies.splitComplementary[1])} className="flex-1 h-12 rounded-lg" style={{ backgroundColor: toRgba(harmonies.splitComplementary[1]) }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accessibility' && (
                        <div className="space-y-6">
                            {/* Contrast Checker */}
                            <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <Contrast className="w-4 h-4 text-fuchsia-400" />
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                        Contrast Checker
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* Foreground/Background selectors */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Text Color (current)</label>
                                            <div className="h-12 rounded-lg border border-slate-600" style={{ backgroundColor: toRgba(color) }} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Background Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={toHex(contrastBgColor)}
                                                    onChange={(e) => {
                                                        const parsed = parseColor(e.target.value);
                                                        if (parsed) setContrastBgColor(parsed);
                                                    }}
                                                    className="w-12 h-12 rounded-lg cursor-pointer border border-slate-600"
                                                />
                                                <div className="flex gap-1">
                                                    <button onClick={() => setContrastBgColor({ r: 255, g: 255, b: 255, a: 1 })} className="w-12 h-12 rounded-lg bg-white border border-slate-600" title="White" />
                                                    <button onClick={() => setContrastBgColor({ r: 0, g: 0, b: 0, a: 1 })} className="w-12 h-12 rounded-lg bg-black border border-slate-600" title="Black" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-500">Preview</label>
                                        <div
                                            className="flex-1 rounded-lg p-4 flex flex-col justify-center items-center min-h-[100px]"
                                            style={{ backgroundColor: toRgba(contrastBgColor) }}
                                        >
                                            <span className="text-2xl font-bold" style={{ color: toRgba(color) }}>Sample Text</span>
                                            <span className="text-sm" style={{ color: toRgba(color) }}>Regular text sample</span>
                                        </div>
                                    </div>

                                    {/* Results */}
                                    <div className="flex flex-col justify-center gap-3">
                                        <div className="text-center">
                                            <div className="text-4xl font-bold text-white">{contrastRatio.toFixed(2)}:1</div>
                                            <p className="text-xs text-slate-500 mt-1">Contrast Ratio</p>
                                        </div>
                                        <div className={`text-center py-2 px-4 rounded-lg border ${getWcagBadgeStyle(wcagRating)}`}>
                                            <span className="font-bold">{wcagRating}</span>
                                            <p className="text-[10px] mt-0.5 opacity-80">
                                                {wcagRating === 'AAA' && 'Enhanced contrast'}
                                                {wcagRating === 'AA' && 'Normal text OK'}
                                                {wcagRating === 'AA Large' && 'Large text only'}
                                                {wcagRating === 'Fail' && 'Insufficient contrast'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Color Blindness Simulation */}
                            <div className="p-5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <Eye className="w-4 h-4 text-fuchsia-400" />
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                        Color Blindness Simulation
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(Object.entries(colorBlindSimulations) as [ColorBlindnessType, ColorRGBA][]).map(([type, simColor]) => (
                                        <div key={type} className="text-center">
                                            <div
                                                className="h-20 rounded-lg mb-2 border border-slate-600"
                                                style={{ backgroundColor: toRgba(simColor) }}
                                            />
                                            <p className="text-xs font-medium text-slate-300 capitalize">{type}</p>
                                            <p className="text-[10px] text-slate-500">
                                                {type === 'protanopia' && 'Red-blind'}
                                                {type === 'deuteranopia' && 'Green-blind'}
                                                {type === 'tritanopia' && 'Blue-blind'}
                                                {type === 'achromatopsia' && 'Monochromacy'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
