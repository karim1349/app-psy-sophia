/**
 * API response and error types
 */

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface RefreshResponse {
  access: string;
  refresh: string;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>; // DRF validation errors format
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
