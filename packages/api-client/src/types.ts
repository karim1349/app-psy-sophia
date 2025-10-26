/**
 * API response and error types
 */

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
  is_active: boolean;
  is_guest: boolean;
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
    public errors?: Record<string, string[]>,
    public code?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
