export interface ConverterOptions {
    rootName: string;
    allOptional: boolean;
    generateCodingKeys: boolean;
}

interface Property {
    name: string;
    type: string;
    isOptional: boolean;
    originalKey: string;
}

interface StructDefinition {
    name: string;
    properties: Property[];
}

export const convertJsonToSwift = (jsonString: string, options: ConverterOptions): string => {
    try {
        const json = JSON.parse(jsonString);
        const structs: StructDefinition[] = [];

        // Helper to convert snake_case to camelCase
        const toCamelCase = (str: string): string => {
            if (!options.generateCodingKeys) return str;
            return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        };

        // Helper to capitalize first letter
        const capitalize = (str: string): string => {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        // Helper to guess type and potentially create sub-structs
        function inferType(value: any, key: string): string {
            if (value === null) return "Any";
            if (typeof value === 'string') return "String";
            if (typeof value === 'number') {
                return Number.isInteger(value) ? "Int" : "Double";
            }
            if (typeof value === 'boolean') return "Bool";

            if (Array.isArray(value)) {
                if (value.length === 0) return "[Any]";
                const firstType = inferType(value[0], key);
                // Simple assumption: array is homogeneous for now
                return `[${firstType}]`;
            }

            if (typeof value === 'object') {
                const structName = capitalize(key); // Naive naming
                generateStruct(value, structName);
                return structName;
            }

            return "Any";
        }

        function generateStruct(obj: any, structName: string) {
            // Check if struct with this name already exists... for now we just append, 
            // but in real world we might want to deduplicate or rename.
            // A simple collision avoidance:
            let uniqueName = structName;
            let counter = 1;
            while (structs.some(s => s.name === uniqueName)) {
                uniqueName = `${structName}${counter++}`;
            }

            const properties: Property[] = [];

            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    let type = inferType(value, key);

                    // If the type is a nested custom struct, we rely on the side-effect of inferType calling generateStruct.
                    // However, we need to handle arrays of objects differently?
                    // inferType handles direct object. 
                    // Let's improve array handling for objects.
                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                        const subName = capitalize(key); // singularize? 'users' -> 'User' is hard without NLP. 'UsersItem'?
                        // For simplicity, let's call it just Capitalized Key + "Item" if plural, or just Key if singular looks fine.
                        // Let's use simple heuristic: CapitalizedKey
                        // But wait, inferType for array recursively calls inferType for element.
                        // So inferType(value[0], key) -> calls generateStruct(value[0], key).
                        // So it returns structName.
                        // So Array of objects is handled naturally if we pass the context.
                    }

                    properties.push({
                        name: toCamelCase(key),
                        type: type,
                        isOptional: options.allOptional || value === null,
                        originalKey: key
                    });
                }
            }

            structs.push({
                name: uniqueName,
                properties: properties
            });
        }

        // Start generation
        if (Array.isArray(json)) {
            // Root is array
            if (json.length > 0 && typeof json[0] === 'object') {
                generateStruct(json[0], options.rootName);
            }
        } else if (typeof json === 'object' && json !== null) {
            generateStruct(json, options.rootName);
        } else {
            // Root is primitive? Not typical for JSON Codable generation but possible.
            return `// Root is primitive type: ${typeof json}`;
        }

        // Convert structs to String
        // We want the root struct at the top? Or bottom?
        // Usually dependent structs are defined first or nested.
        // Let's output them in reverse order of creation so dependencies might be defined (though swift doesn't care order).
        // Actually, let's just print them.

        let output = "import Foundation\n\n";

        // Reverse to have Root at top? generateStruct adds deeply nested first?
        // inferType calls generateStruct, so deeply nested ones are added to `structs` array FIRST.
        // So Root is added LAST. 
        // So reversing `structs` array puts Root at top.

        [...structs].reverse().forEach(s => {
            output += `struct ${s.name}: Codable {\n`;

            // Properties
            s.properties.forEach(p => {
                const typeStr = p.isOptional ? `${p.type}?` : p.type;
                output += `    let ${p.name}: ${typeStr}\n`;
            });

            // CodingKeys
            if (options.generateCodingKeys && s.properties.some(p => p.name !== p.originalKey)) {
                output += `\n    enum CodingKeys: String, CodingKey {\n`;
                s.properties.forEach(p => {
                    output += `        case ${p.name} = "${p.originalKey}"\n`;
                });
                output += `    }\n`;
            }

            output += `}\n\n`;
        });

        return output.trim();

    } catch (e: any) { // Type 'unknown' is better practice but 'any' allows easier access to .message
        return `// Error parsing JSON: ${e.message}`;
    }
}
