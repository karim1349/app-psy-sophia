import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createHttp } from '@qiima/api-client';
import type {
  AuthResponse,
  MessageResponse,
  User,
  RefreshResponse,
} from '@qiima/api-client';
import type {
  RegisterInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from '@qiima/schemas';
import { queryKeys } from './keys';

/**
 * Configuration for auth hooks
 */
export interface UseAuthConfig {
  env: 'native' | 'web';
  baseURL: string;
}

/**
 * Get the appropriate session store based on environment
 */
function getSessionStore(env: 'native' | 'web') {
  if (env === 'native') {
    // Dynamic import for native
    const { useSessionStore } = require('@qiima/state/session.native');
    return useSessionStore;
  } else {
    // Dynamic import for web
    const { useSessionStore } = require('@qiima/state/session.web');
    return useSessionStore;
  }
}

/**
 * Hook for user registration
 *
 * NOTE: Registration no longer stores session automatically
 * User must verify email via useVerifyEmail to get authenticated
 *
 * @example
 * ```ts
 * const register = useRegister({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * register.mutate({
 *   email: 'user@example.com',
 *   username: 'username',
 *   password: 'Password1!',
 *   password_confirm: 'Password1!',
 * });
 * ```
 */
export function useRegister(config: UseAuthConfig) {
  const { env, baseURL } = config;

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const http = createHttp({ env, baseURL });
      return http.post('/users/', input as unknown as Record<string, unknown>);
    },
    meta: {
      showSuccessToast: true,
      action: 'register',
    },
    // No onSuccess - caller handles redirect to verify-email screen
  });
}

/**
 * Hook for user login
 *
 * Native: Stores access token, refresh token, and user data
 * Web: Stores user data only (cookies managed by BFF)
 *
 * @example
 * ```ts
 * const login = useLogin({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * login.mutate({
 *   email: 'user@example.com',
 *   password: 'Password1!',
 * });
 * ```
 */
export function useLogin(config: UseAuthConfig) {
  const { env, baseURL } = config;
  const queryClient = useQueryClient();
  const sessionStore = getSessionStore(env);

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<AuthResponse> => {
      const http = createHttp({ env, baseURL });
      return http.post<AuthResponse>('/users/login/', input as unknown as Record<string, unknown>);
    },
    meta: {
      showSuccessToast: false,
      action: 'login',
    },
    onSuccess: async (data: AuthResponse) => {
      const state = sessionStore.getState();

      if (env === 'native') {
        // Store tokens and user
        await state.setTokens(data.access, data.refresh);
        state.setUser(data.user);
      } else {
        // Web: only store user (cookies set by BFF)
        state.setUser(data.user);
      }

      // Invalidate me query to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}

/**
 * Hook for user logout
 *
 * Clears session and calls logout endpoint
 * Always succeeds even if API call fails (to ensure local session is cleared)
 *
 * @example
 * ```ts
 * const logout = useLogout({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * logout.mutate();
 * ```
 */
export function useLogout(config: UseAuthConfig) {
  const { env, baseURL } = config;
  const queryClient = useQueryClient();
  const sessionStore = getSessionStore(env);

  return useMutation({
    mutationFn: async (): Promise<MessageResponse | void> => {
      try {
        const state = sessionStore.getState();
        let getAccessToken: (() => string | null) | undefined;

        if (env === 'native') {
          getAccessToken = state.getAccessToken;
        }

        const http = createHttp({ env, baseURL, getAccessToken });
        return await http.post<MessageResponse>('/users/logout/');
      } catch (error) {
        // Ignore errors - we want to clear session anyway
        console.warn('Logout API call failed, clearing local session anyway', error);
      }
    },
    onSuccess: async () => {
      const state = sessionStore.getState();
      await state.logout();

      // Clear all queries
      queryClient.clear();
    },
  });
}

/**
 * Hook for requesting password reset
 *
 * Always returns success for security (doesn't reveal if email exists)
 *
 * @example
 * ```ts
 * const forgotPassword = usePasswordForgot({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * forgotPassword.mutate({
 *   email: 'user@example.com',
 * });
 * ```
 */
export function usePasswordForgot(config: UseAuthConfig) {
  const { env, baseURL } = config;

  return useMutation({
    mutationFn: async (input: PasswordResetRequestInput): Promise<MessageResponse> => {
      const http = createHttp({ env, baseURL });
      return http.post<MessageResponse>('/users/request_password_reset/', input as unknown as Record<string, unknown>);
    },
  });
}

/**
 * Hook for resetting password with token
 *
 * @example
 * ```ts
 * const resetPassword = usePasswordReset({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * resetPassword.mutate({
 *   token: 'reset-token-from-email',
 *   password: 'NewPassword1!',
 *   passwordConfirm: 'NewPassword1!',
 * });
 * ```
 */
export function usePasswordReset(config: UseAuthConfig) {
  const { env, baseURL } = config;

  return useMutation({
    mutationFn: async (input: PasswordResetConfirmInput): Promise<MessageResponse> => {
      const http = createHttp({ env, baseURL });
      return http.post<MessageResponse>('/users/confirm_password_reset/', input as unknown as Record<string, unknown>);
    },
    meta: {
      showSuccessToast: true,
      action: 'reset-password',
    },
  });
}

/**
 * Hook for fetching current user data
 *
 * Automatically disabled if no authentication present
 * On 401, triggers logout (token invalid/expired)
 *
 * @example
 * ```ts
 * const { data: user, isLoading } = useMeQuery({
 *   env: 'native',
 *   baseURL: 'https://api.qiima.ma'
 * });
 * ```
 */
export function useMeQuery(config: UseAuthConfig) {
  const { env, baseURL } = config;
  const sessionStore = getSessionStore(env);

  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: async (): Promise<User> => {
      const state = sessionStore.getState();
      let getAccessToken: (() => string | null) | undefined;

      if (env === 'native') {
        getAccessToken = state.getAccessToken;
      }

      const http = createHttp({ env, baseURL, getAccessToken });
      return http.get<User>('/users/me/');
    },
    enabled: env === 'web' || !!sessionStore.getState().accessToken,
    // Remove custom retry logic, use default from QueryClient
    // The global error handler will trigger refresh on token_not_valid
  });
}

/**
 * Hook for refreshing access token
 *
 * Native: Uses refresh token from SecureStore
 * Web: Uses refresh cookie via BFF
 *
 * On failure, logs out user
 *
 * @example
 * ```ts
 * const refresh = useRefresh({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * // Typically called automatically on 401
 * refresh.mutate();
 * ```
 */
export function useRefresh(config: UseAuthConfig) {
  const { env, baseURL } = config;
  const queryClient = useQueryClient();
  const sessionStore = getSessionStore(env);

  return useMutation({
    mutationFn: async (): Promise<RefreshResponse> => {
      const state = sessionStore.getState();

      if (env === 'native') {
        // Get refresh token from SecureStore
        const refreshToken = await state.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const http = createHttp({ env, baseURL });
        return http.post<RefreshResponse>('/users/refresh/', {
          refresh: refreshToken,
        });
      } else {
        // Web: refresh cookie sent automatically
        const http = createHttp({ env, baseURL });
        return http.post<RefreshResponse>('/users/refresh/');
      }
    },
    onSuccess: async (data: RefreshResponse) => {
      const state = sessionStore.getState();

      if (env === 'native') {
        // Update BOTH access token AND refresh token
        await state.setTokens(data.access, data.refresh);
      }
      // Web: cookies updated by BFF automatically

      // Invalidate all queries to refetch with new token
      queryClient.invalidateQueries();
    },
    onError: async () => {
      // Refresh failed, logout user
      const state = sessionStore.getState();
      await state.logout();
      queryClient.clear();
    },
  });
}

/**
 * Hook for verifying email with code
 *
 * On success, stores session (tokens + user) and authenticates the user
 *
 * @example
 * ```ts
 * const verifyEmail = useVerifyEmail({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * verifyEmail.mutate({
 *   email: 'user@example.com',
 *   code: '123456',
 * });
 * ```
 */
export function useVerifyEmail(config: UseAuthConfig) {
  const { env, baseURL } = config;
  const queryClient = useQueryClient();
  const sessionStore = getSessionStore(env);

  return useMutation({
    mutationFn: async (input: VerifyEmailInput): Promise<AuthResponse> => {
      const http = createHttp({ env, baseURL });
      return http.post<AuthResponse>('/users/verify_email/', input as unknown as Record<string, unknown>);
    },
    meta: {
      showSuccessToast: true,
      action: 'verify-email',
    },
    onSuccess: async (data: AuthResponse) => {
      const state = sessionStore.getState();

      if (env === 'native') {
        // Store tokens and user
        await state.setTokens(data.access, data.refresh);
        state.setUser(data.user);
      } else {
        // Web: only store user (cookies set by BFF)
        state.setUser(data.user);
      }

      // Invalidate me query to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}

/**
 * Hook for resending verification code
 *
 * Rate limited to 3 requests per hour per email
 *
 * @example
 * ```ts
 * const resendVerification = useResendVerification({ env: 'native', baseURL: 'https://api.qiima.ma' });
 *
 * resendVerification.mutate({
 *   email: 'user@example.com',
 * });
 * ```
 */
export function useResendVerification(config: UseAuthConfig) {
  const { env, baseURL } = config;

  return useMutation({
    mutationFn: async (input: ResendVerificationInput): Promise<MessageResponse> => {
      const http = createHttp({ env, baseURL });
      return http.post<MessageResponse>('/users/resend_verification/', input as unknown as Record<string, unknown>);
    },
  });
}
