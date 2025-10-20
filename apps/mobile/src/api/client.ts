/**
 * Base API client with fetch wrapper
 */

import Constants from 'expo-constants';
import { tokenStorage } from '../lib/storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://app-psy-sophia.onrender.com';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Base fetch wrapper with automatic token attachment
 */
export async function apiFetch<T = any>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { skipAuth, ...fetchConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchConfig.headers as Record<string, string>),
  };

  // Attach access token if not skipped
  if (!skipAuth) {
    const accessToken = await tokenStorage.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}/api${endpoint}`;

  // Log API calls in development
  console.log(`📡 API ${fetchConfig.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...fetchConfig,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry request with new token
      return apiFetch(endpoint, config);
    }
  }

  // Parse response
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Handle errors
  if (!response.ok) {
    console.error(`❌ API Error ${response.status}: ${url}`);
    console.error('Response:', data);
    throw new APIError(
      data?.message || data?.detail || 'Request failed',
      response.status,
      data
    );
  }

  console.log(`✅ API ${response.status}: ${url}`);
  return data as T;
}

/**
 * Refresh access token using refresh token
 * IMPORTANT: Django's ROTATE_REFRESH_TOKENS=True returns a NEW refresh token
 * that must be stored, otherwise the old one gets blacklisted.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_URL}/api/auth/users/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // If refresh fails (e.g., token blacklisted), clear tokens
      await tokenStorage.clearTokens();
      return false;
    }

    const data = await response.json();

    // Store new access token (always returned)
    await tokenStorage.setAccessToken(data.access);

    // Store new refresh token if returned (when ROTATE_REFRESH_TOKENS=True)
    if (data.refresh) {
      await tokenStorage.setRefreshToken(data.refresh);
    }

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    // Clear tokens on any error to force re-authentication
    await tokenStorage.clearTokens();
    return false;
  }
}
