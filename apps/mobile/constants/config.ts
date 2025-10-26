/**
 * App configuration constants
 * 
 * @deprecated Use src/config/environment.ts instead
 * This file is kept for backward compatibility
 */

import { config as envConfig } from '../src/config/environment';

export const config = {
  // API Configuration - now uses environment-based config
  baseURL: envConfig.apiUrl,
  
  // Environment
  isDevelopment: envConfig.isDevelopment,
  
  // App Settings
  defaultPageSize: 20,
  searchDebounceMs: 500,
} as const;
