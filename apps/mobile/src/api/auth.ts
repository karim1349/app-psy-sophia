/**
 * Authentication API functions
 */

import { apiFetch } from './client';
import { tokenStorage } from '../lib/storage';
import type { AuthResponse, ConvertGuestRequest } from '../types/api';

/**
 * Ensure a valid guest session exists
 * If no token exists or expired guest token, create a new guest user
 * If expired full account token, clear tokens (user must log in)
 */
export async function ensureGuestSession(): Promise<void> {
  const accessToken = await tokenStorage.getAccessToken();

  if (!accessToken) {
    console.log('🔑 No token found, creating guest session');
    // Create guest user
    const response = await apiFetch<AuthResponse>('/api/auth/users/guest/', {
      method: 'POST',
      skipAuth: true,
    });

    // Store tokens
    await tokenStorage.setTokens(response.access, response.refresh);
    return;
  }

  // Check if existing token is from a guest or full account
  let wasGuest = false;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    wasGuest = payload.is_guest === true;
  } catch (error) {
    console.error('Failed to decode token:', error);
  }

  // Verify token is still valid by making a simple API call
  try {
    console.log('🔍 Verifying existing token...');
    await apiFetch('/api/auth/users/me/', {
      method: 'GET',
    });
    console.log('✅ Token is valid');
  } catch (error) {
    // Token is invalid/expired
    console.log(`❌ Token invalid (was ${wasGuest ? 'guest' : 'full account'})`);
    await tokenStorage.clearTokens();

    // Only create new guest session if the expired token was from a guest
    // If it was a full account, user must log in again
    if (wasGuest) {
      console.log('🔄 Creating new guest session');
      const response = await apiFetch<AuthResponse>('/api/auth/users/guest/', {
        method: 'POST',
        skipAuth: true,
      });

      await tokenStorage.setTokens(response.access, response.refresh);
    } else {
      console.log('🚪 Full account expired, user must log in');
      // Don't create guest session - user should be redirected to login
    }
  }
}

/**
 * Create a guest user
 */
export async function createGuestUser(): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/users/guest/', {
    method: 'POST',
    skipAuth: true,
  });

  await tokenStorage.setTokens(response.access, response.refresh);
  return response;
}

/**
 * Convert guest user to full account
 */
export async function convertGuest(
  data: ConvertGuestRequest
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/users/convert/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // Update tokens
  await tokenStorage.setTokens(response.access, response.refresh);
  return response;
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>('/api/auth/users/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });

  await tokenStorage.setTokens(response.access, response.refresh);
  return response;
}

/**
 * Logout - clear tokens
 */
export async function logout(): Promise<void> {
  await tokenStorage.clearTokens();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const accessToken = await tokenStorage.getAccessToken();
  return !!accessToken;
}

/**
 * Check if the current user is a guest
 * Returns null if not authenticated, undefined if is_guest field is missing from token
 */
export async function isGuestUser(): Promise<boolean | null | undefined> {
  const accessToken = await tokenStorage.getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    // Decode JWT payload
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    
    // Check if is_guest field exists in token
    if (payload.is_guest === undefined) {
      return undefined; // Field missing from token
    }
    
    return payload.is_guest === true;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
