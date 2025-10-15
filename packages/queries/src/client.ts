import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { mapErrorToToast, shouldSuppressError, mapSuccessToToast, ToastError } from './error-handler';

/**
 * Creates a configured QueryClient instance with sensible defaults for Qiima.
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
      onError: (error, query) => {
        // Only show toast for query errors if showToast is provided
        if (showToast && !shouldSuppressError(error, query.meta)) {
          const toasts = mapErrorToToast(error);
          toasts.forEach(toast => showToast(toast));
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
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
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
