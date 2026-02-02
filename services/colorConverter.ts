/**
 * Color Converter Service
 * Handles parsing and converting colors between formats:
 * HEX, RGB, RGBA, HSL, HSLA, Swift UIColor, Android Color, Tailwind
 */

export interface ColorRGBA {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
    a: number; // 0-1
}

// ========== TAILWIND PALETTE ==========
// Subset of Tailwind's default color palette for best-match finding
const TAILWIND_COLORS: Record<string, string> = {
    'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1',
    'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155',
    'slate-800': '#1e293b', 'slate-900': '#0f172a', 'slate-950': '#020617',
    'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db',
    'gray-400': '#9ca3af', 'gray-500': '#6b7280', 'gray-600': '#4b5563', 'gray-700': '#374151',
    'gray-800': '#1f2937', 'gray-900': '#111827', 'gray-950': '#030712',
    'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca', 'red-300': '#fca5a5',
    'red-400': '#f87171', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c',
    'red-800': '#991b1b', 'red-900': '#7f1d1d', 'red-950': '#450a0a',
    'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74',
    'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c',
    'orange-800': '#9a3412', 'orange-900': '#7c2d12', 'orange-950': '#431407',
    'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d',
    'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309',
    'amber-800': '#92400e', 'amber-900': '#78350f', 'amber-950': '#451a03',
    'yellow-50': '#fefce8', 'yellow-100': '#fef9c3', 'yellow-200': '#fef08a', 'yellow-300': '#fde047',
    'yellow-400': '#facc15', 'yellow-500': '#eab308', 'yellow-600': '#ca8a04', 'yellow-700': '#a16207',
    'yellow-800': '#854d0e', 'yellow-900': '#713f12', 'yellow-950': '#422006',
    'lime-50': '#f7fee7', 'lime-100': '#ecfccb', 'lime-200': '#d9f99d', 'lime-300': '#bef264',
    'lime-400': '#a3e635', 'lime-500': '#84cc16', 'lime-600': '#65a30d', 'lime-700': '#4d7c0f',
    'lime-800': '#3f6212', 'lime-900': '#365314', 'lime-950': '#1a2e05',
    'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0', 'green-300': '#86efac',
    'green-400': '#4ade80', 'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d',
    'green-800': '#166534', 'green-900': '#14532d', 'green-950': '#052e16',
    'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7',
    'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-700': '#047857',
    'emerald-800': '#065f46', 'emerald-900': '#064e3b', 'emerald-950': '#022c22',
    'teal-50': '#f0fdfa', 'teal-100': '#ccfbf1', 'teal-200': '#99f6e4', 'teal-300': '#5eead4',
    'teal-400': '#2dd4bf', 'teal-500': '#14b8a6', 'teal-600': '#0d9488', 'teal-700': '#0f766e',
    'teal-800': '#115e59', 'teal-900': '#134e4a', 'teal-950': '#042f2e',
    'cyan-50': '#ecfeff', 'cyan-100': '#cffafe', 'cyan-200': '#a5f3fc', 'cyan-300': '#67e8f9',
    'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4', 'cyan-600': '#0891b2', 'cyan-700': '#0e7490',
    'cyan-800': '#155e75', 'cyan-900': '#164e63', 'cyan-950': '#083344',
    'sky-50': '#f0f9ff', 'sky-100': '#e0f2fe', 'sky-200': '#bae6fd', 'sky-300': '#7dd3fc',
    'sky-400': '#38bdf8', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7', 'sky-700': '#0369a1',
    'sky-800': '#075985', 'sky-900': '#0c4a6e', 'sky-950': '#082f49',
    'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-300': '#93c5fd',
    'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8',
    'blue-800': '#1e40af', 'blue-900': '#1e3a8a', 'blue-950': '#172554',
    'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc',
    'indigo-400': '#818cf8', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca',
    'indigo-800': '#3730a3', 'indigo-900': '#312e81', 'indigo-950': '#1e1b4b',
    'violet-50': '#f5f3ff', 'violet-100': '#ede9fe', 'violet-200': '#ddd6fe', 'violet-300': '#c4b5fd',
    'violet-400': '#a78bfa', 'violet-500': '#8b5cf6', 'violet-600': '#7c3aed', 'violet-700': '#6d28d9',
    'violet-800': '#5b21b6', 'violet-900': '#4c1d95', 'violet-950': '#2e1065',
    'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe',
    'purple-400': '#c084fc', 'purple-500': '#a855f7', 'purple-600': '#9333ea', 'purple-700': '#7e22ce',
    'purple-800': '#6b21a8', 'purple-900': '#581c87', 'purple-950': '#3b0764',
    'fuchsia-50': '#fdf4ff', 'fuchsia-100': '#fae8ff', 'fuchsia-200': '#f5d0fe', 'fuchsia-300': '#f0abfc',
    'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef', 'fuchsia-600': '#c026d3', 'fuchsia-700': '#a21caf',
    'fuchsia-800': '#86198f', 'fuchsia-900': '#701a75', 'fuchsia-950': '#4a044e',
    'pink-50': '#fdf2f8', 'pink-100': '#fce7f3', 'pink-200': '#fbcfe8', 'pink-300': '#f9a8d4',
    'pink-400': '#f472b6', 'pink-500': '#ec4899', 'pink-600': '#db2777', 'pink-700': '#be185d',
    'pink-800': '#9d174d', 'pink-900': '#831843', 'pink-950': '#500724',
    'rose-50': '#fff1f2', 'rose-100': '#ffe4e6', 'rose-200': '#fecdd3', 'rose-300': '#fda4af',
    'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c',
    'rose-800': '#9f1239', 'rose-900': '#881337', 'rose-950': '#4c0519',
    'white': '#ffffff',
    'black': '#000000',
};

// ========== PARSING FUNCTIONS ==========

/**
 * Parse a HEX color string (3, 4, 6, or 8 characters)
 */
export function parseHex(hex: string): ColorRGBA | null {
    const cleaned = hex.replace(/^#/, '').trim();

    let r: number, g: number, b: number, a = 1;

    if (cleaned.length === 3) {
        // #RGB
        r = parseInt(cleaned[0] + cleaned[0], 16);
        g = parseInt(cleaned[1] + cleaned[1], 16);
        b = parseInt(cleaned[2] + cleaned[2], 16);
    } else if (cleaned.length === 4) {
        // #RGBA
        r = parseInt(cleaned[0] + cleaned[0], 16);
        g = parseInt(cleaned[1] + cleaned[1], 16);
        b = parseInt(cleaned[2] + cleaned[2], 16);
        a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
    } else if (cleaned.length === 6) {
        // #RRGGBB
        r = parseInt(cleaned.substring(0, 2), 16);
        g = parseInt(cleaned.substring(2, 4), 16);
        b = parseInt(cleaned.substring(4, 6), 16);
    } else if (cleaned.length === 8) {
        // #RRGGBBAA
        r = parseInt(cleaned.substring(0, 2), 16);
        g = parseInt(cleaned.substring(2, 4), 16);
        b = parseInt(cleaned.substring(4, 6), 16);
        a = parseInt(cleaned.substring(6, 8), 16) / 255;
    } else {
        return null;
    }

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;

    return { r, g, b, a };
}

/**
 * Parse RGB or RGBA string
 */
export function parseRgb(rgb: string): ColorRGBA | null {
    // Match rgb(r, g, b) or rgba(r, g, b, a) or rgb(r g b) or rgb(r g b / a)
    const match = rgb.match(/rgba?\s*\(\s*(\d+(?:\.\d+)?%?)\s*[,\s]\s*(\d+(?:\.\d+)?%?)\s*[,\s]\s*(\d+(?:\.\d+)?%?)(?:\s*[,\/]\s*(\d*\.?\d+%?))?\s*\)/i);

    if (!match) return null;

    const parseValue = (val: string, max: number) => {
        if (val.endsWith('%')) {
            return Math.round((parseFloat(val) / 100) * max);
        }
        return parseFloat(val);
    };

    const r = Math.min(255, Math.max(0, parseValue(match[1], 255)));
    const g = Math.min(255, Math.max(0, parseValue(match[2], 255)));
    const b = Math.min(255, Math.max(0, parseValue(match[3], 255)));

    let a = 1;
    if (match[4]) {
        a = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
        a = Math.min(1, Math.max(0, a));
    }

    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

/**
 * Parse HSL or HSLA string
 */
export function parseHsl(hsl: string): ColorRGBA | null {
    // Match hsl(h, s%, l%) or hsla(h, s%, l%, a) or hsl(h s% l%) or hsl(h s% l% / a)
    const match = hsl.match(/hsla?\s*\(\s*(\d+(?:\.\d+)?(?:deg)?)\s*[,\s]\s*(\d+(?:\.\d+)?)%?\s*[,\s]\s*(\d+(?:\.\d+)?)%?(?:\s*[,\/]\s*(\d*\.?\d+%?))?\s*\)/i);

    if (!match) return null;

    const h = parseFloat(match[1]) % 360;
    const s = Math.min(100, Math.max(0, parseFloat(match[2]))) / 100;
    const l = Math.min(100, Math.max(0, parseFloat(match[3]))) / 100;

    let a = 1;
    if (match[4]) {
        a = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
        a = Math.min(1, Math.max(0, a));
    }

    if (isNaN(h) || isNaN(s) || isNaN(l) || isNaN(a)) return null;

    // Convert HSL to RGB
    const { r, g, b } = hslToRgb(h, s, l);

    return { r, g, b, a };
}

/**
 * Auto-detect and parse any supported color format
 */
export function parseColor(input: string): ColorRGBA | null {
    const trimmed = input.trim();

    // Try HEX first
    if (trimmed.startsWith('#') || /^[0-9a-f]{3,8}$/i.test(trimmed)) {
        const result = parseHex(trimmed);
        if (result) return result;
    }

    // Try RGB/RGBA
    if (/rgba?\s*\(/i.test(trimmed)) {
        const result = parseRgb(trimmed);
        if (result) return result;
    }

    // Try HSL/HSLA
    if (/hsla?\s*\(/i.test(trimmed)) {
        const result = parseHsl(trimmed);
        if (result) return result;
    }

    // Try as plain HEX without #
    const hexResult = parseHex(trimmed);
    if (hexResult) return hexResult;

    return null;
}

// ========== OUTPUT FUNCTIONS ==========

/**
 * Convert to HEX string
 */
export function toHex(color: ColorRGBA): string {
    const r = Math.round(color.r).toString(16).padStart(2, '0');
    const g = Math.round(color.g).toString(16).padStart(2, '0');
    const b = Math.round(color.b).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Convert to HEX with alpha
 */
export function toHexAlpha(color: ColorRGBA): string {
    const r = Math.round(color.r).toString(16).padStart(2, '0');
    const g = Math.round(color.g).toString(16).padStart(2, '0');
    const b = Math.round(color.b).toString(16).padStart(2, '0');
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
}

/**
 * Convert to RGB string
 */
export function toRgb(color: ColorRGBA): string {
    return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

/**
 * Convert to RGBA string
 */
export function toRgba(color: ColorRGBA): string {
    const alpha = Math.round(color.a * 100) / 100;
    return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;
}

/**
 * Convert to HSL string
 */
export function toHsl(color: ColorRGBA): string {
    const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Convert to HSLA string
 */
export function toHsla(color: ColorRGBA): string {
    const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
    const alpha = Math.round(color.a * 100) / 100;
    return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha})`;
}

/**
 * Convert to Swift UIColor
 */
export function toSwiftUIColor(color: ColorRGBA): string {
    const r = (color.r / 255).toFixed(3);
    const g = (color.g / 255).toFixed(3);
    const b = (color.b / 255).toFixed(3);
    const a = color.a.toFixed(2);
    return `UIColor(red: ${r}, green: ${g}, blue: ${b}, alpha: ${a})`;
}

/**
 * Convert to SwiftUI Color
 */
export function toSwiftUIColorModern(color: ColorRGBA): string {
    const r = (color.r / 255).toFixed(3);
    const g = (color.g / 255).toFixed(3);
    const b = (color.b / 255).toFixed(3);
    const a = color.a.toFixed(2);
    if (color.a === 1) {
        return `Color(red: ${r}, green: ${g}, blue: ${b})`;
    }
    return `Color(red: ${r}, green: ${g}, blue: ${b}).opacity(${a})`;
}

/**
 * Convert to Android Color Int (0xAARRGGBB)
 */
export function toAndroidColorInt(color: ColorRGBA): string {
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase();
    const r = Math.round(color.r).toString(16).padStart(2, '0').toUpperCase();
    const g = Math.round(color.g).toString(16).padStart(2, '0').toUpperCase();
    const b = Math.round(color.b).toString(16).padStart(2, '0').toUpperCase();
    return `0x${a}${r}${g}${b}`;
}

/**
 * Convert to Android XML color resource
 */
export function toAndroidColorXml(color: ColorRGBA, name: string = 'custom_color'): string {
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase();
    const r = Math.round(color.r).toString(16).padStart(2, '0').toUpperCase();
    const g = Math.round(color.g).toString(16).padStart(2, '0').toUpperCase();
    const b = Math.round(color.b).toString(16).padStart(2, '0').toUpperCase();
    return `<color name="${name}">#${a}${r}${g}${b}</color>`;
}

/**
 * Convert to Jetpack Compose Color
 */
export function toJetpackComposeColor(color: ColorRGBA): string {
    const a = Math.round(color.a * 255).toString(16).padStart(2, '0').toUpperCase();
    const r = Math.round(color.r).toString(16).padStart(2, '0').toUpperCase();
    const g = Math.round(color.g).toString(16).padStart(2, '0').toUpperCase();
    const b = Math.round(color.b).toString(16).padStart(2, '0').toUpperCase();
    return `Color(0x${a}${r}${g}${b})`;
}

/**
 * Find the closest Tailwind color class
 */
export function toTailwindClass(color: ColorRGBA): string {
    let closestName = 'gray-500';
    let minDistance = Infinity;

    for (const [name, hex] of Object.entries(TAILWIND_COLORS)) {
        const twColor = parseHex(hex);
        if (!twColor) continue;

        // Calculate Euclidean distance in RGB space
        const distance = Math.sqrt(
            Math.pow(color.r - twColor.r, 2) +
            Math.pow(color.g - twColor.g, 2) +
            Math.pow(color.b - twColor.b, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestName = name;
        }
    }

    return closestName;
}

/**
 * Convert to CSS variable format
 */
export function toCssVariable(color: ColorRGBA, name: string = 'custom-color'): string {
    return `--${name}: ${toHex(color)};`;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Get contrast color (black or white) for text on top of the given color
 */
export function getContrastColor(color: ColorRGBA): 'white' | 'black' {
    // Calculate relative luminance
    const getLuminance = (c: number) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };

    const luminance = 0.2126 * getLuminance(color.r) +
        0.7152 * getLuminance(color.g) +
        0.0722 * getLuminance(color.b);

    return luminance > 0.179 ? 'black' : 'white';
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;

    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Get all color formats as an object
 */
export function getAllFormats(color: ColorRGBA): Record<string, string> {
    return {
        hex: toHex(color),
        hexAlpha: toHexAlpha(color),
        rgb: toRgb(color),
        rgba: toRgba(color),
        hsl: toHsl(color),
        hsla: toHsla(color),
        swiftUIColor: toSwiftUIColor(color),
        swiftUIColorModern: toSwiftUIColorModern(color),
        androidColorInt: toAndroidColorInt(color),
        androidColorXml: toAndroidColorXml(color),
        jetpackCompose: toJetpackComposeColor(color),
        tailwind: toTailwindClass(color),
        cssVariable: toCssVariable(color),
    };
}

// ========== V2: SHADES & TINTS ==========

/**
 * Mix two colors by a given ratio (0 = color1, 1 = color2)
 */
function mixColors(c1: ColorRGBA, c2: ColorRGBA, ratio: number): ColorRGBA {
    return {
        r: Math.round(c1.r + (c2.r - c1.r) * ratio),
        g: Math.round(c1.g + (c2.g - c1.g) * ratio),
        b: Math.round(c1.b + (c2.b - c1.b) * ratio),
        a: c1.a + (c2.a - c1.a) * ratio,
    };
}

/**
 * Generate shades and tints of a color
 * Returns array of 11 colors: 5 tints (lighter), base, 5 shades (darker)
 * Index 0 = lightest (closest to white), Index 10 = darkest (closest to black)
 */
export function getShadesAndTints(color: ColorRGBA): ColorRGBA[] {
    const white: ColorRGBA = { r: 255, g: 255, b: 255, a: 1 };
    const black: ColorRGBA = { r: 0, g: 0, b: 0, a: 1 };

    const result: ColorRGBA[] = [];

    // Tints (mixing with white) - indices 0-4 (lightest to less light)
    for (let i = 0; i < 5; i++) {
        const ratio = (i + 1) * 0.15; // 0.15, 0.30, 0.45, 0.60, 0.75
        result.push(mixColors(white, color, ratio));
    }

    // Base color - index 5
    result.push({ ...color });

    // Shades (mixing with black) - indices 6-10 (less dark to darkest)
    for (let i = 0; i < 5; i++) {
        const ratio = (i + 1) * 0.15; // 0.15, 0.30, 0.45, 0.60, 0.75
        result.push(mixColors(color, black, ratio));
    }

    return result;
}

// ========== V2: COLOR HARMONIES ==========

/**
 * Helper to convert RGB to HSL values (exported for harmonies)
 */
export function rgbToHslValues(color: ColorRGBA): { h: number; s: number; l: number } {
    return rgbToHsl(color.r, color.g, color.b);
}

/**
 * Helper to create color from HSL values
 */
function fromHsl(h: number, s: number, l: number, a: number = 1): ColorRGBA {
    // Normalize hue to 0-360
    h = ((h % 360) + 360) % 360;
    const rgb = hslToRgb(h, s / 100, l / 100);
    return { ...rgb, a };
}

export interface ColorHarmonies {
    complementary: ColorRGBA;
    analogous: [ColorRGBA, ColorRGBA];
    triadic: [ColorRGBA, ColorRGBA];
    tetradic: [ColorRGBA, ColorRGBA, ColorRGBA];
    splitComplementary: [ColorRGBA, ColorRGBA];
}

/**
 * Calculate color harmonies based on color wheel theory
 */
export function getHarmonies(color: ColorRGBA): ColorHarmonies {
    const { h, s, l } = rgbToHsl(color.r, color.g, color.b);

    return {
        // Opposite on color wheel (180°)
        complementary: fromHsl(h + 180, s, l, color.a),

        // Adjacent colors (±30°)
        analogous: [
            fromHsl(h - 30, s, l, color.a),
            fromHsl(h + 30, s, l, color.a),
        ],

        // Triangle on color wheel (±120°)
        triadic: [
            fromHsl(h + 120, s, l, color.a),
            fromHsl(h + 240, s, l, color.a),
        ],

        // Rectangle/Square on color wheel
        tetradic: [
            fromHsl(h + 90, s, l, color.a),
            fromHsl(h + 180, s, l, color.a),
            fromHsl(h + 270, s, l, color.a),
        ],

        // Split complementary (150° and 210°)
        splitComplementary: [
            fromHsl(h + 150, s, l, color.a),
            fromHsl(h + 210, s, l, color.a),
        ],
    };
}

// ========== V2: WCAG ACCESSIBILITY ==========

/**
 * Calculate relative luminance of a color (WCAG 2.1 formula)
 */
export function getRelativeLuminance(color: ColorRGBA): number {
    const toLinear = (c: number) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/**
 * Calculate WCAG contrast ratio between two colors
 * Returns a value between 1 (no contrast) and 21 (maximum contrast)
 */
export function getContrastRatio(foreground: ColorRGBA, background: ColorRGBA): number {
    const L1 = getRelativeLuminance(foreground);
    const L2 = getRelativeLuminance(background);

    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);

    return (lighter + 0.05) / (darker + 0.05);
}

export type WCAGRating = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/**
 * Get WCAG accessibility rating based on contrast ratio
 * AAA: 7:1+ (enhanced)
 * AA: 4.5:1+ (normal text minimum)
 * AA Large: 3:1+ (large text minimum, 18pt+ or 14pt bold)
 * Fail: below 3:1
 */
export function getWCAGRating(contrastRatio: number): WCAGRating {
    if (contrastRatio >= 7) return 'AAA';
    if (contrastRatio >= 4.5) return 'AA';
    if (contrastRatio >= 3) return 'AA Large';
    return 'Fail';
}

// ========== V2: COLOR BLINDNESS SIMULATION ==========

export type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

/**
 * Simulate color blindness using standard transformation matrices
 * Based on research by Brettel, Viénot, and Mollon (1997)
 */
export function simulateColorBlindness(color: ColorRGBA, type: ColorBlindnessType): ColorRGBA {
    const { r, g, b, a } = color;

    // Normalize to 0-1 range
    const R = r / 255;
    const G = g / 255;
    const B = b / 255;

    let newR: number, newG: number, newB: number;

    switch (type) {
        case 'protanopia': // Red-blind
            newR = 0.567 * R + 0.433 * G + 0.0 * B;
            newG = 0.558 * R + 0.442 * G + 0.0 * B;
            newB = 0.0 * R + 0.242 * G + 0.758 * B;
            break;

        case 'deuteranopia': // Green-blind
            newR = 0.625 * R + 0.375 * G + 0.0 * B;
            newG = 0.7 * R + 0.3 * G + 0.0 * B;
            newB = 0.0 * R + 0.3 * G + 0.7 * B;
            break;

        case 'tritanopia': // Blue-blind
            newR = 0.95 * R + 0.05 * G + 0.0 * B;
            newG = 0.0 * R + 0.433 * G + 0.567 * B;
            newB = 0.0 * R + 0.475 * G + 0.525 * B;
            break;

        case 'achromatopsia': // Complete color blindness (grayscale)
            const gray = 0.299 * R + 0.587 * G + 0.114 * B;
            newR = newG = newB = gray;
            break;

        default:
            newR = R;
            newG = G;
            newB = B;
    }

    return {
        r: Math.round(Math.min(255, Math.max(0, newR * 255))),
        g: Math.round(Math.min(255, Math.max(0, newG * 255))),
        b: Math.round(Math.min(255, Math.max(0, newB * 255))),
        a,
    };
}

/**
 * Get all color blindness simulations at once
 */
export function getAllColorBlindnessSimulations(color: ColorRGBA): Record<ColorBlindnessType, ColorRGBA> {
    return {
        protanopia: simulateColorBlindness(color, 'protanopia'),
        deuteranopia: simulateColorBlindness(color, 'deuteranopia'),
        tritanopia: simulateColorBlindness(color, 'tritanopia'),
        achromatopsia: simulateColorBlindness(color, 'achromatopsia'),
    };
}

