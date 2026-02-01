import { NewsArticle } from '../types';
import api from './api';

export const searchFinancialNews = async (query: string): Promise<{ text: string, articles: NewsArticle[] }> => {
  try {
    const response = await api.get('/api/news', { params: { query } });
    return response.data;
  } catch (error) {
    console.error("AI Search Error:", error);
    return {
      text: "Unable to complete search at this time. Please try again later.",
      articles: []
    };
  }
};
