/**
 * Theme store for React Native
 * 
 * Manages theme mode preferences with persistence to AsyncStorage
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  getMode: () => Promise<ThemeMode>;
  initialize: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'qiima-theme-mode';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  
  setMode: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      set({ mode });
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  },
  
  getMode: async (): Promise<ThemeMode> => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      return (stored as ThemeMode) || 'system';
    } catch (error) {
      console.error('Failed to get theme mode:', error);
      return 'system';
    }
  },
  
  initialize: async () => {
    try {
      const storedMode = await get().getMode();
      set({ mode: storedMode });
    } catch (error) {
      console.error('Failed to initialize theme store:', error);
    }
  },
}));
