import { GoogleGenAI, Type, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

export const initializeAiClient = (apiKey: string) => {
  if (apiKey && apiKey.trim() !== '') {
    ai = new GoogleGenAI({ apiKey });
  } else {
    console.error("Attempted to initialize Gemini client with an empty API key.");
    ai = null;
  }
};

const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    throw new Error("Gemini AI client has not been initialized. Please provide an API key.");
  }
  return ai;
};

const textModel = 'gemini-2.5-flash';
const imageEditModel = 'gemini-2.5-flash-image-preview';

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType
    },
  };
};

export const extractText = async (content: string, mimeType: string): Promise<string> => {
  const client = getAiClient();
  const prompt = "Extract all text from this document. If no text is found, return an empty string.";
  const filePart = fileToGenerativePart(content, mimeType);

  const response = await client.models.generateContent({
    model: textModel,
    contents: { parts: [filePart, {text: prompt}] }
  });
  return response.text;
};

export const summarizeText = async (content: string, mimeType?: string): Promise<string> => {
  const client = getAiClient();
  const prompt = "Summarize the following content in a few key points.";
  
  let parts: any[] = [];
  if (mimeType) { // It's an image or PDF
    parts.push(fileToGenerativePart(content, mimeType));
    parts.push({ text: prompt });
  } else { // It's plain text
    parts.push({ text: `${prompt}\n\n${content}` });
  }

  const response = await client.models.generateContent({
    model: textModel,
    contents: { parts }
  });
  return response.text;
};

export const convertTextToJson = async (content: string, mimeType: string): Promise<string> => {
  const client = getAiClient();
  
  let textContent = content;
  if(mimeType !== 'text/plain') {
      textContent = await extractText(content, mimeType);
      if (!textContent.trim()) {
        return JSON.stringify({ error: "No text found in the document to convert to JSON." });
      }
  }
  
  const prompt = `Convert the following text into a structured JSON format. Analyze the content and create a logical schema. Text: ${textContent}`;

  const response = await client.models.generateContent({
    model: textModel,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
    }
  });

  let jsonStr = response.text.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
  }
  return jsonStr;
};

export const convertToJpg = async (content: string, mimeType: string): Promise<string> => {
  const client = getAiClient();
  if (!mimeType.startsWith('image/')) {
    throw new Error("Conversion to JPG is only supported for image files.");
  }
  
  const imagePart = fileToGenerativePart(content, mimeType);
  
  const response = await client.models.generateContent({
      model: imageEditModel,
      contents: {
          parts: [
              imagePart,
              { text: 'Render this image as a high-quality JPEG.' }
          ]
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      }
  });
  
  for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
          return part.inlineData.data;
      }
  }

  throw new Error("Failed to generate JPG image from the source.");
};


export const getDefinition = async (word: string): Promise<string> => {
  const client = getAiClient();
  const prompt = `Provide a concise dictionary definition for the word: "${word}"`;

  const response = await client.models.generateContent({
    model: textModel,
    contents: prompt
  });
  return response.text;
};