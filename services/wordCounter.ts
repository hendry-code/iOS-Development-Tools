import { LanguageFile } from '../types';


export interface FileWordCount {
    total: number;
    byLanguage?: Record<string, number>;
}

export interface WordCountResult {
    totalWords: number;
    fileCounts: Record<string, FileWordCount>;
}

export const countWordsInText = (text: string): number => {
    if (!text) return 0;

    // Replace format specifiers and escape sequences with space
    // Matches:
    // %(\d+\$)? - Optional positional argument like %1$
    // [@diuxXfeEgGcsp] - Standard format specifiers
    // \\(n|r|t) - Escape sequences \n, \r, \t
    const cleanedText = text.replace(/%(\d+\$)?[@diuxXfeEgGcsp]|\\(n|r|t)/g, ' ');

    // Split by whitespace and filter out empty strings
    return cleanedText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const parseAndCountWords = (file: LanguageFile): FileWordCount => {
    const content = file.content;
    let totalWords = 0;
    const byLanguage: Record<string, number> = {};

    if (file.name.endsWith('.xcstrings')) {
        try {
            const json = JSON.parse(content);
            if (json.strings) {
                Object.values(json.strings).forEach((entry: any) => {
                    if (entry.localizations) {
                        Object.entries(entry.localizations).forEach(([lang, loc]: [string, any]) => {
                            let langCount = 0;
                            if (loc.stringUnit && loc.stringUnit.value) {
                                langCount += countWordsInText(loc.stringUnit.value);
                            }
                            if (loc.variations) {
                                if (loc.variations.plural) {
                                    Object.values(loc.variations.plural).forEach((variation: any) => {
                                        if (variation.stringUnit && variation.stringUnit.value) {
                                            langCount += countWordsInText(variation.stringUnit.value);
                                        }
                                    });
                                }
                            }

                            byLanguage[lang] = (byLanguage[lang] || 0) + langCount;
                            totalWords += langCount;
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing .xcstrings file:', e);
        }
        return { total: totalWords, byLanguage };
    } else if (file.name.endsWith('.strings')) {
        // Simple regex to match "key" = "value";
        // We want to capture the value part.
        // Handles escaped quotes within the value.
        const regex = /"[^"]+"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            if (match[1]) {
                // Unescape the string before counting
                const unescaped = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                totalWords += countWordsInText(unescaped);
            }
        }
    } else if (file.name.endsWith('.xml') || file.name.endsWith('.stringsdict')) {
        // Basic XML parsing to extract text content from tags
        // This is a simplified approach. For Android strings.xml, we look for <string> tags.
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // Android strings.xml
        const stringElements = xmlDoc.getElementsByTagName("string");
        for (let i = 0; i < stringElements.length; i++) {
            const text = stringElements[i].textContent;
            if (text) {
                totalWords += countWordsInText(text);
            }
        }

        // Android string-array items
        const stringArrayElements = xmlDoc.getElementsByTagName("item");
        for (let i = 0; i < stringArrayElements.length; i++) {
            const text = stringArrayElements[i].textContent;
            if (text) {
                totalWords += countWordsInText(text);
            }
        }

        // .stringsdict (plist)
        if (file.name.endsWith('.stringsdict')) {
            // We look for specific keys that hold the format string or plural variations.
            // Structure is usually: <key>NSStringLocalizedFormatKey</key><string>...</string>
            // and inside dicts: <key>one</key><string>...</string>

            // Strategy: Iterate over all <string> tags. 
            // If the previous sibling is a <key> and its text is one of the target keys, count the string.
            // Target keys: NSStringLocalizedFormatKey, zero, one, two, few, many, other

            const stringTags = xmlDoc.getElementsByTagName("string");
            const targetKeys = new Set(['NSStringLocalizedFormatKey', 'zero', 'one', 'two', 'few', 'many', 'other']);

            for (let i = 0; i < stringTags.length; i++) {
                const strTag = stringTags[i];
                // Check previous sibling for <key>
                let prev = strTag.previousSibling;
                while (prev && prev.nodeType !== 1) { // 1 is ELEMENT_NODE
                    prev = prev.previousSibling;
                }

                if (prev && prev.nodeName === 'key' && prev.textContent && targetKeys.has(prev.textContent)) {
                    const text = strTag.textContent;
                    if (text) {
                        totalWords += countWordsInText(text);
                    }
                }
            }
        }

    }

    return { total: totalWords };
};

export const calculateTotalWords = (files: LanguageFile[]): WordCountResult => {
    const result: WordCountResult = {
        totalWords: 0,
        fileCounts: {},
    };

    files.forEach(file => {
        const count = parseAndCountWords(file);
        result.fileCounts[file.name] = count;
        result.totalWords += count.total;
    });

    return result;
};
