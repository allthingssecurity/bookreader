import { Level } from '../types';

const API_KEY = import.meta.env.VITE_NVIDIA_API_KEY;
const INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface SectionSummary {
    title: string;
    content: string[]; // Array of paragraphs/points
    validContent: boolean;
}

export const summarizeSection = async (text: string, sectionIndex: number): Promise<SectionSummary> => {
    // Truncate text if it's too long (increased limit for better context)
    const truncatedText = text.slice(0, 32000);

    const prompt = `
    You are an expert content summarizer and text cleaner.
    The input text comes from a PDF and may contain artifacts like line numbers (e.g., "10", "11", "12" at start of lines), headers, footers, or page numbers mixed with the text.
    
    YOUR TASK:
    1. ANALYZE if this text is actual book content (chapters, narrative, articles) or "noise" (References, Bibliography, Index, Table of Contents, Copyright page, Acknowledgements, or just lists of names/dates).
    2. IF NOISE: Return "validContent": false.
    3. IF CONTENT:
       - IGNORE all line numbers, page numbers, and formatting artifacts.
       - Extract the main section title.
       - Summarize the content into 4-6 detailed, coherent key points.
       - Ensure the output text is CLEAN.
    
    Return ONLY a valid JSON object with this structure:
    {
      "validContent": true/false,
      "title": "A short, descriptive title",
      "points": [
        "Clean, detailed point 1...",
        "Clean, detailed point 2...",
        "Clean, detailed point 3..."
      ]
    }

    Text to analyze:
    ${truncatedText}
  `;

    try {
        const response = await fetch(INVOKE_URL, {
            method: 'POST',
            headers: {
                'Authorization': API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: "meta/llama-4-maverick-17b-128e-instruct",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 20000, // Increased to 20k as requested
                temperature: 0.7,
                top_p: 1.0,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        // Parse JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: parsed.title || `Section ${sectionIndex + 1}`,
                content: parsed.points || [],
                validContent: parsed.validContent !== false // Default to true if undefined
            };
        } else {
            // Fallback if JSON parsing fails
            return {
                title: `Section ${sectionIndex + 1}`,
                content: [content],
                validContent: true
            };
        }

    } catch (error) {
        console.error('AI Summary failed:', error);
        // Fallback to original text if AI fails
        return {
            title: `Section ${sectionIndex + 1}`,
            content: text.split('\n\n').slice(0, 5), // Just take first few paragraphs
            validContent: true
        };
    }
};
