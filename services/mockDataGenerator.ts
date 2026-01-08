import { faker } from '@faker-js/faker';

export type MockDataType =
    | 'uuid'
    | 'name'
    | 'email'
    | 'phone'
    | 'address'
    | 'city'
    | 'country'
    | 'company'
    | 'jobTitle'
    | 'date'
    | 'amount'
    | 'image'
    | 'boolean'
    | 'integer'
    | 'lorem'
    | 'object'
    | 'array';

export interface SchemaField {
    id: string;
    name: string;
    type: MockDataType;
    children?: SchemaField[];
    isArray?: boolean;
    arrayCount?: number;
}

export const AVAILABLE_TYPES: { type: MockDataType; label: string; group: string }[] = [
    // String Types
    { type: 'uuid', label: 'UUID', group: 'String' },
    { type: 'name', label: 'Full Name', group: 'String' },
    { type: 'email', label: 'Email Address', group: 'String' },
    { type: 'phone', label: 'Phone Number', group: 'String' },
    { type: 'jobTitle', label: 'Job Title', group: 'String' },
    { type: 'address', label: 'Street Address', group: 'String' },
    { type: 'city', label: 'City', group: 'String' },
    { type: 'country', label: 'Country', group: 'String' },
    { type: 'company', label: 'Company Name', group: 'String' },
    { type: 'date', label: 'Date (ISO)', group: 'String' },
    { type: 'image', label: 'Image URL', group: 'String' },
    { type: 'lorem', label: 'Lorem Ipsum', group: 'String' },

    // Number Types
    { type: 'amount', label: 'Price / Amount', group: 'Number' },
    { type: 'integer', label: 'Integer (0-100)', group: 'Number' },

    // Boolean Types
    { type: 'boolean', label: 'Boolean', group: 'Boolean' },

    // Object Types
    { type: 'object', label: 'Dictionary / Object', group: 'Object' },

    // Array Types
    { type: 'array', label: 'List / Array (of Objects)', group: 'Array' },
];

const generateValue = (field: SchemaField): any => {
    switch (field.type) {
        case 'uuid': return faker.string.uuid();
        case 'name': return faker.person.fullName();
        case 'email': return faker.internet.email();
        case 'phone': return faker.phone.number();
        case 'address': return faker.location.streetAddress();
        case 'city': return faker.location.city();
        case 'country': return faker.location.country();
        case 'company': return faker.company.name();
        case 'jobTitle': return faker.person.jobTitle();
        case 'date': return faker.date.past().toISOString();
        case 'amount': return parseFloat(faker.commerce.price());
        case 'image': return faker.image.url();
        case 'boolean': return faker.datatype.boolean();
        case 'integer': return faker.number.int({ min: 0, max: 100 });
        case 'lorem': return faker.lorem.sentence();
        case 'object':
            if (field.children) {
                return generateItem(field.children);
            } else {
                return {};
            }
        case 'array':
            if (field.children) {
                const count = field.arrayCount || 3;
                return Array.from({ length: count }).map(() => generateItem(field.children!));
            } else {
                return [];
            }
        default: return null;
    }
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

// Flatten schema for CSV headers (e.g., "user.name", "user.address.city")
const getFlattenedHeaders = (schema: SchemaField[], prefix = ''): string[] => {
    let headers: string[] = [];
    schema.forEach(field => {
        const fieldName = prefix ? `${prefix}.${field.name}` : field.name;
        // If array, we stop flattening and just output the array column
        if (field.isArray || field.type === 'array') {
            headers.push(fieldName);
        } else if (field.type === 'object' && field.children) {
            headers = [...headers, ...getFlattenedHeaders(field.children, fieldName)];
        } else {
            headers.push(fieldName);
        }
    });
    return headers;
}

const getFlattenedRow = (item: any, schema: SchemaField[]): any[] => {
    let row: any[] = [];
    schema.forEach(field => {
        // If it's an array, we can't flatten it easily into a single row structure that matches the header
        // So we stringify it.
        // Also handle explicit 'array' type same as isArray=true
        if (field.isArray || field.type === 'array') {
            row.push(JSON.stringify(item[field.name]));
        } else if (field.type === 'object' && field.children) {
            row = [...row, ...getFlattenedRow(item[field.name], field.children)];
        } else {
            row.push(item[field.name]);
        }
    });
    return row;
}

export const generateMockData = (schema: SchemaField[], count: number, format: 'json' | 'csv'): string => {
    const data = Array.from({ length: count }).map(() => generateItem(schema));

    if (format === 'json') {
        return JSON.stringify(data, null, 2);
    } else {
        if (data.length === 0) return '';

        const headers = getFlattenedHeaders(schema);
        const rows = data.map(item => {
            const flatRow = getFlattenedRow(item, schema);
            return flatRow.map(val => {
                // Handle basic CSV escaping
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                if (typeof val === 'object' && val !== null) return JSON.stringify(val); // Fallback for complex types in CSV
                return val;
            }).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }
};
