/**
 * Deal-related TypeScript interfaces
 * 
 * NOTE: These interfaces are designed to match future Django models/serializers.
 * Currently, only User model exists in the backend.
 * 
 * When Django models are created, these interfaces should be updated to match
 * the exact field names and types returned by Django REST Framework serializers.
 */

// Base types
export type Timestamp = string; // ISO 8601 format from Django
export type Currency = 'MAD' | 'USD' | 'EUR';
export type VoteType = 'up' | 'down';

// User interfaces (from existing serializers)
export interface User {
  id: number;
  email: string;
  username: string;
  created_at: Timestamp;
  is_active: boolean;
}

export interface UserProfile extends User {
  account_age: string; // ISO duration format
  is_new_account: boolean;
}
