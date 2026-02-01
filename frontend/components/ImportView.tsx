import React, { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, FileCode } from 'lucide-react';
import { importTransactionsFromCSV, importTransactionsFromOFX } from '../services/transactionService';
import { useQueryClient } from '@tanstack/react-query';

export const ImportView: React.FC = () => {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'CSV' | 'OFX'>('CSV');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [count, setCount] = useState(0);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!content.trim()) return;
    setStatus('PROCESSING');
    
    try {
      let importedCount = 0;
      if (format === 'CSV') {
        importedCount = await importTransactionsFromCSV(content);
      } else {
        importedCount = await importTransactionsFromOFX(content);
      }
      setCount(importedCount);
      setStatus('SUCCESS');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setContent('');
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 mb-4">
           <Upload size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Import Transactions</h2>
        
        {/* Format Selector */}
        <div className="flex justify-center gap-4 mb-6">
           <button 
             onClick={() => setFormat('CSV')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${format === 'CSV' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-transparent text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
           >
             <FileText size={16} /> CSV
           </button>
           <button 
             onClick={() => setFormat('OFX')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${format === 'OFX' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300' : 'bg-slate-50 border-transparent text-slate-600 dark:bg-slate-900 dark:text-slate-400'}`}
           >
             <FileCode size={16} /> OFX (Bank)
           </button>
        </div>

        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto text-sm">
          {format === 'CSV' 
            ? "Paste your CSV content below. Format: Date (YYYY-MM-DD), Description, Amount, Category." 
            : "Open your .ofx file in a text editor and paste the content here."}
        </p>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={format === 'CSV' ? `2023-10-01, Uber Ride, -25.50, Transport` : `<OFX>...<BANKTRANLIST>...`}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <button 
            onClick={handleImport}
            disabled={status === 'PROCESSING' || !content}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
             {status === 'PROCESSING' ? 'Processing...' : `Import ${format}`}
          </button>
        </div>
      </div>

      {status === 'SUCCESS' && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
          <Check size={20} />
          <span className="font-medium">Successfully imported {count} transactions.</span>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle size={20} />
          <span className="font-medium">Failed to process content. Check the format and try again.</span>
        </div>
      )}
    </div>
  );
};