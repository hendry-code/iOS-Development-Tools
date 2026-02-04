
export interface PluralVariations {
    _isPlural: true;
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
}

export type StringValue = string | PluralVariations;

export function isPlural(value: StringValue): value is PluralVariations {
    return typeof value === 'object' && value !== null && '_isPlural' in value && value._isPlural === true;
}

export type ParsedStrings = Record<string, StringValue>;

export enum OutputFormat {
    IOS = 'iOS String Catalog',
    ANDROID = 'Android XML',
}

export interface LanguageFile {
    name: string;
    content: string;
    langCode: string;
}

/**
 * A structure to hold all translations for all keys.
 * E.g., { "welcome_title": { "en": "Welcome" }, "apples_count": { "en": { "one": "1 apple", "other": "%d apples" } } }
 */
export type ParsedMultiLanguageStrings = Record<string, Record<string, StringValue>>;

export type ConversionMode = 'stringsToCatalog' | 'catalogToStrings';

export type ViewMode = 'dashboard' | 'combine' | 'extract' | 'properties' | 'editor' | 'renamer' | 'merge' | 'merge-catalogs' | 'wordcount' | 'analyser' | 'json-converter' | 'xml-converter' | 'json-formatter' | 'json-to-swift' | 'duplicate-finder' | 'script-runner' | 'mock-data' | 'app-icon-generator' | 'color-converter' | 'encoding-tool' | 'screenshot-generator';
