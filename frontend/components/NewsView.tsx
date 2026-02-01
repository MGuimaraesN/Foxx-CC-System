import React, { useState } from 'react';
import { Search, Loader, ExternalLink, Newspaper } from 'lucide-react';
import { searchFinancialNews } from '../services/aiService';
import { NewsArticle } from '../types';

export const NewsView: React.FC = () => {
  const [query, setQuery] = useState('Market trends today');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const result = await searchFinancialNews(query);
      setSummary(result.text);
      setArticles(result.articles);
    } catch (err) {
      console.error(err);
      setSummary("Failed to fetch news. Please check the API key configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 mb-4">
           <Newspaper size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Financial News & Intelligence</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto">
          Use AI to search for the latest market updates, specific stock news, or economic trends.
        </p>
        
        <form onSubmit={handleSearch} className="relative max-w-lg mx-auto">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-5 pr-14 py-4 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm dark:text-white transition-all"
            placeholder="Search for..."
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </form>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Column */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  AI Summary
                </h3>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-full animate-pulse" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-4/6 animate-pulse" />
                  </div>
                ) : (
                  <div className="prose dark:prose-invert text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {summary}
                  </div>
                )}
             </div>
          </div>

          {/* Sources Column */}
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sources</h3>
             {loading ? (
                [1,2,3].map(i => <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)
             ) : (
               articles.length > 0 ? (
                 articles.map((article, idx) => (
                   <a 
                    key={idx} 
                    href={article.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group"
                   >
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {article.title}
                      </h4>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{article.source || 'Web'}</span>
                        <ExternalLink size={12} />
                      </div>
                   </a>
                 ))
               ) : (
                 <div className="text-center p-6 text-slate-400 text-sm">No specific sources found.</div>
               )
             )}
          </div>

        </div>
      )}
    </div>
  );
};