import i18n from 'i18next';

import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { appConfig } from '@/config';

import en from './locales/en.json';
import vi from './locales/vi.json';

export const defaultNS = 'translation';
export const resources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

export const supportedLngs = appConfig.languages.map((lang) => lang.code);
const fallbackLng = appConfig.defaultLanguage;

const LNG_STORAGE_KEY = 'i18nextLng';
try {
  const cached = localStorage.getItem(LNG_STORAGE_KEY);
  const base = cached?.split('-')[0];
  if (!base || !supportedLngs.includes(base)) {
    localStorage.setItem(LNG_STORAGE_KEY, fallbackLng);
  }
} catch {
  // localStorage unavailable (private mode, etc.) — nothing to sanitize
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,

    supportedLngs,
    fallbackLng,
    load: 'languageOnly',
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

if (appConfig?.translations) {
  for (const [lang, overrides] of Object.entries(appConfig.translations)) {
    i18n.addResourceBundle(lang, 'translation', overrides, true, true);
  }
}

export default i18n;
