/**
 * Utility to completely reset the app to fresh state
 * Clears all tokens, onboarding state, and stored data
 */

import { clearAllStorage } from '../lib/storage';
import { Alert } from 'react-native';

/**
 * Reset the entire app to factory state
 * WARNING: This will delete all local data!
 */
export async function resetApp(): Promise<void> {
  try {
    console.log('🔄 Resetting app...');

    // Clear all storage
    await clearAllStorage();

    console.log('✅ App reset complete. Please restart the app.');

    Alert.alert(
      'App Reset',
      'All data cleared. Please close and restart the app.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('❌ Reset failed:', error);
    Alert.alert('Error', 'Failed to reset app. Please try again.');
  }
}

/**
 * Reset with confirmation dialog
 */
export async function resetAppWithConfirmation(): Promise<void> {
  Alert.alert(
    'Reset App?',
    'This will delete all local data and you will start fresh. This action cannot be undone.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: resetApp,
      },
    ]
  );
}
