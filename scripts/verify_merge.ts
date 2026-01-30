import fs from 'fs';
import path from 'path';
import { mergeStringsIntoCatalog } from '../services/converter';
import { LanguageFile } from '../types';

// Mock DOMParser for Node.js environment as it's used in converter.ts
import { JSDOM } from 'jsdom';
global.DOMParser = new JSDOM().window.DOMParser;

const testFilesDir = path.join(process.cwd(), 'test_files');
const xcstringsPath = path.join(testFilesDir, 'Localizable.xcstrings');
const stringsDictPath = path.join(testFilesDir, 'Localizable.stringsdict');

function runVerification() {
    console.log("Starting verification...");

    if (!fs.existsSync(xcstringsPath)) {
        console.error("Test files not found in test_files directory.");
        return;
    }

    const xcstringsContent = fs.readFileSync(xcstringsPath, 'utf-8');
    const stringsDictContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>plural_example</key>
    <dict>
        <key>NSStringLocalizedFormatKey</key>
        <string>%#@items@</string>
        <key>items</key>
        <dict>
            <key>NSStringFormatSpecTypeKey</key>
            <string>NSStringPluralRuleType</string>
            <key>NSStringFormatValueTypeKey</key>
            <string>d</string>
            <key>one</key>
            <string>1 item (RU)</string>
            <key>other</key>
            <string>%d items (RU)</string>
        </dict>
    </dict>
</dict>
</plist>`;

    const stringsFile: LanguageFile = {
        name: 'Localizable.stringsdict',
        content: stringsDictContent,
        langCode: 'ru' // Testing merging into Russian
    };

    try {
        const mergedOutput = mergeStringsIntoCatalog(xcstringsContent, [stringsFile]);
        const parsedOutput = JSON.parse(mergedOutput);

        // Check if plural keys are merged
        // Assuming Localizable.stringsdict has some plural keys. 
        // We'll inspect the output structure.

        console.log("Merge successful. Inspecting output...");

        // Simple check: Look for a known key from stringsdict in the output
        // I'll need to know a key. Let's assume based on common practice or inspect the file content first.
        // For now, I'll print keys that have 'ru' localization with plural variations.

        let pluralCount = 0;
        for (const key in parsedOutput.strings) {
            const entry = parsedOutput.strings[key];
            if (entry.localizations && entry.localizations['ru']) {
                if (entry.localizations['ru'].variations && entry.localizations['ru'].variations.plural) {
                    console.log(`Verified key '${key}' has plural variations for 'ru'.`);
                    pluralCount++;
                }
            }
        }

        if (pluralCount > 0) {
            console.log(`PASSED: Found ${pluralCount} keys with plural variations merged.`);
        } else {
            console.log("FAILED: No plural variations found in merged output.");
            console.log("Output excerpt:", JSON.stringify(parsedOutput, null, 2).substring(0, 500));
        }

    } catch (e: any) {
        console.error("Merge failed:", e.message);
    }
}

runVerification();
