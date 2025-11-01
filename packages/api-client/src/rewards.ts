/**
 * API client functions for Rewards System (Point System)
 *
 * These functions interact with the Django backend endpoints in coaching/views.py
 */

import type { HttpClient } from './http';
import type {
  Task,
  Privilege,
  DailyTaskCompletion,
  PrivilegeRedemption,
  PointsBalance,
  RewardsSetupRequest,
  RewardsSetupResponse,
  DailyCompletionRequest,
  DailyCompletionResponse,
  RedeemPrivilegeRequest,
  RedeemPrivilegeResponse,
} from '@app-psy-sophia/schemas';

/**
 * Rewards API client
 * Provides methods for interacting with the rewards system endpoints
 */
export function createRewardsApi(http: HttpClient) {
  return {
    /**
     * Setup rewards system for a child
     * POST /api/modules/rewards/setup/
     *
     * @param request - Setup configuration with tasks and privileges
     * @returns Created tasks, privileges, and module progress
     */
    async setup(request: RewardsSetupRequest): Promise<RewardsSetupResponse> {
      return await http.post('/api/modules/rewards/setup/', request);
    },

    /**
     * List all active tasks for a child
     * GET /api/modules/rewards/tasks/?child_id={id}
     *
     * @param childId - ID of the child
     * @returns Array of active tasks
     */
    async listTasks(childId: number): Promise<{ tasks: Task[] }> {
      return await http.get(`/api/modules/rewards/tasks/?child_id=${childId}`);
    },

    /**
     * List all active privileges for a child
     * GET /api/modules/rewards/privileges/?child_id={id}
     *
     * @param childId - ID of the child
     * @returns Array of active privileges
     */
    async listPrivileges(childId: number): Promise<{ privileges: Privilege[] }> {
      return await http.get(`/api/modules/rewards/privileges/?child_id=${childId}`);
    },

    /**
     * Log daily task completions
     * POST /api/modules/rewards/daily-completion/
     *
     * @param request - Daily completion data
     * @returns Completion record and updated module progress
     */
    async logDailyCompletion(
      request: DailyCompletionRequest
    ): Promise<DailyCompletionResponse> {
      return await http.post('/api/modules/rewards/daily-completion/', request);
    },

    /**
     * List daily completion history
     * GET /api/modules/rewards/daily-completion/?child_id={id}&range={days}d
     *
     * @param childId - ID of the child
     * @param rangeDays - Number of days to fetch (default: 30)
     * @returns Array of daily completions
     */
    async listDailyCompletions(
      childId: number,
      rangeDays: number = 30
    ): Promise<{ completions: DailyTaskCompletion[] }> {
      return await http.get(
        `/api/modules/rewards/daily-completion/?child_id=${childId}&range=${rangeDays}d`
      );
    },

    /**
     * Redeem a privilege (spend points)
     * POST /api/modules/rewards/redeem/
     *
     * @param request - Redemption data
     * @returns Redemption record and new balance
     */
    async redeemPrivilege(
      request: RedeemPrivilegeRequest
    ): Promise<RedeemPrivilegeResponse> {
      return await http.post('/api/modules/rewards/redeem/', request);
    },

    /**
     * Get current points balance for a child
     * GET /api/modules/rewards/balance/?child_id={id}
     *
     * @param childId - ID of the child
     * @returns Points balance summary
     */
    async getBalance(childId: number): Promise<PointsBalance> {
      return await http.get(`/api/modules/rewards/balance/?child_id=${childId}`);
    },
  };
}

export type RewardsApi = ReturnType<typeof createRewardsApi>;
