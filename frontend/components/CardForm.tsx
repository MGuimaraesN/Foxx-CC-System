import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, CreditCard, Wifi, CircuitBoard, Smartphone } from 'lucide-react';
import { useCreateCard, useUpdateCard } from '../hooks/useTransactions';
import { CreditCard as CreditCardType } from '../types';

interface CardFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CreditCardType | null;
}

const cardSchema = z.object({
  name: z.string().min(3, "Card name is required"),
  last4Digits: z.string().length(4, "Must be exactly 4 digits").regex(/^\d+$/, "Must be numbers"),
  limit: z.number().min(1, "Limit must be greater than 0"),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
});

type CardFormData = z.infer<typeof cardSchema>;

const CARD_THEMES = [
  { id: 'slate', class: 'bg-slate-900', label: 'Obsidian' },
  { id: 'purple', class: 'bg-purple-600', label: 'Royal' },
  { id: 'indigo', class: 'bg-indigo-600', label: 'Deep Blue' },
  { id: 'blue', class: 'bg-blue-500', label: 'Azure' },
  { id: 'emerald', class: 'bg-emerald-600', label: 'Forest' },
  { id: 'rose', class: 'bg-rose-600', label: 'Ruby' },
  { id: 'orange', class: 'bg-orange-500', label: 'Sunset' },
];

export const CardForm: React.FC<CardFormProps> = ({ onClose, onSuccess, initialData }) => {
  const [selectedColor, setSelectedColor] = useState(CARD_THEMES[0].class);
  const isEditing = !!initialData;
  
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: '',
      last4Digits: '',
      limit: undefined,
      closingDay: undefined,
      dueDay: undefined
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        last4Digits: initialData.last4Digits,
        limit: initialData.limit,
        closingDay: initialData.closingDay,
        dueDay: initialData.dueDay
      });
      setSelectedColor(initialData.color);
    }
  }, [initialData, reset]);

  const createCardMutation = useCreateCard({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  const updateCardMutation = useUpdateCard({
    onSuccess: () => {
      onSuccess();
      onClose();
    }
  });

  const onSubmit = (data: CardFormData) => {
    if (isEditing && initialData) {
      updateCardMutation.mutate({
        ...initialData,
        ...data,
        color: selectedColor
      });
    } else {
      createCardMutation.mutate({
        ...data,
        color: selectedColor
      });
    }
  };

  // Watch values for Live Preview
  const watchedName = watch('name') || 'Your Name';
  const watchedDigits = watch('last4Digits') || '1234';
  const watchedLimit = watch('limit') || 0;
  const watchedClosing = watch('closingDay') || 1;
  const watchedDue = watch('dueDay') || 10;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const isLoading = createCardMutation.isPending || updateCardMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Column: Live Preview */}
        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-950 p-8 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 relative">
          <div className="text-center mb-8 z-10">
            <h3 className="text-lg font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Preview</h3>
            <p className="text-sm text-slate-400">See how your card looks in real-time</p>
          </div>

          {/* Realistic Card Component */}
          <div className={`relative w-full aspect-[1.586/1] rounded-2xl p-6 text-white shadow-2xl transition-all duration-500 transform hover:scale-105 ${selectedColor}`}>
            {/* Glossy Overlay/Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-black/20 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col h-full justify-between">
              {/* Card Top */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                   <div className="w-10 h-8 bg-yellow-400/80 rounded-md relative overflow-hidden flex items-center justify-center shadow-inner">
                      <CircuitBoard className="text-yellow-600/50 w-full h-full opacity-50" />
                   </div>
                   <Wifi className="rotate-90 opacity-80" size={20} />
                </div>
                {/* Removed VISA text */}
              </div>

              {/* Card Number */}
              <div className="mt-4">
                <div className="flex items-center gap-3 text-xl md:text-2xl font-mono tracking-widest opacity-90 drop-shadow-md">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>{watchedDigits.padEnd(4, '•').substring(0, 4)}</span>
                </div>
              </div>

              {/* Card Details (Bottom) */}
              <div className="flex justify-between items-end mt-auto">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase opacity-60 tracking-wider font-semibold">Card Holder</p>
                  <p className="font-medium tracking-wide uppercase truncate max-w-[140px]">{watchedName}</p>
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[10px] uppercase opacity-60 tracking-wider font-semibold">Limit</p>
                   <p className="font-semibold">{formatCurrency(watchedLimit)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Badge */}
          <div className="mt-12 flex gap-6 text-xs text-slate-400">
             <div className="flex flex-col items-center gap-1">
                <span className="font-semibold text-slate-900 dark:text-white">{watchedClosing}th</span>
                <span>Closing Day</span>
             </div>
             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
             <div className="flex flex-col items-center gap-1">
                <span className="font-semibold text-slate-900 dark:text-white">{watchedDue}th</span>
                <span>Due Day</span>
             </div>
          </div>

        </div>

        {/* Right Column: Form */}
        <div className="w-full md:w-7/12 flex flex-col h-full bg-white dark:bg-slate-900">
           <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Card Details' : 'Add New Card'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
              
              {/* Theme Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Card Style</label>
                <div className="flex flex-wrap gap-3">
                  {CARD_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedColor(theme.class)}
                      className={`w-10 h-10 rounded-full cursor-pointer transition-all duration-200 ring-2 ring-offset-2 dark:ring-offset-slate-900 ${theme.class} ${selectedColor === theme.class ? 'ring-indigo-500 scale-110 shadow-lg' : 'ring-transparent hover:scale-105'}`}
                      title={theme.label}
                    />
                  ))}
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Card Name</label>
                <input 
                  type="text" 
                  {...register('name')}
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                  placeholder="e.g. Nubank Platinum"
                />
                {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message}</span>}
              </div>

              {/* Digits & Limit Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last 4 Digits</label>
                  <div className="relative">
                     <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input 
                      type="text" 
                      maxLength={4}
                      {...register('last4Digits')}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono ${errors.last4Digits ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      placeholder="8842"
                    />
                  </div>
                  {errors.last4Digits && <span className="text-red-500 text-xs mt-1 block">{errors.last4Digits.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total Limit</label>
                  <input 
                    type="number" 
                    {...register('limit', { valueAsNumber: true })}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${errors.limit ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                    placeholder="15000"
                  />
                  {errors.limit && <span className="text-red-500 text-xs mt-1 block">{errors.limit.message}</span>}
                </div>
              </div>

              {/* Days Row */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Closing Day</label>
                   <input 
                      type="number" 
                      {...register('closingDay', { valueAsNumber: true })}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${errors.closingDay ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      placeholder="Day (1-31)"
                   />
                   {errors.closingDay && <span className="text-red-500 text-xs mt-1 block">{errors.closingDay.message}</span>}
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Due Day</label>
                   <input 
                      type="number" 
                      {...register('dueDay', { valueAsNumber: true })}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white ${errors.dueDay ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                      placeholder="Day (1-31)"
                   />
                   {errors.dueDay && <span className="text-red-500 text-xs mt-1 block">{errors.dueDay.message}</span>}
                 </div>
              </div>

              <div className="pt-6 mt-auto">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Processing...' : (isEditing ? 'Save Changes' : 'Save Card')}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};