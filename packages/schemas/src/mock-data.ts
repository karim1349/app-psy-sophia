/**
 * Mock data for development and testing
 * 
 * NOTE: This mock data is for frontend development only.
 * The actual Django models for deals, categories, votes, and comments
 * have not been created yet - only the User model exists.
 * 
 * When Django models are implemented, this mock data should be replaced
 * with real API calls to the backend.
 */

import type { 
  User, 
  MockDeal, 
  MockDealCategory,
  DealComment,
  DealVote
} from './deals';

// Mock users
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'ahmed@example.com',
    username: 'ahmed_m',
    created_at: '2024-01-15T10:30:00Z',
    is_active: true,
  },
  {
    id: 2,
    email: 'fatima@example.com',
    username: 'fatima_a',
    created_at: '2024-01-20T14:15:00Z',
    is_active: true,
  },
  {
    id: 3,
    email: 'youssef@example.com',
    username: 'youssef_k',
    created_at: '2024-02-01T09:45:00Z',
    is_active: true,
  },
];

// Mock categories
export const mockCategories: MockDealCategory[] = [
  {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    icon: '📱',
    color: '#3B82F6',
    deal_count: 45,
  },
  {
    id: 2,
    name: 'Fashion',
    slug: 'fashion',
    icon: '👕',
    color: '#EC4899',
    deal_count: 32,
  },
  {
    id: 3,
    name: 'Food & Dining',
    slug: 'food-dining',
    icon: '🍕',
    color: '#F59E0B',
    deal_count: 28,
  },
  {
    id: 4,
    name: 'Home & Garden',
    slug: 'home-garden',
    icon: '🏠',
    color: '#10B981',
    deal_count: 19,
  },
  {
    id: 5,
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    icon: '⚽',
    color: '#8B5CF6',
    deal_count: 15,
  },
];

// Mock deals
export const mockDeals: MockDeal[] = [
  {
    id: 1,
    title: 'iPhone 15 Pro - 50% OFF',
    description: 'Brand new iPhone 15 Pro with 256GB storage. Limited time offer! Available in all colors.',
    current_price: 4500,
    original_price: 9000,
    currency: 'MAD',
    discount_percentage: 50,
    merchant: 'Electro Planet',
    location: 'Casablanca',
    category: mockCategories[0]!, // Electronics
    image_url: 'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=iPhone+15+Pro',
    proof_url: 'https://via.placeholder.com/300x200/10B981/FFFFFF?text=Receipt+Proof',
    created_at: '2024-02-15T10:30:00Z',
    updated_at: '2024-02-15T10:30:00Z',
    author: {
      id: 1,
      username: 'ahmed_m',
    },
    vote_count: 127,
    comment_count: 23,
    user_vote: 'up',
    is_verified: true,
    is_expired: false,
    expires_at: '2024-02-20T23:59:59Z',
  },
  {
    id: 2,
    title: 'Nike Air Max - 30% OFF',
    description: 'Comfortable running shoes with great cushioning. Perfect for daily workouts.',
    current_price: 350,
    original_price: 500,
    currency: 'MAD',
    discount_percentage: 30,
    merchant: 'Nike Store',
    location: 'Rabat',
    category: mockCategories[4]!, // Sports & Fitness
    image_url: 'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Nike+Air+Max',
    created_at: '2024-02-14T16:45:00Z',
    updated_at: '2024-02-14T16:45:00Z',
    author: {
      id: 2,
      username: 'fatima_a',
    },
    vote_count: 89,
    comment_count: 12,
    user_vote: 'up',
    is_verified: true,
    is_expired: false,
  },
  {
    id: 3,
    title: 'McDonald\'s Meal Deal',
    description: 'Big Mac + Fries + Drink combo for only 25 MAD. Valid until end of month.',
    current_price: 25,
    original_price: 35,
    currency: 'MAD',
    discount_percentage: 29,
    merchant: 'McDonald\'s',
    location: 'Marrakech',
    category: mockCategories[2]!, // Food & Dining
    image_url: 'https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=McDonald+Meal',
    created_at: '2024-02-13T12:20:00Z',
    updated_at: '2024-02-13T12:20:00Z',
    author: {
      id: 3,
      username: 'youssef_k',
    },
    vote_count: 45,
    comment_count: 8,
    user_vote: 'down',
    is_verified: false,
    is_expired: false,
    expires_at: '2024-02-29T23:59:59Z',
  },
  {
    id: 4,
    title: 'Samsung Galaxy S24 - 40% OFF',
    description: 'Latest Samsung flagship with amazing camera and battery life.',
    current_price: 3600,
    original_price: 6000,
    currency: 'MAD',
    discount_percentage: 40,
    merchant: 'Samsung Store',
    location: 'Casablanca',
    category: mockCategories[0]!, // Electronics
    image_url: 'https://via.placeholder.com/300x200/3B82F6/FFFFFF?text=Samsung+Galaxy+S24',
    created_at: '2024-02-12T09:15:00Z',
    updated_at: '2024-02-12T09:15:00Z',
    author: {
      id: 1,
      username: 'ahmed_m',
    },
    vote_count: 203,
    comment_count: 45,
    user_vote: 'up',
    is_verified: true,
    is_expired: false,
  },
  {
    id: 5,
    title: 'Zara Winter Collection - 50% OFF',
    description: 'Beautiful winter jackets and sweaters. Limited sizes available.',
    current_price: 150,
    original_price: 300,
    currency: 'MAD',
    discount_percentage: 50,
    merchant: 'Zara',
    location: 'Rabat',
    category: mockCategories[1]!, // Fashion
    image_url: 'https://via.placeholder.com/300x200/EC4899/FFFFFF?text=Zara+Winter',
    created_at: '2024-02-11T14:30:00Z',
    updated_at: '2024-02-11T14:30:00Z',
    author: {
      id: 2,
      username: 'fatima_a',
    },
    vote_count: 67,
    comment_count: 15,
    user_vote: undefined,
    is_verified: true,
    is_expired: false,
  },
];

// Mock comments
export const mockComments: DealComment[] = [
  {
    id: 1,
    deal: 1,
    user: mockUsers[1]!,
    content: 'Great deal! I bought it yesterday and it\'s working perfectly. The camera quality is amazing.',
    created_at: '2024-02-15T11:30:00Z',
    updated_at: '2024-02-15T11:30:00Z',
    is_edited: false,
  },
  {
    id: 2,
    deal: 1,
    user: mockUsers[2]!,
    content: 'Is this still available? I\'m interested!',
    created_at: '2024-02-15T13:45:00Z',
    updated_at: '2024-02-15T13:45:00Z',
    is_edited: false,
  },
  {
    id: 3,
    deal: 2,
    user: mockUsers[0]!,
    content: 'Comfortable shoes, but the sizing runs a bit small. I recommend going up half a size.',
    created_at: '2024-02-14T17:20:00Z',
    updated_at: '2024-02-14T17:20:00Z',
    is_edited: false,
  },
];

// Mock votes
export const mockVotes: DealVote[] = [
  {
    id: 1,
    deal: 1,
    user: 1,
    vote_type: 'up',
    created_at: '2024-02-15T10:35:00Z',
    updated_at: '2024-02-15T10:35:00Z',
  },
  {
    id: 2,
    deal: 1,
    user: 2,
    vote_type: 'up',
    created_at: '2024-02-15T11:00:00Z',
    updated_at: '2024-02-15T11:00:00Z',
  },
  {
    id: 3,
    deal: 2,
    user: 1,
    vote_type: 'up',
    created_at: '2024-02-14T16:50:00Z',
    updated_at: '2024-02-14T16:50:00Z',
  },
];

// Helper functions
export function getDealById(id: number): MockDeal | undefined {
  return mockDeals.find(deal => deal.id === id);
}

export function getDealsByCategory(categoryId: number): MockDeal[] {
  return mockDeals.filter(deal => deal.category.id === categoryId);
}

export function getHotDeals(limit: number = 10): MockDeal[] {
  return mockDeals
    .filter(deal => !deal.is_expired)
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, limit);
}

export function getNewDeals(limit: number = 10): MockDeal[] {
  return mockDeals
    .filter(deal => !deal.is_expired)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function getTopDeals(limit: number = 10): MockDeal[] {
  return mockDeals
    .filter(deal => !deal.is_expired)
    .sort((a, b) => (b.vote_count + b.comment_count) - (a.vote_count + a.comment_count))
    .slice(0, limit);
}

export function searchDeals(query: string): MockDeal[] {
  const lowercaseQuery = query.toLowerCase();
  return mockDeals.filter(deal => 
    deal.title.toLowerCase().includes(lowercaseQuery) ||
    deal.description.toLowerCase().includes(lowercaseQuery) ||
    deal.merchant.toLowerCase().includes(lowercaseQuery) ||
    deal.location.toLowerCase().includes(lowercaseQuery)
  );
}
