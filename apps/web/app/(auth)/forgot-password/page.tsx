import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useI18n } from '@qiima/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password - Qiima',
  description: 'Reset your Qiima password',
};

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="mb-8">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.forgotPassword.title')}</h1>
          <p className="text-gray-600">
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
