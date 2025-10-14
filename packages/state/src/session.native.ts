import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

const REFRESH_TOKEN_KEY = 'refreshToken';

interface SessionStore {
  // State
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;

  // Actions
  setTokens: (access: string, refresh: string) => Promise<void>;
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  clearTokens: () => Promise<void>;
  setUser: (user: User) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
}

/**
 * Native session store using Zustand
 *
 * - Access token stored in memory only (Zustand state)
 * - Refresh token stored in SecureStore (encrypted device storage)
 * - User data stored in memory
 *
 * @example
 * ```ts
 * const { setTokens, getAccessToken, user } = useSessionStore();
 *
 * // After login
 * await setTokens(authResponse.access, authResponse.refresh);
 * setUser(authResponse.user);
 *
 * // Get access token for API calls
 * const token = getAccessToken();
 *
 * // Logout
 * await logout();
 * ```
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  accessToken: null,
  user: null,
  isLoading: false,

  // Store tokens: access in memory, refresh in SecureStore
  setTokens: async (access: string, refresh: string) => {
    set({ accessToken: access });
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
  },

  // Get access token from memory
  getAccessToken: () => {
    return get().accessToken;
  },

  // Get refresh token from SecureStore
  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  },

  // Clear both tokens
  clearTokens: async () => {
    set({ accessToken: null });
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to delete refresh token:', error);
    }
  },

  // Set user data
  setUser: (user: User) => {
    set({ user });
  },

  // Clear user data
  clearUser: () => {
    set({ user: null });
  },

  // Logout: clear everything
  logout: async () => {
    await get().clearTokens();
    set({ user: null });
  },
}));
