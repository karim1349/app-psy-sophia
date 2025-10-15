export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition = 'top' | 'bottom';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  field?: string;
  duration?: number;
  position?: ToastPosition;
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

export interface ToastProps {
  toast: Toast;
  onHide: (id: string) => void;
  offset?: number;
  onLayout?: (toastId: string, height: number) => void;
}
