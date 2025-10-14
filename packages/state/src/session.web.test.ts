import { describe, expect, test, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import { useSessionStore } from './session.web';

describe('useSessionStore (web)', () => {
  beforeEach(() => {
    // Clear the store between tests
    const { result } = renderHook(() => useSessionStore());
    act(() => {
      result.current.clearUser();
    });
  });

  describe('user management', () => {
    test('setUser stores user in state', () => {
      const { result } = renderHook(() => useSessionStore());

      const user = {
        id: 1,
        email: 'karim@example.com',
        username: 'karim123',
        created_at: '2025-01-01T00:00:00Z',
      };

      act(() => {
        result.current.setUser(user);
      });

      expect(result.current.user).toEqual(user);
    });

    test('clearUser removes user from state', () => {
      const { result } = renderHook(() => useSessionStore());

      const user = {
        id: 1,
        email: 'karim@example.com',
        username: 'karim123',
        created_at: '2025-01-01T00:00:00Z',
      };

      act(() => {
        result.current.setUser(user);
      });

      act(() => {
        result.current.clearUser();
      });

      expect(result.current.user).toBeNull();
    });

    test('user can be updated', () => {
      const { result } = renderHook(() => useSessionStore());

      const user1 = {
        id: 1,
        email: 'user1@example.com',
        username: 'user1',
        created_at: '2025-01-01T00:00:00Z',
      };

      const user2 = {
        id: 2,
        email: 'user2@example.com',
        username: 'user2',
        created_at: '2025-01-02T00:00:00Z',
      };

      act(() => {
        result.current.setUser(user1);
      });

      expect(result.current.user).toEqual(user1);

      act(() => {
        result.current.setUser(user2);
      });

      expect(result.current.user).toEqual(user2);
    });
  });

  describe('logout', () => {
    test('logout clears user from state', async () => {
      const { result } = renderHook(() => useSessionStore());

      const user = {
        id: 1,
        email: 'karim@example.com',
        username: 'karim123',
        created_at: '2025-01-01T00:00:00Z',
      };

      act(() => {
        result.current.setUser(user);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });

    test('logout works even if no user exists', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('loading state', () => {
    test('isLoading starts as false', () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('no token storage', () => {
    test('does not expose token methods (cookies managed by browser)', () => {
      const { result } = renderHook(() => useSessionStore());

      // Web store should not have token methods
      expect(result.current).not.toHaveProperty('setTokens');
      expect(result.current).not.toHaveProperty('getAccessToken');
      expect(result.current).not.toHaveProperty('getRefreshToken');
      expect(result.current).not.toHaveProperty('clearTokens');
    });
  });

  describe('state persistence', () => {
    test('user state is isolated between hook instances', () => {
      const { result: result1 } = renderHook(() => useSessionStore());
      const { result: result2 } = renderHook(() => useSessionStore());

      const user = {
        id: 1,
        email: 'karim@example.com',
        username: 'karim123',
        created_at: '2025-01-01T00:00:00Z',
      };

      act(() => {
        result1.current.setUser(user);
      });

      // Both instances should see the same state (Zustand global store)
      expect(result1.current.user).toEqual(user);
      expect(result2.current.user).toEqual(user);
    });
  });
});
