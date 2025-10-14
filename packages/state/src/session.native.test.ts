import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

// Mock expo-secure-store before importing the store
jest.mock('expo-secure-store');

import { useSessionStore } from './session.native';
import * as SecureStore from 'expo-secure-store';
import { __clearMockStore } from './__mocks__/expo-secure-store';

describe('useSessionStore (native)', () => {
  beforeEach(() => {
    // Clear the store between tests
    const { result } = renderHook(() => useSessionStore());
    act(() => {
      result.current.clearTokens();
      result.current.clearUser();
    });
    __clearMockStore();
  });

  describe('token management', () => {
    test('stores access token in memory only', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens(
          'test-access-token',
          'test-refresh-token'
        );
      });

      expect(result.current.accessToken).toBe('test-access-token');
    });

    test('stores refresh token in SecureStore', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens(
          'test-access-token',
          'test-refresh-token'
        );
      });

      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      expect(refreshToken).toBe('test-refresh-token');
    });

    test('getAccessToken returns token from memory', () => {
      const { result } = renderHook(() => useSessionStore());

      act(() => {
        result.current.setTokens('test-access-token', 'test-refresh-token');
      });

      expect(result.current.getAccessToken()).toBe('test-access-token');
    });

    test('getRefreshToken retrieves from SecureStore', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens(
          'test-access-token',
          'test-refresh-token'
        );
      });

      const refreshToken = await result.current.getRefreshToken();
      expect(refreshToken).toBe('test-refresh-token');
    });

    test('clearTokens removes both tokens', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens(
          'test-access-token',
          'test-refresh-token'
        );
      });

      await act(async () => {
        await result.current.clearTokens();
      });

      expect(result.current.accessToken).toBeNull();
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      expect(refreshToken).toBeNull();
    });

    test('handles null refresh token gracefully', async () => {
      const { result } = renderHook(() => useSessionStore());

      const refreshToken = await result.current.getRefreshToken();
      expect(refreshToken).toBeNull();
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
  });

  describe('logout', () => {
    test('logout clears both tokens and user', async () => {
      const { result } = renderHook(() => useSessionStore());

      const user = {
        id: 1,
        email: 'karim@example.com',
        username: 'karim123',
        created_at: '2025-01-01T00:00:00Z',
      };

      await act(async () => {
        await result.current.setTokens(
          'test-access-token',
          'test-refresh-token'
        );
        result.current.setUser(user);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      expect(refreshToken).toBeNull();
    });

    test('logout works even if no tokens exist', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('loading state', () => {
    test('isLoading starts as false', () => {
      const { result } = renderHook(() => useSessionStore());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles empty string tokens', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens('', '');
      });

      expect(result.current.accessToken).toBe('');
      const refreshToken = await result.current.getRefreshToken();
      expect(refreshToken).toBe('');
    });

    test('handles token update (replacing existing tokens)', async () => {
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.setTokens('first-access', 'first-refresh');
      });

      await act(async () => {
        await result.current.setTokens('second-access', 'second-refresh');
      });

      expect(result.current.accessToken).toBe('second-access');
      const refreshToken = await result.current.getRefreshToken();
      expect(refreshToken).toBe('second-refresh');
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
});
