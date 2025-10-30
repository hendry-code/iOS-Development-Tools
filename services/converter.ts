import { ParsedStrings, LanguageFile, ParsedMultiLanguageStrings } from '../types';

/**
 * Parses the content of a .strings file into a key-value object.
 * @param content The string content of the .strings file.
 * @returns A record of string keys to their corresponding values.
 */
export function parseStringsFile(content: string): ParsedStrings {
  const strings: ParsedStrings = {};
  
  // Remove comments
  const withoutComments = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

  // Regex to capture key-value pairs, handles escaped quotes
  const regex = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
  
  let match;
  while ((match = regex.exec(withoutComments)) !== null) {
    const key = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    const value = match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    strings[key] = value;
  }

  if (Object.keys(strings).length === 0 && content.trim().length > 0) {
      // Don't throw for empty files, just return empty object. Throw for malformed.
      if (!content.trim().startsWith('/*') && !content.trim().startsWith('//')) {
        // Simple check if it's not just comments
        throw new Error("Invalid .strings file format. No key-value pairs found.");
      }
  }
  
  return strings;
}

/**
 * Parses multiple .strings files and merges them into a single structure.
 * @param files An array of LanguageFile objects.
 * @returns An object containing the merged data, the source language, and all language codes.
 */
export function mergeAndParseStrings(files: LanguageFile[]): { parsedData: ParsedMultiLanguageStrings; sourceLanguage: string; languages: string[] } {
    if (files.length === 0) {
        throw new Error("No files to process.");
    }
    
    if (files.some(f => !f.langCode.trim())) {
        throw new Error("One or more files is missing a language code.");
    }

    const languages = files.map(f => f.langCode);
    const sourceLanguage = files[0].langCode; // Assume first file is the source

    const parsedFiles = files.map(file => ({
        langCode: file.langCode,
        data: parseStringsFile(file.content)
    }));

    const allKeys = new Set<string>();
    parsedFiles.forEach(pf => {
        Object.keys(pf.data).forEach(key => allKeys.add(key));
    });

    const mergedData: ParsedMultiLanguageStrings = {};
    for (const key of allKeys) {
        mergedData[key] = {};
        for (const pf of parsedFiles) {
            if (pf.data[key] !== undefined) {
                mergedData[key][pf.langCode] = pf.data[key];
            }
        }
    }

    return { parsedData: mergedData, sourceLanguage, languages };
}


/**
 * Generates an iOS String Catalog (.xcstrings) JSON string from multi-language data.
 * @param data The parsed multi-language key-value data.
 * @param sourceLanguage The source language code (e.g., "en").
 * @returns A formatted JSON string.
 */
export function generateIosStringCatalog(data: ParsedMultiLanguageStrings, sourceLanguage: string): string {
  const catalog = {
    sourceLanguage: sourceLanguage,
    strings: Object.entries(data).reduce((acc, [key, localizations]) => {
      acc[key] = {
        extractionState: "manual",
        localizations: Object.entries(localizations).reduce((langAcc, [lang, value]) => {
          langAcc[lang] = {
            stringUnit: {
              state: "translated",
              value: value,
            },
          };
          return langAcc;
        }, {} as any),
      };
      return acc;
    }, {} as any),
    version: "1.0",
  };
  
  return JSON.stringify(catalog, null, 2);
}

/**
 * Escapes characters for XML.
 * @param str The string to escape.
 * @returns The escaped string.
 */
function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Generates an Android strings.xml file content for a single language.
 * @param data The parsed key-value data for one language.
 * @returns A formatted XML string.
 */
function generateSingleAndroidXml(data: ParsedStrings): string {
  const strings = Object.entries(data).map(([key, value]) => {
    // Android resource names must be valid Java identifiers
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    return `    <string name="${sanitizedKey}">${escapeXml(value)}</string>`;
  });
  
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
${strings.join('\n')}
</resources>
`;
}


/**
 * Generates a set of Android strings.xml file contents from multi-language data.
 * @param data The parsed multi-language key-value data.
 * @param languages An array of all language codes present in the data.
 * @returns A record mapping language codes to their corresponding XML string.
 */
export function generateAllAndroidXml(data: ParsedMultiLanguageStrings, languages: string[]): Record<string, string> {
    const allXmls: Record<string, string> = {};

    for (const lang of languages) {
        const langSpecificStrings: ParsedStrings = {};
        for (const key in data) {
            if (data[key][lang] !== undefined) {
                langSpecificStrings[key] = data[key][lang];
            }
        }
        if (Object.keys(langSpecificStrings).length > 0) {
            allXmls[lang] = generateSingleAndroidXml(langSpecificStrings);
        }
    }
    return allXmls;
}

// --- NEW FUNCTIONS for Catalog to Strings ---

/**
 * Escapes characters for a .strings file value.
 * Specifically handles double quotes and newlines.
 * @param str The string to escape.
 * @returns The escaped string.
 */
function escapeStringsValue(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Parses the content of a .xcstrings (JSON) file into a standardized multi-language format.
 * @param content The JSON string content of the .xcstrings file.
 * @returns An object containing the parsed data and all found language codes.
 */
export function parseStringCatalog(content: string): { parsedData: ParsedMultiLanguageStrings; languages: string[] } {
    const catalog = JSON.parse(content);
    if (!catalog.strings || typeof catalog.strings !== 'object' || !catalog.sourceLanguage) {
        throw new Error("Invalid .xcstrings file format. Missing 'strings' or 'sourceLanguage'.");
    }

    const parsedData: ParsedMultiLanguageStrings = {};
    const languageSet = new Set<string>();

    for (const key in catalog.strings) {
        const entry = catalog.strings[key];
        if (entry.localizations && typeof entry.localizations === 'object') {
            parsedData[key] = {};
            for (const langCode in entry.localizations) {
                const localization = entry.localizations[langCode];
                if (localization.stringUnit?.value) {
                    parsedData[key][langCode] = localization.stringUnit.value;
                    languageSet.add(langCode);
                }
            }
        }
    }
    
    if (languageSet.size === 0) {
        throw new Error("No localizations found in the string catalog.");
    }

    return { parsedData, languages: Array.from(languageSet) };
}

/**
 * Generates the content for a single .strings file from key-value data.
 * @param data The parsed key-value data for one language.
 * @returns A formatted .strings file content string.
 */
function generateSingleStringsFileContent(data: ParsedStrings): string {
    const lines = Object.entries(data).map(([key, value]) => {
        return `"${key}" = "${escapeStringsValue(value)}";`;
    });
    return lines.join('\n');
}

/**
 * Generates a set of .strings file contents from multi-language data.
 * @param data The parsed multi-language key-value data.
 * @param languages An array of all language codes to generate files for.
 * @returns A record mapping language codes to their corresponding .strings file content.
 */
export function generateAllStringsFiles(data: ParsedMultiLanguageStrings, languages: string[]): Record<string, string> {
    const allStringsFiles: Record<string, string> = {};

    for (const lang of languages) {
        const langSpecificStrings: ParsedStrings = {};
        for (const key in data) {
            if (data[key][lang] !== undefined) {
                langSpecificStrings[key] = data[key][lang];
            }
        }
        if (Object.keys(langSpecificStrings).length > 0) {
            allStringsFiles[lang] = generateSingleStringsFileContent(langSpecificStrings);
        }
    }
    return allStringsFiles;
}