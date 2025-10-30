export type ParsedStrings = Record<string, string>;

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
 * E.g., { "welcome_title": { "en": "Welcome", "es": "Bienvenido" } }
 */
export type ParsedMultiLanguageStrings = Record<string, Record<string, string>>;

export type ConversionMode = 'stringsToCatalog' | 'catalogToStrings';

export type ViewMode = 'dashboard' | 'combine' | 'extract' | 'translator';