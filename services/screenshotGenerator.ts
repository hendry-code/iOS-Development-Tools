import JSZip from 'jszip';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type Platform = 'ios' | 'android';

export type iOSDevice =
    | 'iphone-16-pro-max'
    | 'iphone-16-pro'
    | 'iphone-16-plus'
    | 'iphone-16'
    | 'iphone-se'
    | 'ipad-pro-12.9'
    | 'ipad-pro-11'
    | 'ipad-10';

export type AndroidDevice =
    | 'android-phone'
    | 'android-tablet-7'
    | 'android-tablet-10';

export type DeviceType = iOSDevice | AndroidDevice;

export interface DeviceSpec {
    id: DeviceType;
    name: string;
    platform: Platform;
    width: number;      // Screenshot width in pixels
    height: number;     // Screenshot height in pixels
    displayName: string;
    category: 'phone' | 'tablet';
}

export interface BackgroundConfig {
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    gradientStart?: string;
    gradientEnd?: string;
    gradientAngle?: number;
    imageData?: string; // Base64 or URL
}

export interface TextOverlayConfig {
    title?: string;
    subtitle?: string;
    titleFontSize: number;
    subtitleFontSize: number;
    titleColor: string;
    subtitleColor: string;
    fontFamily: string;
    fontWeight: 'normal' | 'bold' | '800';
    alignment: 'left' | 'center' | 'right';
    titleXOffset: number;
    titleYOffset: number;
    subtitleXOffset: number;
    subtitleYOffset: number;
    textShadow: boolean;
}

export interface ExportConfig {
    format: 'png' | 'jpg';
    quality: number; // 0.1 to 1.0 for JPG
    namingConvention: 'device' | 'numbered' | 'custom';
    customPrefix?: string;
}

export interface LayoutConfig {
    scale: number;      // 0.1 to 1.5 (10% to 150%)
    offsetX: number;    // Horizontal offset as percentage of canvas width (-0.5 to 0.5)
    offsetY: number;    // Vertical offset as percentage of canvas height (-0.5 to 0.5)
    rotation: number;   // Rotation in degrees (-45 to 45)
    showFrame: boolean; // Whether to show device frame
    shadowIntensity: number; // 0 to 1
    shadowBlur: number; // 0 to 100
    flipX: number; // -1 to 1 (default 1)
    flipY: number; // -1 to 1 (default 1)
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    scale: 0.85,
    offsetX: 0,
    offsetY: 0.05,
    rotation: 0,
    showFrame: true,
    shadowIntensity: 0.4,
    shadowBlur: 60,
    flipX: 1,
    flipY: 1,
};

export interface ScreenshotProject {
    id: string;
    screenshots: UploadedScreenshot[];
    selectedDevices: DeviceType[];
    background: BackgroundConfig;
    textOverlay: TextOverlayConfig;
    exportConfig: ExportConfig;
}

export interface UploadedScreenshot {
    id: string;
    file: File;
    previewUrl: string;
    order: number;
}

export interface GeneratedScreenshot {
    deviceId: DeviceType;
    screenshotId: string;
    blob: Blob;
    filename: string;
}

// ============================================================================
// Device Specifications
// ============================================================================

export const IOS_DEVICES: DeviceSpec[] = [
    {
        id: 'iphone-16-pro-max',
        name: 'iPhone 16 Pro Max',
        platform: 'ios',
        width: 1320,
        height: 2868,
        displayName: '6.9" Display',
        category: 'phone',
    },
    {
        id: 'iphone-16-pro',
        name: 'iPhone 16 Pro',
        platform: 'ios',
        width: 1206,
        height: 2622,
        displayName: '6.3" Display',
        category: 'phone',
    },
    {
        id: 'iphone-16-plus',
        name: 'iPhone 16 Plus',
        platform: 'ios',
        width: 1290,
        height: 2796,
        displayName: '6.7" Display',
        category: 'phone',
    },
    {
        id: 'iphone-16',
        name: 'iPhone 16',
        platform: 'ios',
        width: 1179,
        height: 2556,
        displayName: '6.1" Display',
        category: 'phone',
    },
    {
        id: 'iphone-se',
        name: 'iPhone SE',
        platform: 'ios',
        width: 750,
        height: 1334,
        displayName: '4.7" Display',
        category: 'phone',
    },
    {
        id: 'ipad-pro-12.9',
        name: 'iPad Pro 12.9"',
        platform: 'ios',
        width: 2048,
        height: 2732,
        displayName: '12.9" Display',
        category: 'tablet',
    },
    {
        id: 'ipad-pro-11',
        name: 'iPad Pro 11"',
        platform: 'ios',
        width: 1668,
        height: 2388,
        displayName: '11" Display',
        category: 'tablet',
    },
    {
        id: 'ipad-10',
        name: 'iPad 10th Gen',
        platform: 'ios',
        width: 1640,
        height: 2360,
        displayName: '10.9" Display',
        category: 'tablet',
    },
];

export const ANDROID_DEVICES: DeviceSpec[] = [
    {
        id: 'android-phone',
        name: 'Android Phone',
        platform: 'android',
        width: 1080,
        height: 2400,
        displayName: 'Standard Phone',
        category: 'phone',
    },
    {
        id: 'android-tablet-7',
        name: 'Android Tablet 7"',
        platform: 'android',
        width: 1200,
        height: 1920,
        displayName: '7" Tablet',
        category: 'tablet',
    },
    {
        id: 'android-tablet-10',
        name: 'Android Tablet 10"',
        platform: 'android',
        width: 1600,
        height: 2560,
        displayName: '10" Tablet',
        category: 'tablet',
    },
];

export const ALL_DEVICES: DeviceSpec[] = [...IOS_DEVICES, ...ANDROID_DEVICES];

// ============================================================================
// Utility Functions
// ============================================================================

export function getDeviceSpec(deviceId: DeviceType): DeviceSpec | undefined {
    return ALL_DEVICES.find(d => d.id === deviceId);
}

export function getDevicesByPlatform(platform: Platform): DeviceSpec[] {
    return platform === 'ios' ? IOS_DEVICES : ANDROID_DEVICES;
}

/**
 * Load an image file as ImageBitmap
 */
export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
    return createImageBitmap(file);
}

/**
 * Load an image from URL or base64
 */
export async function loadImageFromUrl(url: string): Promise<ImageBitmap> {
    const response = await fetch(url);
    const blob = await response.blob();
    return createImageBitmap(blob);
}

// ============================================================================
// Core Generation Functions
// ============================================================================

/**
 * Generate a styled background canvas
 */
export async function generateBackground(
    width: number,
    height: number,
    config: BackgroundConfig
): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    switch (config.type) {
        case 'solid':
            ctx.fillStyle = config.color || '#1a1a2e';
            ctx.fillRect(0, 0, width, height);
            break;

        case 'gradient': {
            const angle = (config.gradientAngle || 180) * Math.PI / 180;
            const x1 = width / 2 - Math.cos(angle) * width / 2;
            const y1 = height / 2 - Math.sin(angle) * height / 2;
            const x2 = width / 2 + Math.cos(angle) * width / 2;
            const y2 = height / 2 + Math.sin(angle) * height / 2;
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, config.gradientStart || '#667eea');
            gradient.addColorStop(1, config.gradientEnd || '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            break;
        }

        case 'image': {
            // Fill with dark background first (fallback)
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, width, height);

            if (config.imageData) {
                try {
                    const img = await loadImageFromDataUrl(config.imageData);
                    // Cover logic: scale to fill, center and crop
                    const scaleX = width / img.width;
                    const scaleY = height / img.height;
                    const bgScale = Math.max(scaleX, scaleY);
                    const scaledWidth = img.width * bgScale;
                    const scaledHeight = img.height * bgScale;
                    const offsetX = (width - scaledWidth) / 2;
                    const offsetY = (height - scaledHeight) / 2;
                    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                } catch (e) {
                    console.error('Failed to load background image:', e);
                }
            }
            break;
        }
    }

    return canvas;
}

/**
 * Load an image from a data URL or blob URL
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Add text overlay to canvas
 */
export function addTextOverlay(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    config: TextOverlayConfig,
    deviceBounds: { top: number; bottom: number }
): void {
    ctx.textAlign = config.alignment;

    const xPos = config.alignment === 'left'
        ? 80
        : config.alignment === 'right'
            ? canvasWidth - 80
            : canvasWidth / 2;

    if (config.textShadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
    } else {
        ctx.shadowColor = 'transparent';
    }

    // Title (above device)
    if (config.title) {
        ctx.font = `${config.fontWeight} ${config.titleFontSize}px ${config.fontFamily}`;
        ctx.fillStyle = config.titleColor;
        const titleX = xPos + (config.titleXOffset || 0);
        const titleY = deviceBounds.top - 60 + (config.titleYOffset || 0);
        ctx.fillText(config.title, titleX, titleY);
    }

    // Subtitle (below device)
    if (config.subtitle) {
        // Subtitle usually lighter weight than title
        const subWeight = config.fontWeight === '800' ? 'bold' : 'normal';
        ctx.font = `${subWeight} ${config.subtitleFontSize}px ${config.fontFamily}`;
        ctx.fillStyle = config.subtitleColor;
        const subtitleX = xPos + (config.subtitleXOffset || 0);
        const subtitleY = deviceBounds.bottom + 80 + (config.subtitleYOffset || 0);
        ctx.fillText(config.subtitle, subtitleX, subtitleY);
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
}

/**
 * Resize and position screenshot on device frame
 */
export function resizeScreenshotToDevice(
    source: ImageBitmap,
    targetWidth: number,
    targetHeight: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // High quality resizing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate scaling to cover the device dimensions
    const scaleX = targetWidth / source.width;
    const scaleY = targetHeight / source.height;
    const scale = Math.max(scaleX, scaleY);

    const scaledWidth = source.width * scale;
    const scaledHeight = source.height * scale;
    const offsetX = (targetWidth - scaledWidth) / 2;
    const offsetY = (targetHeight - scaledHeight) / 2;

    ctx.drawImage(source, offsetX, offsetY, scaledWidth, scaledHeight);

    return canvas;
}

/**
 * Create a device frame with rounded corners (simplified mockup)
 */
export function createDeviceFrame(
    screenshotCanvas: HTMLCanvasElement,
    device: DeviceSpec,
    layout: LayoutConfig
): HTMLCanvasElement {
    const showFrame = layout.showFrame;
    // Add padding for frame and shadow
    const framePadding = showFrame ? 40 : 0;
    // Ensure padding handles shadow adequately but here we simplify
    const shadowPadding = showFrame ? Math.max(0, layout.shadowBlur || 0) : 0;

    // Total margin to accommodate shadow
    const margin = Math.max(framePadding, shadowPadding);

    const canvas = document.createElement('canvas');
    canvas.width = screenshotCanvas.width + margin * 2;
    canvas.height = screenshotCanvas.height + margin * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    if (showFrame) {
        ctx.shadowColor = `rgba(0, 0, 0, ${layout.shadowIntensity !== undefined ? layout.shadowIntensity : 0.4})`;
        ctx.shadowBlur = layout.shadowBlur !== undefined ? layout.shadowBlur : 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
    }

    // Calculate corner radius based on device
    const cornerRadius = device.category === 'phone'
        ? Math.min(screenshotCanvas.width, screenshotCanvas.height) * 0.08
        : Math.min(screenshotCanvas.width, screenshotCanvas.height) * 0.04;

    // Draw rounded rectangle path
    const x = margin;
    const y = margin;
    const w = screenshotCanvas.width;
    const h = screenshotCanvas.height;

    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + w - cornerRadius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + cornerRadius);
    ctx.lineTo(x + w, y + h - cornerRadius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - cornerRadius, y + h);
    ctx.lineTo(x + cornerRadius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();

    // Fill to cast shadow
    if (showFrame) {
        ctx.fillStyle = '#000000';
        ctx.fill();
        // Reset shadow for subsequent drawing
        ctx.shadowColor = 'transparent';
    }

    // Clip and draw
    ctx.save();
    ctx.clip();
    ctx.drawImage(screenshotCanvas, margin, margin);
    ctx.restore();

    // Draw frame border if enabled
    if (showFrame) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    return canvas;
}

/**
 * Compose final screenshot with all elements
 */
export async function composeScreenshot(
    screenshot: UploadedScreenshot,
    device: DeviceSpec,
    background: BackgroundConfig,
    textOverlay: TextOverlayConfig,
    layout: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Promise<HTMLCanvasElement> {
    // Load the screenshot image
    const imageBitmap = await loadImageBitmap(screenshot.file);

    // Resize to device dimensions
    const resizedScreenshot = resizeScreenshotToDevice(
        imageBitmap,
        device.width,
        device.height
    );

    // Create device frame with shadow settings from layout
    const framedDevice = createDeviceFrame(resizedScreenshot, device, layout);

    // Calculate final canvas size with margins for text
    const textMarginTop = textOverlay.title ? 200 : 100;
    const textMarginBottom = textOverlay.subtitle ? 200 : 100;
    // Add extra width for rotation if needed (simplified)
    const canvasWidth = framedDevice.width + 400;
    const canvasHeight = framedDevice.height + textMarginTop + textMarginBottom;

    // Create background (now async for image support)
    const bgCanvas = await generateBackground(canvasWidth, canvasHeight, background);
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Apply layout transformations
    const scaledWidth = framedDevice.width * layout.scale;
    const scaledHeight = framedDevice.height * layout.scale;

    // Center position with offset applied
    const centerX = canvasWidth / 2;
    const centerY = textMarginTop + framedDevice.height / 2;
    const offsetXpx = layout.offsetX * canvasWidth;
    const offsetYpx = layout.offsetY * canvasHeight;

    const deviceX = centerX + offsetXpx;
    const deviceY = centerY + offsetYpx;

    ctx.save();
    // Translate to center of device
    ctx.translate(deviceX, deviceY);
    // Rotate
    ctx.rotate((layout.rotation || 0) * Math.PI / 180);
    // Apply Flip (Scale)
    ctx.scale(layout.flipX !== undefined ? layout.flipX : 1, layout.flipY !== undefined ? layout.flipY : 1);

    // Draw centered
    ctx.drawImage(framedDevice, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    ctx.restore();

    // Add text overlays
    // Note: deviceBounds is approx for text placement relative to where device center is
    const deviceBounds = {
        top: deviceY - scaledHeight / 2,
        bottom: deviceY + scaledHeight / 2,
    };
    addTextOverlay(ctx, canvasWidth, canvasHeight, textOverlay, deviceBounds);

    return bgCanvas;
}

/**
 * Convert canvas to blob
 */
export async function canvasToBlob(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpg',
    quality: number = 0.92
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
            blob => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to Blob conversion failed'));
            },
            mimeType,
            quality
        );
    });
}

/**
 * Generate filename based on naming convention
 */
export function generateFilename(
    device: DeviceSpec,
    screenshotIndex: number,
    config: ExportConfig
): string {
    const extension = config.format === 'png' ? 'png' : 'jpg';

    switch (config.namingConvention) {
        case 'device':
            return `${device.id}_${screenshotIndex + 1}.${extension}`;
        case 'numbered':
            return `screenshot_${screenshotIndex + 1}_${device.id}.${extension}`;
        case 'custom':
            return `${config.customPrefix || 'screen'}_${device.id}_${screenshotIndex + 1}.${extension}`;
        default:
            return `${device.id}_${screenshotIndex + 1}.${extension}`;
    }
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Generate all screenshots for export
 */
export async function generateAllScreenshots(
    screenshots: UploadedScreenshot[],
    devices: DeviceType[],
    background: BackgroundConfig,
    textOverlay: TextOverlayConfig,
    exportConfig: ExportConfig,
    layout: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
    onProgress?: (progress: number, message: string) => void
): Promise<GeneratedScreenshot[]> {
    const results: GeneratedScreenshot[] = [];
    const totalOperations = screenshots.length * devices.length;
    let completedOperations = 0;

    for (const screenshot of screenshots) {
        for (const deviceId of devices) {
            const device = getDeviceSpec(deviceId);
            if (!device) continue;

            onProgress?.(
                Math.round((completedOperations / totalOperations) * 100),
                `Generating ${device.name} - Screenshot ${screenshot.order + 1}`
            );

            try {
                const canvas = await composeScreenshot(
                    screenshot,
                    device,
                    background,
                    textOverlay,
                    layout
                );

                const blob = await canvasToBlob(canvas, exportConfig.format, exportConfig.quality);
                const filename = generateFilename(device, screenshot.order, exportConfig);

                results.push({
                    deviceId,
                    screenshotId: screenshot.id,
                    blob,
                    filename,
                });
            } catch (error) {
                console.error(`Failed to generate screenshot for ${device.name}:`, error);
            }

            completedOperations++;
        }
    }

    onProgress?.(100, 'Complete!');
    return results;
}

/**
 * Export screenshots as a ZIP file
 */
export async function exportAsZip(
    generatedScreenshots: GeneratedScreenshot[],
    onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
    const zip = new JSZip();

    // Organize by platform
    const iosFolder = zip.folder('iOS');
    const androidFolder = zip.folder('Android');

    for (const generated of generatedScreenshots) {
        const device = getDeviceSpec(generated.deviceId);
        if (!device) continue;

        const folder = device.platform === 'ios' ? iosFolder : androidFolder;
        if (folder) {
            folder.file(generated.filename, generated.blob);
        }
    }

    onProgress?.(50, 'Creating ZIP archive...');

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    onProgress?.(100, 'ZIP created successfully!');

    return zipBlob;
}

/**
 * Download a single file
 */
export function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_BACKGROUND: BackgroundConfig = {
    type: 'gradient',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
    gradientAngle: 135,
};

export const DEFAULT_TEXT_OVERLAY: TextOverlayConfig = {
    title: '',
    subtitle: '',
    titleFontSize: 72,
    subtitleFontSize: 48,
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 'bold',
    alignment: 'center',
    titleYOffset: 0,
    subtitleYOffset: 0,
    titleXOffset: 0,
    subtitleXOffset: 0,
    textShadow: true,
};

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
    format: 'png',
    quality: 0.92,
    namingConvention: 'device',
};

// ============================================================================
// Gradient Presets
// ============================================================================

export interface GradientPreset {
    id: string;
    name: string;
    start: string;
    end: string;
    angle: number;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
    { id: 'purple-pink', name: 'Purple Pink', start: '#667eea', end: '#764ba2', angle: 135 },
    { id: 'blue-cyan', name: 'Ocean Blue', start: '#0093E9', end: '#80D0C7', angle: 160 },
    { id: 'green-teal', name: 'Forest Teal', start: '#11998e', end: '#38ef7d', angle: 135 },
    { id: 'orange-red', name: 'Sunset', start: '#f12711', end: '#f5af19', angle: 135 },
    { id: 'pink-orange', name: 'Flamingo', start: '#ff6a88', end: '#ff99ac', angle: 135 },
    { id: 'dark-blue', name: 'Midnight', start: '#0f0c29', end: '#302b63', angle: 180 },
    { id: 'black-gray', name: 'Charcoal', start: '#1a1a2e', end: '#16213e', angle: 180 },
    { id: 'teal-purple', name: 'Aurora', start: '#00c6ff', end: '#7c3aed', angle: 135 },
];
