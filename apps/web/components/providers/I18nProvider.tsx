'use client';

import React, { useEffect } from 'react';
import { initI18n } from '@qiima/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // Initialize i18n when the app starts
    initI18n();
  }, []);

  return <>{children}</>;
}
