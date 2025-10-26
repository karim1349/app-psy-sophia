/**
 * Authentication API functions
 */

import { apiFetch } from './client';
import { tokenStorage } from '../lib/storage';
import type { AuthResponse, ConvertGuestRequest } from '../types/api';

/**
 * Ensure a guest session exists
 * If no token exists, create a guest user and store tokens
 */
export async function ensureGuestSession(): Promise<void> {
  const accessToken = await tokenStorage.getAccessToken();

  if (!accessToken) {
    // Create guest user
    const response = await apiFetch<AuthResponse>('/api/auth/users/guest/', {
      method: 'POST',
      skipAuth: true,
    });

    // Store tokens
    await tokenStorage.setTokens(response.access, response.refresh);
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
