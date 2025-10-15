import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

const REFRESH_TOKEN_KEY = 'refreshToken';

// Logging utility
const log = (message: string, data?: unknown) => {
  console.log(`[SessionStore] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

interface SessionStore {
  // State
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setTokens: (access: string, refresh: string) => Promise<void>;
  getAccessToken: () => string | null;
  getRefreshToken: () => Promise<string | null>;
  clearTokens: () => Promise<void>;
  setUser: (user: User) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
}

/**
 * Native session store using Zustand
 *
 * - Access token stored in memory only (Zustand state) - 15 minutes lifetime
 * - Refresh token stored in SecureStore (encrypted device storage) - 12 months lifetime
 * - User data stored in memory
 * - Comprehensive logging for debugging session issues
 * - Session restoration on app launch
 * - Automatic token refresh when app becomes active
 *
 * @example
 * ```ts
 * const { setTokens, getAccessToken, user, initializeSession } = useSessionStore();
 *
 * // Initialize session on app launch
 * await initializeSession();
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
  isInitialized: false,

  // Store tokens: access in memory, refresh in SecureStore
  setTokens: async (access: string, refresh: string) => {
    log('Setting tokens', { accessTokenLength: access.length, refreshTokenLength: refresh.length });
    set({ accessToken: access });
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
      log('Tokens stored successfully');
    } catch (error) {
      log('Failed to store refresh token', error);
      throw error;
    }
  },

  // Get access token from memory
  getAccessToken: () => {
    const token = get().accessToken;
    log('Getting access token', { hasToken: !!token, tokenLength: token?.length });
    return token;
  },

  // Get refresh token from SecureStore
  getRefreshToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      log('Getting refresh token', { hasToken: !!token, tokenLength: token?.length });
      return token;
    } catch (error) {
      log('Failed to get refresh token', error);
      return null;
    }
  },

  // Clear both tokens
  clearTokens: async () => {
    log('Clearing tokens');
    set({ accessToken: null });
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      log('Tokens cleared successfully');
    } catch (error) {
      log('Failed to delete refresh token', error);
    }
  },

  // Set user data
  setUser: (user: User) => {
    log('Setting user data', { userId: user.id, username: user.username });
    set({ user });
  },

  // Clear user data
  clearUser: () => {
    log('Clearing user data');
    set({ user: null });
  },

  // Logout: clear everything
  logout: async () => {
    log('Logging out user');
    await get().clearTokens();
    set({ user: null });
    log('User logged out successfully');
  },

  // Initialize session on app launch
  initializeSession: async () => {
    const state = get();
    if (state.isInitialized) {
      log('Session already initialized');
      return;
    }

    log('Initializing session...');
    set({ isLoading: true });

    try {
      const restored = await get().restoreSession();
      log('Session initialization complete', { restored });
    } catch (error) {
      log('Session initialization failed', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  // Restore session using stored refresh token
  restoreSession: async () => {
    log('Attempting to restore session...');
    
    try {
      const refreshToken = await get().getRefreshToken();
      if (!refreshToken) {
        log('No refresh token found, user needs to login');
        return false;
      }

      log('Found refresh token, attempting to refresh access token');
      
      // Try to refresh the access token using the stored refresh token
      try {
        // Use the same HTTP client as the auth hooks
        const { createHttp } = await import('@qiima/api-client');
        const baseURL = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8000/api';
        
        log('Making refresh request using createHttp', { baseURL });
        
        const http = createHttp({ 
          env: 'native', 
          baseURL,
          getAccessToken: undefined // No access token needed for refresh
        });
        
        const data = await http.post<{ access: string; refresh: string }>('/users/refresh/', {
          refresh: refreshToken,
        });
        
        log('Token refresh successful', { 
          accessTokenLength: data.access?.length,
          refreshTokenLength: data.refresh?.length  
        });
        
        // Store BOTH the new access token AND new refresh token
        set({ accessToken: data.access });
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh);
        log('Access token and refresh token restored successfully');
        return true;
        
      } catch (refreshError) {
        log('Token refresh request failed', refreshError);
        // Clear invalid tokens
        await get().clearTokens();
        return false;
      }
    } catch (error) {
      log('Failed to restore session', error);
      // Clear invalid tokens
      await get().clearTokens();
      return false;
    }
  },
}));
