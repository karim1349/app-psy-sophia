/**
 * Module and Special Time API functions
 */

import { apiFetch } from './client';
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ModuleProgress,
  ModuleWithProgress,
  SpecialTimeSession,
} from '../types/api';

/**
 * Get all modules with progress for a child
 */
export async function getModules(childId: number): Promise<ModuleWithProgress[]> {
  return apiFetch<ModuleWithProgress[]>(`/api/modules/?child_id=${childId}`);
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
