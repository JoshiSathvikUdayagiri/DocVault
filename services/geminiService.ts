import { GoogleGenAI, Modality, Part } from "@google/genai";

let ai: GoogleGenAI | undefined;

export const initializeAiClient = (apiKey: string): boolean => {
    try {
        ai = new GoogleGenAI({ apiKey });
        return true;
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI:", error);
        ai = undefined;
        return false;
    }
};

const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        throw new Error("Gemini AI client has not been initialized. Please provide a valid API key.");
    }
    return ai;
};

const fileToPart = (content: string, mimeType: string): Part => {
    return {
        inlineData: {
            data: content,
            mimeType,
        },
    };
};

export const extractText = async (content: string, mimeType: string): Promise<string> => {
    const localAi = getAiClient();
    const imagePart = fileToPart(content, mimeType);
    const textPart = { text: "Extract all text from this document. Respond only with the extracted text." };

    const response = await localAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
};

export const summarizeText = async (content: string, mimeType?: string): Promise<string> => {
    const localAi = getAiClient();
    let response;
    if (mimeType) {
        const imagePart = fileToPart(content, mimeType);
        const textPart = { text: "Provide a concise summary of this document." };
        response = await localAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
    } else {
        response = await localAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide a concise summary of the following text:\n\n${content}`,
        });
    }
    return response.text;
};


export const convertTextToJson = async (content: string, mimeType?: string): Promise<string> => {
    const localAi = getAiClient();
    const prompt = "Analyze the following content and convert it into a structured JSON format. The JSON should be well-formed. Do not add any explanatory text outside of the JSON block.";
    
    let requestContents: string | { parts: Part[] };

    if (mimeType) { 
        requestContents = { parts: [fileToPart(content, mimeType), {text: prompt}] };
    } else { 
        requestContents = `${prompt}\n\nContent:\n${content}`;
    }

    const response = await localAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: requestContents,
        config: {
            responseMimeType: "application/json",
        },
    });

    return response.text;
};

export const convertToJpg = async (content: string, mimeType: string): Promise<string> => {
    const localAi = getAiClient();
    const imagePart = fileToPart(content, mimeType);
    const textPart = { text: "Convert this image to JPEG format and return only the image without any other text or modifications." };

    const response = await localAi.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
            return part.inlineData.data;
        }
    }
    
    throw new Error("Could not convert to JPG. Model did not return an image.");
};

export const getDefinition = async (word: string): Promise<string> => {
    const localAi = getAiClient();
    const response = await localAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `What is the definition of the word "${word}"? Provide a concise definition.`,
    });
    return response.text;
};
