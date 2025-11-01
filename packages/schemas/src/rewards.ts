/**
 * Rewards System (Point System) TypeScript interfaces
 *
 * These interfaces match the Django models and serializers for the rewards system.
 * Backend endpoints are located in coaching/views.py (RewardsModuleViewSet).
 */

export type Timestamp = string; // ISO 8601 format from Django
export type DateString = string; // ISO 8601 date format (YYYY-MM-DD)

/**
 * Task that child completes to earn points
 * Points reward can be 1 (simple), 3 (medium), or 5 (complex)
 */
export interface Task {
  id: number;
  child: number;
  title: string;
  points_reward: 1 | 3 | 5;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Privilege that child can redeem by spending points
 * Points cost can be 3 (daily), 5 (important), or 10 (very important)
 */
export interface Privilege {
  id: number;
  child: number;
  title: string;
  points_cost: 3 | 5 | 10;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Daily task completion record
 * Tracks which tasks were completed on a given day
 */
export interface DailyTaskCompletion {
  id: number;
  child: number;
  date: DateString;
  completed_task_ids: number[];
  total_points_earned: number;
  completion_rate: number; // Percentage 0-100
  notes: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Privilege redemption transaction
 * Historical record of points spent on privileges
 */
export interface PrivilegeRedemption {
  id: number;
  child: number;
  privilege: number | null; // null if privilege was deleted
  privilege_title: string; // Stored for history
  points_spent: number;
  redeemed_at: Timestamp;
  notes: string;
}

/**
 * Points balance summary
 */
export interface PointsBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

// =============================================================================
// API Request/Response types
// =============================================================================

/**
 * Request body for setting up rewards system
 * POST /api/modules/rewards/setup/
 */
export interface RewardsSetupRequest {
  child_id: number;
  tasks: Array<{
    title: string;
    points_reward: 1 | 3 | 5;
  }>;
  privileges: Array<{
    title: string;
    points_cost: 3 | 5 | 10;
  }>;
}

/**
 * Response from rewards setup
 */
export interface RewardsSetupResponse {
  tasks: Task[];
  privileges: Privilege[];
  progress: ModuleProgress;
}

/**
 * Request body for logging daily task completions
 * POST /api/modules/rewards/daily-completion/
 */
export interface DailyCompletionRequest {
  child_id: number;
  date: DateString;
  completed_task_ids: number[];
  notes?: string;
}

/**
 * Response from logging daily completion
 */
export interface DailyCompletionResponse {
  completion: DailyTaskCompletion;
  progress: ModuleProgress;
}

/**
 * Request body for redeeming a privilege
 * POST /api/modules/rewards/redeem/
 */
export interface RedeemPrivilegeRequest {
  child_id: number;
  privilege_id: number;
  notes?: string;
}

/**
 * Response from redeeming a privilege
 */
export interface RedeemPrivilegeResponse {
  redemption: PrivilegeRedemption;
  new_balance: number;
}

/**
 * Module progress type (simplified - should be imported from module types when available)
 */
export interface ModuleProgress {
  id: number;
  child: number;
  module: number;
  state: "locked" | "unlocked" | "passed";
  counters: Record<string, any>;
  passed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =============================================================================
// Helper types for UI
// =============================================================================

/**
 * Task with completion status for UI
 */
export interface TaskWithStatus extends Task {
  completed_today: boolean;
}

/**
 * Privilege with affordability status for UI
 */
export interface PrivilegeWithAffordability extends Privilege {
  can_afford: boolean;
  points_needed: number; // 0 if can afford, otherwise points needed
}

/**
 * Daily completion summary for calendar/chart display
 */
export interface DailyCompletionSummary {
  date: DateString;
  completion_rate: number;
  points_earned: number;
  tasks_completed: number;
  total_tasks: number;
}
