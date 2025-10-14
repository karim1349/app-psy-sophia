'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VerifyEmailSchema, type VerifyEmailInput } from '@qiima/schemas';
import { useVerifyEmail, useResendVerification } from '@qiima/queries';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const verifyEmail = useVerifyEmail({ env: 'web', baseURL: '/api' });
  const resendVerification = useResendVerification({ env: 'web', baseURL: '/api' });

  const email = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailInput>({
    resolver: zodResolver(VerifyEmailSchema),
    defaultValues: {
      email,
      code: '',
    },
  });

  const onSubmit = (data: VerifyEmailInput) => {
    verifyEmail.mutate(data, {
      onSuccess: () => {
        setVerifySuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      },
    });
  };

  const handleResend = () => {
    if (!email) return;
    resendVerification.mutate(
      { email },
      {
        onSuccess: () => {
          setResendSuccess(true);
          setTimeout(() => setResendSuccess(false), 3000);
        },
      }
    );
  };

  if (verifySuccess) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="text-sm font-medium">Email verified successfully!</p>
          <p className="text-xs mt-1">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('email')} value={email} />

      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Verification Code
        </label>
        <input
          {...register('code')}
          type="text"
          id="code"
          maxLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-center text-2xl font-semibold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="123456"
        />
        {errors.code && (
          <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1 text-center">
          Enter the 6-digit code from your email
        </p>
      </div>

      {verifyEmail.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">
            {verifyEmail.error.message || 'Verification failed. Please try again.'}
          </p>
        </div>
      )}

      {resendSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          <p className="text-sm">
            Code sent to your email
          </p>
        </div>
      )}

      {resendVerification.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">
            {resendVerification.error.message || 'Failed to resend code. Please try again.'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={verifyEmail.isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {verifyEmail.isPending ? 'Verifying...' : 'Verify'}
      </button>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendVerification.isPending || resendSuccess}
            className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendVerification.isPending ? 'Sending...' : 'Resend code'}
          </button>
        </p>
      </div>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Back to login
        </Link>
      </p>
    </form>
  );
}
