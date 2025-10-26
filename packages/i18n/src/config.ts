import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageStorage } from './storage';

// Import translation files
import enCommon from './locales/en/common.json';
import frCommon from './locales/fr/common.json';
import arCommon from './locales/ar/common.json';

import enErrors from './locales/en/errors.json';
import frErrors from './locales/fr/errors.json';
import arErrors from './locales/ar/errors.json';

import enSuccess from './locales/en/success.json';
import frSuccess from './locales/fr/success.json';
import arSuccess from './locales/ar/success.json';


import enSearch from './locales/en/search.json';
import frSearch from './locales/fr/search.json';
import arSearch from './locales/ar/search.json';

export const supportedLanguages = ['en', 'fr', 'ar'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const defaultLanguage: SupportedLanguage = 'fr';

export const resources = {
  en: {
    common: enCommon,
    errors: enErrors,
    success: enSuccess,
    search: enSearch,
  },
  fr: {
    common: frCommon,
    errors: frErrors,
    success: frSuccess,
    search: frSearch,
  },
  ar: {
    common: arCommon,
    errors: arErrors,
    success: arSuccess,
    search: arSearch,
  },
} as const;

export const initI18n = async (language?: SupportedLanguage) => {
  // Suppress the Intl.PluralRules warning for React Native
  const originalWarn = console.warn;
  console.warn = (message: string) => {
    if (message.includes('i18next::pluralResolver') && message.includes('Intl API')) {
      return; // Suppress this specific warning
    }
    originalWarn(message);
  };

  // Get saved language from storage
  let savedLanguage = language;
  if (!savedLanguage) {
    try {
      savedLanguage = await languageStorage.getItem('i18nextLng') as SupportedLanguage;
    } catch (error) {
      console.log('Failed to load saved language:', error);
    }
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage || defaultLanguage,
      fallbackLng: defaultLanguage,
      defaultNS: 'common',
      ns: ['common', 'errors', 'success'],
      
      interpolation: {
        escapeValue: false, // React already does escaping
      },
      
      // React Native specific options
      react: {
        useSuspense: false, // Disable suspense for React Native compatibility
      },
      
      // Compatibility options for React Native
      compatibilityJSON: 'v3',
      pluralSeparator: '_',
      contextSeparator: '_',
      keySeparator: '.',
      nsSeparator: ':',
      
      // React Native compatible persistence
      saveMissing: false,
      updateMissing: false,
    });

  // Restore original console.warn
  console.warn = originalWarn;

  return i18n;
};

export default i18n;
