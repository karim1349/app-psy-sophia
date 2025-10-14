/**
 * @qiima/api-client
 *
 * Platform-aware HTTP client for Qiima API
 * Handles both native (JWT) and web (cookie) authentication patterns
 */

export { createHttp, type HttpConfig, type HttpClient } from './http';
export {
  HttpError,
  type ApiError,
  type User,
  type AuthResponse,
  type RefreshResponse,
  type MessageResponse,
} from './types';
