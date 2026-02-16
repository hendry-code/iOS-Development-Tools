import { faker } from '@faker-js/faker';
import * as yaml from 'js-yaml';

// ─── Types ───────────────────────────────────────────────────────────────────

export type MockDataType =
    | 'uuid' | 'name' | 'email' | 'phone' | 'address' | 'city'
    | 'country' | 'company' | 'jobTitle' | 'date' | 'amount'
    | 'image' | 'boolean' | 'integer' | 'lorem' | 'object' | 'array'
    // New types
    | 'firstName' | 'lastName' | 'username' | 'password' | 'avatar'
    | 'latitude' | 'longitude' | 'zipCode' | 'color' | 'url'
    | 'domain' | 'paragraph' | 'customList' | 'float';

export type OutputFormatType = 'json' | 'csv' | 'yaml' | 'xml' | 'swift' | 'sql';

export interface SchemaField {
    id: string;
    name: string;
    type: MockDataType;
    children?: SchemaField[];
    isArray?: boolean;
    arrayCount?: number;
    // Constraints
    min?: number;
    max?: number;
    precision?: number;        // decimal places for float
    nullablePercent?: number;   // 0-100, chance of null
    isUnique?: boolean;
    customValues?: string[];    // for 'customList' type
    dateFrom?: string;          // ISO date string
    dateTo?: string;            // ISO date string
    maxLength?: number;         // for string types
}

// ─── Available Types ─────────────────────────────────────────────────────────

export const AVAILABLE_TYPES: { type: MockDataType; label: string; group: string }[] = [
    // Person
    { type: 'name', label: 'Full Name', group: 'Person' },
    { type: 'firstName', label: 'First Name', group: 'Person' },
    { type: 'lastName', label: 'Last Name', group: 'Person' },
    { type: 'email', label: 'Email Address', group: 'Person' },
    { type: 'phone', label: 'Phone Number', group: 'Person' },
    { type: 'username', label: 'Username', group: 'Person' },
    { type: 'password', label: 'Password', group: 'Person' },
    { type: 'avatar', label: 'Avatar URL', group: 'Person' },
    { type: 'jobTitle', label: 'Job Title', group: 'Person' },

    // Location
    { type: 'address', label: 'Street Address', group: 'Location' },
    { type: 'city', label: 'City', group: 'Location' },
    { type: 'country', label: 'Country', group: 'Location' },
    { type: 'zipCode', label: 'Zip Code', group: 'Location' },
    { type: 'latitude', label: 'Latitude', group: 'Location' },
    { type: 'longitude', label: 'Longitude', group: 'Location' },

    // Internet
    { type: 'url', label: 'URL', group: 'Internet' },
    { type: 'domain', label: 'Domain Name', group: 'Internet' },
    { type: 'image', label: 'Image URL', group: 'Internet' },
    { type: 'color', label: 'Hex Color', group: 'Internet' },

    // Text
    { type: 'lorem', label: 'Sentence', group: 'Text' },
    { type: 'paragraph', label: 'Paragraph', group: 'Text' },
    { type: 'company', label: 'Company Name', group: 'Text' },

    // Identifiers
    { type: 'uuid', label: 'UUID', group: 'Identifiers' },

    // Number
    { type: 'integer', label: 'Integer', group: 'Number' },
    { type: 'float', label: 'Float / Decimal', group: 'Number' },
    { type: 'amount', label: 'Price / Amount', group: 'Number' },

    // Date
    { type: 'date', label: 'Date (ISO)', group: 'Date' },

    // Boolean
    { type: 'boolean', label: 'Boolean', group: 'Boolean' },

    // Custom
    { type: 'customList', label: 'Enum / Custom List', group: 'Custom' },

    // Structure
    { type: 'object', label: 'Dictionary / Object', group: 'Structure' },
    { type: 'array', label: 'List / Array (of Objects)', group: 'Structure' },
];

// ─── Value Generation ────────────────────────────────────────────────────────

const generateRawValue = (field: SchemaField): any => {
    switch (field.type) {
        case 'uuid': return faker.string.uuid();
        case 'name': return faker.person.fullName();
        case 'firstName': return faker.person.firstName();
        case 'lastName': return faker.person.lastName();
        case 'email': return faker.internet.email();
        case 'phone': return faker.phone.number();
        case 'username': return faker.internet.username();
        case 'password': return faker.string.alphanumeric(12);
        case 'avatar': return faker.image.avatar();
        case 'address': return faker.location.streetAddress();
        case 'city': return faker.location.city();
        case 'country': return faker.location.country();
        case 'zipCode': return faker.location.zipCode();
        case 'latitude': return faker.location.latitude();
        case 'longitude': return faker.location.longitude();
        case 'company': return faker.company.name();
        case 'jobTitle': return faker.person.jobTitle();
        case 'url': return faker.internet.url();
        case 'domain': return faker.internet.domainName();
        case 'color': return faker.color.rgb();
        case 'image': return faker.image.url();
        case 'boolean': return faker.datatype.boolean();

        case 'integer': {
            const min = field.min ?? 0;
            const max = field.max ?? 100;
            return faker.number.int({ min, max });
        }
        case 'float': {
            const min = field.min ?? 0;
            const max = field.max ?? 100;
            const fractionDigits = field.precision ?? 2;
            return faker.number.float({ min, max, fractionDigits });
        }
        case 'amount': {
            const min = field.min ?? 1;
            const max = field.max ?? 1000;
            return parseFloat(faker.commerce.price({ min, max }));
        }

        case 'date': {
            if (field.dateFrom || field.dateTo) {
                const from = field.dateFrom ? new Date(field.dateFrom) : new Date('2020-01-01');
                const to = field.dateTo ? new Date(field.dateTo) : new Date();
                return faker.date.between({ from, to }).toISOString();
            }
            return faker.date.past().toISOString();
        }

        case 'lorem': {
            const sentence = faker.lorem.sentence();
            if (field.maxLength && sentence.length > field.maxLength) {
                return sentence.substring(0, field.maxLength);
            }
            return sentence;
        }
        case 'paragraph': {
            const para = faker.lorem.paragraph();
            if (field.maxLength && para.length > field.maxLength) {
                return para.substring(0, field.maxLength);
            }
            return para;
        }

        case 'customList': {
            const values = field.customValues && field.customValues.length > 0
                ? field.customValues
                : ['option_a', 'option_b', 'option_c'];
            return faker.helpers.arrayElement(values);
        }

        case 'object':
            if (field.children) {
                return generateItem(field.children);
            }
            return {};

        case 'array':
            if (field.children) {
                const count = field.arrayCount || 3;
                return Array.from({ length: count }).map(() => generateItem(field.children!));
            }
            return [];

        default: return null;
    }
};

const generateValue = (field: SchemaField): any => {
    // Nullable check
    if (field.nullablePercent && field.nullablePercent > 0) {
        if (faker.number.int({ min: 1, max: 100 }) <= field.nullablePercent) {
            return null;
        }
    }
    return generateRawValue(field);
};

const generateItem = (schema: SchemaField[]): Record<string, any> => {
    const item: Record<string, any> = {};
    schema.forEach(field => {
        if (field.isArray) {
            const count = field.arrayCount || 3;
            item[field.name] = Array.from({ length: count }).map(() => generateValue(field));
        } else {
            item[field.name] = generateValue(field);
        }
    });
    return item;
};

// ─── Unique enforcement (post-processing) ────────────────────────────────────

const enforceUnique = (data: Record<string, any>[], schema: SchemaField[]): void => {
    const uniqueFields = schema.filter(f => f.isUnique && f.type !== 'object' && f.type !== 'array');
    for (const field of uniqueFields) {
        const seen = new Set<any>();
        for (let i = 0; i < data.length; i++) {
            let val = data[i][field.name];
            let attempts = 0;
            while (seen.has(val) && attempts < 50) {
                val = generateRawValue(field);
                attempts++;
            }
            data[i][field.name] = val;
            seen.add(val);
        }
    }
};

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

const getFlattenedHeaders = (schema: SchemaField[], prefix = ''): string[] => {
    let headers: string[] = [];
    schema.forEach(field => {
        const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
        if (field.isArray || field.type === 'array') {
            headers.push(fieldName);
        } else if (field.type === 'object' && field.children) {
            headers = [...headers, ...getFlattenedHeaders(field.children, fieldName)];
        } else {
            headers.push(fieldName);
        }
    });
    return headers;
};

const getFlattenedRow = (item: any, schema: SchemaField[]): any[] => {
    let row: any[] = [];
    schema.forEach(field => {
        if (field.isArray || field.type === 'array') {
            row.push(JSON.stringify(item[field.name]));
        } else if (field.type === 'object' && field.children) {
            row = [...row, ...getFlattenedRow(item[field.name], field.children)];
        } else {
            row.push(item[field.name]);
        }
    });
    return row;
};

// ─── Format Renderers ────────────────────────────────────────────────────────

const renderAsCSV = (data: Record<string, any>[], schema: SchemaField[]): string => {
    if (data.length === 0) return '';
    const headers = getFlattenedHeaders(schema);
    const rows = data.map(item => {
        const flatRow = getFlattenedRow(item, schema);
        return flatRow.map(val => {
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            if (val === null || val === undefined) return '';
            if (typeof val === 'object' && val !== null) return JSON.stringify(val);
            return val;
        }).join(',');
    });
    return [headers.join(','), ...rows].join('\n');
};

const renderAsYAML = (data: Record<string, any>[]): string => {
    return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
};

const renderAsXML = (data: Record<string, any>[]): string => {
    const escapeXml = (s: string): string =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    const valueToXml = (value: any, indent: string): string => {
        if (value === null || value === undefined) return `${indent}<string></string>`;
        if (typeof value === 'boolean') return `${indent}<${value ? 'true' : 'false'}/>`;
        if (typeof value === 'number') {
            return Number.isInteger(value)
                ? `${indent}<integer>${value}</integer>`
                : `${indent}<real>${value}</real>`;
        }
        if (typeof value === 'string') return `${indent}<string>${escapeXml(value)}</string>`;
        if (Array.isArray(value)) {
            const items = value.map(v => valueToXml(v, indent + '    ')).join('\n');
            return `${indent}<array>\n${items}\n${indent}</array>`;
        }
        if (typeof value === 'object') {
            const entries = Object.entries(value).map(([k, v]) =>
                `${indent}    <key>${escapeXml(k)}</key>\n${valueToXml(v, indent + '    ')}`
            ).join('\n');
            return `${indent}<dict>\n${entries}\n${indent}</dict>`;
        }
        return `${indent}<string>${String(value)}</string>`;
    };

    const items = data.map(item => valueToXml(item, '    ')).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<array>\n${items}\n</array>\n</plist>`;
};

const swiftTypeName = (field: SchemaField): string => {
    let base: string;
    switch (field.type) {
        case 'uuid': base = 'String'; break;
        case 'name': case 'firstName': case 'lastName': case 'email': case 'phone':
        case 'username': case 'password': case 'avatar': case 'address': case 'city':
        case 'country': case 'zipCode': case 'company': case 'jobTitle': case 'url':
        case 'domain': case 'color': case 'image': case 'lorem': case 'paragraph':
        case 'customList': case 'date':
            base = 'String'; break;
        case 'latitude': case 'longitude': case 'float': case 'amount':
            base = 'Double'; break;
        case 'integer': base = 'Int'; break;
        case 'boolean': base = 'Bool'; break;
        case 'object':
            base = capitalize(field.name); break;
        case 'array':
            if (field.children && field.children.length > 0) {
                base = `[${capitalize(field.name)}Item]`;
            } else {
                base = '[Any]';
            }
            break;
        default: base = 'String';
    }

    if (field.isArray && field.type !== 'array') {
        base = `[${base}]`;
    }

    if (field.nullablePercent && field.nullablePercent > 0) {
        base += '?';
    }

    return base;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const generateSwiftStruct = (schema: SchemaField[], structName: string = 'MockItem'): string => {
    const structs: string[] = [];

    const buildStruct = (fields: SchemaField[], name: string) => {
        const lines: string[] = [];
        lines.push(`struct ${name}: Codable {`);
        for (const field of fields) {
            const typeName = swiftTypeName(field);
            lines.push(`    let ${field.name}: ${typeName}`);

            // If object or array with children, generate nested struct
            if (field.type === 'object' && field.children && field.children.length > 0) {
                buildStruct(field.children, capitalize(field.name));
            }
            if (field.type === 'array' && field.children && field.children.length > 0) {
                buildStruct(field.children, capitalize(field.name) + 'Item');
            }
        }
        lines.push('}');
        structs.push(lines.join('\n'));
    };

    buildStruct(schema, structName);
    return structs.join('\n\n');
};

const renderAsSwift = (data: Record<string, any>[], schema: SchemaField[]): string => {
    const structCode = generateSwiftStruct(schema);
    const jsonString = JSON.stringify(data, null, 2);

    return `import Foundation

// MARK: - Model

${structCode}

// MARK: - Sample JSON Data

let sampleJSON = """
${jsonString}
"""

// MARK: - Decoding Example

let jsonData = Data(sampleJSON.utf8)
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601

do {
    let items = try decoder.decode([MockItem].self, from: jsonData)
    print("Decoded \\(items.count) items")
} catch {
    print("Decoding error: \\(error)")
}
`;
};

const escapeSQL = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') return `'${String(JSON.stringify(val)).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
};

const renderAsSQL = (data: Record<string, any>[], schema: SchemaField[], tableName: string = 'mock_data'): string => {
    if (data.length === 0) return '';

    const headers = getFlattenedHeaders(schema);

    // CREATE TABLE
    const colDefs = headers.map(h => {
        const field = findFieldByPath(schema, h);
        let sqlType = 'TEXT';
        if (field) {
            switch (field.type) {
                case 'integer': sqlType = 'INTEGER'; break;
                case 'float': case 'amount': case 'latitude': case 'longitude': sqlType = 'REAL'; break;
                case 'boolean': sqlType = 'INTEGER'; break;
                default: sqlType = 'TEXT';
            }
        }
        return `    "${h}" ${sqlType}`;
    });

    const createTable = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs.join(',\n')}\n);`;

    // INSERT statements
    const inserts = data.map(item => {
        const flatRow = getFlattenedRow(item, schema);
        const values = flatRow.map(v => escapeSQL(v)).join(', ');
        return `INSERT INTO "${tableName}" (${headers.map(h => `"${h}"`).join(', ')}) VALUES (${values});`;
    });

    return `${createTable}\n\n${inserts.join('\n')}`;
};

const findFieldByPath = (schema: SchemaField[], path: string): SchemaField | null => {
    const parts = path.split('.');
    let currentFields = schema;
    for (let i = 0; i < parts.length; i++) {
        const field = currentFields.find(f => f.name === parts[i]);
        if (!field) return null;
        if (i === parts.length - 1) return field;
        if (field.children) {
            currentFields = field.children;
        } else {
            return null;
        }
    }
    return null;
};

// ─── Main Export ─────────────────────────────────────────────────────────────

export const generateMockData = (
    schema: SchemaField[],
    count: number,
    format: OutputFormatType,
    seed?: number
): string => {
    if (seed !== undefined && seed !== null) {
        faker.seed(seed);
    } else {
        faker.seed();
    }

    const data = Array.from({ length: count }).map(() => generateItem(schema));

    // Enforce unique constraints
    enforceUnique(data, schema);

    switch (format) {
        case 'json':
            return JSON.stringify(data, null, 2);
        case 'csv':
            return renderAsCSV(data, schema);
        case 'yaml':
            return renderAsYAML(data);
        case 'xml':
            return renderAsXML(data);
        case 'swift':
            return renderAsSwift(data, schema);
        case 'sql':
            return renderAsSQL(data, schema);
        default:
            return JSON.stringify(data, null, 2);
    }
};
