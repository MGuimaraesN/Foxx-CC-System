import React, { useRef, useState } from 'react';
import { Moon, Shield, Globe, Monitor, Database, Download, Upload, AlertTriangle, MessageSquare, Bot } from 'lucide-react';
import { generateBackup, restoreBackup, updateUserSettings } from '../services/userService';
import { toast } from 'sonner';
import { UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currency: string;
  setCurrency: (val: string) => void;
  language: string;
  setLanguage: (val: string) => void;
  userProfile?: UserProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  darkMode, setDarkMode, currency, setCurrency, language, setLanguage, userProfile
}) => {
  const { t, setLanguage: setContextLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [whatsappPhone, setWhatsappPhone] = useState(userProfile?.whatsappPhone || '');

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await updateUserSettings({ currency: newCurrency });
    toast.success(t('settings.currencyUpdated'));
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    setContextLanguage(newLanguage as any);
    await updateUserSettings({ language: newLanguage });
    toast.success(t('settings.languageUpdated'));
  };

  const handleWhatsappSave = async () => {
    if (!whatsappPhone) return;
    await updateUserSettings({ whatsappPhone });
    toast.success(t('settings.whatsappSaved'));
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const success = restoreBackup(content);
          if (success) {
            resolve('Data restored!');
            setTimeout(() => window.location.reload(), 1500);
          } else {
            reject(new Error(t('settings.invalidBackup')));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error(t('settings.readFileFailed')));
      reader.readAsText(file);
    });

    toast.promise(promise, {
      loading: t('settings.restoreLoading'),
      success: t('settings.restoreSuccess'),
      error: (err) => t('settings.restoreFailed').replace('{message}', err.message)
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* WhatsApp Assistant */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
             <Bot size={20} className="text-emerald-500" /> {t('settings.whatsapp')}
          </h3>
        </div>
        <div className="p-6 space-y-6">
           <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('settings.whatsappNumber')}</label>
                 <div className="flex gap-2">
                   <input
                      type="text"
                     placeholder={t('settings.whatsappPlaceholder')}
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   />
                   <button
                      onClick={handleWhatsappSave}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                   >
                     {t('common.save')}
                   </button>
                 </div>
                  <p className="text-xs text-slate-500 mt-2">{t('settings.whatsappHint')}</p>
              </div>
              <div className="flex-1 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                 <h4 className="font-semibold text-emerald-800 dark:text-emerald-400 text-sm mb-2 flex items-center gap-2">
                    <MessageSquare size={16} /> {t('settings.howToUse')}
                 </h4>
                 <ul className="space-y-2 text-xs text-emerald-700 dark:text-emerald-500">
                    <li>• {t('settings.howToExample1')}</li>
                    <li>• {t('settings.howToExample2')}</li>
                    <li>• {t('settings.howToExample3')}</li>
                 </ul>
              </div>
           </div>
        </div>
      </div>

      {/* Security & Data Safeguard */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-indigo-500" /> {t('settings.data')}
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
             <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
               <Database size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">{t('settings.backup')}</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.backupDesc')}</p>
             </div>
             <button 
               onClick={() => {
                 generateBackup();
                 toast.success(t('settings.backupGenerated'));
               }}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
             >
               <Download size={16} /> {t('settings.exportJson')}
             </button>
          </div>

           <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
             <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
               <Upload size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">{t('settings.restore')}</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.restoreDesc')}</p>
               <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                 <AlertTriangle size={10} /> {t('settings.restoreWarning')}
               </p>
             </div>
             <input 
               type="file" 
               accept=".json" 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleRestore}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
             >
               <Upload size={16} /> {t('settings.importBackup')}
             </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor size={20} className="text-slate-400" /> {t('settings.appearance')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{t('settings.darkMode')}</p>
              <p className="text-sm text-slate-500">{t('settings.themeHint')}</p>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe size={20} className="text-slate-400" /> {t('settings.localization')}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('settings.currency')}</label>
               <select
                 value={currency}
                 onChange={(e) => handleCurrencyChange(e.target.value)}
                 className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
               >
                   <option value="BRL">{t('settings.currencyBRL')}</option>
                   <option value="USD">{t('settings.currencyUSD')}</option>
                   <option value="EUR">{t('settings.currencyEUR')}</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('settings.language')}</label>
               <select
                 value={language}
                 onChange={(e) => handleLanguageChange(e.target.value)}
                 className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
               >
                   <option value="en">{t('settings.languageEnglish')}</option>
                   <option value="pt-BR">{t('settings.languagePortuguese')}</option>
               </select>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};