// Main exports
export { initI18n, supportedLanguages, defaultLanguage, type SupportedLanguage } from './config';
export { useI18n, useI18nNamespace } from './hooks';
export { default as i18n } from './config';

// Re-export react-i18next components for convenience
export { Trans } from 'react-i18next';
