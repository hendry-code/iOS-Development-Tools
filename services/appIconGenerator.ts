import JSZip from 'jszip';

export type Platform = 'iphone' | 'ipad' | 'watch' | 'mac';

export interface IconSpec {
    size: number; // width/height in points
    scale: number; // 1, 2, 3
    idiom: 'iphone' | 'ipad' | 'ios-marketing' | 'watch-marketing' | 'mac' | 'universal' | 'watch';
    minos?: string;
    subtype?: string;
    role?: string;
}

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
    { size: 44, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '40mm' }, // Series 4 40mm
    { size: 46, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '41mm' }, // Series 7 41mm
    { size: 50, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '44mm' }, // Series 4 44mm
    { size: 51, scale: 2, idiom: 'watch', role: 'appLauncher', subtype: '45mm' }, // Series 7 45mm
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

export const generateAppIcons = async (
    imageFile: File,
    platforms: Record<Platform, boolean>,
    onProgress?: (progress: number) => void
): Promise<Blob> => {
    const zip = new JSZip();
    const folder = zip.folder('AppIcon.appiconset');
    if (!folder) throw new Error('Could not create zip folder');

    const sourceBitmap = await loadBitmap(imageFile);

    // Filter specs based on selected platforms
    let specs: IconSpec[] = [];
    if (platforms.iphone || platforms.ipad) {
        // iOS Marketing (1024) is shared, but we included it in IOS_SPECS
        // We should refine this to avoid duplicates if we split strictly.
        // For now, IOS_SPECS covers both iPhone and iPad standard set.
        // Let's filter specifically.
        const ios = IOS_SPECS.filter(s =>
            (s.idiom === 'iphone' && platforms.iphone) ||
            (s.idiom === 'ipad' && platforms.ipad) ||
            (s.idiom === 'ios-marketing' && (platforms.iphone || platforms.ipad))
        );
        specs = [...specs, ...ios];
    }
    if (platforms.watch) specs = [...specs, ...WATCH_SPECS];
    if (platforms.mac) specs = [...specs, ...MAC_SPECS];

    // Deduplicate specs just in case
    specs = specs.filter((spec, index, self) =>
        index === self.findIndex((t) => (
            t.size === spec.size &&
            t.scale === spec.scale &&
            t.idiom === spec.idiom &&
            t.subtype === spec.subtype &&
            t.role === spec.role
        ))
    );

    const imagesJson: any[] = [];
    const total = specs.length;

    for (let i = 0; i < total; i++) {
        const spec = specs[i];
        const dimension = spec.size * spec.scale;
        const filename = `Icon-${spec.size}${spec.scale > 1 ? `@${spec.scale}x` : ''}${spec.idiom === 'ipad' ? '~ipad' : ''}${spec.idiom === 'watch' ? '~watch' : ''}${spec.subtype ? `-${spec.subtype}` : ''}.png`;

        // Generate blob
        const blob = await resizeImage(sourceBitmap, dimension);
        folder.file(filename, blob);

        // Add to Contents.json entry
        const entry: any = {
            size: `${spec.size}x${spec.size}`,
            idiom: spec.idiom,
            filename: filename,
            scale: `${spec.scale}x`
        };
        if (spec.role) entry.role = spec.role;
        if (spec.subtype) entry.subtype = spec.subtype;

        imagesJson.push(entry);

        if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));
    }

    // Create Contents.json
    const contents = {
        images: imagesJson,
        info: {
            version: 1,
            author: 'xcode'
        }
    };
    folder.file('Contents.json', JSON.stringify(contents, null, 2));

    return zip.generateAsync({ type: 'blob' });
};
