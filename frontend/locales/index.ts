import { ptBR } from './pt-BR';
import { enUS } from './en-US';

export const locales = {
  'pt-BR': ptBR,
  'en': enUS, // Mapping 'en' to enUS for fallback
  'en-US': enUS,
};

export type Language = keyof typeof locales;
export type TranslationKey = string; // Simplified for now
