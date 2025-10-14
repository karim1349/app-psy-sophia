/**
 * @qiima/schemas
 *
 * Shared Zod validation schemas for Qiima application
 * Provides client-side validation that mirrors backend Django validation
 */

export {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
} from './auth';

export {
  type Deal,
  type DealCategory,
  type DealVote,
  type DealComment,
  type CreateDealInput,
  type UpdateDealInput,
  type CreateCommentInput,
  type UpdateCommentInput,
  type DealFilters,
  type DealSearchParams,
  type DealListResponse,
  type DealDetailResponse,
  type VoteResponse,
  type CommentResponse,
  type DealSortOption,
  type DealStatus,
  type MockDeal,
  type MockDealCategory,
} from './deals';

export {
  mockUsers,
  mockCategories,
  mockDeals,
  mockComments,
  mockVotes,
  getDealById,
  getDealsByCategory,
  getHotDeals,
  getNewDeals,
  getTopDeals,
  searchDeals,
} from './mock-data';
