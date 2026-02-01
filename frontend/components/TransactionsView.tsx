import React, { useState, useMemo } from 'react';
import { TransactionTable } from './TransactionTable';
import { Transaction, CreditCard, TransactionType, TransactionStatus } from '../types';
import { Search, Filter, AlertCircle, Calendar, Tag as TagIcon, Check, ArrowUpCircle, ArrowDownCircle, Wallet, FileText, Sheet, Download } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { useUpdateTransaction } from '../hooks/useTransactions';
import { exportToPDF, exportToExcel } from '../services/exportService';

interface TransactionsViewProps {
  transactions: Transaction[];
  loading: boolean;
  cards: CreditCard[];
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  error?: Error | null;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions, loading, cards, onDelete, isDeleting, error, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [cardFilter, setCardFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const updateMutation = useUpdateTransaction({
    onSuccess: () => {
      if (showToast) showToast('Transaction status updated', 'success');
    },
    onError: (err) => {
      if (showToast) showToast(`Failed to update status: ${err.message}`, 'error');
    }
  });

  const handleStatusToggle = (t: Transaction) => {
    const newStatus = t.status === TransactionStatus.PAID ? TransactionStatus.PENDING : TransactionStatus.PAID;
    updateMutation.mutate({ id: t.id, status: newStatus });
  };

  // Derive unique tags from transactions
  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => allTags.add(tag)));
    return Array.from(allTags);
  }, [transactions]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredTransactions = transactions.filter(t => {
    // Text Search
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Dropdown Filters
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesCard = cardFilter === 'ALL' || t.cardId === cardFilter;
    
    // Category specific input
    const matchesCategory = categoryFilter === '' || t.category.toLowerCase().includes(categoryFilter.toLowerCase());

    // Date Range
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(t.date) >= new Date(startDate);
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(t.date) <= endDateTime;
    }

    // Tag Filter (OR Logic: if selectedTags > 0, transaction must have at least one of them)
    let matchesTags = true;
    if (selectedTags.length > 0) {
      matchesTags = t.tags?.some(tag => selectedTags.includes(tag)) || false;
    }

    return matchesSearch && matchesType && matchesCard && matchesCategory && matchesDate && matchesTags;
  });

  // Calculate Summary based on filtered transactions
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) {
        acc.income += t.amount;
      } else {
        acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const netBalance = summary.income - summary.expense;

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      if (showToast) showToast('No data to export', 'error');
      return;
    }
    exportToPDF(filteredTransactions, cards);
    if (showToast) showToast('PDF Exported Successfully', 'success');
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      if (showToast) showToast('No data to export', 'error');
      return;
    }
    exportToExcel(filteredTransactions, cards);
    if (showToast) showToast('Excel Exported Successfully', 'success');
  };

  if (error) {
     return (
       <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
         <AlertCircle className="text-red-600 dark:text-red-400 mt-1" size={20} />
         <div>
           <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Failed to load transactions</h3>
           <p className="text-red-600 dark:text-red-400 mt-1">{error.message}</p>
         </div>
       </div>
     );
  }

  const formatMoney = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
           <div>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Income</p>
             <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(summary.income)}</h3>
           </div>
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
             <ArrowUpCircle size={24} />
           </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
           <div>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Expenses</p>
             <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatMoney(summary.expense)}</h3>
           </div>
           <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
             <ArrowDownCircle size={24} />
           </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
           <div>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Net Balance</p>
             <h3 className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(netBalance)}</h3>
           </div>
           <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
             <Wallet size={24} />
           </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        
        {/* Row 1: Search, Export buttons, and Type/Card */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between">
          <div className="relative w-full xl:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             
            {/* Export Buttons */}
            <div className="flex items-center gap-2 mr-2">
              <button 
                onClick={handleExportPDF}
                title="Export to PDF"
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                 <FileText size={16} className="text-red-500" />
                 <span className="hidden sm:inline">PDF</span>
              </button>
              <button 
                onClick={handleExportExcel}
                title="Export to Excel"
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                 <Sheet size={16} className="text-emerald-500" />
                 <span className="hidden sm:inline">Excel</span>
              </button>
            </div>

             <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
               <Filter size={16} className="text-slate-500" />
               <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">Filters:</span>
            </div>
            
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium cursor-pointer"
            >
               <option value="ALL">All Types</option>
               <option value="EXPENSE">Expenses</option>
               <option value="INCOME">Income</option>
            </select>

            <select 
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium cursor-pointer max-w-[120px] truncate"
            >
               <option value="ALL">All Cards</option>
               {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Advanced Filters (Date, Category, Multi-Tag) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Category</label>
             <input 
                type="text"
                placeholder="e.g. Food" 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
             />
           </div>
           
           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Start Date</label>
             <div className="relative">
               <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
               />
             </div>
           </div>

           <div>
             <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">End Date</label>
             <div className="relative">
               <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
               />
             </div>
           </div>

           <div className="relative">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Tags</label>
              <button
                onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-left flex items-center justify-between dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <span className="truncate">
                  {selectedTags.length === 0 ? 'Select tags...' : `${selectedTags.length} selected`}
                </span>
                <TagIcon size={14} className="text-slate-400" />
              </button>

              {isTagDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsTagDropdownOpen(false)} 
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto p-2">
                    {availableTags.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2 text-center">No tags available</p>
                    ) : (
                      availableTags.map(tag => (
                        <div 
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${selectedTags.includes(tag) ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTags.includes(tag) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                             {selectedTags.includes(tag) && <Check size={10} />}
                          </div>
                          {tag}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
           </div>
        </div>
      </div>

      <TransactionTable 
        transactions={filteredTransactions} 
        loading={loading} 
        cards={cards} 
        onDelete={onDelete}
        onEdit={(t) => setEditingTransaction(t)}
        onStatusToggle={handleStatusToggle}
        isDeleting={isDeleting}
      />

      {editingTransaction && (
        <TransactionForm
          onClose={() => setEditingTransaction(null)}
          onSuccess={() => showToast && showToast('Transaction updated successfully', 'success')}
          cards={cards}
          initialData={editingTransaction}
          availableTags={availableTags}
        />
      )}
    </div>
  );
};