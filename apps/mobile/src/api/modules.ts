/**
 * Module and Special Time API functions
 */

import { apiFetch } from './client';
import type {
  AngerCrisisLog,
  CreateAngerLogRequest,
  CreateAngerLogResponse,
  CreateLogRequest,
  CreateLogResponse,
  CreateObjectivesRequest,
  CreateRoutineCompletionRequest,
  CreateRoutineCompletionResponse,
  CreateRoutineRequest,
  CreateScheduleBlockRequest,
  CreateScheduleRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  CreateTimeOutLogRequest,
  CreateTimeOutLogResponse,
  EffectiveCommandLog,
  EffectiveCommandObjective,
  ModuleProgress,
  ModuleWithProgress,
  Routine,
  RoutineCompletion,
  RoutineTemplates,
  Schedule,
  ScheduleBlock,
  SetAngerFrequencyRequest,
  SetTimeManagementChoiceRequest,
  SetTimeOutGoalRequest,
  SpecialTimeSession,
  TimeManagementChoice,
  TimeOutLog,
} from '../types/api';

/**
 * Get all modules with progress for a child
 */
export async function getModules(childId: number): Promise<ModuleWithProgress[]> {
  console.log('📡 getModules called with childId:', childId);
  const url = `/api/modules/?child_id=${childId}`;
  console.log('📡 Full URL:', url);
  const result = await apiFetch<ModuleWithProgress[]>(url);
  console.log('📡 getModules response:', result);
  return result;
}

/**
 * Log a Special Time session
 */
export async function createSpecialTimeSession(
  data: CreateSessionRequest
): Promise<CreateSessionResponse> {
  return apiFetch<CreateSessionResponse>('/api/modules/special-time/sessions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get Special Time sessions for a child
 */
export async function getSpecialTimeSessions(
  childId: number,
  range: string = '21d'
): Promise<{ results: SpecialTimeSession[] }> {
  return apiFetch<{ results: SpecialTimeSession[] }>(
    `/api/modules/special-time/sessions/?child_id=${childId}&range=${range}`
  );
}

/**
 * Update goal_per_week for a module
 */
export async function updateModuleGoal(
  progressId: number,
  goalPerWeek: number
): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>(`/api/modules-progress/${progressId}/goal/`, {
    method: 'PATCH',
    body: JSON.stringify({ goal_per_week: goalPerWeek }),
  });
}

/**
 * Recompute Special Time progress (for testing/debugging)
 */
export async function recomputeSpecialTime(childId: number): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>('/api/modules/special-time/recompute/', {
    method: 'POST',
    body: JSON.stringify({ child: childId }),
  });
}

// Effective Commands API functions

/**
 * Create objectives for Effective Commands module
 */
export async function createEffectiveCommandObjectives(
  data: CreateObjectivesRequest
): Promise<EffectiveCommandObjective[]> {
  return apiFetch<EffectiveCommandObjective[]>(
    '/api/modules/effective-commands/objectives/',
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Get objectives for a child
 */
export async function getEffectiveCommandObjectives(
  childId: number
): Promise<{ results: EffectiveCommandObjective[] }> {
  return apiFetch<{ results: EffectiveCommandObjective[] }>(
    `/api/modules/effective-commands/objectives/?child_id=${childId}`
  );
}

/**
 * Log an Effective Command entry
 */
export async function createEffectiveCommandLog(
  data: CreateLogRequest
): Promise<CreateLogResponse> {
  return apiFetch<CreateLogResponse>('/api/modules/effective-commands/logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get logs for a child, optionally filtered by objective
 */
export async function getEffectiveCommandLogs(
  childId: number,
  objectiveId?: number,
  range: string = '30d'
): Promise<{ results: EffectiveCommandLog[] }> {
  let url = `/api/modules/effective-commands/logs/?child_id=${childId}&range=${range}`;
  if (objectiveId) {
    url += `&objective_id=${objectiveId}`;
  }
  return apiFetch<{ results: EffectiveCommandLog[] }>(url);
}

/**
 * Update initial repetition average for Effective Commands module
 */
export async function updateInitialRepetitions(
  progressId: number,
  initialRepetitionAverage: number
): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>(
    `/api/modules-progress/${progressId}/initial-repetitions/`,
    {
      method: 'PATCH',
      body: JSON.stringify({ initial_repetition_average: initialRepetitionAverage }),
    }
  );
}

/**
 * Recompute Effective Commands progress (for testing/debugging)
 */
export async function recomputeEffectiveCommands(childId: number): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>('/api/modules/effective-commands/recompute/', {
    method: 'POST',
    body: JSON.stringify({ child: childId }),
  });
}

// ========================================
// Anger Management API
// ========================================

/**
 * Set initial anger crisis frequency for a child
 */
export async function setAngerFrequency(data: SetAngerFrequencyRequest): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>('/api/modules/anger-management/initial-frequency/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create a new anger crisis log entry
 */
export async function createAngerCrisisLog(data: CreateAngerLogRequest): Promise<CreateAngerLogResponse> {
  return apiFetch<CreateAngerLogResponse>('/api/modules/anger-management/logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get anger crisis logs for a child
 */
export async function getAngerCrisisLogs(
  childId: number,
  range: string = '30d'
): Promise<{ results: AngerCrisisLog[] }> {
  return apiFetch<{ results: AngerCrisisLog[] }>(
    `/api/modules/anger-management/logs/?child_id=${childId}&range=${range}`
  );
}

// ========================================
// Time Out API
// ========================================

/**
 * Set target duration goal for time-out (2, 3, 4, or 5 minutes)
 */
export async function setTimeOutGoal(data: SetTimeOutGoalRequest): Promise<ModuleProgress> {
  return apiFetch<ModuleProgress>('/api/modules/timeout/goal/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create or update a time-out log entry
 */
export async function createTimeOutLog(data: CreateTimeOutLogRequest): Promise<CreateTimeOutLogResponse> {
  return apiFetch<CreateTimeOutLogResponse>('/api/modules/timeout/logs/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get time-out logs for a child
 */
export async function getTimeOutLogs(
  childId: number,
  range: string = '30d'
): Promise<{ results: TimeOutLog[] }> {
  return apiFetch<{ results: TimeOutLog[] }>(
    `/api/modules/timeout/logs/?child_id=${childId}&range=${range}`
  );
}

// ========================================
// Rewards System API
// ========================================

/**
 * Setup rewards system with tasks and privileges
 */
export async function setupRewards(data: {
  child_id: number;
  tasks: Array<{ title: string; points_reward: 1 | 3 | 5 }>;
  privileges: Array<{ title: string; points_cost: 3 | 5 | 10 }>;
}): Promise<any> {
  return apiFetch('/api/modules/rewards/setup/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * List all active tasks for a child
 */
export async function listRewardsTasks(childId: number): Promise<{ tasks: any[] }> {
  return apiFetch<{ tasks: any[] }>(`/api/modules/rewards/tasks/?child_id=${childId}`);
}

/**
 * List all active privileges for a child
 */
export async function listRewardsPrivileges(childId: number): Promise<{ privileges: any[] }> {
  return apiFetch<{ privileges: any[] }>(`/api/modules/rewards/privileges/?child_id=${childId}`);
}

/**
 * Log daily task completions
 */
export async function logDailyCompletion(data: {
  child_id: number;
  date: string;
  completed_task_ids: number[];
  notes?: string;
}): Promise<any> {
  return apiFetch('/api/modules/rewards/daily-completion/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Redeem a privilege (spend points)
 */
export async function redeemPrivilege(data: {
  child_id: number;
  privilege_id: number;
  notes?: string;
}): Promise<any> {
  return apiFetch('/api/modules/rewards/redeem/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get current points balance for a child
 */
export async function getRewardsBalance(childId: number): Promise<{
  balance: number;
  total_earned: number;
  total_spent: number;
}> {
  return apiFetch(`/api/modules/rewards/balance/?child_id=${childId}`);
}

// ========================================
// Time Management API
// ========================================

/**
 * Set time management approach for a child
 */
export async function setTimeManagementChoice(data: SetTimeManagementChoiceRequest): Promise<TimeManagementChoice> {
  return apiFetch<TimeManagementChoice>('/api/modules/time-management/choice/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create a routine for a child
 */
export async function createRoutine(data: CreateRoutineRequest): Promise<Routine> {
  return apiFetch<Routine>('/api/modules/time-management/routines/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get routines for a child
 */
export async function getRoutines(childId: number): Promise<{ results: Routine[] }> {
  return apiFetch<{ results: Routine[] }>(
    `/api/modules/time-management/routines/?child_id=${childId}`
  );
}

/**
 * Log a routine completion
 */
export async function createRoutineCompletion(
  data: CreateRoutineCompletionRequest
): Promise<CreateRoutineCompletionResponse> {
  return apiFetch<CreateRoutineCompletionResponse>('/api/modules/time-management/routine-completion/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get routine completions for a child
 */
export async function getRoutineCompletions(
  childId: number,
  range: string = '7d'
): Promise<{ results: RoutineCompletion[] }> {
  return apiFetch<{ results: RoutineCompletion[] }>(
    `/api/modules/time-management/routine-completion/?child_id=${childId}&range=${range}`
  );
}

/**
 * Create a schedule for a child
 */
export async function createSchedule(data: CreateScheduleRequest): Promise<Schedule> {
  return apiFetch<Schedule>('/api/modules/time-management/schedule/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get active schedule for a child
 */
export async function getSchedule(childId: number): Promise<Schedule> {
  return apiFetch<Schedule>(`/api/modules/time-management/schedule/?child_id=${childId}`);
}

/**
 * Create a schedule block
 */
export async function createScheduleBlock(data: CreateScheduleBlockRequest): Promise<ScheduleBlock> {
  return apiFetch<ScheduleBlock>('/api/modules/time-management/schedule-blocks/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get schedule blocks for a schedule
 */
export async function getScheduleBlocks(scheduleId: number): Promise<{ results: ScheduleBlock[] }> {
  return apiFetch<{ results: ScheduleBlock[] }>(
    `/api/modules/time-management/schedule-blocks/?schedule_id=${scheduleId}`
  );
}

/**
 * Get routine templates
 */
export async function getRoutineTemplates(): Promise<RoutineTemplates> {
  return apiFetch<RoutineTemplates>('/api/modules/time-management/templates/');
}
