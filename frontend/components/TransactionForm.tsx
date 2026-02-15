import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, DollarSign, Tag, CreditCard as CardIcon, Repeat, ArrowUpCircle, ArrowDownCircle, Plus, CalendarOff, Layers, Upload } from 'lucide-react';
import { TransactionType, Currency, CreditCard, Transaction, RecurrenceFrequency, TransactionStatus } from '../types';
import { useCreateTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { useBudgets } from '../hooks/useBudgets';
import { useLanguage } from '../context/LanguageContext';

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  cards: CreditCard[];
  initialData?: Transaction | null;
  availableTags?: string[];
}

const buildTransactionSchema = (t: (key: string) => string) => z.object({
  description: z.string().min(3, t('validation.descriptionMin')),
  amount: z.preprocess((val) => Number(val), z.number().positive(t('validation.amountPositive'))),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), t('validation.invalidDate')),
  category: z.string().min(2, t('validation.categoryRequired')),
  type: z.nativeEnum(TransactionType),
  status: z.nativeEnum(TransactionStatus),
  cardId: z.string().optional(),
  isRecurring: z.boolean(),
  recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
  recurrenceEndDate: z.string().optional().transform(e => e === "" ? undefined : e),
  isInstallment: z.boolean(),
  totalInstallments: z.preprocess((val) => Number(val), z.number().min(1).max(24).optional().or(z.nan())),
  installmentNumber: z.preprocess((val) => Number(val), z.number().min(1).optional().or(z.nan())),
  receiptUrl: z.string().nullable().optional(),
});

type TransactionFormData = z.infer<ReturnType<typeof buildTransactionSchema>>;

export const TransactionForm: React.FC<TransactionFormProps> = ({ onClose, onSuccess, cards, initialData, availableTags = [] }) => {
  const { t } = useLanguage();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // React Query Mutations
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const { data: budgets } = useBudgets();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Use budgets for categories, but also keep the initial category if it's not in the list (for editing legacy data)
  const budgetCategories = budgets?.map(b => b.category) || [];
  const initialCategory = initialData?.category;
  const uniqueCategories = Array.from(new Set([...budgetCategories, ...(initialCategory ? [initialCategory] : [])])).sort();

  const transactionSchema = React.useMemo(() => buildTransactionSchema(t), [t]);

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
        receiptUrl: initialData.receiptUrl,
      });
      setTags(initialData.tags || []);
      setReceiptPreview(initialData.receiptUrl || null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setReceiptPreview(base64);
        setValue('receiptUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
        totalInstallments: data.totalInstallments ? Number(data.totalInstallments) : undefined,
        installmentNumber: data.installmentNumber ? Number(data.installmentNumber) : undefined,
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
      console.error('Failed to save transaction', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {isEditing ? t('transactionForm.titleEdit') : t('transactionForm.titleNew')}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, (errors) => console.error("Form Validation Errors:", errors))} className="p-6 overflow-y-auto space-y-6">
          
          {/* Top Row: Type and Status */}
          <div className="flex gap-4">
            {/* Type Selector */}
            <div className="flex-1 flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setValue('type', TransactionType.EXPENSE)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${watchType === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <ArrowDownCircle size={16} /> {t('transactions.expense')}
              </button>
              <button
                type="button"
                onClick={() => setValue('type', TransactionType.INCOME)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${watchType === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                <ArrowUpCircle size={16} /> {t('transactions.income')}
              </button>
            </div>
            
            {/* Status Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3">
               <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('transactionForm.paidQuestion')}</span>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.amount')}</label>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.description')}</label>
            <input 
              type="text" 
              {...register('description')}
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
              placeholder={t('transactionForm.descriptionPlaceholder')}
            />
            {errors.description && <span className="text-red-500 text-xs mt-1 block">{errors.description.message}</span>}
          </div>

          {/* Category & Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.category')}</label>
            <div className="relative group">
              <select
                {...register('category')}
                className={`w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none dark:text-white ${errors.category ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
              >
                 <option value="" disabled>{t('transactionForm.categorySelect')}</option>
                 {uniqueCategories.map(cat => (
                   <option key={cat} value={cat}>{cat}</option>
                 ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ArrowDownCircle size={16} />
              </div>
            </div>
             {errors.category && <span className="text-red-500 text-xs mt-1 block">{errors.category.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.tags')}</label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 min-h-[46px]">
              {tags.map(tag => (
                <span key={tag} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-indigo-900 dark:hover:text-white rounded-full p-0.5 hover:bg-black/10"><X size={12} /></button>
                </span>
              ))}
              <div className="flex-1 min-w-[120px] relative">
                 <input 
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="bg-transparent border-none focus:ring-0 text-sm w-full h-full py-1 pl-7 dark:text-white"
                      placeholder={t('transactionForm.tagsPlaceholder')}
                 />
                 <Tag size={14} className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400" />
                 {tagInput && (
                   <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                      {availableTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)).map(tag => (
                        <div
                          key={tag}
                          className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer dark:text-slate-300"
                          onClick={() => { setTags([...tags, tag]); setTagInput(''); }}
                        >
                          {tag}
                        </div>
                      ))}
                      {tagInput && !availableTags.includes(tagInput) && (
                         <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700">
                           {t('transactionForm.createTagHint').replace('{tag}', tagInput)}
                         </div>
                      )}
                   </div>
                 )}
              </div>
            </div>
          </div>

          {/* Card & Date Row */}
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.date')}</label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.cardOptional')}</label>
              <div className="relative">
                <CardIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  {...register('cardId')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none dark:text-white"
                >
                  <option value="">{t('transactionForm.noCard')}</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-2 gap-4 auto-rows-fr">
             {/* Recurring Toggle */}
            <div className={`p-4 rounded-lg border transition-colors h-full flex flex-col justify-start ${isRecurring ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
              <div className="flex items-center space-x-3 mb-2">
                <input 
                  type="checkbox" 
                  id="recurring-toggle"
                  {...register('isRecurring')}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="recurring-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                  <Repeat size={16} /> {t('transactionForm.recurring')}
                </label>
              </div>
              {isRecurring && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <select
                    {...register('recurrenceFrequency')}
                    className="w-full text-xs p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    <option value={RecurrenceFrequency.WEEKLY}>{t('transactionForm.weekly')}</option>
                    <option value={RecurrenceFrequency.MONTHLY}>{t('transactionForm.monthly')}</option>
                    <option value={RecurrenceFrequency.YEARLY}>{t('transactionForm.yearly')}</option>
                  </select>
                  <div className="relative">
                    <label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">{t('transactionForm.endDateOptional')}</label>
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
              <div className={`p-4 rounded-lg border transition-colors h-full flex flex-col justify-start ${isInstallment ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-transparent dark:bg-slate-800'}`}>
                <div className="flex items-center space-x-3 mb-2">
                  <input 
                    type="checkbox" 
                    id="installment-toggle"
                    {...register('isInstallment')}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <label htmlFor="installment-toggle" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                   <Layers size={16} /> {t('transactionForm.installments')}
                  </label>
                </div>
                
                 {isInstallment && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 duration-300 mt-2">
                       <div>
                         <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Total</label>
                         <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{t('transactionForm.total')}</label>
                         <select 
                            {...register('totalInstallments', { valueAsNumber: true })}
                            // Only disable if editing an EXISTING installment. If converting single->installment (editing but !initialData.isInstallment), allow it.
                            disabled={isEditing && initialData?.isInstallment}
                            className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs dark:text-white disabled:opacity-70"
                          >
                            {[2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                              <option key={n} value={n}>{n}x</option>
                            ))}
                          </select>
                       </div>
                       <div>
                         <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">{t('transactionForm.currentNumber')}</label>
                         <input
                            type="number"
                            {...register('installmentNumber', { valueAsNumber: true })}
                            disabled={isEditing && initialData?.isInstallment}
                            min={1}
                            className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs dark:text-white disabled:opacity-70"
                          />
                       </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('transactionForm.receipt')}</label>
            <div className="flex items-center gap-4">
               {receiptPreview ? (
                 <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group">
                    <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setReceiptPreview(null); setValue('receiptUrl', ''); }} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={16} />
                    </button>
                 </div>
               ) : (
                 <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                    <Upload size={20} className="text-slate-400" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                 </label>
               )}
               <span className="text-xs text-slate-500">{t('transactionForm.receiptOptional')}</span>
            </div>
          </div>

          <div className="pt-4">
            <button 
              disabled={isSubmitting}
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>{t('common.processing')}</span>
              ) : (
                <>
                  {isEditing ? t('transactionForm.saveChanges') : t('transactionForm.createTransaction')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};