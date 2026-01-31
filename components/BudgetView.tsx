import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBudgets, createBudget, deleteBudget } from '../services/transactionService';
import { BudgetUsage } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export const BudgetView: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
  });

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setIsAdding(false);
      setNewCategory('');
      setNewAmount('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory && newAmount) {
      createMutation.mutate({ category: newCategory, amount: Number(newAmount) });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Budgets</h2>
         <button 
           onClick={() => setIsAdding(true)}
           className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
         >
           <Plus size={18} /> Add Budget
         </button>
       </div>

       {/* Add Form */}
       {isAdding && (
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
            <h3 className="text-sm font-semibold mb-3 dark:text-white">New Budget Goal</h3>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Category</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="e.g. Restaurants"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm dark:text-white"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="text-xs text-slate-500 mb-1 block">Limit (R$)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm dark:text-white"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
              <button 
                type="button"
                onClick={() => setIsAdding(false)} 
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </form>
         </div>
       )}

       {/* List */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {isLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
         ) : budgets?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
               <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
               <p>No budgets set yet. Create one to track your spending.</p>
            </div>
         ) : (
            budgets?.map((budget) => {
              const isOver = budget.spent > budget.amount;
              const color = isOver ? 'bg-red-500' : (budget.percentage > 80 ? 'bg-orange-500' : 'bg-emerald-500');
              const statusColor = isOver ? 'text-red-600 dark:text-red-400' : (budget.percentage > 80 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400');
              
              return (
                <div key={budget.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative group">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-slate-900 dark:text-white text-lg">{budget.category}</h3>
                       <p className="text-xs text-slate-500">Monthly Limit: {formatCurrency(budget.amount)}</p>
                     </div>
                     <button 
                       onClick={() => deleteMutation.mutate(budget.id)}
                       className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                   
                   <div className="mb-2 flex justify-between items-end">
                      <span className={`text-2xl font-bold ${statusColor}`}>
                        {formatCurrency(budget.spent)}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {budget.percentage.toFixed(0)}% used
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
                          <AlertTriangle size={12} /> Over budget by {formatCurrency(budget.spent - budget.amount)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500">
                          <CheckCircle size={12} /> {formatCurrency(budget.remaining)} remaining
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