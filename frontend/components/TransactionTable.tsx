import React, { useState } from 'react';
import { Transaction, Currency, CreditCard, TransactionType, TransactionStatus } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Repeat, Layers, Trash2, AlertTriangle, PlusCircle, Edit2, ArrowUpDown, ArrowUp, ArrowDown, ArrowUpCircle, ArrowDownCircle, CheckCircle, Clock, Globe, Utensils, Car, Home, ShoppingBag, Heart, GraduationCap, Film, Plane, Coffee, Music, Wifi, Zap, Book, Briefcase, Gift, Smile, Tag, Smartphone, Laptop, Tv } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  cards: CreditCard[];
  onDelete?: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
  onStatusToggle?: (transaction: Transaction) => void;
  isDeleting?: boolean;
  currency?: string;
  isPrivate?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
}

type SortKey = 'date' | 'amount' | 'description';
type SortDirection = 'asc' | 'desc';

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, loading, cards, onDelete, onEdit, onStatusToggle, isDeleting, currency = 'BRL', isPrivate = false, selectedIds = [], onSelect, onSelectAll }) => {
  const { t, language } = useLanguage();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const getCardName = (id?: string) => cards.find(c => c.id === id)?.name || '-';
  
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(language === 'en' ? 'en-US' : language, { day: '2-digit', month: 'short' });
  };

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    // Food / Alimentação
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('alimentação') || lower.includes('restaurante')) return <Utensils size={16} />;
    // Transport / Transporte
    if (lower.includes('transport') || lower.includes('uber') || lower.includes('gas') || lower.includes('fuel')) return <Car size={16} />;
    // Housing / Casa
    if (lower.includes('housing') || lower.includes('rent') || lower.includes('home') || lower.includes('casa') || lower.includes('aluguel')) return <Home size={16} />;
    // Shopping / Compras
    if (lower.includes('shopping') || lower.includes('market') || lower.includes('store') || lower.includes('clothes') || lower.includes('mercado') || lower.includes('loja')) return <ShoppingBag size={16} />;
    // Health / Saúde
    if (lower.includes('health') || lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('saúde') || lower.includes('medico') || lower.includes('farmacia')) return <Heart size={16} />;
    // Education / Educação
    if (lower.includes('education') || lower.includes('school') || lower.includes('course') || lower.includes('educação') || lower.includes('escola') || lower.includes('curso')) return <GraduationCap size={16} />;
    // Entertainment / Lazer
    if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('fun') || lower.includes('lazer') || lower.includes('cinema') || lower.includes('diversão')) return <Film size={16} />;
    // Travel / Viagem
    if (lower.includes('travel') || lower.includes('trip') || lower.includes('hotel') || lower.includes('flight') || lower.includes('viagem') || lower.includes('ferias')) return <Plane size={16} />;
    // Technology / Tecnologia
    if (lower.includes('tech') || lower.includes('computer') || lower.includes('phone') || lower.includes('tecnologia') || lower.includes('celular') || lower.includes('eletronico')) return <Smartphone size={16} />;
    // Subscriptions / Assinaturas
    if (lower.includes('subscription') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('assinatura') || lower.includes('stream')) return <Tv size={16} />;
    // Work / Trabalho
    if (lower.includes('work') || lower.includes('business') || lower.includes('trabalho') || lower.includes('salario') || lower.includes('freela')) return <Briefcase size={16} />;

    // Misc
    if (lower.includes('coffee') || lower.includes('cafe')) return <Coffee size={16} />;
    if (lower.includes('music')) return <Music size={16} />;
    if (lower.includes('internet') || lower.includes('wifi')) return <Wifi size={16} />;
    if (lower.includes('electric') || lower.includes('power') || lower.includes('light') || lower.includes('luz') || lower.includes('energia')) return <Zap size={16} />;
    if (lower.includes('book') || lower.includes('reading') || lower.includes('livro')) return <Book size={16} />;
    if (lower.includes('gift') || lower.includes('present') || lower.includes('presente')) return <Gift size={16} />;
    if (lower.includes('personal') || lower.includes('care') || lower.includes('pessoal')) return <Smile size={16} />;

    return <Tag size={16} />;
  };

  const handleDeleteClick = (id: string) => setDeleteConfirmId(id);
  
  const handleConfirmDelete = () => {
    if (deleteConfirmId && onDelete) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedTransactions = () => {
    if (!sortConfig) return transactions;

    return [...transactions].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle Date Sorting
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc' 
          ? new Date(aVal as string).getTime() - new Date(bVal as string).getTime()
          : new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
      }

      // Handle String Sorting
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Handle Number Sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-indigo-600" /> : <ArrowDown size={14} className="ml-1 text-indigo-600" />;
  };

  const sortedTransactions = getSortedTransactions();
  const headerCells = [
    onSelectAll ? (
      <th key="select-all" className="px-4 py-4 w-10 text-center">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          checked={transactions.length > 0 && selectedIds.length === transactions.length}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
      </th>
    ) : null,
    <th key="icon" className="px-4 py-4 w-10 text-center"></th>,
    <th key="type" className="px-6 py-4 w-12 text-center">{t('transactions.tableType')}</th>,
    <th key="status" className="px-6 py-4 w-24">{t('transactions.tableStatus')}</th>,
    (
      <th
        key="date"
        className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        onClick={() => handleSort('date')}
      >
        <div className="flex items-center">{t('transactions.tableDate')} {renderSortIcon('date')}</div>
      </th>
    ),
    (
      <th
        key="description"
        className="px-6 py-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        onClick={() => handleSort('description')}
      >
        <div className="flex items-center">{t('transactions.tableDescription')} {renderSortIcon('description')}</div>
      </th>
    ),
    <th key="card" className="px-6 py-4">{t('transactions.tableCard')}</th>,
    <th key="tags" className="px-6 py-4">{t('transactions.tableTags')}</th>,
    (
      <th
        key="amount"
        className="px-6 py-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        onClick={() => handleSort('amount')}
      >
        <div className="flex items-center justify-end">{t('transactions.tableAmount')} {renderSortIcon('amount')}</div>
      </th>
    ),
    (onDelete || onEdit) ? <th key="actions" className="px-6 py-4 text-center w-24">{t('transactions.tableActions')}</th> : null,
  ].filter(Boolean) as React.ReactNode[];

  if (loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
           <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 space-y-4">
           {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    )
  }

  if (!loading && transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
          <PlusCircle size={32} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('transactions.noTransactions')}</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          {t('transactions.noTransactionsHint')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('transactions.title')}</h3>
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
            {transactions.length} {t('common.records')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
              <tr>{headerCells}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedTransactions.map((transaction) => {
                const isSelected = selectedIds.includes(transaction.id);
                return (
                <tr key={transaction.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                  {onSelect && (
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={isSelected}
                        onChange={() => onSelect(transaction.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-4 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex items-center justify-center p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                       {getCategoryIcon(transaction.category)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     {transaction.type === TransactionType.INCOME ? (
                       <div className="inline-flex p-1.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                         <ArrowUpCircle size={16} />
                       </div>
                     ) : (
                       <div className="inline-flex p-1.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                         <ArrowDownCircle size={16} />
                       </div>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <button
                        onClick={() => onStatusToggle && onStatusToggle(transaction)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                          transaction.status === TransactionStatus.PAID
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                            : 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                        }`}
                        title={t('transactions.toggleStatus')}
                     >
                       {transaction.status === TransactionStatus.PAID ? (
                         <>
                           <CheckCircle size={12} /> {t('transactions.paid')}
                         </>
                       ) : (
                         <>
                           <Clock size={12} /> {t('transactions.pending')}
                         </>
                       )}
                     </button>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                        {formatDate(transaction.date)}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white font-medium text-sm">{transaction.description}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{transaction.category}</span>
                        {transaction.isInstallment && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                            <Layers size={10} /> {transaction.installmentNumber}/{transaction.totalInstallments}
                          </span>
                        )}
                        {transaction.isRecurring && (
                           <span className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                            <Repeat size={10} /> {t('transactions.recurringMonthly')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${transaction.cardId ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>
                      {getCardName(transaction.cardId)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {transaction.tags && transaction.tags.length > 0 ? transaction.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                             {tag}
                          </span>
                        )) : <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-semibold text-sm ${transaction.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {isPrivate ? 'R$ ••••' : (transaction.type === TransactionType.INCOME ? '+' : '') + new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency }).format(transaction.amount)}
                      </span>
                      {/* Foreign Currency Indicator */}
                      {transaction.originalAmount && transaction.originalCurrency && transaction.originalCurrency !== Currency.BRL && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Globe size={10} /> {isPrivate ? '•••' : new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency: transaction.originalCurrency }).format(transaction.originalAmount)}
                        </span>
                      )}
                    </div>
                  </td>
                  {(onDelete || onEdit) && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                         {onEdit && (
                          <button 
                            onClick={() => onEdit(transaction)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title={t('transactions.editTransaction')}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={() => handleDeleteClick(transaction.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('transactions.deleteTitle')}</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              {t('transactions.deleteConfirm')}
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-500/20 transition-all"
              >
                {isDeleting ? t('common.processing') : t('transactions.yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};