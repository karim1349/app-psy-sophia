/**
 * UI State management with Zustand
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

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

  // Toast state
  toasts: Toast[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Deprecated (use showToast instead)
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
  toasts: [],

  // Modal actions
  openCheckinModal: () => set({ isCheckinModalOpen: true }),
  closeCheckinModal: () => set({ isCheckinModalOpen: false }),
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  openToolsSheet: () => set({ isToolsSheetOpen: true }),
  closeToolsSheet: () => set({ isToolsSheetOpen: false }),

  // Toast actions
  showToast: (type, message, title, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, type, message, title, duration };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  // Deprecated error actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
