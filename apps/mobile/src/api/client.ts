/**
 * Base API client with fetch wrapper
 */

import Constants from 'expo-constants';
import { HttpError } from '@app-psy-sophia/api-client';
import { config } from '../config/environment';
import { tokenStorage } from '../lib/storage';

// Use environment-based API URL
const API_URL = config.apiUrl;

// Re-export HttpError for convenience
export { HttpError } from '@app-psy-sophia/api-client';

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  debug?: boolean;
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

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Log API calls in development
  if (config.debug) {
    console.log(`📡 API ${fetchConfig.method || 'GET'} ${url}`);
  }

  const response = await fetch(url, {
    ...fetchConfig,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && !skipAuth) {
    // Only attempt refresh if we have a refresh token
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        return apiFetch(endpoint, config);
      }
    }
    // If no refresh token or refresh failed, clear tokens to force re-auth
    await tokenStorage.clearTokens();
  }

  // Parse response
  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  console.log(`📥 Response status ${response.status} for ${url}`);
  if (contentType?.includes('application/json') && config.debug) {
    console.log(`📥 Response data:`, JSON.stringify(data, null, 2));
  }

  // Handle errors
  if (!response.ok) {
    console.error(`❌ API Error ${response.status}: ${url}`);
    console.error('Response:', data);

    // Extract error code from response (Django REST framework format)
    const errorCode = data?.code || (data?.detail?.includes('token') ? 'token_not_valid' : undefined);

    // DRF returns validation errors directly in the response body
    // For 400/422, the entire data object IS the errors structure (e.g., {non_field_errors: [...], email: [...]})
    const errors = (response.status === 400 || response.status === 422) && typeof data === 'object' ? data : data?.errors;

    throw new HttpError(
      data?.message || data?.detail || 'Request failed',
      response.status,
      errors,
      errorCode
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
