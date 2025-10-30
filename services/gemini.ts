import { GoogleGenAI, Type } from "@google/genai";
import { ParsedStrings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Translates a set of strings from English to a list of target languages using the Gemini API.
 * @param englishStrings The parsed key-value pairs of the English .strings file.
 * @param targetLanguages An array of language codes to translate to (e.g., ['es', 'fr']).
 * @returns A promise that resolves to a record mapping language codes to their translated strings.
 */
export async function translateStrings(
    englishStrings: ParsedStrings,
    targetLanguages: string[]
): Promise<Record<string, ParsedStrings>> {

    if (targetLanguages.length === 0) return {};
    if (Object.keys(englishStrings).length === 0) return {};

    // Dynamically build the response schema based on the target languages
    const properties: Record<string, any> = {};
    targetLanguages.forEach(lang => {
        properties[lang] = {
            type: Type.OBJECT,
            description: `Key-value pairs for ${lang} translations. Keys MUST match the source.`,
            additionalProperties: { type: Type.STRING },
        };
    });

    const responseSchema = {
        type: Type.OBJECT,
        properties,
        required: targetLanguages,
    };

    const prompt = `You are an expert localization assistant.
Translate the following English strings into the specified target languages: ${targetLanguages.join(', ')}.
Maintain the original meaning and context. The keys must be identical to the source.
Return the result as a single, valid JSON object that strictly adheres to the provided schema.

Source English strings:
${JSON.stringify(englishStrings, null, 2)}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        // Basic validation
        if (typeof parsedJson !== 'object' || parsedJson === null) {
            throw new Error("AI response is not a valid object.");
        }
        
        return parsedJson;

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        throw new Error(`Failed to get translations from AI. Reason: ${error.message || 'Unknown API error'}`);
    }
}