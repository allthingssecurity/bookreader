import { GoogleGenAI, Type } from "@google/genai";
import { BookContent } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert author and philosopher specializing in Jainism. 
Your task is to write a high-quality, physically modeled digital book about the "Jain Philosophy of Karma".
The tone should be educational, profound, and serene, resembling a classic hardcover book.
Do not use markdown. Return raw text suitable for a JSON structure.
Divide the content into 10-12 logical pages.
Structure:
- Page 1: Title Page
- Page 2: Introduction to Karma
- Pages 3-10: Detailed concepts (Types of Karma, Bondage, Liberation)
- Page 11: Conclusion
`;

const BOOK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    pages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pageNumber: { type: Type.INTEGER },
          type: { type: Type.STRING, enum: ["text", "chapter-title", "image"] },
          title: { type: Type.STRING, nullable: true },
          content: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          imageUrl: { type: Type.STRING, nullable: true },
          imageCaption: { type: Type.STRING, nullable: true }
        },
        required: ["pageNumber", "type", "content"]
      }
    }
  },
  required: ["title", "pages"]
};

export const fetchBookContent = async (): Promise<BookContent> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate a comprehensive short book on the Jain Philosophy of Karma.",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BOOK_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");
    
    return JSON.parse(text) as BookContent;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback content if API fails (for demo reliability)
    return {
      title: "Jain Philosophy of Karma",
      author: "Gemini AI",
      pages: [
        {
          pageNumber: 1,
          type: "chapter-title",
          title: "Jain Philosophy of Karma",
          content: ["A Journey into the Mechanics of the Soul"]
        },
        {
          pageNumber: 2,
          type: "text",
          title: "Introduction",
          content: [
            "In Jainism, Karma is not merely a cosmic mechanism of reward and punishment, but a physical substance (pudgala) that pervades the universe.",
            "It is attracted to the soul (jiva) by the vibrations caused by activities of mind, body, and speech. Just as dust clings to a wet cloth, karmic particles cling to a soul moistened by passions (kashaya)."
          ]
        },
        {
          pageNumber: 3,
          type: "image",
          content: ["Visual representation of the soul's coloration."],
          imageUrl: "https://picsum.photos/400/300",
          imageCaption: "Lesya: The Colour of the Soul"
        }
      ]
    };
  }
};