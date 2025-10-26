/**
 * Authentication-related TypeScript interfaces matching Django serializers
 */

// Base types
export type Timestamp = string; // ISO 8601 format from Django

// User interfaces (from existing Django UserSerializer)
export interface User {
  id: number;
  email: string;
  username: string;
  created_at: Timestamp;
  is_active: boolean;
  is_guest: boolean;
}

// Authentication request/response interfaces
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string; // JWT access token
  refresh: string; // JWT refresh token
  user: User;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  passwordConfirm: string;
}

export interface RegisterResponse {
  access: string; // JWT access token
  refresh: string; // JWT refresh token
  user: User;
  message: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  password: string;
  passwordConfirm: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string; // 6-digit verification code
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
}

export interface ResendVerificationInput {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// JWT Token interfaces
export interface TokenRefreshInput {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

export interface TokenVerifyInput {
  token: string;
}

export interface TokenVerifyResponse {
  // Empty response for successful verification
}

// Error response interface
export interface AuthErrorResponse {
  detail?: string;
  email?: string[];
  username?: string[];
  password?: string[];
  passwordConfirm?: string[];
  token?: string[];
  code?: string[];
  non_field_errors?: string[];
}

import { z } from 'zod';

// Password complexity validation
const passwordComplexity = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email transformation (trim and lowercase)
const emailTransform = z.string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address');

// Form validation schemas (for Zod)
export const LoginSchema = z.object({
  email: emailTransform,
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: emailTransform,
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  password: passwordComplexity,
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

export const ForgotPasswordSchema = z.object({
  email: emailTransform,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordComplexity,
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

export const VerifyEmailSchema = z.object({
  email: emailTransform,
  code: z.string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Verification code must be numeric'),
});

export const ResendVerificationSchema = z.object({
  email: emailTransform,
});

// Session/State interfaces
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginInput) => Promise<void>;
  register: (userData: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  verifyEmail: (data: VerifyEmailInput) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (data: PasswordResetConfirmInput) => Promise<void>;
  clearError: () => void;
}