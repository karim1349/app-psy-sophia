import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from './config';
import { languageStorage } from './storage';

export const useI18n = () => {
  const { t, i18n } = useTranslation('common');
  
  const changeLanguage = (language: SupportedLanguage) => {
    console.log('Changing language to:', language);
    return i18n.changeLanguage(language).then(async () => {
      console.log('Language changed successfully to:', i18n.language);
      // Save to AsyncStorage
      try {
        await languageStorage.setItem('i18nextLng', language);
        console.log('Language saved to storage:', language);
      } catch (error) {
        console.error('Failed to save language to storage:', error);
      }
    }).catch((error) => {
      console.error('Failed to change language:', error);
    });
  };
  
  const currentLanguage = i18n.language as SupportedLanguage;
  
  return {
    t,
    changeLanguage,
    currentLanguage,
    isReady: i18n.isInitialized,
  };
};

// Hook for getting translation with namespace
export const useI18nNamespace = (namespace: string) => {
  const { t, i18n } = useTranslation(namespace);
  
  const changeLanguage = (language: SupportedLanguage) => {
    return i18n.changeLanguage(language);
  };
  
  const currentLanguage = i18n.language as SupportedLanguage;
  
  return {
    t,
    changeLanguage,
    currentLanguage,
    isReady: i18n.isInitialized,
  };
};
