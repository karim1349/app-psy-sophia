/**
 * API types matching Django backend
 */

export type SchoolingStage = 'preK' | '6-13' | '13-18';
export type DiagnosedADHD = 'yes' | 'no' | 'unknown';
export type Zone = 'vert' | 'orange' | 'rouge';

export interface User {
  id: number;
  email: string | null;
  username: string | null;
  is_guest: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
  message: string;
}

export interface Child {
  id: number;
  first_name?: string;
  schooling_stage: SchoolingStage;
  diagnosed_adhd: DiagnosedADHD;
  created_at: string;
  updated_at: string;
}

export interface Screener {
  id: number;
  child: number;
  instrument: string;
  answers: Record<string, number>;
  total_score: number;
  zone: Zone;
  recommendations: string[];
  consult: string[];
  created_at: string;
}

export interface TargetBehavior {
  id: number;
  child: number;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: number;
  child: number;
  date: string;
  mood: number;
  behaviors: { behavior_id: number; done: boolean }[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  days: string[];
  routine_success: (number | null)[];
  mood: (number | null)[];
  special_time_count: number[];
  enjoy_rate: (number | null)[];
}

export interface ConvertGuestRequest {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}

export type ModuleState = 'locked' | 'unlocked' | 'passed';

export interface Module {
  id: number;
  key: string;
  title: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleProgress {
  id: number;
  child: number;
  module: number;
  module_key: string;
  module_title: string;
  state: ModuleState;
  counters: {
    sessions_21d?: number;
    liked_last6?: number;
    goal_per_week?: number;
    [key: string]: any;
  };
  passed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleWithProgress {
  id: number;
  progress_id: number;
  key: string;
  title: string;
  order_index: number;
  state: ModuleState;
  counters: {
    // Special Time counters
    sessions_21d?: number;
    liked_last6?: number;
    goal_per_week?: number;
    // Effective Commands counters
    initial_repetition_average?: number;
    objectives_with_5plus_days?: number[];
    // Anger Management counters
    initial_frequency?: string;
    successful_crises_count?: number;
    // Time Out counters
    target_duration?: number;
    successful_timeouts_count?: number;
    // Allow any other dynamic counters
    [key: string]: any;
  };
  passed_at: string | null;
}

export interface SpecialTimeSession {
  id: number;
  child: number;
  datetime: string;
  duration_min: number;
  activity: string;
  child_enjoyed: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionRequest {
  child: number;
  datetime?: string;
  duration_min: number;
  activity?: string;
  child_enjoyed: boolean;
  notes?: string;
}

export interface CreateSessionResponse {
  session: SpecialTimeSession;
  progress: ModuleProgress;
}

// Effective Commands types
export type ChildCompletionType = 'first_try' | 'not_directly' | 'not_completed';
export type FailureReason = 'distractions' | 'no_contact' | 'no_repeat' | 'unsure_command' | 'too_complex';

export interface EffectiveCommandObjective {
  id: number;
  child: number;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EffectiveCommandLog {
  id: number;
  child: number;
  objective: number;
  date: string;
  gave_effective_command: boolean;
  child_completed: ChildCompletionType | null;
  repetitions_count: number | null;
  failure_reason: FailureReason | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLogRequest {
  child: number;
  objective: number;
  date: string;
  gave_effective_command: boolean;
  child_completed?: ChildCompletionType | null;
  repetitions_count?: number | null;
  failure_reason?: FailureReason | null;
  notes?: string;
}

export interface CreateLogResponse {
  log: EffectiveCommandLog;
  progress: ModuleProgress;
}

export interface CreateObjectivesRequest {
  child: number;
  labels: string[];
}

// Anger Management types
export type AngerFrequency = 'daily' | 'weekly_multiple' | 'weekly_once' | 'monthly_multiple' | 'monthly_once';

export type InterventionStage = 'before' | 'during' | 'after' | 'none';

export type AngerTechnique =
  // Before crisis techniques
  | 'observe_signs' | 'cushion_punch' | 'sensory_activity' | 'calm_activity' | 'discussion'
  // During crisis techniques
  | 'isolate' | 'stay_calm' | 'no_escalation'
  // After crisis techniques
  | 'awareness' | 'discuss_alternatives' | 'teach_techniques';

export interface AngerCrisisLog {
  id: number;
  child: number;
  date: string;
  time: string | null;
  intervention_stage: InterventionStage;
  techniques_used: AngerTechnique[];
  was_successful: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAngerLogRequest {
  child: number;
  date: string;
  time?: string;
  intervention_stage: InterventionStage;
  techniques_used: AngerTechnique[];
  was_successful: boolean;
  notes?: string;
}

export interface CreateAngerLogResponse {
  log: AngerCrisisLog;
  progress: ModuleProgress;
}

export interface SetAngerFrequencyRequest {
  child_id: number;
  frequency: AngerFrequency;
}

// Time Out Module Types
export type TimeOutFailureReason = 'negotiation' | 'time_not_respected';

export interface TimeOutLog {
  id: number;
  child: number;
  date: string; // ISO date
  needed_timeout: boolean;
  was_successful: boolean | null;
  failure_reason: TimeOutFailureReason | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeOutLogRequest {
  child: number;
  date: string; // ISO date
  needed_timeout: boolean;
  was_successful?: boolean | null;
  failure_reason?: TimeOutFailureReason | null;
  notes?: string;
}

export interface CreateTimeOutLogResponse {
  log: TimeOutLog;
  progress: ModuleProgress;
}

export interface SetTimeOutGoalRequest {
  child_id: number;
  target_duration: 2 | 3 | 4 | 5; // minutes
}

// Time Management Module Types
export type TimeManagementApproach = 'routines' | 'schedule' | 'both';
export type RoutineType = 'morning' | 'evening' | 'sunday';
export type ActivityType = 'school' | 'travel' | 'home_activity' | 'leisure' | 'free_time';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Monday, 6 = Sunday

export interface TimeManagementChoice {
  id: number;
  child: number;
  approach: TimeManagementApproach;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: number;
  child: number;
  routine_type: RoutineType;
  title: string;
  steps: string[];
  target_time: string; // HH:MM format
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: number;
  child: number;
  routine: number | null;
  routine_type: RoutineType;
  date: string; // ISO date
  was_on_time: boolean;
  completion_time: string | null; // HH:MM format
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  child: number;
  title: string;
  is_active: boolean;
  blocks: ScheduleBlock[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlock {
  id: number;
  schedule: number;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  activity_type: ActivityType;
  title: string;
  description: string;
  subject: string;
  color: string; // Hex color code
  created_at: string;
  updated_at: string;
}

export interface RoutineTemplate {
  title: string;
  steps: string[];
  target_time: string;
}

export interface RoutineTemplates {
  morning: RoutineTemplate[];
  evening: RoutineTemplate[];
  sunday: RoutineTemplate[];
}

// Request/Response types
export interface SetTimeManagementChoiceRequest {
  child_id: number;
  approach: TimeManagementApproach;
}

export interface CreateRoutineRequest {
  child: number;
  routine_type: RoutineType;
  title: string;
  steps: string[];
  target_time: string;
  is_custom?: boolean;
}

export interface CreateRoutineCompletionRequest {
  child: number;
  routine?: number;
  routine_type: RoutineType;
  date: string;
  was_on_time: boolean;
  completion_time?: string;
  notes?: string;
}

export interface CreateRoutineCompletionResponse {
  completion: RoutineCompletion;
  progress: ModuleProgress;
}

export interface CreateScheduleRequest {
  child: number;
  title?: string;
}

export interface CreateScheduleBlockRequest {
  schedule: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  subject?: string;
  color?: string;
}
