import yaml from 'js-yaml';
import { js2xml } from 'xml-js';
import { Parser } from 'json2csv';
import jmespath from 'jmespath';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    line?: number;
}

/**
 * Escapes a JSON object to a JSON string literal.
 * e.g., { "key": "value" } -> "{ \"key\": \"value\" }"
 */
export const escapeJson = (json: string): string => {
    try {
        // First, parse to ensure it's valid JSON, then stringify it as a string.
        const parsed = JSON.parse(json);
        // We re-stringify it pretty-printed, then escape the result.
        const pretty = JSON.stringify(parsed, null, 2);
        return JSON.stringify(pretty);
    } catch (e: any) {
        throw new Error('Escape failed: Input is not valid JSON');
    }
};

/**
 * Unescapes a JSON string literal to a JSON object.
 * e.g., "{ \"key\": \"value\" }" -> { "key": "value" }
 */
export const unescapeJson = (json: string): string => {
    try {
        // The input should be a JSON string (e.g., starts and ends with quotes).
        const unescaped = JSON.parse(json);
        // If the result is a string, it might be a double-escaped JSON.
        if (typeof unescaped === 'string') {
            // Try to parse it again in case it's double-escaped JSON.
            try {
                const parsed = JSON.parse(unescaped);
                return JSON.stringify(parsed, null, 2);
            } catch {
                // It's just a regular string, return it as is.
                return unescaped;
            }
        }
        // If it was an object/array, just pretty print it.
        return JSON.stringify(unescaped, null, 2);
    } catch (e: any) {
        throw new Error('Unescape failed: ' + e.message);
    }
};

/**
 * Queries a JSON object using a JMESPath expression.
 */
export const queryJson = (json: string, query: string): string => {
    try {
        const parsed = JSON.parse(json);
        const result = jmespath.search(parsed, query);
        return JSON.stringify(result, null, 2);
    } catch (e: any) {
        throw new Error('Query failed: ' + e.message);
    }
};

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
