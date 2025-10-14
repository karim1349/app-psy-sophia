import { create } from 'zustand';
import type { User } from './types';

interface SessionStore {
  // State
  user: User | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
}

/**
 * Web session store using Zustand
 *
 * - NO token storage (cookies managed by browser via HttpOnly cookies)
 * - Only user data stored in memory
 * - Logout calls API to clear cookies
 *
 * @example
 * ```ts
 * const { user, setUser, logout } = useSessionStore();
 *
 * // After login (BFF sets cookies automatically)
 * setUser(authResponse.user);
 *
 * // Logout (BFF clears cookies)
 * await logout();
 * ```
 */
export const useSessionStore = create<SessionStore>((set) => ({
  // Initial state
  user: null,
  isLoading: false,

  // Set user data
  setUser: (user: User) => {
    set({ user });
  },

  // Clear user data
  clearUser: () => {
    set({ user: null });
  },

  // Logout: clear user (cookies cleared by API call in queries package)
  logout: async () => {
    set({ user: null });
  },
}));
