/**
 * App configuration constants
 */

export const config = {
  // API Configuration
  baseURL: process.env.EXPO_PUBLIC_API_BASE || 'https://app-psy-sophia.onrender.com/api',
  
  // Environment
  isDevelopment: __DEV__,
  
  // App Settings
  defaultPageSize: 20,
  searchDebounceMs: 500,
} as const;
