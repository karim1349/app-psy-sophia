import { setGlobalRefreshCallback, triggerGlobalRefresh } from './refresh-handler';

describe('refresh-handler', () => {
  beforeEach(() => {
    // Reset the global state before each test
    jest.clearAllMocks();
  });

  describe('setGlobalRefreshCallback', () => {
    it('should set the global refresh callback', () => {
      const mockCallback = jest.fn();
      setGlobalRefreshCallback(mockCallback);
      
      // We can't directly test the internal state, but we can test triggerGlobalRefresh
      expect(() => setGlobalRefreshCallback(mockCallback)).not.toThrow();
    });
  });

  describe('triggerGlobalRefresh', () => {
    it('should return false when no callback is set', async () => {
      // Clear any existing callback by setting a null one
      setGlobalRefreshCallback(null as any);
      const result = await triggerGlobalRefresh();
      expect(result).toBe(false);
    });

    it('should call the refresh callback and return true on success', async () => {
      const mockCallback = jest.fn().mockResolvedValue(undefined);
      setGlobalRefreshCallback(mockCallback);

      const result = await triggerGlobalRefresh();

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should return false when callback throws an error', async () => {
      const mockCallback = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      setGlobalRefreshCallback(mockCallback);

      const result = await triggerGlobalRefresh();

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });

    it('should prevent concurrent refresh calls', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      
      const mockCallback = jest.fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValue(undefined);
      
      setGlobalRefreshCallback(mockCallback);

      // Start first refresh
      const firstResult = triggerGlobalRefresh();
      
      // Start second refresh while first is still running
      const secondResult = triggerGlobalRefresh();
      
      // Resolve the first promise
      resolveFirst!();
      
      const [first, second] = await Promise.all([firstResult, secondResult]);

      // Both should return true, but callback should only be called once
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(first).toBe(true);
      expect(second).toBe(true);
    });
  });
});
