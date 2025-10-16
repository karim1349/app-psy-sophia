/**
 * @qiima/state
 *
 * Shared Zustand stores for Qiima application
 * Platform-specific session management (native vs web)
 */

export type { User } from './types';

// Note: Session stores are not exported from the main index
// Import them directly using platform-specific paths:
// - import { useSessionStore } from '@qiima/state/session.native'
// - import { useSessionStore } from '@qiima/state/session.web'

// Theme store
export { useThemeStore } from './theme.native';
export type { ThemeMode } from './theme.native';
