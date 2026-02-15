import React, { useState, useMemo } from 'react';
import { CreditCard, Transaction } from '../types';
import { Skeleton } from './ui/Skeleton';
import { Plus, Wifi, Edit2, ThumbsUp, Trash2 } from 'lucide-react';
import { CardForm } from './CardForm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCard } from '../services/transactionService';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

interface CardsViewProps {
  cards: CreditCard[];
  loading: boolean;
  onSuccess?: () => void;
  transactions?: Transaction[];
  isPrivate?: boolean;
}

export const CardsView: React.FC<CardsViewProps> = ({ cards, loading, onSuccess, transactions = [], isPrivate = false }) => {
  const { t, language } = useLanguage();
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success(t('cardsView.deleted'));
      setCardToDelete(null);
    },
    onError: () => toast.error(t('cardsView.deleteFailed'))
  });

  const history = useMemo(() => {
      if (!selectedCardId || !transactions) return [];

      const cardTx = transactions.filter(t => t.cardId === selectedCardId && (t.type === 'EXPENSE' || t.amount < 0)); // Handle expense
      const grouped = cardTx.reduce((acc, t) => {
          const date = new Date(t.date);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!acc[key]) acc[key] = 0;
          acc[key] += Math.abs(t.amount); // Sum absolute amount
          return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped)
        .sort((a, b) => b[0].localeCompare(a[0])) // Descending
        .map(([key, amount]) => ({ month: key, amount }));
  }, [selectedCardId, transactions]);

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  const handleClose = () => {
    setShowCardModal(false);
    setEditingCard(null);
  };

  const isBestDayToBuy = (closingDay: number) => {
    const today = new Date().getDate();
    // Simple logic: If today is closing day, it's the best day (next invoice is far)
    return today === closingDay;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowCardModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} /> {t('cardsView.addNew')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl transition-transform hover:-translate-y-1 group ${card.color || 'bg-slate-800'}`}
          >
            {/* Best Buy Day Badge */}
            {isBestDayToBuy(card.closingDay) && (
              <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg shadow-lg z-20 flex items-center gap-1">
                 <ThumbsUp size={10} /> {t('cardsView.bestDayToBuy')}
              </div>
            )}

            {/* Background Decor */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl" />

            {/* Edit Overlay Button */}
            <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
               <button 
                 onClick={() => handleEdit(card)}
                 className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-sm transition-colors"
                 title={t('cardsView.editCard')}
               >
                 <Edit2 size={16} />
               </button>
               <button
                 onClick={() => setCardToDelete(card.id)}
                 className="p-2 bg-red-500/80 hover:bg-red-600/80 rounded-full text-white backdrop-blur-sm transition-colors"
                 title={t('cardsView.deleteCard')}
               >
                 <Trash2 size={16} />
               </button>
            </div>

            <div className="relative z-10 flex flex-col h-48 justify-between pointer-events-none">
              <div className="flex justify-between items-start mt-4">
                <div>
                  <h3 className="font-bold text-lg tracking-wide">{card.name}</h3>
                  <p className="text-xs opacity-75">{t('cardsView.cardLabel')}</p>
                </div>
                <Wifi size={24} className="opacity-75" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-4 text-lg tracking-widest font-mono opacity-90">
                  <span>••••</span>
                  <span>••••</span>
                  <span>••••</span>
                  <span>{card.last4Digits}</span>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-75 mb-1">{t('cardsView.totalLimit')}</p>
                  <p className="font-semibold">{isPrivate ? 'R$ ••••' : formatCurrency(card.limit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-75 mb-1">{t('cardsView.closingDay')}</p>
                  <p className="font-semibold">{card.closingDay}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Card Placeholder */}
        <button 
          onClick={() => setShowCardModal(true)}
          className="h-full min-h-[14rem] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-900/50"
        >
          <Plus size={32} className="mb-2" />
          <span className="font-medium">{t('cardsView.linkNew')}</span>
        </button>
      </div>

      {/* Card Details / Analysis Section */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cardsView.limitUtilization')}</h3>
          <div className="space-y-4">
            {cards.map(card => {
               const cardExpenses = transactions.filter(t => t.cardId === card.id && (t.type === 'EXPENSE' || t.amount < 0));
               const totalUsed = cardExpenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
               const utilPercent = card.limit > 0 ? (totalUsed / card.limit) * 100 : 0;
               const visualPercent = Math.min(100, utilPercent);

               return (
                 <div key={card.id}>
                   <div className="flex justify-between text-sm mb-1">
                     <span className="text-slate-700 dark:text-slate-300">{card.name}</span>
                     <span className="text-slate-500">{utilPercent.toFixed(1)}%</span>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                     <div
                        className={`h-2.5 rounded-full ${utilPercent > 75 ? 'bg-red-500' : 'bg-indigo-600'}`}
                        style={{ width: `${visualPercent}%` }}
                      ></div>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cardsView.invoiceHistory')}</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedCardId === card.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                        {card.name}
                    </button>
                ))}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {selectedCardId ? (
                    history.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">{t('cardsView.noHistory')}</p>
                    ) : (
                        history.map(item => (
                            <div key={item.month} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                <span className="font-medium text-slate-700 dark:text-slate-300 text-sm capitalize">
                            {new Date(item.month + '-02').toLocaleDateString(language === 'en' ? 'en-US' : language, { month: 'long', year: 'numeric' })}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {isPrivate ? 'R$ ••••' : formatCurrency(item.amount)}
                                </span>
                            </div>
                        ))
                    )
                ) : (
                    <p className="text-slate-500 text-sm text-center py-4">{t('cardsView.selectCard')}</p>
                )}
            </div>
        </div>
      </div>

      {showCardModal && (
        <CardForm 
          onClose={handleClose} 
          onSuccess={() => onSuccess && onSuccess()}
          initialData={editingCard}
        />
      )}

      {cardToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('cardsView.deleteTitle')}</h3>
            <p className="text-slate-500 text-sm mb-6">{t('cardsView.deleteConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(cardToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};