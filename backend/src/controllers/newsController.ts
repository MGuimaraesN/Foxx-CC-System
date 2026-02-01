import { Request, Response } from 'express';
import { GoogleGenAI } from "@google/genai";

export const getNews = async (req: Request, res: Response) => {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
             return res.json({
                text: "API Key is missing. Please configure your environment to use AI features.",
                articles: []
              });
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
        const articles: any[] = [];
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

        res.json({ text, articles });
    } catch (error) {
        console.error("AI Search Error:", error);
        res.status(500).json({ error: 'AI Service Error' });
    }
};
