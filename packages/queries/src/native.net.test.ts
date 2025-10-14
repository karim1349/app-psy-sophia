/**
 * @jest-environment node
 */
import { setupNetworkListeners } from './native.net';

describe('setupNetworkListeners (native)', () => {
  it('should export setupNetworkListeners function', () => {
    expect(typeof setupNetworkListeners).toBe('function');
  });

  it('should return a cleanup function', () => {
    const cleanup = setupNetworkListeners();
    expect(typeof cleanup).toBe('function');
  });

  it('should not throw when cleanup is called', () => {
    const cleanup = setupNetworkListeners();
    expect(() => cleanup()).not.toThrow();
  });

  it('should handle non-React Native environment gracefully', () => {
    // In Node test environment (not React Native), modules won't be available
    // The function should handle this gracefully
    expect(() => setupNetworkListeners()).not.toThrow();
  });

  it('should handle multiple cleanup calls gracefully', () => {
    const cleanup = setupNetworkListeners();
    expect(() => {
      cleanup();
      cleanup();
    }).not.toThrow();
  });
});
