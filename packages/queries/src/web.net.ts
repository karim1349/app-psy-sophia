import { onlineManager, focusManager } from '@tanstack/react-query';

/**
 * Sets up network and focus listeners for web using browser APIs.
 *
 * This enables TanStack Query to automatically:
 * - Pause queries when offline
 * - Resume queries when online
 * - Refetch queries when tab becomes visible
 *
 * @returns Cleanup function to remove listeners
 */
export function setupNetworkListeners(): () => void {
  // Listen to online/offline events
  const handleOnline = () => onlineManager.setOnline(true);
  const handleOffline = () => onlineManager.setOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen to visibility changes (tab focus)
  const handleVisibilityChange = () => {
    focusManager.setFocused(document.visibilityState === 'visible');
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
