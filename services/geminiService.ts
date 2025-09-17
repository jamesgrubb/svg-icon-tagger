import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const descriptionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, descriptive title for the icon (2-4 words max)."
    },
    keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: "A relevant keyword."
      },
      description: "An array of 5-7 relevant keywords for searching this icon."
    },
  },
  required: ["title", "keywords"]
};

export const getIconDescription = async (pngDataUri: string, altText?: string): Promise<{ title: string; keywords: string[] }> => {
  let prompt = `
      You are an expert UI/UX designer analyzing a vector icon.
      I am providing you with a PNG image of the icon.
      
      Your analysis should be based PRIMARILY on the VISUALS of the icon. The visual representation is the most important source of information.
    `;

  if (altText) {
    prompt += `
      The SVG for this icon included a title tag with the following text: "${altText}".
      You can use this as a HINT or for context, but your final description and keywords must be justified by the icon's visual appearance. Do not simply copy the provided text if it doesn't match the image.
    `;
  }
    
  prompt += `
      Based on your visual analysis, provide:
      1. A short, descriptive title (e.g., "User Profile", "Delete Item").
      2. An array of 5-7 relevant keywords for searching (e.g., ["person", "account", "avatar", "member"]).
    `;
    
  let jsonText = '';
  try {
    const base64Data = pngDataUri.split(',')[1];
    if (!base64Data) {
        throw new Error("Invalid PNG data URI provided.");
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    };

    const textPart = { text: prompt };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: descriptionResponseSchema,
      },
    });

    jsonText = response.text;
    if (!jsonText) {
        const finishReason = response?.candidates?.[0]?.finishReason;
        const safetyRatings = response?.candidates?.[0]?.safetyRatings;
        console.error("Gemini returned an empty response.", { finishReason, safetyRatings });
        throw new Error(`AI returned an empty response. Reason: ${finishReason || 'Unknown'}`);
    }

    const parsed = JSON.parse(jsonText);
    
    return {
      title: parsed.title || 'Untitled Icon',
      keywords: parsed.keywords || []
    };

  } catch (error) {
    console.error("Failed to analyze icon with Gemini. Raw text response was:", jsonText, "Error:", error);
    // Return a default object on error so the app doesn't crash
    return {
      title: 'Analysis Failed',
      keywords: ['error']
    };
  }
};