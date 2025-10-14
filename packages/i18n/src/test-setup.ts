// Test setup for i18n package
import 'jest';

// Mock i18next for tests
jest.mock('i18next', () => ({
  init: jest.fn(),
  changeLanguage: jest.fn(),
  t: jest.fn((key: string) => key),
  language: 'en',
  languages: ['en', 'fr', 'ar'],
  hasResourceBundle: jest.fn(() => true),
  getResourceBundle: jest.fn(() => ({})),
  use: jest.fn().mockReturnThis(),
  isInitialized: true,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
      isInitialized: true,
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));
