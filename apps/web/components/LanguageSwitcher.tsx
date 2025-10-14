'use client';

import React from 'react';
import { useI18n, supportedLanguages } from '@qiima/i18n';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage } = useI18n();

  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 border border-gray-200 ${className || ''}`}>
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            currentLanguage === lang
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
          onClick={() => changeLanguage(lang)}
        >
          {lang === 'ar' ? 'عربي' : lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
