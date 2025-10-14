/**
 * Query key factory for type-safe, stable query keys.
 * Keys are tuples that ensure proper cache invalidation.
 */
export const queryKeys = {
  /**
   * Key for the current user query (GET /api/me)
   */
  me: () => ['me'] as const,

  /**
   * Base key for all auth-related queries
   */
  auth: () => ['auth'] as const,
} as const;
