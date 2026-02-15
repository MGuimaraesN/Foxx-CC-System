import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock } from 'lucide-react';
import { login } from '../services/userService';
import { toast } from 'sonner';
import { useLanguage } from '../context/LanguageContext';

const buildLoginSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t('validation.invalidEmail')),
  password: z.string().min(1, t('validation.passwordRequired')),
});

type LoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const loginSchema = React.useMemo(() => buildLoginSchema(t), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    // Simulate slight delay for effect
    // await new Promise(resolve => setTimeout(resolve, 800));

    const success = await login(data.email, data.password);

    if (success) {
      toast.success(t('auth.welcomeToast'));
      onLoginSuccess();
    } else {
      toast.error(t('auth.invalidCredentials'));
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('auth.welcomeBack')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t('auth.signInSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                {...register('email')}
                type="email"
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white`}
                placeholder="name@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.passwordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                {...register('password')}
                type="password"
                className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white`}
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : t('auth.signIn')}
          </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('auth.noAccount')} <a href="#" className="text-indigo-600 font-semibold hover:underline">{t('auth.contactAdmin')}</a>
            </p>
            <p className="text-xs text-slate-400 mt-4">
               {t('auth.demoCredentials')}
            </p>
        </div>
      </div>
    </div>
  );
};
