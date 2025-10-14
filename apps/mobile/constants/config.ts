/**
 * App configuration constants
 */

export const config = {
  // API Configuration
  baseURL: process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:8000/api',
  
  // Environment
  isDevelopment: __DEV__,
  
  // App Settings
  defaultPageSize: 20,
  searchDebounceMs: 500,
} as const;
