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

export type ModuleState = 'locked' | 'active' | 'passed';

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
  key: string;
  title: string;
  order_index: number;
  state: ModuleState;
  counters: {
    sessions_21d: number;
    liked_last6: number;
    goal_per_week: number;
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
