import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('erp_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('erp_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  const toggleLang = useCallback(() => setLang((prev) => (prev === 'en' ? 'bn' : 'en')), []);
  const isBn = lang === 'bn';

  const value = useMemo(() => ({ lang, setLang, toggleLang, t, isBn }), [lang, t, toggleLang, isBn]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};
