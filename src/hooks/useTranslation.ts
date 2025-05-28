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
      setTranslations(langModule); // Use the module directly, not langModule.default
    } catch (error) {
      console.warn(`Could not load translations for language: ${lang}. Falling back to English.`);
      try {
        const fallbackModule = await import(`../locales/en.json`);
        setTranslations(fallbackModule); // Use the module directly for fallback
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

    const keys = key.split('.');
    let current: string | Translations | undefined = translations;

    for (const k of keys) {
      if (typeof current === 'object' && current !== null && k in current) {
        current = current[k];
      } else {
        current = undefined; 
        break;
      }
    }
    
    let translatedString = typeof current === 'string' ? current : key; 

    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translatedString = translatedString.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }

    return translatedString;
  }, [translations, loading]);

  return { t, loadingTranslations: loading, currentLanguage: preferredLanguage };
};
