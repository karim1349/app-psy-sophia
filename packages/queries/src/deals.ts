import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createHttp } from '@qiima/api-client';
import type { Deal, DealCategory, DealComment } from '@qiima/schemas';
import { queryKeys } from './keys';

/**
 * Configuration for deal hooks
 */
export interface UseDealsConfig {
  env: 'native' | 'web';
  baseURL: string;
}

/**
 * Get the appropriate session store based on environment
 */
function getSessionStore(env: 'native' | 'web') {
  if (env === 'native') {
    // Dynamic import for native
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useSessionStore } = require('@qiima/state/session.native');
    return useSessionStore;
  } else {
    // Dynamic import for web
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useSessionStore } = require('@qiima/state/session.web');
    return useSessionStore;
  }
}

/**
 * Create an authenticated HTTP client
 */
function createAuthenticatedHttp(config: UseDealsConfig) {
  const sessionStore = getSessionStore(config.env);
  
  return createHttp({
    baseURL: config.baseURL,
    env: config.env,
    getAccessToken: config.env === 'native' ? sessionStore.getState().getAccessToken : undefined,
  });
}

/**
 * Hook to fetch hot deals
 */
export function useHotDeals(config: UseDealsConfig, limit = 10) {
  return useQuery({
    queryKey: queryKeys.deals.hot(limit),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<{
        count: number;
        next: string | null;
        previous: string | null;
        results: Deal[];
      }>(`/deals/hot/?limit=${limit}`);
      return response?.results || [];
    },
  });
}

/**
 * Hook to fetch top deals
 */
export function useTopDeals(config: UseDealsConfig, limit = 10) {
  return useQuery({
    queryKey: queryKeys.deals.top(limit),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<{
        count: number;
        next: string | null;
        previous: string | null;
        results: Deal[];
      }>(`/deals/top/?limit=${limit}`);
      return response?.results || [];
    },
  });
}

/**
 * Hook to search deals
 */
export function useSearchDeals(config: UseDealsConfig, query: string, filters?: {
  category?: string;
  merchant?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
}) {
  const searchParams = new URLSearchParams();
  if (query) searchParams.append('q', query);
  if (filters?.category) searchParams.append('category', filters.category);
  if (filters?.merchant) searchParams.append('merchant', filters.merchant);
  if (filters?.city) searchParams.append('city', filters.city);
  if (filters?.min_price) searchParams.append('min_price', filters.min_price.toString());
  if (filters?.max_price) searchParams.append('max_price', filters.max_price.toString());

  return useQuery({
    queryKey: queryKeys.deals.search(query, filters),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<{
        count: number;
        next: string | null;
        previous: string | null;
        results: Deal[];
      }>(`/deals/search/?${searchParams.toString()}`);
      return response?.results || [];
    },
    enabled: !!query || !!filters,
  });
}

/**
 * Hook to fetch a single deal
 */
export function useDeal(config: UseDealsConfig, dealId: string) {
  return useQuery({
    queryKey: queryKeys.deals.detail(dealId),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<Deal>(`/deals/${dealId}/`);
      return response;
    },
    enabled: !!dealId,
  });
}

/**
 * Hook to fetch deal comments
 */
export function useDealComments(config: UseDealsConfig, dealId: string) {
  return useQuery({
    queryKey: queryKeys.deals.comments(dealId),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<{ comments: DealComment[] }>(`/deals/${dealId}/comments/`);
      return response?.comments || [];
    },
    enabled: !!dealId,
  });
}

/**
 * Hook to fetch deal categories
 */
export function useCategories(config: UseDealsConfig) {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: async () => {
      const http = createAuthenticatedHttp(config);
      const response = await http.get<DealCategory[]>('/categories/');
      return response || [];
    },
  });
}

/**
 * Hook to create a new deal
 */
export function useCreateDeal(config: UseDealsConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealData: {
      title: string;
      description: string;
      current_price: number;
      original_price?: number;
      currency: string;
      category: string;
      merchant: string;
      deal_type: 'online' | 'in_store';
      deal_url?: string;
      city?: string;
      proof_image?: string;
    }) => {
      const http = createAuthenticatedHttp(config);
      const response = await http.post<Deal>('/deals/', dealData);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch deals
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all() });
    },
  });
}

/**
 * Hook to vote on a deal
 */
export function useVoteDeal(config: UseDealsConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      voteType,
      reason,
    }: {
      dealId: string;
      voteType: 'up' | 'down' | 'remove';
      reason?: string;
    }) => {
      const http = createAuthenticatedHttp(config);
      const response = await http.post<any>(`/deals/${dealId}/vote/`, {
        vote_type: voteType,
        reason,
      });
      return response;
    },
    onSuccess: (_, { dealId }) => {
      // Invalidate deal queries
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(dealId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all() });
    },
  });
}

/**
 * Hook to add a comment to a deal
 */
export function useAddComment(config: UseDealsConfig) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      content,
      parentId,
    }: {
      dealId: string;
      content: string;
      parentId?: string;
    }) => {
      const http = createAuthenticatedHttp(config);
      const response = await http.post<DealComment>(`/deals/${dealId}/add_comment/`, {
        content,
        parent: parentId,
      });
      return response;
    },
    onSuccess: (_, { dealId }) => {
      // Invalidate comments
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.comments(dealId) });
    },
  });
}
