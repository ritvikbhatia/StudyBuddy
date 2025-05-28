import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface Translations {
  [key: string]: string | Translations; 
}

export const useTranslation = () => {
  const { preferredLanguage } = useAuth();
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTranslations = useCallback(async (lang: string) => {
    setLoading(true);
    try {
      // Correctly access the imported JSON module
      const langModule = await import(`../locales/${lang}.json`);
      setTranslations(langModule.default); // Use the module directly, not langModule.default
    } catch (error) {
      console.warn(`Could not load translations for language: ${lang}. Falling back to English.`);
      try {
        const fallbackModule = await import(`../locales/en.json`);
        setTranslations(fallbackModule.default); // Use the module directly for fallback
      } catch (fallbackError) {
        console.error('Could not load fallback English translations.', fallbackError);
        setTranslations({}); 
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTranslations(preferredLanguage);
  }, [preferredLanguage, loadTranslations]);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    if (loading || !translations) {
      return key; 
    }

     const translatedString = translations[key] as string;

    if (translatedString) {
      if (replacements) {
        return Object.keys(replacements).reduce((acc, placeholder) => {
          return acc.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
        }, translatedString);

      }
      return translatedString;
    }
    
   return key;
  }, [translations, loading]);

  return { t, loadingTranslations: loading, currentLanguage: preferredLanguage };
};
