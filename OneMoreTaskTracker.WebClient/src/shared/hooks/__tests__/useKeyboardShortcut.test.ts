import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from '../useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should register a keydown listener', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
    }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should unregister listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
    }));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler when matching key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
      preventDefault: false,
    }));

    const event = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler for non-matching key', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
      preventDefault: false,
    }));

    const event = new KeyboardEvent('keydown', { key: 'j' });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle Ctrl modifier', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      ctrl: true,
      handler,
      preventDefault: false,
    }));

    const eventWithoutCtrl = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(eventWithoutCtrl);
    expect(handler).not.toHaveBeenCalled();

    const eventWithCtrl = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(eventWithCtrl);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle Shift modifier', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: '/',
      shift: true,
      handler,
      preventDefault: false,
    }));

    const eventWithoutShift = new KeyboardEvent('keydown', { key: '/' });
    window.dispatchEvent(eventWithoutShift);
    expect(handler).not.toHaveBeenCalled();

    const eventWithShift = new KeyboardEvent('keydown', { key: '/', shiftKey: true });
    window.dispatchEvent(eventWithShift);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should prevent default when preventDefault is true', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
      preventDefault: true,
    }));

    const event = new KeyboardEvent('keydown', { key: 'k' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should be disabled when enabled is false', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled?: boolean }) =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          enabled,
          preventDefault: false,
        }),
      { initialProps: { enabled: false } }
    );

    const event = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    // Re-enable and verify it works
    rerender({ enabled: true });
    window.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple shortcuts', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    renderHook(() => useKeyboardShortcut([
      { key: 'k', handler: handler1, preventDefault: false },
      { key: 'j', handler: handler2, preventDefault: false },
    ]));

    const event1 = new KeyboardEvent('keydown', { key: 'k' });
    window.dispatchEvent(event1);
    expect(handler1).toHaveBeenCalledTimes(1);

    const event2 = new KeyboardEvent('keydown', { key: 'j' });
    window.dispatchEvent(event2);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should skip shortcuts when typing in input without Ctrl modifier', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      handler,
      preventDefault: false,
    }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'k' });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should trigger shortcuts with Ctrl modifier even when in input', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'k',
      ctrl: true,
      handler,
      preventDefault: false,
    }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('should trigger Escape even when in input', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcut({
      key: 'Escape',
      handler,
      preventDefault: false,
    }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    Object.defineProperty(event, 'target', { value: input, enumerable: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
