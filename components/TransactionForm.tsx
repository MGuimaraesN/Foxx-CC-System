import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, DollarSign, Tag, CreditCard as CardIcon, Repeat, ArrowUpCircle, ArrowDownCircle, Plus, CalendarOff, Layers } from 'lucide-react';
import { TransactionType, Currency, CreditCard, Transaction, RecurrenceFrequency, TransactionStatus } from '../types';
import { useCreateTransaction, useUpdateTransaction } from '../hooks/useTransactions';

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  cards: CreditCard[];
  initialData?: Transaction | null;
  availableTags?: string[];
}

// Zod Schema Validation
const transactionSchema = z.object({
  description: z.string().min(3, "Description must be at least 3 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  category: z.string().min(2, "Category is required"),
  type: z.nativeEnum(TransactionType),
  status: z.nativeEnum(TransactionStatus),
  cardId: z.string().optional(),
  isRecurring: z.boolean(),
  recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
  recurrenceEndDate: z.string().optional(),
  isInstallment: z.boolean(),
  totalInstallments: z.number().min(1).max(24).optional(),
  installmentNumber: z.number().min(1).optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSuccess, cards, initialData, availableTags = [] }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // React Query Mutations
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      totalInstallments: 1,
      installmentNumber: 1,
      isInstallment: false,
      isRecurring: false,
      recurrenceFrequency: RecurrenceFrequency.MONTHLY,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PENDING,
    }
  });

  const watchType = watch('type');
  const watchStatus = watch('status');
  const isInstallment = watch('isInstallment');
  const isRecurring = watch('isRecurring');
  const isEditing = !!initialData;

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      reset({
        description: initialData.description,
        amount: initialData.amount,
        date: initialData.date.split('T')[0],
        category: initialData.category,
        type: initialData.type,
        status: initialData.status || TransactionStatus.PENDING,
        cardId: initialData.cardId || '',
        isRecurring: initialData.isRecurring,
        recurrenceFrequency: initialData.recurrenceFrequency || RecurrenceFrequency.MONTHLY,
        recurrenceEndDate: initialData.recurrenceEndDate ? initialData.recurrenceEndDate.split('T')[0] : undefined,
        isInstallment: initialData.isInstallment,
        totalInstallments: initialData.totalInstallments || 1,
        installmentNumber: initialData.installmentNumber || 1,
      });
      setTags(initialData.tags || []);
    }
  }, [initialData, reset]);

  // Auto-set status defaults when type changes (if not editing)
  useEffect(() => {
    if (!isEditing) {
      if (watchType === TransactionType.INCOME) {
        setValue('status', TransactionStatus.PAID);
      } else {
        setValue('status', TransactionStatus.PENDING);
      }
    }
  }, [watchType, setValue, isEditing]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(',', '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString(),
        totalInstallments: Number(data.totalInstallments),
        installmentNumber: Number(data.installmentNumber),
        currency: Currency.BRL,
        tags: tags,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate).toISOString() : undefined,
      };

      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...initialData, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save transaction", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Row: Type and Status */}
          <div className="flex gap-4">
            {/* Type Selector */}
            <div className="flex-1 flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setValue('type', TransactionType.EXPENSE)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${watchType === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <ArrowDownCircle size={16} /> Expense
              </button>
              <button
                type="button"
                onClick={() => setValue('type', TransactionType.INCOME)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${watchType === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <ArrowUpCircle size={16} /> Income
              </button>
            </div>
            
            {/* Status Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3">
               <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Paid?</span>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${watchStatus === TransactionStatus.PAID ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={watchStatus === TransactionStatus.PAID}
                      onChange={(e) => setValue('status', e.target.checked ? TransactionStatus.PAID : TransactionStatus.PENDING)}
                    />
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${watchStatus === TransactionStatus.PAID ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
               </label>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number" 
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white transition-colors ${errors.amount ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && <span className="text-red-500 text-xs mt-1 block">{errors.amount.message}</span>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <input 
              type="text" 
              {...register('description')}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
              placeholder="e.g. Uber trip"
            />
            {errors.description && <span className="text-red-500 text-xs mt-1 block">{errors.description.message}</span>}
          </div>

          {/* Category & Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
            <input 
              type="text" 
              {...register('category')}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white ${errors.category ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
              placeholder="e.g. Food, Transport"
            />
             {errors.category && <span className="text-red-500 text-xs mt-1 block">{errors.category.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tags</label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900">
              {tags.map(tag => (
                <span key={tag} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900 dark:hover:text-white"><X size={12} /></button>
                </span>
              ))}
              <div className="flex-1 min-w-[100px] flex items-center">
                 <Tag size={14} className="text-slate-400 mr-2" />
                 <input 
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-white"
                    placeholder="Type & press Enter"
                    list="available-tags"
                 />
                 <datalist id="available-tags">
                   {availableTags.map(tag => <option key={tag} value={tag} />)}
                 </datalist>
              </div>
            </div>
          </div>

          {/* Card & Date Row */}
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" 
                  {...register('date')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
               {errors.date && <span className="text-red-500 text-xs mt-1 block">{errors.date.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Credit Card (Opt)</label>
              <div className="relative">
                <CardIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  {...register('cardId')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none dark:text-white"
                >
                  <option value="">No Card (Cash/Debit)</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-2 gap-4">
             {/* Recurring Toggle */}
            <div className={`p-4 rounded-lg border transition-colors ${isRecurring ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
              <div className="flex items-center space-x-3 mb-2">
                <input 
                  type="checkbox" 
                  id="recurring-toggle"
                  {...register('isRecurring')}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="recurring-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                  <Repeat size={16} /> Recurring
                </label>
              </div>
              {isRecurring && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <select
                    {...register('recurrenceFrequency')}
                    className="w-full text-xs p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    <option value={RecurrenceFrequency.WEEKLY}>Weekly</option>
                    <option value={RecurrenceFrequency.MONTHLY}>Monthly</option>
                    <option value={RecurrenceFrequency.YEARLY}>Yearly</option>
                  </select>
                  <div className="relative">
                    <label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">End Date (Optional)</label>
                    <CalendarOff className="absolute left-2 top-[22px] text-slate-400" size={12} />
                    <input 
                      type="date"
                      {...register('recurrenceEndDate')}
                      className="w-full pl-6 pr-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Installments Toggle */}
            {watchType === TransactionType.EXPENSE && (
              <div className={`p-4 rounded-lg border transition-colors ${isInstallment ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
                <div className="flex items-center space-x-3 mb-2">
                  <input 
                    type="checkbox" 
                    id="installment-toggle"
                    disabled={isEditing && initialData?.isInstallment}
                    {...register('isInstallment')}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <label htmlFor="installment-toggle" className={`text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none ${isEditing && initialData?.isInstallment ? 'opacity-50' : ''}`}>
                   <Layers size={16} /> Installments
                  </label>
                </div>
                
                 {isInstallment && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
                       <div>
                         <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Total</label>
                         <select 
                            {...register('totalInstallments', { valueAsNumber: true })}
                            disabled={isEditing}
                            className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs dark:text-white disabled:opacity-70"
                          >
                            {[2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                              <option key={n} value={n}>{n}x</option>
                            ))}
                          </select>
                       </div>
                       <div>
                         <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Current #</label>
                         <input
                            type="number"
                            {...register('installmentNumber', { valueAsNumber: true })}
                            disabled={isEditing}
                            min={1}
                            className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs dark:text-white disabled:opacity-70"
                          />
                       </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button 
              disabled={isSubmitting}
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  {isEditing ? 'Save Changes' : 'Create Transaction'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};