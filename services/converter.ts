import { ParsedStrings, LanguageFile, ParsedMultiLanguageStrings, isPlural, PluralVariations, StringValue } from '../types';

/**
 * Parses the content of a .strings file into a key-value object.
 * @param content The string content of the .strings file.
 * @returns A record of string keys to their corresponding values.
 */
export function parseStringsFile(content: string): ParsedStrings {
  const strings: ParsedStrings = {};
  
  const withoutComments = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
  const regex = /"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
  
  let match;
  while ((match = regex.exec(withoutComments)) !== null) {
    const key = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    const value = match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    strings[key] = value;
  }

  if (Object.keys(strings).length === 0 && content.trim().length > 0) {
      if (!content.trim().startsWith('/*') && !content.trim().startsWith('//')) {
        console.warn("Potentially invalid .strings file format. No key-value pairs found.");
      }
  }
  
  return strings;
}

/**
 * Parses the content of a .stringsdict (XML plist) file into a key-value object for plurals.
 * @param content The XML string content of the .stringsdict file.
 * @returns A record of string keys to their corresponding plural variations.
 */
export function parseStringsDictFile(content: string): ParsedStrings {
    const strings: ParsedStrings = {};
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "application/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Invalid .stringsdict XML format.");
    }

    const topDict = xmlDoc.querySelector('plist > dict');
    if (!topDict) return strings;

    const topLevelKeys = Array.from(topDict.children).filter(el => el.tagName === 'key');

    for (const keyNode of topLevelKeys) {
        const key = keyNode.textContent?.trim();
        const dictNode = keyNode.nextElementSibling;
        if (!key || !dictNode || dictNode.tagName !== 'dict') continue;
        
        const variableKeyNode = Array.from(dictNode.children).find(el => el.tagName === 'key' && el.nextElementSibling?.tagName === 'dict' && el.textContent?.trim() !== 'NSStringLocalizedFormatKey');
        if (!variableKeyNode) continue;
        
        const pluralDict = variableKeyNode.nextElementSibling;
        if (!pluralDict || pluralDict.tagName !== 'dict') continue;

        const variations: Partial<Omit<PluralVariations, '_isPlural'>> = {};
        const pluralRuleNodes = Array.from(pluralDict.children).filter(el => el.tagName === 'key');
        
        for (const ruleNode of pluralRuleNodes) {
            const rule = ruleNode.textContent?.trim();
            const valueNode = ruleNode.nextElementSibling;
            if (!rule || !valueNode || valueNode.tagName !== 'string') continue;
            
            if (['zero', 'one', 'two', 'few', 'many', 'other'].includes(rule)) {
                variations[rule as keyof typeof variations] = valueNode.textContent || '';
            }
        }

        if (variations.other) {
            strings[key] = {
                _isPlural: true,
                ...variations,
                other: variations.other,
            };
        }
    }
    return strings;
}


/**
 * Parses multiple .strings and .stringsdict files and merges them into a single structure.
 * @param files An array of LanguageFile objects.
 * @returns An object containing the merged data, the source language, and all language codes.
 */
export function mergeAndParseStrings(files: LanguageFile[]): { parsedData: ParsedMultiLanguageStrings; sourceLanguage: string; languages: string[] } {
    if (files.length === 0) throw new Error("No files to process.");
    if (files.some(f => !f.langCode.trim())) throw new Error("One or more files is missing a language code.");

    const sourceLanguage = files[0].langCode;
    const langToFileMap = new Map<string, LanguageFile[]>();
    for (const file of files) {
        if (!langToFileMap.has(file.langCode)) langToFileMap.set(file.langCode, []);
        langToFileMap.get(file.langCode)!.push(file);
    }
    
    const languages = Array.from(langToFileMap.keys());
    const parsedFiles: { langCode: string; data: ParsedStrings }[] = [];

    for (const [langCode, langFiles] of langToFileMap.entries()) {
        const langData: ParsedStrings = {};
        for (const file of langFiles) {
            try {
                let parsedContent: ParsedStrings;
                if (file.name.endsWith('.stringsdict')) {
                    parsedContent = parseStringsDictFile(file.content);
                } else {
                    parsedContent = parseStringsFile(file.content);
                }
                Object.assign(langData, parsedContent);
            } catch(e: any) {
                throw new Error(`Error parsing file ${file.name}: ${e.message}`);
            }
        }
        parsedFiles.push({ langCode, data: langData });
    }

    const allKeys = new Set<string>();
    parsedFiles.forEach(pf => Object.keys(pf.data).forEach(key => allKeys.add(key)));

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
          if (isPlural(value)) {
            langAcc[lang] = {
              variations: {
                plural: Object.entries(value).reduce((pluralAcc, [pluralKey, pluralValue]) => {
                  if (pluralKey === '_isPlural') return pluralAcc;
                  pluralAcc[pluralKey] = { stringUnit: { state: "translated", value: pluralValue } };
                  return pluralAcc;
                }, {} as any)
              }
            };
          } else {
            langAcc[lang] = {
              stringUnit: { state: "translated", value: value },
            };
          }
          return langAcc;
        }, {} as any),
      };
      return acc;
    }, {} as any),
    version: "1.0",
  };
  
  return JSON.stringify(catalog, null, 2);
}

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c]!));
}

function generateSingleAndroidXml(data: ParsedStrings): string {
  const lines: string[] = [];
  Object.entries(data).forEach(([key, value]) => {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
    if (isPlural(value)) {
        lines.push(`    <plurals name="${sanitizedKey}">`);
        for (const [quantity, text] of Object.entries(value)) {
            if (quantity === '_isPlural') continue;
            lines.push(`        <item quantity="${quantity}">${escapeXml(text as string)}</item>`);
        }
        lines.push(`    </plurals>`);
    } else {
        lines.push(`    <string name="${sanitizedKey}">${escapeXml(value)}</string>`);
    }
  });
  
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
${lines.join('\n')}
</resources>
`;
}

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

function escapeStringsValue(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function parseStringCatalog(content: string): { parsedData: ParsedMultiLanguageStrings; languages: string[] } {
    const catalog = JSON.parse(content);
    if (!catalog.strings || typeof catalog.strings !== 'object' || !catalog.sourceLanguage) {
        throw new Error("Invalid .xcstrings file format. Missing 'strings' or 'sourceLanguage'.");
    }

    const parsedData: ParsedMultiLanguageStrings = {};
    const languageSet = new Set<string>();

    for (const key in catalog.strings) {
        const entry = catalog.strings[key];
        if (!entry.localizations || typeof entry.localizations !== 'object') continue;
        
        parsedData[key] = {};
        for (const langCode in entry.localizations) {
            languageSet.add(langCode);
            const localization = entry.localizations[langCode];
            
            if (localization.variations?.plural) {
                const pluralData: Partial<Omit<PluralVariations, '_isPlural'>> = {};
                let hasOther = false;
                for (const pluralKey in localization.variations.plural) {
                    const pluralValue = localization.variations.plural[pluralKey]?.stringUnit?.value;
                    if (pluralValue !== undefined) {
                        pluralData[pluralKey as keyof typeof pluralData] = pluralValue;
                        if(pluralKey === 'other') hasOther = true;
                    }
                }
                if (hasOther) {
                   parsedData[key][langCode] = { _isPlural: true, ...pluralData, other: pluralData.other! };
                }
            } else if (localization.stringUnit?.value) {
                parsedData[key][langCode] = localization.stringUnit.value;
            }
        }
    }
    
    if (languageSet.size === 0) {
        throw new Error("No localizations found in the string catalog.");
    }

    return { parsedData, languages: Array.from(languageSet) };
}

function generateSingleStringsFileContent(data: ParsedStrings): string {
    return Object.entries(data).map(([key, value]) => `"${key}" = "${escapeStringsValue(value as string)}";`).join('\n');
}

function generateSingleStringsDictFileContent(data: ParsedStrings): string {
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
        '<dict>'
    ];

    for (const [key, value] of Object.entries(data)) {
        if (!isPlural(value)) continue;
        lines.push(`    <key>${escapeXml(key)}</key>`);
        lines.push('    <dict>');
        lines.push('        <key>NSStringLocalizedFormatKey</key>');
        lines.push('        <string>%#@count@</string>');
        lines.push('        <key>count</key>');
        lines.push('        <dict>');
        lines.push('            <key>NSStringFormatSpecTypeKey</key>');
        lines.push('            <string>NSStringPluralRuleType</string>');
        lines.push('            <key>NSStringFormatValueTypeKey</key>');
        lines.push('            <string>d</string>');
        
        for (const [pluralKey, pluralValue] of Object.entries(value)) {
            if (pluralKey === '_isPlural') continue;
            lines.push(`            <key>${escapeXml(pluralKey)}</key>`);
            lines.push(`            <string>${escapeXml(pluralValue as string)}</string>`);
        }

        lines.push('        </dict>');
        lines.push('    </dict>');
    }
    lines.push('</dict>', '</plist>');
    return lines.join('\n');
}


export function generateAllStringsFiles(data: ParsedMultiLanguageStrings, languages: string[]): Record<string, string> {
    const allFiles: Record<string, string> = {};

    for (const lang of languages) {
        const simpleStrings: ParsedStrings = {};
        const pluralStrings: ParsedStrings = {};

        for (const key in data) {
            const value = data[key][lang];
            if (value === undefined) continue;

            if (isPlural(value)) {
                pluralStrings[key] = value;
            } else {
                simpleStrings[key] = value;
            }
        }

        if (Object.keys(simpleStrings).length > 0) {
            allFiles[`${lang}.strings`] = generateSingleStringsFileContent(simpleStrings);
        }
        if (Object.keys(pluralStrings).length > 0) {
            allFiles[`${lang}.stringsdict`] = generateSingleStringsDictFileContent(pluralStrings);
        }
    }
    return allFiles;
}