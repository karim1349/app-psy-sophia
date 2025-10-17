import { useEffect } from 'react';
import { useThemeStore } from '@app-psy-sophia/state';

/**
 * Provider component to initialize theme store on app startup
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeStore = useThemeStore();

  useEffect(() => {
    // Initialize theme store on app startup
    themeStore.initialize();
  }, []);

  return <>{children}</>;
}
