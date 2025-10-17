import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, setGlobalRefreshCallback, useRefresh } from '@app-psy-sophia/queries';
import { useSessionStore } from '@app-psy-sophia/state/session.native';
import { useToast } from '@app-psy-sophia/ui';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { config } from '@/constants/config';

// Component to register refresh callback after QueryClient is available
function RefreshCallbackProvider() {
  const refreshMutation = useRefresh({ env: 'native', baseURL: config.baseURL });

  useEffect(() => {
    // Register the refresh callback
    setGlobalRefreshCallback(async () => {
      await refreshMutation.mutateAsync();
    });
  }, [refreshMutation]);

  return null; // This component doesn't render anything
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  // Toast i18n translation is now handled in ToastItem component
  const [queryClient] = useState(() => createQueryClient(showToast));
  const { initializeSession } = useSessionStore();

  useEffect(() => {
    // Initialize session on app launch
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    // Setup native network listeners
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        queryClient.refetchQueries({ type: 'active' });
      }
    });

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        queryClient.refetchQueries({ type: 'active' });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribeNetInfo();
      subscription.remove();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RefreshCallbackProvider />
      {children}
    </QueryClientProvider>
  );
}