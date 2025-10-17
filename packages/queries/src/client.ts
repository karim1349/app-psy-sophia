import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { HttpError } from '@app-psy-sophia/api-client';
import { mapErrorToToast, shouldSuppressError, mapSuccessToToast, ToastError } from './error-handler';
import { triggerGlobalRefresh } from './refresh-handler';

/**
 * Creates a configured QueryClient instance with sensible defaults for app-psy-sophia.
 *
 * Configuration:
 * - 5 minute stale time for queries
 * - Single retry on failure
 * - Refetch on window focus and reconnect
 * - No retry for mutations
 * - Global error handling with toast notifications
 *
 * @param showToast - Function to show toast notifications (optional)
 * @returns Configured QueryClient instance
 */
export function createQueryClient(showToast?: (toast: ToastError) => void): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: async (error, query) => {
        // Handle 401 token expiration by triggering refresh
        if (error instanceof HttpError && error.status === 401 && error.code === 'token_not_valid') {
          await triggerGlobalRefresh();
          // React Query will automatically retry based on retry config
        }
        
        // Only show toast for query errors if showToast is provided
        if (showToast && !shouldSuppressError(error, query.meta)) {
          const toasts = mapErrorToToast(error);
          toasts.forEach(toast => showToast(toast));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: async (error, _variables, _context, mutation) => {
        // Handle 401 token expiration for mutations
        if (error instanceof HttpError && error.status === 401 && error.code === 'token_not_valid') {
          await triggerGlobalRefresh();
          // Note: mutations don't auto-retry by default
          // User will need to manually retry the action
        }
        
        // Show toast for mutation errors if showToast is provided
        if (showToast && !shouldSuppressError(error, mutation.meta)) {
          const toasts = mapErrorToToast(error);
          toasts.forEach(toast => showToast(toast));
        }
      },
      onSuccess: (data, _variables, _context, mutation) => {
        // Show success toast for specific mutations if showToast is provided
        if (showToast && mutation.meta?.showSuccessToast) {
          const action = mutation.meta.action as string;
          const toasts = mapSuccessToToast(action, data);
          toasts.forEach(toast => showToast(toast));
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error) => {
          // Retry once for 401 token_not_valid (after refresh)
          if (error instanceof HttpError && error.status === 401 && error.code === 'token_not_valid') {
            return failureCount < 1;
          }
          // Default retry for other errors
          return failureCount < 1;
        },
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
