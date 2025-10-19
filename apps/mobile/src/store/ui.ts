/**
 * UI State management with Zustand
 */

import { create } from 'zustand';

interface UIState {
  // Modal states
  isCheckinModalOpen: boolean;
  isCommandPaletteOpen: boolean;
  isToolsSheetOpen: boolean;

  // Actions
  openCheckinModal: () => void;
  closeCheckinModal: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openToolsSheet: () => void;
  closeToolsSheet: () => void;

  // Toast/Error state
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial states
  isCheckinModalOpen: false,
  isCommandPaletteOpen: false,
  isToolsSheetOpen: false,
  error: null,

  // Modal actions
  openCheckinModal: () => set({ isCheckinModalOpen: true }),
  closeCheckinModal: () => set({ isCheckinModalOpen: false }),
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  openToolsSheet: () => set({ isToolsSheetOpen: true }),
  closeToolsSheet: () => set({ isToolsSheetOpen: false }),

  // Error actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
