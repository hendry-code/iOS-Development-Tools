import { SchemaField, MockDataType } from './mockDataGenerator';

// ─── Saved Schema Types ──────────────────────────────────────────────────────

export interface SavedSchema {
    id: string;
    name: string;
    fields: SchemaField[];
    createdAt: string;
    updatedAt: string;
}

const STORAGE_KEY = 'mock-data-saved-schemas';

// ─── Schema Store (localStorage) ─────────────────────────────────────────────

export const schemaStore = {
    getAll(): SavedSchema[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    save(name: string, fields: SchemaField[]): SavedSchema {
        const schemas = schemaStore.getAll();
        const newSchema: SavedSchema = {
            id: Date.now().toString(),
            name,
            fields: JSON.parse(JSON.stringify(fields)), // deep clone
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        schemas.push(newSchema);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
        return newSchema;
    },

    update(id: string, fields: SchemaField[]): void {
        const schemas = schemaStore.getAll();
        const idx = schemas.findIndex(s => s.id === id);
        if (idx !== -1) {
            schemas[idx].fields = JSON.parse(JSON.stringify(fields));
            schemas[idx].updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
        }
    },

    remove(id: string): void {
        const schemas = schemaStore.getAll().filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
    },

    exportToJSON(id: string): string {
        const schemas = schemaStore.getAll();
        const schema = schemas.find(s => s.id === id);
        return schema ? JSON.stringify(schema, null, 2) : '';
    },

    importFromJSON(json: string): SavedSchema {
        const parsed = JSON.parse(json);
        const schema: SavedSchema = {
            id: Date.now().toString(),
            name: parsed.name || 'Imported Schema',
            fields: parsed.fields || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const schemas = schemaStore.getAll();
        schemas.push(schema);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
        return schema;
    },
};

// ─── JSON-to-Schema Inference ────────────────────────────────────────────────

let inferIdCounter = 0;

const nextId = (): string => `infer_${++inferIdCounter}_${Date.now()}`;

const inferType = (value: any): MockDataType => {
    if (value === null || value === undefined) return 'lorem';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'integer' : 'float';
    }
    if (typeof value === 'string') {
        // Heuristics for common patterns
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
        if (/^https?:\/\//i.test(value)) return 'url';
        if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'date';
        if (/^#[0-9a-f]{6}$/i.test(value)) return 'color';
        if (/^\+?\d[\d\s\-().]{6,}$/.test(value)) return 'phone';
        if (value.length > 100) return 'paragraph';
        return 'lorem';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'lorem';
};

const inferFieldsFromObject = (obj: Record<string, any>): SchemaField[] => {
    return Object.entries(obj).map(([key, value]) => {
        const type = inferType(value);
        const field: SchemaField = { id: nextId(), name: key, type };

        if (type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
            field.children = inferFieldsFromObject(value);
        }

        if (type === 'array' && Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem)) {
                field.children = inferFieldsFromObject(firstItem);
                field.arrayCount = value.length;
            } else {
                // Array of primitives — use isArray on a single field
                const itemType = inferType(firstItem);
                field.type = itemType;
                field.isArray = true;
                field.arrayCount = value.length;
            }
        }

        return field;
    });
};

export const inferSchemaFromJSON = (jsonString: string): SchemaField[] => {
    inferIdCounter = 0;
    const parsed = JSON.parse(jsonString);

    if (Array.isArray(parsed)) {
        if (parsed.length === 0) return [];
        const first = parsed[0];
        if (typeof first === 'object' && first !== null) {
            return inferFieldsFromObject(first);
        }
        return [];
    }

    if (typeof parsed === 'object' && parsed !== null) {
        return inferFieldsFromObject(parsed);
    }

    return [];
};
