import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBudgets, createBudget, deleteBudget, updateBudget } from '../services/transactionService';
import { BudgetUsage } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Edit2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const BudgetView: React.FC = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for Add/Edit
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [amount, setAmount] = useState('');

  const { data: budgetsData, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
  });

  // CORREÇÃO: Garante que budgets seja sempre um array para evitar erros de .map()
  const budgets = useMemo(() => Array.isArray(budgetsData) ? budgetsData : [], [budgetsData]);

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['budgets'] });
       resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] })
  });

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setCategory('');
    setTag('');
    setAmount('');
  };

  const handleEdit = (budget: any) => {
    setEditingId(budget.id);
    setCategory(budget.category);
    setTag(budget.tag || '');
    setAmount(String(budget.amount));
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (category && amount) {
      if (editingId) {
          updateMutation.mutate({
            id: editingId,
            category,
            amount: Number(amount),
            tag: tag || undefined
          });
      } else {
          createMutation.mutate({ category, amount: Number(amount), tag: tag || undefined });
      }
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('budgets.title')}</h2>
         {!isAdding && (
            <button
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
                <Plus size={18} /> {t('budgets.addBudget')}
            </button>
         )}
       </div>

       {/* Add/Edit Form */}
       {isAdding && (
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
            <h3 className="text-sm font-semibold mb-3 dark:text-white">{editingId ? t('budgets.editBudget') : t('budgets.newBudgetGoal')}</h3>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-slate-500 mb-1 block">{t('budgets.category')}</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder={t('budgets.categoryPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm dark:text-white"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-slate-500 mb-1 block">{t('budgets.tagOptional')}</label>
                <input
                  type="text"
                  placeholder={t('budgets.tagPlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm dark:text-white"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-slate-500 mb-1 block">{t('budgets.limitLabel')}</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm dark:text-white"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                {t('budgets.save')}
              </button>
              <button 
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                {t('budgets.cancel')}
              </button>
            </form>
         </div>
       )}

       {/* List */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {isLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
         ) : budgets.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
               <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
            <p>{t('budgets.empty')}</p>
            </div>
         ) : (
            budgets.map((budget) => {
              const isOver = budget.spent > budget.amount;
              const color = isOver ? 'bg-red-500' : (budget.percentage > 80 ? 'bg-orange-500' : 'bg-emerald-500');
              const statusColor = isOver ? 'text-red-600 dark:text-red-400' : (budget.percentage > 80 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400');
              
              return (
                <div key={budget.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative group">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                         {budget.category}
                         {budget.tag && <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-normal">{budget.tag}</span>}
                       </h3>
                       <p className="text-xs text-slate-500">{t('budgets.monthlyLimit')}: {formatCurrency(budget.amount)}</p>
                     </div>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleEdit(budget)}
                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => deleteMutation.mutate(budget.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={16} />
                        </button>
                     </div>
                   </div>
                   
                   <div className="mb-2 flex justify-between items-end">
                      <span className={`text-2xl font-bold ${statusColor}`}>
                        {formatCurrency(budget.spent)}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {budget.percentage.toFixed(0)}% {t('budgets.used')}
                      </span>
                   </div>

                   <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${color}`} 
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      />
                   </div>

                   <div className="mt-3 flex items-center gap-2 text-xs">
                      {isOver ? (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <AlertTriangle size={12} /> {t('budgets.overBudgetBy')} {formatCurrency(budget.spent - budget.amount)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500">
                          <CheckCircle size={12} /> {formatCurrency(budget.remaining)} {t('budgets.remaining')}
                        </span>
                      )}
                   </div>
                </div>
              );
            })
         )}
       </div>
    </div>
  );
};