import { HttpError } from './types';

export interface HttpConfig {
  env: 'native' | 'web';
  baseURL: string;
  getAccessToken?: () => string | null; // Only used for native
}

export interface HttpClient {
  get<T>(url: string, config?: RequestInit): Promise<T>;
  post<T>(url: string, data?: Record<string, unknown>, config?: RequestInit): Promise<T>;
  patch<T>(url: string, data?: any, config?: RequestInit): Promise<T>;
  delete<T>(url: string, config?: RequestInit): Promise<T | undefined>;
}

/**
 * Create an HTTP client with platform-specific behavior
 *
 * @param config - Configuration object
 * @returns HTTP client with get, post, patch, delete methods
 *
 * @example Native
 * ```ts
 * const http = createHttp({
 *   env: 'native',
 *   baseURL: 'https://api.qiima.ma',
 *   getAccessToken: () => sessionStore.getState().accessToken,
 * });
 * ```
 *
 * @example Web
 * ```ts
 * const http = createHttp({
 *   env: 'web',
 *   baseURL: '/api', // BFF proxy
 * });
 * ```
 */
export function createHttp(config: HttpConfig): HttpClient {
  const { env, baseURL, getAccessToken } = config;

  // Normalize baseURL (remove trailing slash)
  const normalizedBaseURL = baseURL.endsWith('/')
    ? baseURL.slice(0, -1)
    : baseURL;

  /**
   * Build headers for the request based on environment
   */
  function buildHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Native: Add Authorization header if token exists
    if (env === 'native' && getAccessToken) {
      const token = getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Merge with custom headers
    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Build request config based on environment
   */
  function buildRequestConfig(config?: RequestInit): RequestInit {
    const baseConfig: RequestInit = {
      headers: buildHeaders(config?.headers),
    };

    // Web: Always include credentials for cookie-based auth
    if (env === 'web') {
      baseConfig.credentials = 'include';
    }

    return {
      ...baseConfig,
      ...config,
      headers: {
        ...baseConfig.headers,
        ...(config?.headers || {}),
      },
    };
  }

  /**
   * Make a fetch request and handle errors
   */
  async function request<T>(
    url: string,
    config?: RequestInit
  ): Promise<T | undefined> {
    const fullURL = `${normalizedBaseURL}${url}`;
    const requestConfig = buildRequestConfig(config);

    try {
      const response = await fetch(fullURL, requestConfig);

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined;
      }

      // Parse response body
      let data: Record<string, any>;
      try {
        data = await response.json();
      } catch {
        // If not JSON, use status text
        data = { message: response.statusText };
      }

      // Handle error responses
      if (!response.ok) {
        // DRF sends validation errors at the top level (e.g., { "non_field_errors": [...], "email": [...] })
        // Check if we have DRF-style validation errors at the top level
        const hasValidationErrors = Object.keys(data).some(key => 
          Array.isArray(data[key]) && key !== 'message'
        );
        
        // Use data.errors if nested, otherwise use the whole data object (DRF format)
        const errors = data.errors || (hasValidationErrors ? data : undefined);
        
        throw new HttpError(
          data.message || data.detail || response.statusText,
          response.status,
          errors
        );
      }

      return data as T;
    } catch (error) {
      // Re-throw HttpError as is
      if (error instanceof HttpError) {
        throw error;
      }

      // Wrap other errors
      throw error;
    }
  }

  return {
    get<T>(url: string, config?: RequestInit): Promise<T> {
      return request<T>(url, {
        ...config,
        method: 'GET',
      }) as Promise<T>;
    },

    post<T>(url: string, data?: any, config?: RequestInit): Promise<T> {
      return request<T>(url, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }) as Promise<T>;
    },

    patch<T>(url: string, data?: Record<string, unknown>, config?: RequestInit): Promise<T> {
      return request<T>(url, {
        ...config,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      }) as Promise<T>;
    },

    delete<T>(url: string, config?: RequestInit): Promise<T | undefined> {
      return request<T>(url, {
        ...config,
        method: 'DELETE',
      });
    },
  };
}
