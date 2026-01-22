import { LanguageFile } from '../types';


export interface FileWordCount {
    total: number;
    translated: number;
    nonTranslated: number;
    byLanguage?: Record<string, { translated: number; pending: number; total: number }>;
}

export interface WordCountResult {
    totalWords: number;
    translated: number;
    nonTranslated: number;
    fileCounts: Record<string, FileWordCount>;
}

export const countWordsInText = (text: string): number => {
    if (!text) return 0;
    const cleanedText = text.replace(/%(\d+\$)?[@diuxXfeEgGcsp]|\\(n|r|t)/g, ' ');
    return cleanedText.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const parseAndCountWords = (file: LanguageFile): FileWordCount => {
    const content = file.content;
    let totalWords = 0;
    let translatedWords = 0;
    let nonTranslatedWords = 0;
    const byLanguage: Record<string, { translated: number; pending: number; total: number }> = {};

    if (file.name.endsWith('.xcstrings')) {
        try {
            const json = JSON.parse(content);
            if (json.strings) {
                Object.entries(json.strings).forEach(([key, entry]: [string, any]) => {
                    const sourceWords = countWordsInText(key);

                    if (entry.localizations) {
                        Object.entries(entry.localizations).forEach(([lang, loc]: [string, any]) => {
                            let langTranslated = 0;
                            let langPending = 0;
                            let isTranslated = false;

                            // Check translation state/value
                            if (loc.stringUnit) {
                                if (loc.stringUnit.state === 'translated' || !loc.stringUnit.state) {
                                    if (loc.stringUnit.value) {
                                        langTranslated += countWordsInText(loc.stringUnit.value);
                                        isTranslated = true;
                                    }
                                }
                            }

                            // Plural / Variations support
                            if (loc.variations) {
                                // Simplified: if any variation exists, count as translated (using first value found)
                                // or sum all variation words? Usually word count is for "volume".
                                // If translated, we sum the translated words.
                                let variationWords = 0;
                                if (loc.variations.plural) {
                                    Object.values(loc.variations.plural).forEach((variation: any) => {
                                        if (variation.stringUnit && variation.stringUnit.value) {
                                            variationWords += countWordsInText(variation.stringUnit.value);
                                        }
                                    });
                                }
                                if (variationWords > 0) {
                                    langTranslated += variationWords;
                                    isTranslated = true;
                                }
                            }

                            if (isTranslated) {
                                translatedWords += langTranslated;
                            } else {
                                langPending += sourceWords;
                                nonTranslatedWords += sourceWords;
                            }

                            if (!byLanguage[lang]) byLanguage[lang] = { translated: 0, pending: 0, total: 0 };
                            byLanguage[lang].translated += langTranslated;
                            byLanguage[lang].pending += langPending;
                            byLanguage[lang].total += (langTranslated + langPending);
                        });
                    } else {
                        // Global non-translated (not attached to specific lang in loop)
                        nonTranslatedWords += sourceWords;
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing .xcstrings file:', e);
        }
        totalWords = translatedWords + nonTranslatedWords;
        return { total: totalWords, translated: translatedWords, nonTranslated: nonTranslatedWords, byLanguage };

    } else if (file.name.endsWith('.xliff')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // Try to identify language from file attributes first
        const files = xmlDoc.getElementsByTagName("file");
        let defaultTargetLang = "unknown";
        if (files.length > 0) {
            defaultTargetLang = files[0].getAttribute("target-language") || defaultTargetLang;
        }

        const transUnits = xmlDoc.getElementsByTagName("trans-unit");

        for (let i = 0; i < transUnits.length; i++) {
            const unit = transUnits[i];
            const sourceEl = unit.getElementsByTagName("source")[0];
            const targetEl = unit.getElementsByTagName("target")[0];

            const sourceText = sourceEl ? sourceEl.textContent || "" : "";
            const targetText = targetEl ? targetEl.textContent || "" : "";

            const state = targetEl ? targetEl.getAttribute("state") : "new";

            const sourceCount = countWordsInText(sourceText);
            const targetCount = countWordsInText(targetText);

            let unitTranslated = 0;
            let unitPending = 0;

            // XLIFF analysis usually implies we are working on a target language
            // Assign these counts to the identified target language

            if (targetEl && targetText && state !== 'new' && state !== 'needs-review') {
                unitTranslated = targetCount;
                translatedWords += unitTranslated;
            } else {
                unitPending = sourceCount;
                nonTranslatedWords += unitPending;
            }

            const targetLang = defaultTargetLang; // Use file-level target lang
            if (!byLanguage[targetLang]) byLanguage[targetLang] = { translated: 0, pending: 0, total: 0 };
            byLanguage[targetLang].translated += unitTranslated;
            byLanguage[targetLang].pending += unitPending;
            byLanguage[targetLang].total += (unitTranslated + unitPending);
        }

        totalWords = translatedWords + nonTranslatedWords;
        return { total: totalWords, translated: translatedWords, nonTranslated: nonTranslatedWords, byLanguage };

    } else if (file.name.endsWith('.strings')) {
        const regex = /"[^"]+"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g;
        let match;
        const lang = file.langCode || 'en'; // Default or from file
        if (!byLanguage[lang]) byLanguage[lang] = { translated: 0, pending: 0, total: 0 };

        while ((match = regex.exec(content)) !== null) {
            if (match[1]) {
                const unescaped = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                const count = countWordsInText(unescaped);
                translatedWords += count;
                byLanguage[lang].translated += count;
                byLanguage[lang].total += count;
            }
        }
    } else if (file.name.endsWith('.xml') || file.name.endsWith('.stringsdict')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const lang = file.langCode || 'en';
        if (!byLanguage[lang]) byLanguage[lang] = { translated: 0, pending: 0, total: 0 };

        const addCount = (text: string | null) => {
            if (text) {
                const count = countWordsInText(text);
                translatedWords += count;
                byLanguage[lang].translated += count;
                byLanguage[lang].total += count;
            }
        };

        // Android strings.xml
        const stringElements = xmlDoc.getElementsByTagName("string");
        for (let i = 0; i < stringElements.length; i++) {
            addCount(stringElements[i].textContent);
        }

        // Android string-array
        const stringArrayElements = xmlDoc.getElementsByTagName("item");
        for (let i = 0; i < stringArrayElements.length; i++) {
            addCount(stringArrayElements[i].textContent);
        }

        // .stringsdict (plist)
        if (file.name.endsWith('.stringsdict')) {
            const stringTags = xmlDoc.getElementsByTagName("string");
            const targetKeys = new Set(['NSStringLocalizedFormatKey', 'zero', 'one', 'two', 'few', 'many', 'other']);
            for (let i = 0; i < stringTags.length; i++) {
                const strTag = stringTags[i];
                let prev = strTag.previousSibling;
                while (prev && prev.nodeType !== 1) {
                    prev = prev.previousSibling;
                }
                if (prev && prev.nodeName === 'key' && prev.textContent && targetKeys.has(prev.textContent)) {
                    addCount(strTag.textContent);
                }
            }
        }
    }

    totalWords = translatedWords + nonTranslatedWords;
    return { total: totalWords, translated: translatedWords, nonTranslated: nonTranslatedWords, byLanguage };
};

export const calculateTotalWords = (files: LanguageFile[]): WordCountResult => {
    const result: WordCountResult = {
        totalWords: 0,
        translated: 0,
        nonTranslated: 0,
        fileCounts: {},
    };

    files.forEach(file => {
        const count = parseAndCountWords(file);
        result.fileCounts[file.name] = count;
        result.totalWords += count.total;
        result.translated += count.translated;
        result.nonTranslated += count.nonTranslated;
    });

    return result;
};
