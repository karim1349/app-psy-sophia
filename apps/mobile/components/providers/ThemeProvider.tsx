import { useEffect } from 'react';
import { useThemeStore } from '@qiima/state';

/**
 * Provider component to initialize theme store on app startup
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeStore = useThemeStore();

  useEffect(() => {
    // Initialize theme store on app startup
    themeStore.initialize();
  }, [themeStore]);

  return <>{children}</>;
}
