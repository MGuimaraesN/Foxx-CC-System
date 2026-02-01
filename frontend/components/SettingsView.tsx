import React, { useRef } from 'react';
import { Moon, Shield, Globe, Monitor, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import { generateBackup, restoreBackup } from '../services/userService';
import { toast } from 'sonner';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ darkMode, setDarkMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            reject(new Error('Invalid backup file structure'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });

    toast.promise(promise, {
      loading: 'Validating and restoring data...',
      success: 'System restored successfully! Reloading...',
      error: (err) => `Restore failed: ${err.message}`
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Security & Data Safeguard */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-emerald-500" /> Data Safeguard
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
             <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
               <Database size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">Full System Backup</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Download all your data (Transactions, Cards, Profile) as a JSON file.</p>
             </div>
             <button 
               onClick={() => {
                 generateBackup();
                 toast.success('Backup file generated');
               }}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
             >
               <Download size={16} /> Export JSON
             </button>
          </div>

           <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
             <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
               <Upload size={24} />
             </div>
             <div className="flex-1">
               <h4 className="font-semibold text-slate-900 dark:text-white">Restore Data</h4>
               <p className="text-sm text-slate-500 dark:text-slate-400">Overwrite current data with a backup file.</p>
               <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                 <AlertTriangle size={10} /> This action cannot be undone.
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
               <Upload size={16} /> Import Backup
             </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor size={20} className="text-slate-400" /> Appearance
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
              <p className="text-sm text-slate-500">Switch between light and dark themes</p>
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
            <Globe size={20} className="text-slate-400" /> Localization
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Primary Currency</label>
               <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white">
                 <option value="BRL">Real Brasileiro (BRL)</option>
                 <option value="USD">US Dollar (USD)</option>
                 <option value="EUR">Euro (EUR)</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Language</label>
               <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white">
                 <option value="en">English</option>
                 <option value="pt">Português</option>
               </select>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};