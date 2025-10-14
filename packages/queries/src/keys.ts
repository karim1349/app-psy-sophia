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

  /**
   * Deal-related query keys
   */
  deals: {
    all: () => ['deals'] as const,
    hot: (limit: number) => ['deals', 'hot', limit] as const,
    top: (limit: number) => ['deals', 'top', limit] as const,
    search: (query: string, filters?: Record<string, any>) => 
      ['deals', 'search', query, filters] as const,
    detail: (id: string) => ['deals', 'detail', id] as const,
    comments: (dealId: string) => ['deals', 'comments', dealId] as const,
  },

  /**
   * Category-related query keys
   */
  categories: {
    all: () => ['categories'] as const,
    popular: () => ['categories', 'popular'] as const,
  },
} as const;
