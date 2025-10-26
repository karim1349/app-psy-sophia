import { supportedLanguages, defaultLanguage } from './config';

describe('i18n config', () => {
  it('should have correct supported languages', () => {
    expect(supportedLanguages).toEqual(['en', 'fr', 'ar']);
  });

  it('should have correct default language', () => {
    expect(defaultLanguage).toBe('fr');
  });
});
