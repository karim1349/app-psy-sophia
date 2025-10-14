import { renderHook } from '@testing-library/react';
import { useI18n, useI18nNamespace } from './hooks';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: jest.fn((key: string) => key),
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
      isInitialized: true,
    },
  })),
}));

describe('i18n hooks', () => {
  it('should return correct values from useI18n', () => {
    const { result } = renderHook(() => useI18n());
    
    expect(result.current.t).toBeDefined();
    expect(result.current.changeLanguage).toBeDefined();
    expect(result.current.currentLanguage).toBe('en');
    expect(result.current.isReady).toBe(true);
  });

  it('should return correct values from useI18nNamespace', () => {
    const { result } = renderHook(() => useI18nNamespace('test'));
    
    expect(result.current.t).toBeDefined();
    expect(result.current.changeLanguage).toBeDefined();
    expect(result.current.currentLanguage).toBe('en');
    expect(result.current.isReady).toBe(true);
  });
});
