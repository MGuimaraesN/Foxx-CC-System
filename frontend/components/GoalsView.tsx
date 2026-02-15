import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Target } from 'lucide-react';
import { Goal } from '../types';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '../services/goalService';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

export const GoalsView: React.FC = () => {
  const { t, language } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await fetchGoals();
      setGoals(data);
    } catch (error) {
      toast.error(t('goals.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setEditingGoal(null);
    setShowModal(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline ? goal.deadline.split('T')[0] : '');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('goals.confirmDelete'))) {
      try {
        await deleteGoal(id);
        toast.success(t('goals.deleted'));
        loadGoals();
      } catch (error) {
        toast.error(t('goals.deleteFailed'));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        deadline: deadline ? new Date(deadline).toISOString() : null
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
        toast.success(t('goals.updated'));
      } else {
        await createGoal(payload);
        toast.success(t('goals.created'));
      }
      resetForm();
      loadGoals();
    } catch (error) {
      toast.error(t('goals.saveFailed'));
    }
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat(language === 'en' ? 'en-US' : language, { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="text-indigo-600" /> {t('goals.title')}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> {t('goals.newGoal')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">{t('goals.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const percentage = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
            return (
              <div key={goal.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-xs text-slate-500">{t('goals.targetLabel')} {new Date(goal.deadline).toLocaleDateString(language === 'en' ? 'en-US' : language)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(goal)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {formatMoney(goal.currentAmount)}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatMoney(goal.targetAmount)}
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-right text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">{percentage.toFixed(1)}%</p>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="col-span-full text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500">{t('goals.noGoals')}</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingGoal ? t('goals.editGoal') : t('goals.newSavingsGoal')}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('goals.goalName')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder={t('goals.goalNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('goals.targetAmount')}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('goals.currentSaved')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('goals.deadlineOptional')}</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
                >
                  {editingGoal ? t('goals.updateGoal') : t('goals.createGoal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
