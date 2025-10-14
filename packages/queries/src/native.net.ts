import { onlineManager, focusManager } from '@tanstack/react-query';

/**
 * Sets up network and focus listeners for React Native using NetInfo and AppState.
 *
 * This enables TanStack Query to automatically:
 * - Pause queries when offline
 * - Resume queries when online
 * - Refetch queries when app comes to foreground
 *
 * @returns Cleanup function to remove listeners
 */
export function setupNetworkListeners(): () => void {
  // Dynamically import React Native modules only when in native environment
  let unsubscribeNetInfo: (() => void) | undefined;
  let unsubscribeAppState: (() => void) | undefined;

  // Check if we're in a React Native environment
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const NetInfo = require('@react-native-community/netinfo');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppState } = require('react-native');

      // Listen to network state changes
      unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
        onlineManager.setOnline(state.isConnected ?? false);
      });

      // Listen to app state changes (foreground/background)
      const subscription = AppState.addEventListener('change', (state: string) => {
        focusManager.setFocused(state === 'active');
      });

      unsubscribeAppState = () => subscription.remove();
    } catch (error) {
      console.warn('Failed to setup native network listeners:', error);
    }
  }

  // Return cleanup function
  return () => {
    unsubscribeNetInfo?.();
    unsubscribeAppState?.();
  };
}
