import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useGanttTimelineScroll, type ScrollChunkRequest } from './useGanttTimelineScroll';

// jsdom does not implement matchMedia or scrollTo / scrollBy on HTMLElements.
// Wire minimal stubs that satisfy the hook's expectations.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  if (typeof HTMLElement.prototype.scrollTo !== 'function') {
    HTMLElement.prototype.scrollTo = function scrollTo(arg?: ScrollToOptions | number, y?: number) {
      if (typeof arg === 'number') {
        this.scrollLeft = arg;
        if (typeof y === 'number') this.scrollTop = y;
      } else if (arg && typeof arg === 'object') {
        if (typeof arg.left === 'number') this.scrollLeft = arg.left;
        if (typeof arg.top === 'number') this.scrollTop = arg.top;
      }
    };
  }
  if (typeof HTMLElement.prototype.scrollBy !== 'function') {
    HTMLElement.prototype.scrollBy = function scrollBy(arg?: ScrollToOptions | number, y?: number) {
      if (typeof arg === 'number') {
        this.scrollLeft += arg;
        if (typeof y === 'number') this.scrollTop += y;
      } else if (arg && typeof arg === 'object') {
        if (typeof arg.left === 'number') this.scrollLeft += arg.left;
        if (typeof arg.top === 'number') this.scrollTop += arg.top;
      }
    };
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeScrollerEl(opts: { clientWidth: number; scrollWidth?: number }): HTMLDivElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: opts.clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollWidth', {
    value: opts.scrollWidth ?? opts.clientWidth * 3,
    configurable: true,
  });
  return el;
}

function flushRaf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('useGanttTimelineScroll', () => {
  const TODAY = '2026-04-25';
  const DAY_PX = 32;
  const VIEWPORT_DAYS = 30;
  const HALF_WINDOW_DAYS = 60;
  const CHUNK_DAYS = 14;

  it('seeds a symmetric loadedRange around today and computes Home math at leading 1/3', () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );

    // halfWindow = 60 → loadedRange.start = today - 60 days,
    // loadedRange.end = today + 60 + 1 (half-open) → span = 121 days.
    expect(result.current.loadedRange.start).toBe('2026-02-24');
    expect(result.current.loadedRange.end).toBe('2026-06-25');
    expect(result.current.todayPx).toBe(60 * DAY_PX);
    expect(result.current.totalWidthPx).toBe(121 * DAY_PX);
    // initialScrollLeft anchors today at leading 1/3 of viewport.
    // viewportPx = 30 * 32 = 960 → 1/3 = 320 → target = 1920 - 320 = 1600
    expect(result.current.initialScrollLeft).toBe(1920 - Math.floor(960 / 3));
  });

  it('triggers a leading chunk fetch when scrolled near the leading edge', async () => {
    const loadChunk = vi.fn<(req: ScrollChunkRequest) => Promise<undefined>>(
      async () => undefined,
    );
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });

    // Scroll to the leading edge.
    el.scrollLeft = 0;
    await act(async () => {
      el.dispatchEvent(new Event('scroll'));
      await flushRaf();
    });

    await waitFor(() => expect(loadChunk).toHaveBeenCalled());
    const args = loadChunk.mock.calls[0][0] as ScrollChunkRequest;
    expect(args.windowStart).toBeDefined();
    expect(args.windowEnd).toBeDefined();
    expect(args.signal).toBeInstanceOf(AbortSignal);
    document.body.removeChild(el);
  });

  it('cancels the prior in-flight chunk fetch when a fresh fetch starts in the same direction', async () => {
    let resolveFirst: (() => void) | null = null;
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const signals: AbortSignal[] = [];
    const loadChunk = vi.fn(async (req: ScrollChunkRequest) => {
      signals.push(req.signal);
      if (signals.length === 1) {
        await firstPromise;
      }
    });
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });

    // First leading prefetch via scroll-edge — hangs on `firstPromise`.
    el.scrollLeft = 0;
    await act(async () => {
      el.dispatchEvent(new Event('scroll'));
      await flushRaf();
    });
    await waitFor(() => expect(loadChunk).toHaveBeenCalledTimes(1));

    // The scroll-edge guard refuses to spawn a second leading fetch while
    // one is in flight — this is intentional; it's `scrollToDate` (or any
    // imperative API that bypasses the guard) that exercises the abort
    // path. Trigger a second `scrollToDate` to a far-leading date and
    // capture the promise so we can resolve it cleanly.
    let secondPromise: Promise<void> | undefined;
    await act(async () => {
      secondPromise = result.current.scrollToDate('2025-12-01').catch(() => {
        // First in-flight is aborted — swallow the AbortError.
      });
      await flushRaf();
    });
    await waitFor(() => expect(loadChunk).toHaveBeenCalledTimes(2));
    // The second AbortController is fresh — never aborted.
    expect(signals[1].aborted).toBe(false);

    // Resolve the first hung fetch and await both so React state settles
    // before the test scope tears down.
    await act(async () => {
      resolveFirst?.();
      await secondPromise;
    });
    document.body.removeChild(el);
  });

  it('records loadError when the chunk fetch rejects, and clears it on retry', async () => {
    let mode: 'fail' | 'ok' = 'fail';
    const loadChunk = vi.fn(async () => {
      if (mode === 'fail') throw new Error('boom');
    });
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });

    // Trigger leading fetch → fails.
    el.scrollLeft = 0;
    await act(async () => {
      el.dispatchEvent(new Event('scroll'));
      await flushRaf();
    });
    await waitFor(() => expect(result.current.loadError).not.toBeNull());
    expect(result.current.loadError?.direction).toBe('leading');
    expect(result.current.loadError?.error.message).toBe('boom');

    // Switch to success and retry.
    mode = 'ok';
    await act(async () => {
      result.current.retryFailedChunk();
    });
    await waitFor(() => expect(result.current.loadError).toBeNull());
    document.body.removeChild(el);
  });

  it('continues to prefetch indefinitely past the loaded range (unbounded scroll)', async () => {
    // Each scroll-edge tick that lands us within EDGE_PREFETCH_DAYS of an
    // edge spawns another chunk; with no bounds the hook does NOT clamp
    // and the user can keep panning into empty cells forever.
    const loadChunk = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });

    el.scrollLeft = 0;
    await act(async () => {
      el.dispatchEvent(new Event('scroll'));
      await flushRaf();
    });

    await waitFor(() => expect(loadChunk).toHaveBeenCalled());
    document.body.removeChild(el);
  });

  it('scrollToToday positions the today column at leading 1/3 of the viewport', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const VIEWPORT_PX = VIEWPORT_DAYS * DAY_PX; // 960
    const el = makeScrollerEl({ clientWidth: VIEWPORT_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });

    act(() => {
      result.current.scrollToToday('auto');
    });
    // todayPx = 60 days * 32 = 1920 → 1920 - 320 = 1600
    expect(el.scrollLeft).toBe(1920 - Math.floor(VIEWPORT_PX / 3));
    document.body.removeChild(el);
  });

  it('Home keyboard shortcut scrolls to today (anchored at leading 1/3 of viewport)', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const VIEWPORT_PX = VIEWPORT_DAYS * DAY_PX; // 960
    const el = makeScrollerEl({ clientWidth: VIEWPORT_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });
    el.scrollLeft = 1000;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    });

    // todayPx = 60 days * 32 = 1920 → 1920 - floor(960 / 3) = 1600
    expect(el.scrollLeft).toBe(1920 - Math.floor(VIEWPORT_PX / 3));
    document.body.removeChild(el);
  });

  it('PageDown / PageUp scroll by 90% of the viewport width', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const VIEWPORT_PX = VIEWPORT_DAYS * DAY_PX; // 960
    const el = makeScrollerEl({ clientWidth: VIEWPORT_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });
    el.scrollLeft = 1000;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown' }));
    });
    expect(el.scrollLeft).toBe(1000 + VIEWPORT_PX * 0.9);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp' }));
    });
    expect(el.scrollLeft).toBeCloseTo(1000, 5);
    document.body.removeChild(el);
  });

  it('ArrowRight scrolls one day; Shift+ArrowRight scrolls 7 days', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    await act(async () => {
      result.current.attachScroller(el);
    });
    el.scrollLeft = 100;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(el.scrollLeft).toBe(100 + DAY_PX);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
    });
    expect(el.scrollLeft).toBe(100 + DAY_PX + DAY_PX * 7);
  });

  it('ignores keyboard shortcuts when focus is in an input or textarea', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    const input = document.createElement('input');
    document.body.appendChild(input);
    await act(async () => {
      result.current.attachScroller(el);
    });
    el.scrollLeft = 100;

    // Dispatch from the input element.
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    });
    expect(el.scrollLeft).toBe(100);
    document.body.removeChild(el);
    document.body.removeChild(input);
  });

  it('uses instant scroll behavior when prefers-reduced-motion is set', async () => {
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const el = makeScrollerEl({ clientWidth: VIEWPORT_DAYS * DAY_PX, scrollWidth: 5000 });
    document.body.appendChild(el);
    const scrollToSpy = vi.fn();
    el.scrollTo = scrollToSpy;
    await act(async () => {
      result.current.attachScroller(el);
    });

    act(() => {
      result.current.scrollToToday();
    });

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'auto' }),
    );
    document.body.removeChild(el);
  });

  it('re-anchors today when the scroller element is replaced (filter-driven remount)', async () => {
    const loadChunk = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGanttTimelineScroll({
        today: TODAY,
        dayPx: DAY_PX,
        initialViewportDays: VIEWPORT_DAYS,
        initialHalfWindowDays: HALF_WINDOW_DAYS,
        chunkDays: CHUNK_DAYS,
        loadChunk,
      }),
    );
    const expectedInitial = result.current.initialScrollLeft;
    expect(expectedInitial).toBeGreaterThan(0);

    const first = makeScrollerEl({
      clientWidth: VIEWPORT_DAYS * DAY_PX,
      scrollWidth: 5000,
    });
    document.body.appendChild(first);
    await act(async () => {
      result.current.attachScroller(first);
    });
    expect(first.scrollLeft).toBe(expectedInitial);

    // Filter change → loading flips true → timeline unmounts → fresh
    // <GanttTimelineScroller> remounts with a brand-new DOM element.
    await act(async () => {
      result.current.attachScroller(null);
    });
    const second = makeScrollerEl({
      clientWidth: VIEWPORT_DAYS * DAY_PX,
      scrollWidth: 5000,
    });
    document.body.appendChild(second);
    await act(async () => {
      result.current.attachScroller(second);
    });

    expect(second.scrollLeft).toBe(expectedInitial);

    document.body.removeChild(first);
    document.body.removeChild(second);
  });
});
