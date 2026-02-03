/**
 * Encoding Service
 * Provides utilities for Base64, URL, HTML entity, and JWT encoding/decoding
 */

// ========== BASE64 ==========

/**
 * Encode a string to Base64
 */
export function base64Encode(text: string): string {
    try {
        // Handle Unicode characters properly
        const bytes = new TextEncoder().encode(text);
        const binary = String.fromCharCode(...bytes);
        return btoa(binary);
    } catch (error) {
        throw new Error('Failed to encode to Base64');
    }
}

/**
 * Decode a Base64 string
 */
export function base64Decode(encoded: string): string {
    try {
        const binary = atob(encoded);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch (error) {
        throw new Error('Invalid Base64 string');
    }
}

// ========== URL ENCODING ==========

/**
 * URL encode a string (encodeURIComponent)
 */
export function urlEncode(text: string): string {
    try {
        return encodeURIComponent(text);
    } catch (error) {
        throw new Error('Failed to URL encode');
    }
}

/**
 * URL decode a string (decodeURIComponent)
 */
export function urlDecode(encoded: string): string {
    try {
        return decodeURIComponent(encoded);
    } catch (error) {
        throw new Error('Invalid URL encoded string');
    }
}

/**
 * Encode entire URL (encodeURI - preserves URL structure)
 */
export function urlEncodeURI(text: string): string {
    try {
        return encodeURI(text);
    } catch (error) {
        throw new Error('Failed to encode URI');
    }
}

/**
 * Decode entire URL (decodeURI)
 */
export function urlDecodeURI(encoded: string): string {
    try {
        return decodeURI(encoded);
    } catch (error) {
        throw new Error('Invalid URI string');
    }
}

// ========== HTML ENTITIES ==========

const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
};

const REVERSE_HTML_ENTITIES: Record<string, string> = Object.fromEntries(
    Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k])
);

/**
 * Encode special characters as HTML entities
 */
export function htmlEncode(text: string): string {
    return text.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Decode HTML entities back to characters
 */
export function htmlDecode(encoded: string): string {
    // Handle named entities
    let result = encoded;
    for (const [entity, char] of Object.entries(REVERSE_HTML_ENTITIES)) {
        result = result.replace(new RegExp(entity, 'g'), char);
    }

    // Handle numeric entities (&#123; or &#x1A;)
    result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    return result;
}

// ========== JWT DECODING ==========

export interface JWTDecoded {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
    signature: string;
    isExpired: boolean;
    expiresAt?: Date;
    issuedAt?: Date;
}

/**
 * Decode a JWT token (without verification)
 * Note: This does NOT verify the signature - for inspection only
 */
export function jwtDecode(token: string): JWTDecoded {
    const parts = token.trim().split('.');

    if (parts.length !== 3) {
        throw new Error('Invalid JWT format: expected 3 parts separated by dots');
    }

    try {
        // Decode header
        const headerJson = base64UrlDecode(parts[0]);
        const header = JSON.parse(headerJson);

        // Decode payload
        const payloadJson = base64UrlDecode(parts[1]);
        const payload = JSON.parse(payloadJson);

        // Extract timing info
        let isExpired = false;
        let expiresAt: Date | undefined;
        let issuedAt: Date | undefined;

        if (typeof payload.exp === 'number') {
            expiresAt = new Date(payload.exp * 1000);
            isExpired = expiresAt < new Date();
        }

        if (typeof payload.iat === 'number') {
            issuedAt = new Date(payload.iat * 1000);
        }

        return {
            header,
            payload,
            signature: parts[2],
            isExpired,
            expiresAt,
            issuedAt,
        };
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid')) {
            throw error;
        }
        throw new Error('Failed to decode JWT: invalid token structure');
    }
}

/**
 * Decode Base64URL (JWT uses a URL-safe variant of Base64)
 */
function base64UrlDecode(str: string): string {
    // Convert Base64URL to standard Base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
        base64 += '='.repeat(4 - padding);
    }

    return base64Decode(base64);
}

// ========== UNICODE UTILITIES ==========

/**
 * Escape non-ASCII characters to Unicode escape sequences
 */
export function unicodeEscape(text: string): string {
    return text.replace(/[^\x00-\x7F]/g, (char) => {
        return '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0');
    });
}

/**
 * Unescape Unicode sequences back to characters
 */
export function unicodeUnescape(text: string): string {
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });
}

// ========== HEX ENCODING ==========

/**
 * Encode string to hexadecimal
 */
export function hexEncode(text: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Decode hexadecimal string
 */
export function hexDecode(hex: string): string {
    // Remove spaces and validate
    const cleaned = hex.replace(/\s/g, '');
    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
        throw new Error('Invalid hexadecimal string');
    }
    if (cleaned.length % 2 !== 0) {
        throw new Error('Hex string must have even length');
    }

    const bytes = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) {
        bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
    }

    return new TextDecoder().decode(bytes);
}

// ========== ENCODING MODES ==========

export type EncodingMode = 'base64' | 'url' | 'html' | 'jwt' | 'hex' | 'unicode';

export interface EncodingResult {
    success: boolean;
    result: string;
    error?: string;
}

/**
 * Unified encode function
 */
export function encode(text: string, mode: EncodingMode): EncodingResult {
    try {
        let result: string;
        switch (mode) {
            case 'base64':
                result = base64Encode(text);
                break;
            case 'url':
                result = urlEncode(text);
                break;
            case 'html':
                result = htmlEncode(text);
                break;
            case 'hex':
                result = hexEncode(text);
                break;
            case 'unicode':
                result = unicodeEscape(text);
                break;
            default:
                throw new Error(`Encoding not supported for mode: ${mode}`);
        }
        return { success: true, result };
    } catch (error) {
        return { success: false, result: '', error: error instanceof Error ? error.message : 'Encoding failed' };
    }
}

/**
 * Unified decode function
 */
export function decode(text: string, mode: EncodingMode): EncodingResult {
    try {
        let result: string;
        switch (mode) {
            case 'base64':
                result = base64Decode(text);
                break;
            case 'url':
                result = urlDecode(text);
                break;
            case 'html':
                result = htmlDecode(text);
                break;
            case 'hex':
                result = hexDecode(text);
                break;
            case 'unicode':
                result = unicodeUnescape(text);
                break;
            case 'jwt':
                const decoded = jwtDecode(text);
                result = JSON.stringify({ header: decoded.header, payload: decoded.payload }, null, 2);
                break;
            default:
                throw new Error(`Decoding not supported for mode: ${mode}`);
        }
        return { success: true, result };
    } catch (error) {
        return { success: false, result: '', error: error instanceof Error ? error.message : 'Decoding failed' };
    }
}
