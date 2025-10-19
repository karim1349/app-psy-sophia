/**
 * Onboarding and coaching API functions
 */

import { apiFetch } from './client';
import type {
  Child,
  Screener,
  TargetBehavior,
  DailyCheckin,
  DashboardData,
  SchoolingStage,
  DiagnosedADHD,
} from '../types/api';

/**
 * Create a child
 */
export async function createChild(data: {
  first_name?: string;
  schooling_stage: SchoolingStage;
  diagnosed_adhd: DiagnosedADHD;
}): Promise<Child> {
  return apiFetch<Child>('/api/children/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all children
 */
export async function getChildren(): Promise<{ results: Child[] }> {
  return apiFetch<{ results: Child[] }>('/api/children/');
}

/**
 * Submit screener for a child
 */
export async function submitScreener(
  childId: number,
  answers: Record<string, number>
): Promise<Screener> {
  return apiFetch<Screener>(`/api/children/${childId}/screener/`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

/**
 * Create target behaviors for a child
 */
export async function createTargets(
  childId: number,
  behaviors: { name: string }[]
): Promise<TargetBehavior[]> {
  return apiFetch<TargetBehavior[]>(`/api/children/${childId}/targets/`, {
    method: 'POST',
    body: JSON.stringify({ behaviors }),
  });
}

/**
 * Get target behaviors
 */
export async function getTargetBehaviors(): Promise<{ results: TargetBehavior[] }> {
  return apiFetch<{ results: TargetBehavior[] }>('/api/target-behaviors/');
}

/**
 * Create or update daily check-in (idempotent)
 */
export async function upsertCheckin(
  childId: number,
  data: {
    date: string;
    mood: number;
    behaviors: { behavior_id: number; done: boolean }[];
    notes?: string;
  }
): Promise<DailyCheckin> {
  return apiFetch<DailyCheckin>(`/api/children/${childId}/checkins/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get check-ins for a child
 */
export async function getCheckins(childId: number): Promise<{ results: DailyCheckin[] }> {
  return apiFetch<{ results: DailyCheckin[] }>(`/api/children/${childId}/checkins/`);
}

/**
 * Get today's check-in for a child
 */
export async function getTodayCheckin(childId: number): Promise<DailyCheckin | null> {
  const today = new Date().toISOString().split('T')[0];
  const response = await apiFetch<{ results: DailyCheckin[] }>(
    `/api/daily-checkins/?date=${today}`
  );

  // Filter by child ID (API returns all user's check-ins)
  const todayCheckin = response.results.find(c => c.child === childId);
  return todayCheckin || null;
}

/**
 * Get dashboard data for a child
 */
export async function getDashboard(
  childId: number,
  range: number = 7
): Promise<DashboardData> {
  return apiFetch<DashboardData>(
    `/api/children/${childId}/dashboard/?range=${range}`
  );
}
