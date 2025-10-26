/**
 * Environment Configuration
 * 
 * This file handles environment-based configuration for the app.
 * All configuration comes from environment variables - no hardcoded values.
 */

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  apiUrl: string;
  environment: Environment;
  debug: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get environment configuration based on environment variables
 */
function getEnvironmentConfig(): AppConfig {
  // Get environment from environment variable or default to development
  const environment = (process.env.EXPO_PUBLIC_ENVIRONMENT || 'development') as Environment;
  
  // Determine if we're in development mode
  const isDevelopment = environment === 'development' || __DEV__;
  const isProduction = environment === 'production';
  
  // Get API URL from environment variable - NO FALLBACKS
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Validate required environment variable
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_URL is required. Check your .env file.');
  }
  
  // Debug mode - enabled in development, can be overridden
  const debug = process.env.EXPO_PUBLIC_DEBUG === 'true' || (isDevelopment && process.env.EXPO_PUBLIC_DEBUG !== 'false');
  
  return {
    apiUrl,
    environment,
    debug,
    isDevelopment,
    isProduction,
  };
}

/**
 * Export the configuration
 */
export const config = getEnvironmentConfig();

/**
 * Log configuration in development
 */
if (config.debug) {
  console.log('🔧 App Configuration:', {
    environment: config.environment,
    apiUrl: config.apiUrl,
    debug: config.debug,
    isDevelopment: config.isDevelopment,
  });
}

export default config;
