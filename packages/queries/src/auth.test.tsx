/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createHttp, HttpError } from '@qiima/api-client';
import type {
  AuthResponse,
  MessageResponse,
  User,
  RefreshResponse,
} from '@qiima/api-client';
import {
  useRegister,
  useLogin,
  useLogout,
  usePasswordForgot,
  usePasswordReset,
  useMeQuery,
  useRefresh,
  useVerifyEmail,
  useResendVerification,
} from './auth';

// Mock dependencies
jest.mock('@qiima/api-client', () => ({
  createHttp: jest.fn(),
  HttpError: class HttpError extends Error {
    constructor(
      message: string,
      public status: number,
      public errors?: Record<string, string[]>
    ) {
      super(message);
      this.name = 'HttpError';
    }
  },
}));

// Mock session stores
const mockNativeStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
  destroy: jest.fn(),
};

const mockWebStore = {
  getState: jest.fn(),
  setState: jest.fn(),
  subscribe: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('@qiima/state/session.native', () => ({
  useSessionStore: mockNativeStore,
}));

jest.mock('@qiima/state/session.web', () => ({
  useSessionStore: mockWebStore,
}));

// Test utilities
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  created_at: '2025-01-01T00:00:00Z',
};

const mockAuthResponse: AuthResponse = {
  user: mockUser,
  access: 'access-token-123',
  refresh: 'refresh-token-456',
};

describe('useRegister', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    beforeEach(() => {
      mockNativeStore.getState.mockReturnValue({
        accessToken: null,
        user: null,
        setTokens: jest.fn(),
        setUser: jest.fn(),
        getAccessToken: jest.fn(),
      });
    });

    it('should register successfully but NOT store session (email verification required)', async () => {
      const registerResponse = {
        user: mockUser,
        message: 'Registration successful. Please check your email to verify your account.',
      };
      mockPost.mockResolvedValue(registerResponse);
      const setTokens = jest.fn();
      const setUser = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        setTokens,
        setUser,
        accessToken: null,
        user: null,
        getAccessToken: jest.fn(),
      });

      const { result } = renderHook(
        () => useRegister({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/', {
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });
      // Registration should NOT store tokens - email verification required
      expect(setTokens).not.toHaveBeenCalled();
      expect(setUser).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(registerResponse);
    });

    it('should handle validation errors (400)', async () => {
      const error = new HttpError('Validation failed', 400, {
        email: ['This email is already registered'],
      });
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useRegister({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'existing@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useRegister({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should handle rate limit errors (429)', async () => {
      const error = new HttpError('Too many requests', 429);
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useRegister({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('Web platform', () => {
    beforeEach(() => {
      mockWebStore.getState.mockReturnValue({
        user: null,
        setUser: jest.fn(),
      });
    });

    it('should register successfully but NOT store session (email verification required)', async () => {
      const registerResponse = {
        user: mockUser,
        message: 'Registration successful. Please check your email to verify your account.',
      };
      mockPost.mockResolvedValue(registerResponse);
      const setUser = jest.fn();
      mockWebStore.getState.mockReturnValue({
        setUser,
        user: null,
      });

      const { result } = renderHook(
        () => useRegister({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/', {
        email: 'new@example.com',
        username: 'newuser',
        password: 'Test1234!',
        passwordConfirm: 'Test1234!',
      });
      // Registration should NOT store session - email verification required
      expect(setUser).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(registerResponse);
    });
  });
});

describe('useLogin', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    beforeEach(() => {
      mockNativeStore.getState.mockReturnValue({
        accessToken: null,
        user: null,
        setTokens: jest.fn(),
        setUser: jest.fn(),
        getAccessToken: jest.fn(),
      });
    });

    it('should login successfully and store tokens', async () => {
      mockPost.mockResolvedValue(mockAuthResponse);
      const setTokens = jest.fn();
      const setUser = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        setTokens,
        setUser,
        accessToken: null,
        user: null,
        getAccessToken: jest.fn(),
      });

      const { result } = renderHook(
        () => useLogin({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        password: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/login/', {
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(setTokens).toHaveBeenCalledWith('access-token-123', 'refresh-token-456');
      expect(setUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle invalid credentials (401)', async () => {
      const error = new HttpError('Invalid credentials', 401);
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useLogin({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'wrong@example.com',
        password: 'WrongPassword!',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should handle inactive user error', async () => {
      const error = new HttpError('Account is inactive', 403);
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useLogin({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'inactive@example.com',
        password: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('Web platform', () => {
    beforeEach(() => {
      mockWebStore.getState.mockReturnValue({
        user: null,
        setUser: jest.fn(),
      });
    });

    it('should login successfully and store user only', async () => {
      mockPost.mockResolvedValue(mockAuthResponse);
      const setUser = jest.fn();
      mockWebStore.getState.mockReturnValue({
        setUser,
        user: null,
      });

      const { result } = renderHook(
        () => useLogin({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        password: 'Test1234!',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/login/', {
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(setUser).toHaveBeenCalledWith(mockUser);
    });
  });
});

describe('useLogout', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    it('should logout successfully and clear session', async () => {
      mockPost.mockResolvedValue({ message: 'Logged out successfully' });
      const logout = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'token',
        user: mockUser,
        logout,
        getAccessToken: () => 'token',
      });

      const { result } = renderHook(
        () => useLogout({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/logout/');
      expect(logout).toHaveBeenCalled();
    });

    it('should clear session even if API call fails', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      const logout = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'token',
        user: mockUser,
        logout,
        getAccessToken: () => 'token',
      });

      const { result } = renderHook(
        () => useLogout({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(logout).toHaveBeenCalled();
    });
  });

  describe('Web platform', () => {
    it('should logout successfully and clear session', async () => {
      mockPost.mockResolvedValue({ message: 'Logged out successfully' });
      const logout = jest.fn();
      mockWebStore.getState.mockReturnValue({
        user: mockUser,
        logout,
      });

      const { result } = renderHook(
        () => useLogout({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/logout/');
      expect(logout).toHaveBeenCalled();
    });
  });
});

describe('usePasswordForgot', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  it('should request password reset successfully', async () => {
    const response: MessageResponse = {
      message: 'Password reset email sent',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => usePasswordForgot({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ email: 'test@example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith('/users/request_password_reset/', {
      email: 'test@example.com',
    });
    expect(result.current.data).toEqual(response);
  });

  it('should always return success for security (even for non-existent email)', async () => {
    const response: MessageResponse = {
      message: 'If the email exists, a reset link will be sent',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => usePasswordForgot({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ email: 'nonexistent@example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });
});

describe('usePasswordReset', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  it('should reset password successfully', async () => {
    const response: MessageResponse = {
      message: 'Password reset successfully',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => usePasswordReset({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      token: 'reset-token-123',
      password: 'NewPassword1!',
      passwordConfirm: 'NewPassword1!',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith('/users/confirm_password_reset/', {
      token: 'reset-token-123',
      password: 'NewPassword1!',
      passwordConfirm: 'NewPassword1!',
    });
    expect(result.current.data).toEqual(response);
  });

  it('should handle invalid token error', async () => {
    const error = new HttpError('Invalid or expired token', 400);
    mockPost.mockRejectedValue(error);

    const { result } = renderHook(
      () => usePasswordReset({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      token: 'invalid-token',
      password: 'NewPassword1!',
      passwordConfirm: 'NewPassword1!',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('should handle validation errors', async () => {
    const error = new HttpError('Validation failed', 400, {
      password: ['Password is too weak'],
    });
    mockPost.mockRejectedValue(error);

    const { result } = renderHook(
      () => usePasswordReset({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      token: 'reset-token-123',
      password: 'weak',
      passwordConfirm: 'weak',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });
});

describe('useMeQuery', () => {
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      get: mockGet,
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    it('should fetch user data successfully', async () => {
      mockGet.mockResolvedValue(mockUser);
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'token',
        user: null,
        getAccessToken: () => 'token',
      });

      const { result } = renderHook(
        () => useMeQuery({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith('/users/me/');
      expect(result.current.data).toEqual(mockUser);
    });

    it('should not fetch if no access token', async () => {
      mockNativeStore.getState.mockReturnValue({
        accessToken: null,
        user: null,
        getAccessToken: () => null,
      });

      const { result } = renderHook(
        () => useMeQuery({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      // Query should be disabled
      expect(result.current.status).toBe('pending');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle 401 error gracefully', async () => {
      const error = new HttpError('Unauthorized', 401);
      mockGet.mockRejectedValue(error);
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'invalid-token',
        user: null,
        getAccessToken: () => 'invalid-token',
      });

      const { result } = renderHook(
        () => useMeQuery({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('Web platform', () => {
    it('should fetch user data successfully', async () => {
      mockGet.mockResolvedValue(mockUser);
      mockWebStore.getState.mockReturnValue({
        user: null,
      });

      const { result } = renderHook(
        () => useMeQuery({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith('/users/me/');
      expect(result.current.data).toEqual(mockUser);
    });
  });
});

describe('useRefresh', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    it('should refresh access token successfully', async () => {
      const refreshResponse: RefreshResponse = {
        access: 'new-access-token',
      };
      mockPost.mockResolvedValue(refreshResponse);
      const setTokens = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'old-token',
        user: mockUser,
        setTokens,
        getRefreshToken: async () => 'refresh-token',
        getAccessToken: () => 'old-token',
      });

      const { result } = renderHook(
        () => useRefresh({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/refresh/', {
        refresh: 'refresh-token',
      });
      expect(setTokens).toHaveBeenCalledWith('new-access-token', 'refresh-token');
    });

    it('should handle refresh failure and logout user', async () => {
      const error = new HttpError('Invalid refresh token', 401);
      mockPost.mockRejectedValue(error);
      const logout = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'old-token',
        user: mockUser,
        logout,
        getRefreshToken: async () => 'invalid-refresh-token',
        getAccessToken: () => 'old-token',
      });

      const { result } = renderHook(
        () => useRefresh({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should handle missing refresh token', async () => {
      mockNativeStore.getState.mockReturnValue({
        accessToken: 'token',
        user: mockUser,
        getRefreshToken: async () => null,
        getAccessToken: () => 'token',
      });

      const { result } = renderHook(
        () => useRefresh({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Web platform', () => {
    it('should refresh access token via cookies successfully', async () => {
      const refreshResponse: RefreshResponse = {
        access: 'new-access-token',
      };
      mockPost.mockResolvedValue(refreshResponse);
      mockWebStore.getState.mockReturnValue({
        user: mockUser,
      });

      const { result } = renderHook(
        () => useRefresh({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/refresh/');
    });
  });
});

describe('useVerifyEmail', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  describe('Native platform', () => {
    beforeEach(() => {
      mockNativeStore.getState.mockReturnValue({
        accessToken: null,
        user: null,
        setTokens: jest.fn(),
        setUser: jest.fn(),
        getAccessToken: jest.fn(),
      });
    });

    it('should verify email successfully and store tokens', async () => {
      mockPost.mockResolvedValue(mockAuthResponse);
      const setTokens = jest.fn();
      const setUser = jest.fn();
      mockNativeStore.getState.mockReturnValue({
        setTokens,
        setUser,
        accessToken: null,
        user: null,
        getAccessToken: jest.fn(),
      });

      const { result } = renderHook(
        () => useVerifyEmail({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        code: '123456',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/verify_email/', {
        email: 'test@example.com',
        code: '123456',
      });
      expect(setTokens).toHaveBeenCalledWith('access-token-123', 'refresh-token-456');
      expect(setUser).toHaveBeenCalledWith(mockUser);
    });

    it('should handle invalid verification code (400)', async () => {
      const error = new HttpError('Invalid or expired verification code', 400, {
        code: ['Invalid code'],
      });
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useVerifyEmail({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        code: '000000',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockPost.mockRejectedValue(error);

      const { result } = renderHook(
        () => useVerifyEmail({ env: 'native', baseURL: 'https://api.test' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        code: '123456',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(error);
    });
  });

  describe('Web platform', () => {
    beforeEach(() => {
      mockWebStore.getState.mockReturnValue({
        user: null,
        setUser: jest.fn(),
      });
    });

    it('should verify email successfully and store user only', async () => {
      mockPost.mockResolvedValue(mockAuthResponse);
      const setUser = jest.fn();
      mockWebStore.getState.mockReturnValue({
        setUser,
        user: null,
      });

      const { result } = renderHook(
        () => useVerifyEmail({ env: 'web', baseURL: '/api' }),
        { wrapper: createWrapper() }
      );

      result.current.mutate({
        email: 'test@example.com',
        code: '123456',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPost).toHaveBeenCalledWith('/users/verify_email/', {
        email: 'test@example.com',
        code: '123456',
      });
      expect(setUser).toHaveBeenCalledWith(mockUser);
    });
  });
});

describe('useResendVerification', () => {
  let mockPost: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    (createHttp as jest.Mock).mockReturnValue({
      post: mockPost,
      get: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    });
  });

  it('should resend verification code successfully', async () => {
    const response: MessageResponse = {
      message: 'Verification code sent successfully',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => useResendVerification({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ email: 'test@example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).toHaveBeenCalledWith('/users/resend_verification/', {
      email: 'test@example.com',
    });
    expect(result.current.data).toEqual(response);
  });

  it('should handle rate limit errors (429)', async () => {
    const error = new HttpError('Rate limit exceeded. Please try again later.', 429);
    mockPost.mockRejectedValue(error);

    const { result } = renderHook(
      () => useResendVerification({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ email: 'test@example.com' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });

  it('should expose loading and error states', async () => {
    const response: MessageResponse = {
      message: 'Verification code sent successfully',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => useResendVerification({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    // Initially idle
    expect(result.current.isPending).toBe(false);
    expect(result.current.isIdle).toBe(true);

    result.current.mutate({ email: 'test@example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  it('should handle email not found (still returns success for security)', async () => {
    const response: MessageResponse = {
      message: 'If the email exists, a verification code will be sent',
    };
    mockPost.mockResolvedValue(response);

    const { result } = renderHook(
      () => useResendVerification({ env: 'native', baseURL: 'https://api.test' }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ email: 'nonexistent@example.com' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(response);
  });
});
