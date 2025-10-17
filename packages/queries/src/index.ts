/**
 * @app-psy-sophia/queries - TanStack Query hooks for app-psy-sophia API
 *
 * Provides React Query hooks for authentication, data fetching, and mutations
 * with platform-specific behavior (native vs web).
 */

// Query client setup
export { createQueryClient } from './client';

// Error handling
export { mapErrorToToast, shouldSuppressError, mapSuccessToToast } from './error-handler';
export type { ToastError } from './error-handler';

// Query keys
export { queryKeys } from './keys';

// Network listeners
export { setupNetworkListeners as setupNativeNetworkListeners } from './native.net';
export { setupNetworkListeners as setupWebNetworkListeners } from './web.net';

// Auth hooks
export {
  useRegister,
  useLogin,
  useLogout,
  usePasswordForgot,
  usePasswordReset,
  useMeQuery,
  useRefresh,
  useVerifyEmail,
  useResendVerification,
  useChangePassword,
} from './auth';
export type { UseAuthConfig } from './auth';


// Refresh handler
export { setGlobalRefreshCallback, triggerGlobalRefresh } from './refresh-handler';
