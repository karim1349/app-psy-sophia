/**
 * Mock data for development and testing
 * 
 * NOTE: This mock data is for frontend development only.
 * The actual Django models for 
 * have not been created yet - only the User model exists.
 * 
 * When Django models are implemented, this mock data should be replaced
 * with real API calls to the backend.
 */

import type { 
  User,
} from './user';

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
