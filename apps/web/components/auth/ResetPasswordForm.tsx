'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordSchema, type ResetPasswordInput } from '@qiima/schemas';
import { usePasswordReset } from '@qiima/queries';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetSuccess, setResetSuccess] = useState(false);
  const passwordReset = usePasswordReset({ env: 'web', baseURL: '/api' });

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: token || '',
    },
  });

  const onSubmit = (data: ResetPasswordInput) => {
    passwordReset.mutate(data, {
      onSuccess: () => {
        setResetSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      },
    });
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Invalid reset link</p>
          <p className="text-sm mt-1">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Password reset successful</p>
          <p className="text-sm mt-1">
            Your password has been reset. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('token')} />

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          New Password
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Must be at least 8 characters with uppercase, lowercase, digit and special character
        </p>
      </div>

      <div>
        <label
          htmlFor="password_confirm"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Confirm Password
        </label>
        <input
          {...register('password_confirm')}
          type="password"
          id="password_confirm"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="••••••••"
        />
        {errors.password_confirm && (
          <p className="text-red-500 text-sm mt-1">
            {errors.password_confirm.message}
          </p>
        )}
      </div>

      {passwordReset.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">
            {passwordReset.error.message || 'Failed to reset password. Please try again.'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={passwordReset.isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {passwordReset.isPending ? 'Resetting password...' : 'Reset password'}
      </button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
          Back to login
        </Link>
      </p>
    </form>
  );
}
