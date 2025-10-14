/**
 * @jest-environment jsdom
 */
import { onlineManager, focusManager } from '@tanstack/react-query';
import { setupNetworkListeners } from './web.net';

describe('setupNetworkListeners (web)', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');
    jest.spyOn(onlineManager, 'setOnline');
    jest.spyOn(focusManager, 'setFocused');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should set up online/offline listeners', () => {
    setupNetworkListeners();

    expect(window.addEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('should set up visibility change listener', () => {
    setupNetworkListeners();

    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('should handle online event', () => {
    setupNetworkListeners();

    const onlineHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'online'
    )?.[1];

    onlineHandler();

    expect(onlineManager.setOnline).toHaveBeenCalledWith(true);
  });

  it('should handle offline event', () => {
    setupNetworkListeners();

    const offlineHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'offline'
    )?.[1];

    offlineHandler();

    expect(onlineManager.setOnline).toHaveBeenCalledWith(false);
  });

  it('should handle visibility change to visible', () => {
    setupNetworkListeners();

    const visibilityHandler = (
      document.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'visibilitychange')?.[1];

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });

    visibilityHandler();

    expect(focusManager.setFocused).toHaveBeenCalledWith(true);
  });

  it('should handle visibility change to hidden', () => {
    setupNetworkListeners();

    const visibilityHandler = (
      document.addEventListener as jest.Mock
    ).mock.calls.find((call) => call[0] === 'visibilitychange')?.[1];

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });

    visibilityHandler();

    expect(focusManager.setFocused).toHaveBeenCalledWith(false);
  });

  it('should return cleanup function that removes all listeners', () => {
    const cleanup = setupNetworkListeners();

    cleanup();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });
});
