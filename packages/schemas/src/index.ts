/**
 * @app-psy-sophia/schemas
 *
 * Shared Zod validation schemas for app-psy-sophia application
 * Provides client-side validation that mirrors backend Django validation
 */

export {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  type RegisterInput,
  type LoginInput,
  type PasswordResetRequestInput,
  type PasswordResetConfirmInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
} from './auth';

export {
  mockUsers,
} from './mock-data';
