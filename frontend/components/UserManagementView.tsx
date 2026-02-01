import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { User, Mail, Link as LinkIcon, Save, CheckCircle } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', avatarUrl: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(profile);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
         <div className="flex items-center gap-4 mb-8">
           <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border-2 border-indigo-200 dark:border-indigo-800">
             {profile.avatarUrl ? (
               <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <User size={32} className="text-indigo-600 dark:text-indigo-400" />
             )}
           </div>
           <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Settings</h2>
             <p className="text-sm text-slate-500">Manage your personal information</p>
           </div>
         </div>

         <form onSubmit={handleSave} className="space-y-6">
           <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
             <div className="relative">
               <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 value={profile.name}
                 onChange={e => setProfile({...profile, name: e.target.value})}
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
               />
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
             <div className="relative">
               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="email" 
                 value={profile.email}
                 onChange={e => setProfile({...profile, email: e.target.value})}
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
               />
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Avatar URL</label>
             <div className="relative">
               <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 value={profile.avatarUrl}
                 onChange={e => setProfile({...profile, avatarUrl: e.target.value})}
                 placeholder="https://example.com/me.jpg"
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
               />
             </div>
           </div>

           <div className="pt-4">
             <button 
               type="submit"
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
             >
               <Save size={18} /> Save Changes
             </button>
           </div>
         </form>

         {success && (
           <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg flex items-center gap-2 text-sm">
             <CheckCircle size={16} /> Profile updated successfully!
           </div>
         )}
       </div>
    </div>
  );
};