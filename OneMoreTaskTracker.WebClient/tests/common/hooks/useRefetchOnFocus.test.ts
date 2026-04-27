import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefetchOnFocus } from '../../../src/common/hooks/useRefetchOnFocus';

function fireFocus() {
  window.dispatchEvent(new Event('focus'));
}

describe('useRefetchOnFocus', () => {
  it('calls refetch on focus while enabled', () => {
    const refetch = vi.fn();
    renderHook(() => useRefetchOnFocus(true, refetch));
    act(() => fireFocus());
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does not call refetch on focus while disabled', () => {
    const refetch = vi.fn();
    renderHook(() => useRefetchOnFocus(false, refetch));
    act(() => fireFocus());
    expect(refetch).not.toHaveBeenCalled();
  });

  it('suppresses refetch while an in-flight request is running', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      ({ inFlight }: { inFlight: boolean }) =>
        useRefetchOnFocus(true, refetch, inFlight),
      { initialProps: { inFlight: true } },
    );
    act(() => fireFocus());
    expect(refetch).not.toHaveBeenCalled();

    rerender({ inFlight: false });
    act(() => fireFocus());
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('removes the listener on unmount', () => {
    const refetch = vi.fn();
    const { unmount } = renderHook(() => useRefetchOnFocus(true, refetch));
    unmount();
    act(() => fireFocus());
    expect(refetch).not.toHaveBeenCalled();
  });

  it('removes the listener when enabled flips to false', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useRefetchOnFocus(enabled, refetch),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    act(() => fireFocus());
    expect(refetch).not.toHaveBeenCalled();
  });
});
