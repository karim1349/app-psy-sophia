import React, { useEffect, useState } from 'react';
import { initI18n } from '@app-psy-sophia/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        await initI18n();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        setIsInitialized(true); // Still render children even if i18n fails
      }
    };

    initializeI18n();
  }, []);

  // Show loading state while initializing
  if (!isInitialized) {
    return null; // or a loading component
  }

  return <>{children}</>;
}
