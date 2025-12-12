import { GoogleGenAI } from "@google/genai";

// Helper to get the AI client, ensuring we use the latest key if refreshed
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface GenerateAvatarParams {
  prompt: string;
  aspectRatio: string;
  imageSize: string; // "1K", "2K", "4K"
}

export const generateAvatarImage = async (params: GenerateAvatarParams): Promise<string> => {
  const ai = getAiClient();
  
  try {
    // Using the specific model requested: gemini-3-pro-image-preview
    // This model supports image generation via generateContent with specific configs
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: params.prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: params.aspectRatio,
          imageSize: params.imageSize,
        },
      },
    });

    // Extract image from response
    // The response structure for image gen usually contains inlineData in the parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${base64EncodeString}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};
