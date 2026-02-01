import React, { createContext, useContext, useState, useEffect } from 'react';
import { locales, Language } from '../locales';
import { getUserProfile } from '../services/userService';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt-BR');

  useEffect(() => {
    const initLang = async () => {
      // 1. Try LocalStorage
      const cached = localStorage.getItem('cc_language');
      if (cached && (cached === 'pt-BR' || cached === 'en' || cached === 'en-US')) {
        setLanguage(cached as Language);
      } else {
        // 2. Try User Profile if authenticated (simplified check)
        // Ideally we check auth state, but this effect runs on mount.
        // We can just rely on the App.tsx sync for profile updates.
      }
    };
    initLang();
  }, []);

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: any = locales[language];

    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to en-US if key missing
        console.warn(`Missing translation: ${path} in ${language}`);
        return path;
      }
      current = current[key];
    }
    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
