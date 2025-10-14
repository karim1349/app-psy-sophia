import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@qiima/queries';
import { useSessionStore } from '@qiima/state/session.native';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
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
      {children}
    </QueryClientProvider>
  );
}
