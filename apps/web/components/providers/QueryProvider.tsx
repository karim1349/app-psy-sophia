'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@qiima/queries';
import { useEffect, useState } from 'react';

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
      {children}
    </QueryClientProvider>
  );
}
