import yaml from 'js-yaml';
import { js2xml } from 'xml-js';
import { Parser } from 'json2csv';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    line?: number;
}

export const formatJson = (json: string, space: number): string => {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, space);
    } catch (e) {
        throw new Error('Invalid JSON');
    }
};

export const minifyJson = (json: string): string => {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed);
    } catch (e) {
        throw new Error('Invalid JSON');
    }
};

export const validateJson = (json: string): ValidationResult => {
    try {
        JSON.parse(json);
        return { isValid: true };
    } catch (e: any) {
        // Try to extract line number from error message if possible
        // Standard JSON.parse error usually format: "Unexpected token ... at position X"
        // We might need a better parser for line numbers, but for now let's rely on message.
        // Some browsers/environments give line number in stack or message.
        return { isValid: false, error: e.message };
    }
};

export const jsonToXml = (json: string): string => {
    try {
        const parsed = JSON.parse(json);
        return js2xml(parsed, { compact: true, spaces: 4 });
    } catch (e: any) {
        throw new Error('Conversion to XML failed: ' + e.message);
    }
};

export const jsonToYaml = (json: string): string => {
    try {
        const parsed = JSON.parse(json);
        return yaml.dump(parsed);
    } catch (e: any) {
        throw new Error('Conversion to YAML failed: ' + e.message);
    }
};

export const jsonToCsv = (json: string): string => {
    try {
        const parsed = JSON.parse(json);
        const parser = new Parser();
        return parser.parse(parsed);
    } catch (e: any) {
        throw new Error('Conversion to CSV failed: ' + e.message);
    }
};
