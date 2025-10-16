/**
 * @qiima/queries - TanStack Query hooks for Qiima API
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
  useMyDeals,
  useMyComments,
  useChangePassword,
} from './auth';
export type { UseAuthConfig } from './auth';

// Deal hooks
export {
  useHotDeals,
  useTopDeals,
  useSearchDeals,
  useDeal,
  useDealComments,
  useCategories,
  useAllCategories,
  useInfiniteCategories,
  useCreateDeal,
  useVoteDeal,
  useAddComment,
} from './deals';
export type { UseDealsConfig, PaginatedResponse, PaginationParams } from './deals';

// Refresh handler
export { setGlobalRefreshCallback, triggerGlobalRefresh } from './refresh-handler';
