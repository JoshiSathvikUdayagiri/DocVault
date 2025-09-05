import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

// Fix: Per coding guidelines, the API_KEY is assumed to be set in the environment. Removed fallback logic.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getFileContentPart = (content: string, mimeType?: string) => {
    if (mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
        return {
            inlineData: {
                data: content,
                mimeType: mimeType,
            },
        };
    }
    // For text files, the content is already plain text.
    return { text: content };
};

export const extractText = async (content: string, mimeType: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Extract all text from this document. If no text is present, say 'No text found'." },
                    getFileContentPart(content, mimeType)
                ]
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting text from document:", error);
        throw new Error("Failed to extract text. Please check your API key and network connection.");
    }
};

export const summarizeText = async (content: string, mimeType?: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Provide a concise, bullet-point summary of the following document content:" },
                    getFileContentPart(content, mimeType)
                ]
            },
            config: {
                temperature: 0.2,
                topP: 0.9,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error summarizing text:", error);
        throw new Error("Failed to summarize. Please check your API key and network connection.");
    }
};

export const convertTextToJson = async (content: string, mimeType?: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Analyze the following content and convert the key information into a structured JSON object. Infer the data structure based on the content." },
                    getFileContentPart(content, mimeType)
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        entities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    relevance: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                },
                temperature: 0.1,
            }
        });

        // The response text might need cleaning before parsing
        let jsonStr = response.text.trim();
        // Remove markdown code block fences if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7);
        }
        if (jsonStr.endsWith('```')) {
            jsonStr = jsonStr.substring(0, jsonStr.length - 3);
        }

        const jsonObj = JSON.parse(jsonStr);
        return JSON.stringify(jsonObj, null, 2); // Pretty print the JSON
    } catch (error) {
        console.error("Error converting to JSON:", error);
        throw new Error("Failed to convert to JSON. The AI may have returned an invalid format.");
    }
};

export const convertToJpg = async (content: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    getFileContentPart(content, mimeType),
                    { text: 'Convert this image to a high-quality JPG.' },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                return part.inlineData.data;
            }
        }

        throw new Error("The AI did not return an image. It might have responded with text instead.");

    } catch (error) {
        console.error("Error converting to JPG:", error);
        if (error instanceof Error && error.message.includes('did not return an image')) {
            throw error;
        }
        throw new Error("Failed to convert to JPG. Please check your API key and that the file is a valid image or PDF.");
    }
};

export const getDefinition = async (word: string): Promise<string> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide a clear and concise definition for the following word or phrase: "${word}". If it's a phrase, explain its meaning.`,
            config: {
                temperature: 0.1,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting definition:", error);
        throw new Error("Failed to get definition. Please check your API key and network connection.");
    }
};