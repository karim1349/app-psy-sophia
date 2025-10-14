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
  password_confirm: string;
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
  password_confirm: string;
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
  password_confirm?: string[];
  token?: string[];
  code?: string[];
  non_field_errors?: string[];
}

// Form validation schemas (for Zod)
export const LoginSchema = {
  email: 'string (email format)',
  password: 'string (min: 1)',
} as const;

export const RegisterSchema = {
  email: 'string (email format)',
  username: 'string (min: 3, max: 30)',
  password: 'string (Django password validators)',
  password_confirm: 'string (must match password)',
} as const;

export const PasswordResetRequestSchema = {
  email: 'string (email format)',
} as const;

export const PasswordResetConfirmSchema = {
  token: 'string (required)',
  password: 'string (Django password validators)',
  password_confirm: 'string (must match password)',
} as const;

export const VerifyEmailSchema = {
  email: 'string (email format)',
  code: 'string (exactly 6 digits)',
} as const;

export const ResendVerificationSchema = {
  email: 'string (email format)',
} as const;

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