
import { LanguageFile } from '../types';

export interface StringsAnalysisResult {
    totalKeys: number;
    totalLanguages: number;
    languages: LanguageAnalysis[];
    duplicates: DuplicateValue[];
    looseDuplicates: DuplicateValue[]; // Case-insensitive, trimmed
    keys: KeyAnalysis[];
}

export interface LanguageAnalysis {
    langCode: string;
    translatedCount: number;
    pendingCount: number; // For xcstrings, means state is not translated or needs review. For XML, might be harder to determine without source, so maybe just presence.
    missingCount: number;
    percentComplete: number;
}

export interface DuplicateValue {
    value: string;
    keys: string[];
    count: number;
}

export interface KeyAnalysis {
    key: string;
    translations: Record<string, { value: string; state?: string }>; // lang -> { value, state }
    hasDuplicates: boolean;
}

export const analyzeStrings = (files: LanguageFile[]): StringsAnalysisResult => {
    const keysMap: Record<string, KeyAnalysis> = {};
    const languagesSet = new Set<string>();

    // 1. Parse Files
    files.forEach(file => {
        if (file.name.endsWith('.xcstrings')) {
            parseXCStrings(file.content, keysMap, languagesSet);
        } else if (file.name.endsWith('.xml')) {
            parseXML(file, keysMap, languagesSet);
        } else if (file.name.endsWith('.xliff')) {
            parseXLIFF(file, keysMap, languagesSet);
        }
    });

    const totalKeys = Object.keys(keysMap).length;
    const languages = Array.from(languagesSet);

    // 2. Analyze Languages
    const languageAnalysis: LanguageAnalysis[] = languages.map(lang => {
        let translated = 0;
        let pending = 0;
        let missing = 0;

        Object.values(keysMap).forEach(keyData => {
            const trans = keyData.translations[lang];
            if (trans) {
                if (trans.state === 'needs_review' || trans.state === 'new') {
                    pending++;
                } else {
                    translated++;
                }
            } else {
                missing++;
            }
        });

        const totalForLang = translated + pending + missing; // Should equal totalKeys ideally
        return {
            langCode: lang,
            translatedCount: translated,
            pendingCount: pending,
            missingCount: missing,
            percentComplete: totalKeys > 0 ? (translated / totalKeys) * 100 : 0
        };
    });

    // 3. Analyze Duplicates across all languages? 
    // Usually duplicates are checked per language or for the source language (often 'en').
    // Let's aggregate all values across all languages and keys to find where the same string is used for different keys.
    // Spec says "Show if there are any duplicates values exists".

    const valueToKeys: Record<string, Set<string>> = {};
    const looseValueToKeys: Record<string, Set<string>> = {};

    Object.values(keysMap).forEach(k => {
        Object.values(k.translations).forEach(t => {
            if (!t.value) return;
            const val = t.value;
            const looseVal = val.trim().toLowerCase();

            if (!valueToKeys[val]) valueToKeys[val] = new Set();
            valueToKeys[val].add(k.key);

            if (!looseValueToKeys[looseVal]) looseValueToKeys[looseVal] = new Set();
            looseValueToKeys[looseVal].add(k.key);
        });
    });

    const duplicates: DuplicateValue[] = [];
    Object.entries(valueToKeys).forEach(([val, keySet]) => {
        if (keySet.size > 1) {
            duplicates.push({ value: val, keys: Array.from(keySet), count: keySet.size });
        }
    });

    const looseDuplicates: DuplicateValue[] = [];
    Object.entries(looseValueToKeys).forEach(([val, keySet]) => {
        if (keySet.size > 1) {
            // Filter out if it's already in exact duplicates to avoid redundancy? 
            // Or just show everything. Let's just show everything for now.
            looseDuplicates.push({ value: val, keys: Array.from(keySet), count: keySet.size });
        }
    });


    return {
        totalKeys,
        totalLanguages: languages.length,
        languages: languageAnalysis,
        duplicates: duplicates.sort((a, b) => b.count - a.count),
        looseDuplicates: looseDuplicates.sort((a, b) => b.count - a.count),
        keys: Object.values(keysMap)
    };
};

const parseXCStrings = (content: string, keysMap: Record<string, KeyAnalysis>, languagesSet: Set<string>) => {
    try {
        const json = JSON.parse(content);
        // sourceLanguage = json.sourceLanguage

        if (json.strings) {
            Object.entries(json.strings).forEach(([key, entry]: [string, any]) => {
                if (!keysMap[key]) {
                    keysMap[key] = { key, translations: {}, hasDuplicates: false };
                }

                // Add Check for source language value if it exists directly in 'extractionState' or inferred?
                // Usually source value is the key itself or separate?
                // In xcstrings, if no localizations, it might use the key.

                if (entry.localizations) {
                    Object.entries(entry.localizations).forEach(([lang, loc]: [string, any]) => {
                        languagesSet.add(lang);
                        let value = "";
                        if (loc.stringUnit) {
                            value = loc.stringUnit.value;
                        } else if (loc.variations) {
                            // Use 'other' or first available for representation
                            if (loc.variations.plural) {
                                Object.values(loc.variations.plural).forEach((variation: any) => {
                                    if (variation.stringUnit && variation.stringUnit.value) {
                                        value = variation.stringUnit.value;
                                    }
                                });
                            } else if (loc.variations.device) {
                                // just pick one
                                const deviceVars = Object.values(loc.variations.device) as any[];
                                value = deviceVars[0]?.stringUnit?.value || "";
                            }
                        }

                        keysMap[key].translations[lang] = {
                            value,
                            state: loc.stringUnit?.state || 'translated'
                        };
                    });
                }
            });
        }
    } catch (e) {
        console.error("Failed to parse xcstrings", e);
    }
};

const parseXML = (file: LanguageFile, keysMap: Record<string, KeyAnalysis>, languagesSet: Set<string>) => {
    // Attempt to guess language from filename or parent folder if passed? 
    // for single file upload without path info, we might not know lang.
    // Default to 'unknown' or try to parse 'values-xx'?
    // The InputPanel usually just gives filename. 
    // If it's just 'strings.xml', we assume 'en' or we treat it as a single language file.
    // Let's assume the user might rename it or we treat it as "Base" or the file name itself if indeterminate.

    // HACK: for now, use file name as language identifier if it looks like a language code, else 'xml-content'.
    // Better: In the UI, maybe we can ask? But for now let's just use "XML" as the language if single, 
    // or if the user uploads "fr.xml", "en.xml", use those.

    let lang = file.name.replace('.xml', '');
    if (lang === 'strings') lang = 'en'; // Default assumption commonly

    languagesSet.add(lang);

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(file.content, "text/xml");

    const stringElements = xmlDoc.getElementsByTagName("string");

    for (let i = 0; i < stringElements.length; i++) {
        const el = stringElements[i];
        const key = el.getAttribute("name");
        const value = el.textContent || "";

        if (key) {
            if (!keysMap[key]) {
                keysMap[key] = { key, translations: {}, hasDuplicates: false };
            }
            keysMap[key].translations[lang] = { value, state: 'translated' };
        }
    }

    // Handle string-array?
    const stringArrayElements = xmlDoc.getElementsByTagName("string-array");
    for (let i = 0; i < stringArrayElements.length; i++) {
        const el = stringArrayElements[i];
        const keyBase = el.getAttribute("name");
        if (keyBase) {
            const items = el.getElementsByTagName("item");
            for (let j = 0; j < items.length; j++) {
                const subKey = `${keyBase}.${j}`;
                const value = items[j].textContent || "";
                if (!keysMap[subKey]) {
                    keysMap[subKey] = { key: subKey, translations: {}, hasDuplicates: false };
                }
                keysMap[subKey].translations[lang] = { value, state: 'translated' };
            }
        }
    }
};

const parseXLIFF = (file: LanguageFile, keysMap: Record<string, KeyAnalysis>, languagesSet: Set<string>) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(file.content, "text/xml");

    // Attempt to find target language from <file> tag
    const files = xmlDoc.getElementsByTagName("file");
    let targetLang = "unknown";

    // Usually one file element per xliff, but just in case
    if (files.length > 0) {
        // Prefer target-language, fallback to source-language or infer from filename
        const targetAttr = files[0].getAttribute("target-language");
        if (targetAttr) {
            targetLang = targetAttr;
        } else {
            // If no target-language, it might be a source-only file or we look at the file name
            // but strictly speaking XLIFFs for translation should have target-language.
            targetLang = file.langCode || "en";
        }
    } else {
        targetLang = file.langCode || "en";
    }

    languagesSet.add(targetLang);

    const transUnits = xmlDoc.getElementsByTagName("trans-unit");
    for (let i = 0; i < transUnits.length; i++) {
        const unit = transUnits[i];
        const key = unit.getAttribute("id");
        if (!key) continue;

        const sourceEl = unit.getElementsByTagName("source")[0];
        const targetEl = unit.getElementsByTagName("target")[0];
        // NoteEl?

        const sourceVal = sourceEl ? sourceEl.textContent || "" : "";
        let targetVal = targetEl ? targetEl.textContent || "" : "";

        // If target is missing, do we rely on source? 
        // In XLIFF, if not translated, target might be missing or empty.
        // If state is new, it might use source. 

        const state = targetEl ? targetEl.getAttribute("state") : "new";

        // Use source value as fallback for value if target is empty?
        // Actually for analysis, we want to know what is translated.
        // If target is empty, it's missing or pending.

        // However, we need to populate the 'key' structure.
        if (!keysMap[key]) {
            keysMap[key] = { key, translations: {}, hasDuplicates: false };
        }

        keysMap[key].translations[targetLang] = {
            value: targetVal || "", // Use empty string if missing to signify existence but no content
            state: state || 'translated'
        };

        // Also we might want to track source language value if possible? 
        // For now our data model is key -> lang -> value.
        // If we want to capture source explicitly we'd need another field or treat source-language as a lang.
        // Let's treat source-language as a lang too if we find it?
        // Typically XLIFF has source-language="en".

        if (files.length > 0) {
            const sourceLang = files[0].getAttribute("source-language");
            if (sourceLang && sourceLang !== targetLang) {
                languagesSet.add(sourceLang);
                // Only set source if not already set (avoid overwriting if multiple files have same source)
                if (!keysMap[key].translations[sourceLang]) {
                    keysMap[key].translations[sourceLang] = {
                        value: sourceVal,
                        state: 'translated' // Source is always 'translated' / original
                    };
                }
            }
        }
    }
};
