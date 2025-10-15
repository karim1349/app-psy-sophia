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

// Deal interfaces
export interface Deal {
  id: number;
  title: string;
  description: string;
  current_price: number;
  original_price: number;
  currency: Currency;
  discount_percentage: number;
  merchant: string;
  location: string;
  category: DealCategory;
  image_url?: string;
  proof_url?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  author: User;
  vote_count: number;
  comment_count: number;
  user_vote?: VoteType; // Current user's vote (if authenticated)
  is_verified: boolean;
  is_expired: boolean;
  expires_at?: Timestamp;
}

export interface DealCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
}

export interface DealVote {
  id: number;
  deal: number; // Deal ID
  user: number; // User ID
  vote_type: VoteType;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DealComment {
  id: number;
  deal: number; // Deal ID
  user: User;
  content: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_edited: boolean;
  parent?: number; // For nested comments
  replies?: DealComment[];
}

// Create/Update interfaces
export interface CreateDealInput {
  title: string;
  description: string;
  current_price: number;
  original_price: number;
  currency: Currency;
  merchant: string;
  channel: 'online' | 'in_store';
  city?: string;
  url?: string;
  category: number; // Category ID
  image?: File; // For image upload
  proof_url?: string; // For proof URL
  expires_at?: Timestamp;
}

export interface UpdateDealInput {
  title?: string;
  description?: string;
  current_price?: number;
  original_price?: number;
  currency?: Currency;
  merchant?: string;
  location?: string;
  category?: number;
  expires_at?: Timestamp;
}

export interface CreateCommentInput {
  deal: number; // Deal ID
  content: string;
  parent?: number; // For replies
}

export interface UpdateCommentInput {
  content: string;
}

// Search and filtering
export interface DealFilters {
  category?: number;
  merchant?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  currency?: Currency;
  is_verified?: boolean;
  is_expired?: boolean;
  sort_by?: 'hot' | 'top' | 'new' | 'price_low' | 'price_high';
  search?: string;
}

export interface DealSearchParams extends DealFilters {
  page?: number;
  page_size?: number;
}

// API Response types
export interface DealListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Deal[];
}

export interface DealDetailResponse extends Deal {
  votes: DealVote[];
  comments: DealComment[];
}

export interface VoteResponse {
  vote: DealVote;
  deal_vote_count: number;
  user_vote: VoteType | null;
}

export interface CommentResponse {
  comment: DealComment;
  deal_comment_count: number;
}

// Form validation schemas (for Zod)
export const DealCategorySchema = {
  id: 'number',
  name: 'string',
  slug: 'string',
  icon: 'string?',
  color: 'string?',
} as const;

export const CreateDealSchema = {
  title: 'string (min: 5, max: 200)',
  description: 'string (min: 10, max: 1000)',
  current_price: 'number (min: 0)',
  original_price: 'number (min: 0)',
  currency: 'Currency enum',
  merchant: 'string (min: 2, max: 100)',
  location: 'string (min: 2, max: 100)',
  category: 'number (category ID)',
  expires_at: 'Timestamp?',
} as const;

export const CreateCommentSchema = {
  deal: 'number (deal ID)',
  content: 'string (min: 1, max: 500)',
  parent: 'number? (parent comment ID)',
} as const;

// Utility types
export type DealSortOption = 'hot' | 'top' | 'new' | 'price_low' | 'price_high';
export type DealStatus = 'active' | 'expired' | 'verified' | 'unverified';

// Mock data types for development
export interface MockDeal extends Omit<Deal, 'author'> {
  author: {
    id: number;
    username: string;
  };
}

export interface MockDealCategory extends DealCategory {
  deal_count: number;
}
