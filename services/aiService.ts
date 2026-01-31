import { GoogleGenAI } from "@google/genai";
import { NewsArticle } from '../types';

export const searchFinancialNews = async (query: string): Promise<{ text: string, articles: NewsArticle[] }> => {
  try {
    // Lazy initialize to ensure process.env is available and to handle missing keys gracefully
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.warn("API Key is missing. AI features disabled.");
      return { 
        text: "API Key is missing. Please configure your environment to use AI features.", 
        articles: [] 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the latest financial news and market trends regarding: "${query}". Provide a summary.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No summary available.";
    
    // Extract grounding chunks (URLs)
    const articles: NewsArticle[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
           articles.push({
             title: chunk.web.title || "News Article",
             url: chunk.web.uri,
             source: chunk.web.source || new URL(chunk.web.uri).hostname,
           });
        }
      });
    }

    return { text, articles };
  } catch (error) {
    console.error("AI Search Error:", error);
    // Return a graceful error structure instead of crashing
    return { 
      text: "Unable to complete search at this time. Please try again later.", 
      articles: [] 
    };
  }
};