/**
 * Mock for expo-secure-store for testing
 */

const store: Record<string, string> = {};

export async function setItemAsync(key: string, value: string): Promise<void> {
  store[key] = value;
}

export async function getItemAsync(key: string): Promise<string | null> {
  return key in store ? (store[key] ?? null) : null;
}

export async function deleteItemAsync(key: string): Promise<void> {
  delete store[key];
}

// Export helper to clear store between tests
export function __clearMockStore(): void {
  Object.keys(store).forEach(key => delete store[key]);
}
