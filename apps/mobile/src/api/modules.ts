/**
 * Module and Special Time API functions
 */

import { apiFetch } from './client';
import type {
  CreateLogRequest,
  CreateLogResponse,
  CreateObjectivesRequest,
  CreateSessionRequest,
  CreateSessionResponse,
  EffectiveCommandLog,
  EffectiveCommandObjective,
  ModuleProgress,
  ModuleWithProgress,
  SpecialTimeSession,
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
