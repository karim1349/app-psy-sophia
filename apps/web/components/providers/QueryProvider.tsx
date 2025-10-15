'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, setGlobalRefreshCallback, useRefresh } from '@qiima/queries';
import { useEffect, useState } from 'react';

// Component to register refresh callback after QueryClient is available
function RefreshCallbackProvider() {
  const refreshMutation = useRefresh({ env: 'web', baseURL: '/api' });

  useEffect(() => {
    // Register the refresh callback
    setGlobalRefreshCallback(async () => {
      await refreshMutation.mutateAsync();
    });
  }, [refreshMutation]);

  return null; // This component doesn't render anything
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    // Setup web network listeners
    const handleOnline = () => {
      queryClient.refetchQueries({ type: 'active' });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.refetchQueries({ type: 'active' });
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RefreshCallbackProvider />
      {children}
    </QueryClientProvider>
  );
}
