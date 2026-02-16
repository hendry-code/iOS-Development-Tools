import JSZip from 'jszip';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'iphone' | 'ipad' | 'watch' | 'mac' | 'web';

export type IconAppearance = 'dark' | 'tinted';

export interface IconSpec {
    size: number; // width/height in points
    scale: number; // 1, 2, 3
    idiom: 'iphone' | 'ipad' | 'ios-marketing' | 'watch-marketing' | 'mac' | 'universal' | 'watch';
    minos?: string;
    subtype?: string;
    role?: string;
}

export interface ImageValidation {
    width: number;
    height: number;
    isSquare: boolean;
    isMinSize: boolean; // >= 1024x1024
    hasAlpha: boolean;
    warnings: string[];
}

export interface AssetSummaryEntry {
    filename: string;
    width: number;
    height: number;
    platform: string;
    idiom: string;
    appearance?: string;
}

export interface GenerateOptions {
    singleSize?: boolean;            // F5 — Xcode 15+ universal single icon
    appearances?: Partial<Record<IconAppearance, File>>;  // F7 — dark / tinted variant files
    variantName?: string;            // F8 — custom folder name (e.g., "AppIcon-Dark")
}

// ─── Icon Specs ───────────────────────────────────────────────────────────────

const IOS_SPECS: IconSpec[] = [
    // iPhone
    { size: 20, scale: 2, idiom: 'iphone' },
    { size: 20, scale: 3, idiom: 'iphone' },
    { size: 29, scale: 2, idiom: 'iphone' },
    { size: 29, scale: 3, idiom: 'iphone' },
    { size: 40, scale: 2, idiom: 'iphone' },
    { size: 40, scale: 3, idiom: 'iphone' },
    { size: 60, scale: 2, idiom: 'iphone' },
    { size: 60, scale: 3, idiom: 'iphone' },
    { size: 1024, scale: 1, idiom: 'ios-marketing' }, // App Store

    // iPad
    { size: 20, scale: 1, idiom: 'ipad' },
    { size: 20, scale: 2, idiom: 'ipad' },
    { size: 29, scale: 1, idiom: 'ipad' },
    { size: 29, scale: 2, idiom: 'ipad' },
    { size: 40, scale: 1, idiom: 'ipad' },
    { size: 40, scale: 2, idiom: 'ipad' },
    { size: 76, scale: 1, idiom: 'ipad' },
    { size: 76, scale: 2, idiom: 'ipad' },
    { size: 83.5, scale: 2, idiom: 'ipad' }, // iPad Pro 12.9
];

const WATCH_SPECS: IconSpec[] = [
    // Watch Notification
    { size: 24, scale: 2, idiom: 'watch', role: 'notificationCenter', subtype: '38mm' },
    { size: 27.5, scale: 2, idiom: 'watch', role: 'notificationCenter', subtype: '42mm' },
    // Watch Settings
    { size: 29, scale: 2, idiom: 'watch', role: 'companionSettings' },
    { size: 29, scale: 3, idiom: 'watch', role: 'companionSettings' },
    // Watch Home Screen
    { size: 40, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '38mm' },
    { size: 44, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '40mm' },
    { size: 46, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '41mm' },
    { size: 50, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '44mm' },
    { size: 51, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '45mm' },
    { size: 86, scale: 2, idiom: 'watch', role: 'quickLook', subtype: '38mm' },
    { size: 98, scale: 2, idiom: 'watch', role: 'quickLook', subtype: '42mm' },
    { size: 108, scale: 2, idiom: 'watch', role: 'quickLook', subtype: '44mm' },
    { size: 1024, scale: 1, idiom: 'watch-marketing' }, // App Store
];

const MAC_SPECS: IconSpec[] = [
    { size: 16, scale: 1, idiom: 'mac' },
    { size: 16, scale: 2, idiom: 'mac' },
    { size: 32, scale: 1, idiom: 'mac' },
    { size: 32, scale: 2, idiom: 'mac' },
    { size: 128, scale: 1, idiom: 'mac' },
    { size: 128, scale: 2, idiom: 'mac' },
    { size: 256, scale: 1, idiom: 'mac' },
    { size: 256, scale: 2, idiom: 'mac' },
    { size: 512, scale: 1, idiom: 'mac' },
    { size: 512, scale: 2, idiom: 'mac' },
];

const WEB_SPECS: IconSpec[] = [
    { size: 16, scale: 1, idiom: 'universal' },   // favicon-16
    { size: 32, scale: 1, idiom: 'universal' },   // favicon-32
    { size: 180, scale: 1, idiom: 'universal' },  // apple-touch-icon
    { size: 192, scale: 1, idiom: 'universal' },  // PWA icon
    { size: 512, scale: 1, idiom: 'universal' },  // PWA icon large
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadBitmap = (file: File): Promise<ImageBitmap> => {
    return createImageBitmap(file);
};

const resizeImage = async (source: ImageBitmap, dimension: number): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = dimension;
    canvas.height = dimension;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // High quality resizing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, dimension, dimension);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
        }, 'image/png');
    });
};

/**
 * Build the filename for an icon spec, with an optional appearance suffix.
 */
const buildFilename = (spec: IconSpec, appearance?: string): string => {
    const suffix = appearance ? `-${appearance}` : '';
    return `Icon-${spec.size}${spec.scale > 1 ? `@${spec.scale}x` : ''}${spec.idiom === 'ipad' ? '~ipad' : ''}${spec.idiom === 'watch' ? '~watch' : ''}${spec.subtype ? `-${spec.subtype}` : ''}${suffix}.png`;
};

/**
 * Build the filename for a web icon.
 */
const buildWebFilename = (spec: IconSpec): string => {
    if (spec.size === 180) return 'apple-touch-icon.png';
    if (spec.size === 192) return 'icon-192.png';
    if (spec.size === 512) return 'icon-512.png';
    return `favicon-${spec.size}.png`;
};

/**
 * Get human-readable platform label for a given idiom.
 */
const idiomToPlatform = (idiom: string): string => {
    switch (idiom) {
        case 'iphone': return 'iPhone';
        case 'ipad': return 'iPad';
        case 'ios-marketing': return 'App Store (iOS)';
        case 'watch': return 'watchOS';
        case 'watch-marketing': return 'App Store (watchOS)';
        case 'mac': return 'macOS';
        case 'universal': return 'Web';
        default: return idiom;
    }
};

// ─── F2: Image Validation ─────────────────────────────────────────────────────

export const validateImage = async (file: File): Promise<ImageValidation> => {
    const warnings: string[] = [];

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const isSquare = width === height;
    if (!isSquare) {
        warnings.push(`Image is not square (${width}×${height}). App icons must be square.`);
    }

    const isMinSize = Math.min(width, height) >= 1024;
    if (!isMinSize) {
        warnings.push(`Image is ${width}×${height}px. For best quality, use at least 1024×1024.`);
    }

    // Detect alpha channel by sampling pixel data
    const canvas = document.createElement('canvas');
    // Use a smaller version for performance — alpha check doesn't need full res
    const sampleDim = Math.min(width, height, 256);
    canvas.width = sampleDim;
    canvas.height = sampleDim;
    const ctx = canvas.getContext('2d');
    let hasAlpha = false;

    if (ctx) {
        ctx.drawImage(bitmap, 0, 0, sampleDim, sampleDim);
        const imageData = ctx.getImageData(0, 0, sampleDim, sampleDim);
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                hasAlpha = true;
                break;
            }
        }
    }

    if (hasAlpha) {
        warnings.push('Image contains transparency. iOS app icons should not have alpha channels — they may render with a black background.');
    }

    bitmap.close();

    return { width, height, isSquare, isMinSize, hasAlpha, warnings };
};

// ─── F3: Alpha Flattening ─────────────────────────────────────────────────────

export const flattenAlpha = async (file: File, bgColor: string): Promise<File> => {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Fill with background color first
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Composite original image on top
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Flatten failed'));
                return;
            }
            // Derive a new filename from the original
            const name = file.name.replace(/\.[^.]+$/, '') + '-flat.png';
            resolve(new File([blob], name, { type: 'image/png' }));
        }, 'image/png');
    });
};

// ─── F10: Asset Summary ───────────────────────────────────────────────────────

export const buildAssetSummary = (
    platforms: Record<Platform, boolean>,
    singleSize: boolean,
    appearances?: Partial<Record<IconAppearance, File>>,
): AssetSummaryEntry[] => {
    if (singleSize) {
        const entries: AssetSummaryEntry[] = [{
            filename: 'Icon-1024.png',
            width: 1024,
            height: 1024,
            platform: 'Universal',
            idiom: 'universal',
        }];
        // Add appearance variants
        if (appearances) {
            for (const app of Object.keys(appearances) as IconAppearance[]) {
                if (appearances[app]) {
                    entries.push({
                        filename: `Icon-1024-${app}.png`,
                        width: 1024,
                        height: 1024,
                        platform: 'Universal',
                        idiom: 'universal',
                        appearance: app,
                    });
                }
            }
        }
        return entries;
    }

    const specs = resolveSpecs(platforms);
    const entries: AssetSummaryEntry[] = [];

    for (const spec of specs) {
        const isWeb = spec.idiom === 'universal';
        const dimension = spec.size * spec.scale;
        entries.push({
            filename: isWeb ? buildWebFilename(spec) : buildFilename(spec),
            width: dimension,
            height: dimension,
            platform: idiomToPlatform(spec.idiom),
            idiom: spec.idiom,
        });
    }

    // Add appearance variants (for non-web specs only)
    if (appearances) {
        const nonWebSpecs = specs.filter(s => s.idiom !== 'universal');
        for (const app of Object.keys(appearances) as IconAppearance[]) {
            if (!appearances[app]) continue;
            for (const spec of nonWebSpecs) {
                const dimension = spec.size * spec.scale;
                entries.push({
                    filename: buildFilename(spec, app),
                    width: dimension,
                    height: dimension,
                    platform: idiomToPlatform(spec.idiom),
                    idiom: spec.idiom,
                    appearance: app,
                });
            }
        }
    }

    return entries;
};

// ─── Spec Resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the list of icon specs to generate based on selected platforms.
 * Extracted so it can be reused by both `generateAppIcons` and `buildAssetSummary`.
 */
const resolveSpecs = (platforms: Record<Platform, boolean>): IconSpec[] => {
    let specs: IconSpec[] = [];

    if (platforms.iphone || platforms.ipad) {
        const ios = IOS_SPECS.filter(s =>
            (s.idiom === 'iphone' && platforms.iphone) ||
            (s.idiom === 'ipad' && platforms.ipad) ||
            (s.idiom === 'ios-marketing' && (platforms.iphone || platforms.ipad))
        );
        specs = [...specs, ...ios];
    }
    if (platforms.watch) specs = [...specs, ...WATCH_SPECS];
    if (platforms.mac) specs = [...specs, ...MAC_SPECS];
    if (platforms.web) specs = [...specs, ...WEB_SPECS];

    // Deduplicate
    specs = specs.filter((spec, index, self) =>
        index === self.findIndex((t) => (
            t.size === spec.size &&
            t.scale === spec.scale &&
            t.idiom === spec.idiom &&
            t.subtype === spec.subtype &&
            t.role === spec.role
        ))
    );

    return specs;
};

// ─── Main Generation ──────────────────────────────────────────────────────────

/**
 * Generate an icon set into a given JSZip folder for a single source bitmap.
 * Returns the Contents.json images array for this set.
 */
const generateIconSetIntoFolder = async (
    folder: JSZip,
    sourceBitmap: ImageBitmap,
    specs: IconSpec[],
    isWeb: boolean,
    appearances?: Partial<Record<IconAppearance, ImageBitmap>>,
    onProgress?: (current: number, total: number) => void,
    progressOffset: number = 0,
): Promise<any[]> => {
    const imagesJson: any[] = [];

    // Count total work items for progress
    const appearanceKeys = appearances ? (Object.keys(appearances) as IconAppearance[]).filter(k => appearances[k]) : [];
    const specsForAppearances = isWeb ? [] : specs; // No appearance variants for web icons
    const totalItems = specs.length + (specsForAppearances.length * appearanceKeys.length);

    let processed = 0;

    // Generate main icons
    for (const spec of specs) {
        const dimension = spec.size * spec.scale;
        const filename = isWeb ? buildWebFilename(spec) : buildFilename(spec);

        const blob = await resizeImage(sourceBitmap, dimension);
        folder.file(filename, blob);

        const entry: any = {
            size: `${spec.size}x${spec.size}`,
            idiom: spec.idiom,
            filename: filename,
            scale: `${spec.scale}x`,
        };
        if (spec.role) entry.role = spec.role;
        if (spec.subtype) entry.subtype = spec.subtype;
        imagesJson.push(entry);

        processed++;
        if (onProgress) onProgress(progressOffset + processed, totalItems);
    }

    // Generate appearance variant icons (F7)
    for (const app of appearanceKeys) {
        const appBitmap = appearances![app]!;
        for (const spec of specsForAppearances) {
            const dimension = spec.size * spec.scale;
            const filename = buildFilename(spec, app);

            const blob = await resizeImage(appBitmap, dimension);
            folder.file(filename, blob);

            const entry: any = {
                size: `${spec.size}x${spec.size}`,
                idiom: spec.idiom,
                filename: filename,
                scale: `${spec.scale}x`,
                appearances: [{ appearance: 'luminosity', value: app }],
            };
            if (spec.role) entry.role = spec.role;
            if (spec.subtype) entry.subtype = spec.subtype;
            imagesJson.push(entry);

            processed++;
            if (onProgress) onProgress(progressOffset + processed, totalItems);
        }
    }

    return imagesJson;
};

export const generateAppIcons = async (
    imageFile: File,
    platforms: Record<Platform, boolean>,
    onProgress?: (progress: number) => void,
    options?: GenerateOptions,
): Promise<{ blob: Blob; summary: AssetSummaryEntry[] }> => {
    const zip = new JSZip();
    const folderName = options?.variantName
        ? `${options.variantName}.appiconset`
        : 'AppIcon.appiconset';

    const sourceBitmap = await loadBitmap(imageFile);

    // Load appearance bitmaps if provided (F7)
    const appearanceBitmaps: Partial<Record<IconAppearance, ImageBitmap>> = {};
    if (options?.appearances) {
        for (const [key, file] of Object.entries(options.appearances)) {
            if (file) {
                appearanceBitmaps[key as IconAppearance] = await loadBitmap(file);
            }
        }
    }

    let summary: AssetSummaryEntry[];

    // ─── F5: Single-size mode (Xcode 15+) ─────────────────────────
    if (options?.singleSize) {
        const folder = zip.folder(folderName);
        if (!folder) throw new Error('Could not create zip folder');

        const mainBlob = await resizeImage(sourceBitmap, 1024);
        folder.file('Icon-1024.png', mainBlob);

        const imagesJson: any[] = [{
            filename: 'Icon-1024.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
        }];

        // Appearance variants
        const appearanceKeys = Object.keys(appearanceBitmaps) as IconAppearance[];
        for (const app of appearanceKeys) {
            const blob = await resizeImage(appearanceBitmaps[app]!, 1024);
            const filename = `Icon-1024-${app}.png`;
            folder.file(filename, blob);
            imagesJson.push({
                filename,
                idiom: 'universal',
                platform: 'ios',
                size: '1024x1024',
                appearances: [{ appearance: 'luminosity', value: app }],
            });
        }

        folder.file('Contents.json', JSON.stringify({
            images: imagesJson,
            info: { version: 1, author: 'xcode' },
        }, null, 2));

        if (onProgress) onProgress(100);

        summary = buildAssetSummary(platforms, true, options?.appearances);
    } else {
        // ─── Standard multi-size mode ──────────────────────────────
        const allSpecs = resolveSpecs(platforms);
        const webSpecs = allSpecs.filter(s => s.idiom === 'universal');
        const nativeSpecs = allSpecs.filter(s => s.idiom !== 'universal');

        // Generate native icon set
        if (nativeSpecs.length > 0) {
            const folder = zip.folder(folderName);
            if (!folder) throw new Error('Could not create zip folder');

            const appearanceKeys = Object.keys(appearanceBitmaps) as IconAppearance[];
            const totalNative = nativeSpecs.length + (nativeSpecs.length * appearanceKeys.length);
            const totalAll = totalNative + webSpecs.length;

            const imagesJson = await generateIconSetIntoFolder(
                folder, sourceBitmap, nativeSpecs, false,
                Object.keys(appearanceBitmaps).length > 0 ? appearanceBitmaps : undefined,
                (current, _total) => {
                    if (onProgress) onProgress(Math.round((current / totalAll) * 100));
                },
            );

            folder.file('Contents.json', JSON.stringify({
                images: imagesJson,
                info: { version: 1, author: 'xcode' },
            }, null, 2));
        }

        // Generate web icons into a separate folder (F9)
        if (webSpecs.length > 0) {
            const webFolder = zip.folder('web-icons');
            if (!webFolder) throw new Error('Could not create web-icons folder');

            for (let i = 0; i < webSpecs.length; i++) {
                const spec = webSpecs[i];
                const dimension = spec.size * spec.scale;
                const filename = buildWebFilename(spec);
                const blob = await resizeImage(sourceBitmap, dimension);
                webFolder.file(filename, blob);
            }

            if (onProgress) onProgress(100);
        } else {
            if (onProgress) onProgress(100);
        }

        summary = buildAssetSummary(platforms, false, options?.appearances);
    }

    // Cleanup bitmaps
    sourceBitmap.close();
    for (const bm of Object.values(appearanceBitmaps)) {
        if (bm) bm.close();
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    return { blob, summary };
};
