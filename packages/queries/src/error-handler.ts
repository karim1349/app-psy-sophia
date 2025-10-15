import { HttpError } from '@qiima/api-client';

export interface ToastError {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;  // i18n key
  message?: string;  // i18n key or backend i18n key
  field?: string;  // Field display name for context
}

/**
 * Maps different error types to appropriate toast messages with i18n keys
 * Returns an array to support multiple validation errors
 */
export function mapErrorToToast(error: unknown): ToastError[] {
  // Handle HttpError from API client
  if (error instanceof HttpError) {
    return mapHttpErrorToToast(error);
  }

  // Handle network errors
  if (error instanceof Error && error.name === 'NetworkError') {
    return [{
      type: 'error',
      title: 'errors.title.network',
      message: 'errors.network.connectionFailed',
    }];
  }

  // Handle generic errors
  if (error instanceof Error) {
    return [{
      type: 'error',
      title: 'errors.title.validation',
      message: error.message || 'errors.generic.unknown',
    }];
  }

  // Handle unknown error types
  return [{
    type: 'error',
    title: 'errors.title.validation',
    message: 'errors.generic.unknown',
  }];
}

/**
 * Determines the appropriate error title based on the error message i18n key
 */
function getTitleForErrorMessage(errorMessage: string): string {
  // Map error message patterns to appropriate titles
  if (errorMessage.startsWith('auth.')) {
    return 'errors.title.auth';
  }
  if (errorMessage.startsWith('network.')) {
    return 'errors.title.network';
  }
  if (errorMessage.startsWith('server.')) {
    return 'errors.title.server';
  }
  if (errorMessage.startsWith('resource.')) {
    return 'errors.title.notFound';
  }
  if (errorMessage.startsWith('rateLimit.')) {
    return 'errors.title.rateLimit';
  }
  
  // Default to validation error
  return 'errors.title.validation';
}

/**
 * Converts backend field names to i18n keys for field display names
 */
function getFieldDisplayName(fieldName: string): string {
  // Map common backend field names to i18n keys
  const fieldMappings: Record<string, string> = {
    // Authentication fields
    'email': 'errors.fields.email',
    'password': 'errors.fields.password',
    'password_confirm': 'errors.fields.password_confirm',
    'username': 'errors.fields.username',
    
    // Deal fields
    'merchant': 'errors.fields.merchant',
    'channel': 'errors.fields.channel',
    'url': 'errors.fields.url',
    'proof_url': 'errors.fields.proof_url',
    'title': 'errors.fields.title',
    'description': 'errors.fields.description',
    'price': 'errors.fields.price',
    'original_price': 'errors.fields.original_price',
    'discount_percentage': 'errors.fields.discount_percentage',
    'expires_at': 'errors.fields.expires_at',
    
    // User profile fields
    'first_name': 'errors.fields.first_name',
    'last_name': 'errors.fields.last_name',
    'phone': 'errors.fields.phone',
    'address': 'errors.fields.address',
    'city': 'errors.fields.city',
    'country': 'errors.fields.country',
    
    // Common fields
    'name': 'errors.fields.name',
    'image': 'errors.fields.image',
    'file': 'errors.fields.file',
    'code': 'errors.fields.code',
    'token': 'errors.fields.token',
  };
  
  // Return i18n key or create a generic one for unmapped fields
  return fieldMappings[fieldName] || `errors.fields.${fieldName}`;
}

/**
 * Maps HttpError status codes to user-friendly toast messages with i18n keys
 * Returns an array to support showing multiple field validation errors
 */
function mapHttpErrorToToast(error: HttpError): ToastError[] {
  const { status, message, errors } = error;

  switch (status) {
    case 400:
    case 422:
      const toasts: ToastError[] = [];
      
      // Check for non-field errors (backend sends i18n key)
      if (errors?.non_field_errors) {
        errors.non_field_errors.forEach((errorMessage) => {
          toasts.push({
            type: 'error',
            title: getTitleForErrorMessage(errorMessage),
            message: errorMessage,  // Backend i18n key like "auth.login.invalidCredentials"
          });
        });
      }
      
      // Field-specific errors (backend sends i18n key) - show ALL of them
      if (errors) {
        Object.keys(errors).forEach((field) => {
          if (field !== 'non_field_errors' && errors[field]) {
            errors[field]?.forEach((errorMessage) => {
              // For field-specific errors, create a structured message
              // that can be properly translated while including field context
              const fieldDisplayName = getFieldDisplayName(field);
              
              toasts.push({
                type: 'error',
                title: getTitleForErrorMessage(errorMessage),
                message: errorMessage,  // Keep the i18n key for translation
                // Add field context as a separate property if needed
                field: fieldDisplayName,
              });
            });
          }
        });
      }
      
      // If we found errors, return them
      if (toasts.length > 0) {
        return toasts;
      }
      
      // Fallback if no structured errors
      return [{
        type: 'error',
        title: 'errors.title.validation',
        message: message || 'errors.generic.validation',
      }];

    case 401:
      // Check if it's a "not authenticated" vs "session expired" error
      const is401NotAuthenticated = 
        message?.toLowerCase().includes('credentials were not provided') ||
        message?.toLowerCase().includes('authentication credentials') ||
        message?.toLowerCase().includes('not authenticated');
      
      // Use 'error' for not authenticated (user needs to log in), 'warning' for expired session
      return is401NotAuthenticated ? [{
        type: 'error' as const,
        title: 'errors.title.auth',
        message: 'auth.login.required',
      }] : [{
        type: 'warning' as const,
        title: 'errors.title.auth',
        message: 'auth.session.expiredMessage',
      }];

    case 403:
      return [{
        type: 'error',
        title: 'errors.title.forbidden',
        message: 'errors.resource.forbidden',
      }];

    case 404:
      return [{
        type: 'error',
        title: 'errors.title.notFound',
        message: 'errors.resource.notFound',
      }];

    case 409:
      return [{
        type: 'error',
        title: 'errors.title.conflict',
        message: message || 'errors.resource.conflict',
      }];

    case 429:
      return [{
        type: 'warning',
        title: 'errors.title.rateLimit',
        message: 'errors.rateLimit.exceeded',
      }];

    case 500:
      return [{
        type: 'error',
        title: 'errors.title.server',
        message: 'errors.server.internal',
      }];

    case 502:
    case 503:
    case 504:
      return [{
        type: 'error',
        title: 'errors.title.server',
        message: 'errors.server.unavailable',
      }];

    default:
      if (status >= 500) {
        return [{
          type: 'error',
          title: 'errors.title.server',
          message: 'errors.server.internal',
        }];
      } else if (status >= 400) {
        return [{
          type: 'error',
          title: 'errors.title.validation',
          message: message || 'errors.generic.validation',
        }];
      }
      
      return [{
        type: 'error',
        title: 'common.error',
        message: 'errors.generic.unknown',
      }];
  }
}

/**
 * Checks if an error should be suppressed from showing as a toast
 */
export function shouldSuppressError(error: unknown, meta?: Record<string, unknown>): boolean {
  // Check if error suppression is explicitly requested
  if (meta?.suppressErrorToast === true) {
    return true;
  }

  // Suppress specific error types that are handled elsewhere
  if (error instanceof HttpError) {
    // For 401 errors, only suppress if it's a token refresh scenario
    // Show toast for "not authenticated" errors (when user needs to log in)
    if (error.status === 401) {
      const errorMessage = error.message?.toLowerCase() || '';
      
      // Don't suppress if it's an "authentication required" error
      // These messages indicate the user is not logged in, not that the token expired
      if (
        errorMessage.includes('credentials were not provided') ||
        errorMessage.includes('authentication credentials') ||
        errorMessage.includes('not authenticated') ||
        meta?.showAuthRequired === true
      ) {
        return false; // Show toast
      }
      
      // Suppress token expiration errors (handled by refresh logic)
      return true;
    }
  }

  // Suppress network errors for background operations
  if (error instanceof Error && error.name === 'NetworkError') {
    if (meta?.isBackgroundRefresh === true || meta?.isPolling === true) {
      return true;
    }
  }

  // Suppress errors for specific query types
  if (meta?.queryType === 'background-sync' || meta?.handleErrorLocally === true) {
    return true;
  }

  return false;
}

/**
 * Maps success actions to toast messages with i18n keys
 */
export function mapSuccessToToast(action: string, _data?: unknown): ToastError[] {
  switch (action) {
    case 'login':
      return [{
        type: 'success',
        title: 'auth.login.success',
        message: 'auth.login.welcomeBack',
      }];

    case 'register':
      return [{
        type: 'success',
        title: 'auth.register.success',
        message: 'auth.register.checkEmail',
      }];

    case 'verify-email':
      return [{
        type: 'success',
        title: 'auth.verifyEmail.success',
        message: 'auth.verifyEmail.verified',
      }];

    case 'reset-password':
      return [{
        type: 'success',
        title: 'auth.resetPassword.success',
        message: 'auth.resetPassword.resetSuccess',
      }];

    case 'create-deal':
      return [{
        type: 'success',
        title: 'deals.create.success',
        message: 'deals.create.created',
      }];

    default:
      return [];
  }
}