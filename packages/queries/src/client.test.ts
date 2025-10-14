import { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from './client';

describe('createQueryClient', () => {
  it('should create a QueryClient with correct configuration', () => {
    const client = createQueryClient();

    expect(client).toBeInstanceOf(QueryClient);
    expect(client.getDefaultOptions().queries?.staleTime).toBe(1000 * 60 * 5);
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
    expect(client.getDefaultOptions().queries?.refetchOnReconnect).toBe(true);
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('should create independent instances', () => {
    const client1 = createQueryClient();
    const client2 = createQueryClient();

    expect(client1).not.toBe(client2);
  });
});
