'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordSchema, type PasswordResetRequestInput } from '@qiima/schemas';
import { usePasswordForgot } from '@qiima/queries';
import Link from 'next/link';
import { useState } from 'react';

export function ForgotPasswordForm() {
  const [emailSent, setEmailSent] = useState(false);
  const passwordForgot = usePasswordForgot({ env: 'web', baseURL: '/api' });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = (data: PasswordResetRequestInput) => {
    passwordForgot.mutate(data, {
      onSuccess: () => {
        setEmailSent(true);
      },
    });
  };

  if (emailSent) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Check your email</p>
          <p className="text-sm mt-1">
            We&apos;ve sent password reset instructions to your email address.
          </p>
        </div>
        <Link
          href="/login"
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Enter your email address and we&apos;ll send you instructions to reset your password.
        </p>
      </div>

      {passwordForgot.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">
            {passwordForgot.error.message || 'Failed to send reset email. Please try again.'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={passwordForgot.isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {passwordForgot.isPending ? 'Sending...' : 'Send reset instructions'}
      </button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Back to login
        </Link>
      </p>
    </form>
  );
}
