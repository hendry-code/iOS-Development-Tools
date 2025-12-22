
import { LanguageFile, ParsedStrings, ParsedMultiLanguageStrings, isPlural } from '../types';
import {
    parseStringsFile,
    parseStringsDictFile,
    parseJson,
    parseStringCatalog,
    parseAndroidXml
} from './converter';

export interface DuplicateLocation {
    fileName: string;
    key: string;
    language?: string; // For formats that support multiple languages in one file (like xcstrings)
}

export interface DuplicateResult {
    value: string;
    locations: DuplicateLocation[];
}

export function findDuplicates(files: LanguageFile[]): DuplicateResult[] {
    const valueMap = new Map<string, DuplicateLocation[]>();

    for (const file of files) {
        try {
            if (file.name.endsWith('.xcstrings')) {
                processXcStrings(file, valueMap);
            } else {
                let parsed: ParsedStrings = {};
                if (file.name.endsWith('.strings')) {
                    parsed = parseStringsFile(file.content);
                } else if (file.name.endsWith('.stringsdict')) {
                    parsed = parseStringsDictFile(file.content);
                } else if (file.name.endsWith('.json')) {
                    parsed = parseJson(file.content);
                } else if (file.name.endsWith('.xml')) {
                    parsed = parseAndroidXml(file.content);
                }

                processParsedStrings(file.name, parsed, valueMap);
            }
        } catch (e) {
            console.error(`Error parsing file ${file.name} for duplicate checking`, e);
            // Optionally we could track errors to show to user, but for now we skip invalid files
        }
    }

    const duplicates: DuplicateResult[] = [];
    for (const [value, locations] of valueMap.entries()) {
        if (locations.length > 1) {
            duplicates.push({ value, locations });
        }
    }

    // Sort by number of duplicates (descending)
    return duplicates.sort((a, b) => b.locations.length - a.locations.length);
}

function processTopLevelValue(value: any, fileName: string, key: string, valueMap: Map<string, DuplicateLocation[]>, language?: string) {
    if (typeof value === 'string') {
        addValue(value, fileName, key, valueMap, language);
    } else if (isPlural(value)) {
        // For plurals, we check individual variations? 
        // The requirement says "Duplicate value finder".
        // Usually we want to find identical translations.
        // Let's check each variation value.
        Object.entries(value).forEach(([pluralKey, pluralVal]) => {
            if (pluralKey === '_isPlural') return;
            // Compound key for the plural variation? Or just report the main key?
            // Reporting the main key is probably cleaner, but listing the variation is more precise.
            // Let's append the variation to the key for clarity in the UI: "key.one", "key.other"
            if (typeof pluralVal === 'string') {
                addValue(pluralVal, fileName, `${key}.${pluralKey}`, valueMap, language);
            }
        });
    }
}

function processParsedStrings(fileName: string, parsed: ParsedStrings, valueMap: Map<string, DuplicateLocation[]>) {
    for (const [key, value] of Object.entries(parsed)) {
        processTopLevelValue(value, fileName, key, valueMap);
    }
}

function processXcStrings(file: LanguageFile, valueMap: Map<string, DuplicateLocation[]>) {
    try {
        const { parsedData, languages } = parseStringCatalog(file.content);

        for (const [key, langData] of Object.entries(parsedData)) {
            for (const [lang, value] of Object.entries(langData)) {
                processTopLevelValue(value, file.name, key, valueMap, lang);
            }
        }
    } catch (e) {
        console.error("Failed to process xcstrings for duplicates", e);
    }
}

function addValue(value: string, fileName: string, key: string, valueMap: Map<string, DuplicateLocation[]>, language?: string) {
    const trimmed = value.trim();
    if (!trimmed) return; // Skip empty strings

    if (!valueMap.has(trimmed)) {
        valueMap.set(trimmed, []);
    }
    valueMap.get(trimmed)!.push({ fileName, key, language });
}
