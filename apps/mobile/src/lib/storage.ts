/**
 * Storage utilities using SecureStore for tokens and AsyncStorage for app data
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys
const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ONBOARDING_DONE: 'onboarding_done',
  CHILD_ID: 'child_id',
} as const;

// Token storage (secure)
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    ]);
  },
};

// App data storage
export const appStorage = {
  async getOnboardingDone(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
      return value === 'true';
    } catch {
      return false;
    }
  },

  async setOnboardingDone(done: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
  },

  async getChildId(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(KEYS.CHILD_ID);
      return value ? parseInt(value, 10) : null;
    } catch {
      return null;
    }
  },

  async setChildId(id: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.CHILD_ID, id.toString());
  },

  async clearAppData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.ONBOARDING_DONE),
      AsyncStorage.removeItem(KEYS.CHILD_ID),
    ]);
  },
};

// Clear all storage
export async function clearAllStorage(): Promise<void> {
  await Promise.all([tokenStorage.clearTokens(), appStorage.clearAppData()]);
}
