import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance with sensible defaults for Qiima.
 *
 * Configuration:
 * - 5 minute stale time for queries
 * - Single retry on failure
 * - Refetch on window focus and reconnect
 * - No retry for mutations
 *
 * @returns Configured QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
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
