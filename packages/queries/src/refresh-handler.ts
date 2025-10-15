type RefreshCallback = () => Promise<void>;

let globalRefreshCallback: RefreshCallback | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export function setGlobalRefreshCallback(callback: RefreshCallback) {
  globalRefreshCallback = callback;
}

export async function triggerGlobalRefresh(): Promise<boolean> {
  if (!globalRefreshCallback) {
    return false;
  }
  
  // Prevent concurrent refresh calls - return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  // Create new refresh promise
  refreshPromise = (async () => {
    try {
      isRefreshing = true;
      await globalRefreshCallback();
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}
