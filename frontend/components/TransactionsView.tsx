import React, { useState, useEffect, useMemo } from 'react';
import { TransactionTable } from './TransactionTable';
import { Transaction, CreditCard, TransactionType, TransactionStatus } from '../types';
import { Search, Filter, AlertCircle, Calendar, Tag as TagIcon, Check, ArrowUpCircle, ArrowDownCircle, Wallet, FileText, Sheet, Download, RefreshCw, Trash2, CheckCircle, X } from 'lucide-react';
import { TransactionForm } from './TransactionForm';
import { useUpdateTransaction } from '../hooks/useTransactions';
import { bulkUpdateStatus, bulkDelete } from '../services/transactionService';
import { exportToPDF, exportToExcel } from '../services/exportService';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

interface TransactionsViewProps {
  transactions: Transaction[];
  loading: boolean;
  cards: CreditCard[];
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  error?: Error | null;
  showToast?: (msg: string, type: 'success' | 'error') => void;
  currency?: string;
  isPrivate?: boolean;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions, loading, cards, onDelete, isDeleting, error, showToast, currency = 'BRL', isPrivate = false }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TransactionStatus>('ALL');
  const [cardFilter, setCardFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const queryClient = useQueryClient();

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const handleSyncBot = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
    toast.info(t('transactions.syncBot') + '...');
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredTransactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const bulkStatusMutation = useMutation({
    mutationFn: (status: 'PAID' | 'PENDING') => bulkUpdateStatus(selectedIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Bulk status updated');
      setSelectedIds([]);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDelete(selectedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Bulk items deleted');
      setSelectedIds([]);
    }
  });

  // Derive unique tags from transactions
  const availableTags = useMemo(() => {
    const allTags = new Set<string>();
    transactions.forEach(t => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  }, [transactions]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredTransactions = transactions.filter(t => {
    // Text Search
    const term = debouncedSearchTerm.toLowerCase();
    const matchesSearch = t.description.toLowerCase().includes(term) ||
                          t.category.toLowerCase().includes(term);
    
    // Dropdown Filters
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
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

    return matchesSearch && matchesType && matchesStatus && matchesCard && matchesCategory && matchesDate && matchesTags;
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

  const formatMoney = (amount: number) => {
    if (isPrivate) return 'R$ ••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
           <div>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.total')} {t('transactions.income')}</p>
             <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatMoney(summary.income)}</h3>
           </div>
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
             <ArrowUpCircle size={24} />
           </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
           <div>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.total')} {t('transactions.expense')}</p>
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

      {/* Filter Bar - Simplified Row */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center">
        
        {/* 1. Search */}
        <div className="relative flex-grow min-w-[200px]">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
           <input
             type="text"
             placeholder={t('common.search')}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
           />
        </div>

        {/* 2. Date Range */}
        <div className="flex items-center gap-2">
           <input
             type="date"
             value={startDate}
             onChange={(e) => setStartDate(e.target.value)}
             className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
           />
           <span className="text-slate-400">-</span>
           <input
             type="date"
             value={endDate}
             onChange={(e) => setEndDate(e.target.value)}
             className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
           />
        </div>

        {/* 3. Category */}
        <input
            type="text"
            placeholder={t('transactions.category')}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
        />

        {/* 4. Status */}
        <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm dark:text-white"
        >
             <option value="ALL">Status: All</option>
             <option value="PAID">Paid</option>
             <option value="PENDING">Pending</option>
        </select>

        {/* 5. Clear Button */}
        <button
            onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setCategoryFilter('');
                setStatusFilter('ALL');
                setCardFilter('ALL');
                setSelectedTags([]);
            }}
            className="px-3 py-2 text-slate-500 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Clear Filters"
        >
            <X size={18} />
        </button>

        {/* Extra Actions (Sync/Export) - kept compact */}
        <div className="flex border-l border-slate-200 dark:border-slate-700 pl-3 gap-1">
             <button onClick={handleSyncBot} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors" title={t('transactions.syncBot')}><RefreshCw size={18} /></button>
             <button onClick={handleExportPDF} className="p-2 text-slate-500 hover:text-red-600 transition-colors" title="PDF"><FileText size={18} /></button>
             <button onClick={handleExportExcel} className="p-2 text-slate-500 hover:text-emerald-600 transition-colors" title="Excel"><Sheet size={18} /></button>
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
        currency={currency}
        isPrivate={isPrivate}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
      />

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
           <span className="text-sm font-medium">{selectedIds.length} {t('transactions.selected')}</span>
           <div className="h-4 w-px bg-slate-700"></div>
           <button
             onClick={() => bulkStatusMutation.mutate('PAID')}
             className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
           >
             <CheckCircle size={16} /> {t('transactions.markPaid')}
           </button>
           <button
             onClick={() => bulkDeleteMutation.mutate()}
             className="flex items-center gap-2 text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
           >
             <Trash2 size={16} /> {t('common.delete')}
           </button>
           <button
             onClick={() => setSelectedIds([])}
             className="ml-2 p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
           >
             <X size={16} />
           </button>
        </div>
      )}

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