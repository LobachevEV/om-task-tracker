import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  chunkRange,
  clampToBounds,
  daysBetween,
  loadedRangeFromBuffer,
  type ChunkDirection,
  type DateWindow,
} from './ganttMath';

export interface ScrollChunkRequest {
  windowStart: string;
  windowEnd: string;
  signal: AbortSignal;
}

export interface UseGanttTimelineScrollParams {
  today: string;
  /** Width of one day column in px. */
  dayPx: number;
  /** Initial visible width in days (used for loadedRange seed; overridden by scroller geometry once mounted). */
  initialViewportDays: number;
  /** How many days of pre/post buffer around `today` to prefetch on first mount. */
  initialBufferDays: number;
  /** Days per leading/trailing chunk fetch. */
  chunkDays: number;
  /** Days of cushion past the global bounds before clamping prevents further pan. */
  cushionDays: number;
  /** Global plan bounds — when null, no clamp. */
  bounds: { earliestPlannedStart: string | null; latestPlannedEnd: string | null } | null;
  /** Caller's chunk fetcher (e.g. usePlanFeatures.loadChunk). */
  loadChunk: (req: ScrollChunkRequest) => Promise<void> | Promise<unknown>;
}

export interface ScrollState {
  loadedRange: DateWindow;
  totalWidthPx: number;
  /** Px offset of `today` from `loadedRange.start`. */
  todayPx: number;
  /** Initial scrollLeft to apply once on mount: today anchored at leading 1/3 of viewport. */
  initialScrollLeft: number;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  isFetchingLeading: boolean;
  isFetchingTrailing: boolean;
  loadError: { direction: ChunkDirection; error: Error } | null;
  /** Scrolls `today` to leading 1/3 of the viewport. */
  scrollToToday: (behavior?: ScrollBehavior) => void;
  /** Scrolls to the earliest planned date (or first column when bounds unknown). */
  scrollToStart: (behavior?: ScrollBehavior) => void;
  /** Scrolls to the latest planned date (or last column when bounds unknown). */
  scrollToEnd: (behavior?: ScrollBehavior) => void;
  /** Pans to a specific date (snaps to its day column at viewport leading 1/3). */
  scrollToDate: (iso: string, behavior?: ScrollBehavior) => Promise<void>;
  /** Retry a failed leading/trailing chunk. */
  retryFailedChunk: () => void;
}

const EDGE_PREFETCH_DAYS = 14; // Trigger prefetch when we're within this many days of either edge.
const TODAY_LEAD_FRACTION = 1 / 3;

function isWithinRange(iso: string, range: DateWindow): boolean {
  return daysBetween(range.start, iso) >= 0 && daysBetween(iso, range.end) > 0;
}

export function useGanttTimelineScroll(
  params: UseGanttTimelineScrollParams,
): ScrollState {
  const {
    today,
    dayPx,
    initialViewportDays,
    initialBufferDays,
    chunkDays,
    cushionDays,
    bounds,
    loadChunk,
  } = params;

  const [loadedRange, setLoadedRange] = useState<DateWindow>(() =>
    loadedRangeFromBuffer(today, initialViewportDays, initialBufferDays),
  );
  const [isFetchingLeading, setIsFetchingLeading] = useState(false);
  const [isFetchingTrailing, setIsFetchingTrailing] = useState(false);
  const [loadError, setLoadError] = useState<{ direction: ChunkDirection; error: Error } | null>(
    null,
  );
  // `scrollerEl` is stored as state (not just a ref) so the scroll-listener
  // and keyboard effects re-bind when consumers attach the DOM node
  // imperatively after mount (or via a callback ref). The exported
  // `scrollerRef` is a stable proxy whose getter/setter forward to state, so
  // consumers can keep the familiar `ref={scrollerRef}` JSX pattern AND
  // imperative setters from tests both work without requiring callers to
  // adopt a callback-ref API.
  const [scrollerEl, setScrollerEl] = useState<HTMLDivElement | null>(null);
  const scrollerElRef = useRef<HTMLDivElement | null>(null);
  scrollerElRef.current = scrollerEl;
  const scrollerRefProxyRef = useRef<React.RefObject<HTMLDivElement | null> | null>(null);
  if (scrollerRefProxyRef.current === null) {
    scrollerRefProxyRef.current = {
      get current() {
        return scrollerElRef.current;
      },
      set current(value: HTMLDivElement | null) {
        if (scrollerElRef.current === value) return;
        scrollerElRef.current = value;
        setScrollerEl(value);
      },
    };
  }
  const leadingAbortRef = useRef<AbortController | null>(null);
  const trailingAbortRef = useRef<AbortController | null>(null);
  const loadChunkRef = useRef(loadChunk);
  loadChunkRef.current = loadChunk;
  const initialScrollAppliedRef = useRef(false);
  const scrollerRef = scrollerRefProxyRef.current;

  const totalDays = daysBetween(loadedRange.start, loadedRange.end);
  const totalWidthPx = totalDays * dayPx;
  const todayPx = daysBetween(loadedRange.start, today) * dayPx;

  // Initial scrollLeft — today anchored at leading 1/3 of viewport.
  const initialScrollLeft = useMemo(() => {
    const viewportPx = initialViewportDays * dayPx;
    return Math.max(0, todayPx - Math.floor(viewportPx * TODAY_LEAD_FRACTION));
    // Only depends on initial sizing — recomputed if today/dayPx/viewport changes.
  }, [todayPx, initialViewportDays, dayPx]);

  // Apply initial scroll once the scroller is attached (and only once).
  useEffect(() => {
    if (initialScrollAppliedRef.current) return;
    if (!scrollerEl) return;
    scrollerEl.scrollLeft = initialScrollLeft;
    initialScrollAppliedRef.current = true;
    // initialScrollLeft is intentionally not in deps — first-mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollerEl]);

  const fetchChunk = useCallback(
    async (direction: ChunkDirection) => {
      // Compute the chunk window first; clamp to bounds (with cushion) so we
      // never fetch past the planning horizon.
      const chunk = chunkRange(direction, loadedRange, chunkDays);
      const clamped = bounds
        ? clampToBounds(chunk, bounds, cushionDays)
        : chunk;
      // If clamping reduced the chunk to zero days, do nothing.
      if (daysBetween(clamped.start, clamped.end) <= 0) return;

      // Cancel any prior in-flight chunk in the same direction.
      const ref = direction === 'leading' ? leadingAbortRef : trailingAbortRef;
      ref.current?.abort();
      const ac = new AbortController();
      ref.current = ac;
      if (direction === 'leading') setIsFetchingLeading(true);
      else setIsFetchingTrailing(true);
      setLoadError((prev) => (prev?.direction === direction ? null : prev));
      try {
        await loadChunkRef.current({
          windowStart: clamped.start,
          windowEnd: addDays(clamped.end, -1),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        // Expand the loaded range to include the freshly-fetched chunk.
        setLoadedRange((prev) => {
          if (direction === 'leading') {
            const newStart =
              daysBetween(clamped.start, prev.start) > 0 ? clamped.start : prev.start;
            return { start: newStart, end: prev.end };
          }
          const newEnd =
            daysBetween(prev.end, clamped.end) > 0 ? clamped.end : prev.end;
          return { start: prev.start, end: newEnd };
        });
      } catch (err: unknown) {
        if (ac.signal.aborted) return;
        const e = err instanceof Error ? err : new Error(String(err));
        if (e.name === 'AbortError') return;
        setLoadError({ direction, error: e });
      } finally {
        if (ref.current === ac) {
          if (direction === 'leading') setIsFetchingLeading(false);
          else setIsFetchingTrailing(false);
        }
      }
    },
    [loadedRange, chunkDays, bounds, cushionDays],
  );

  // Edge-prefetch on scroll. Throttled via requestAnimationFrame to avoid
  // spamming chunk requests on continuous wheel events.
  useEffect(() => {
    const el = scrollerEl;
    if (!el) return;
    let raf = 0;
    const handle = () => {
      const sl = el.scrollLeft;
      const cw = el.clientWidth;
      const sw = el.scrollWidth;
      const leadingThresholdPx = EDGE_PREFETCH_DAYS * dayPx;
      const trailingThresholdPx = sw - cw - EDGE_PREFETCH_DAYS * dayPx;
      // Leading edge.
      if (sl < leadingThresholdPx && !isFetchingLeading) {
        const atBoundsStart =
          bounds?.earliestPlannedStart != null &&
          daysBetween(loadedRange.start, addDays(bounds.earliestPlannedStart, -cushionDays)) >= 0;
        if (!atBoundsStart) {
          void fetchChunk('leading');
        }
      }
      // Trailing edge.
      if (sl > trailingThresholdPx && !isFetchingTrailing) {
        const atBoundsEnd =
          bounds?.latestPlannedEnd != null &&
          daysBetween(addDays(bounds.latestPlannedEnd, cushionDays + 1), loadedRange.end) >= 0;
        if (!atBoundsEnd) {
          void fetchChunk('trailing');
        }
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        handle();
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    scrollerEl,
    dayPx,
    fetchChunk,
    isFetchingLeading,
    isFetchingTrailing,
    bounds,
    cushionDays,
    loadedRange.start,
    loadedRange.end,
  ]);

  const respectMotionPref = (behavior?: ScrollBehavior): ScrollBehavior => {
    if (behavior) return behavior;
    if (typeof window === 'undefined') return 'auto';
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reduced ? 'auto' : 'smooth';
  };

  const scrollToToday = useCallback(
    (behavior?: ScrollBehavior) => {
      const el = scrollerRef.current;
      if (!el) return;
      const viewportPx = el.clientWidth || initialViewportDays * dayPx;
      const target = Math.max(
        0,
        daysBetween(loadedRange.start, today) * dayPx -
          Math.floor(viewportPx * TODAY_LEAD_FRACTION),
      );
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [loadedRange.start, today, dayPx, initialViewportDays],
  );

  const scrollToStart = useCallback(
    (behavior?: ScrollBehavior) => {
      const el = scrollerRef.current;
      if (!el) return;
      const target = bounds?.earliestPlannedStart
        ? Math.max(
            0,
            daysBetween(loadedRange.start, bounds.earliestPlannedStart) * dayPx,
          )
        : 0;
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [bounds, loadedRange.start, dayPx],
  );

  const scrollToEnd = useCallback(
    (behavior?: ScrollBehavior) => {
      const el = scrollerRef.current;
      if (!el) return;
      const viewportPx = el.clientWidth;
      const target = bounds?.latestPlannedEnd
        ? Math.max(
            0,
            daysBetween(loadedRange.start, bounds.latestPlannedEnd) * dayPx -
              Math.floor(viewportPx * (1 - TODAY_LEAD_FRACTION)),
          )
        : el.scrollWidth - viewportPx;
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [bounds, loadedRange.start, dayPx],
  );

  const scrollToDate = useCallback(
    async (iso: string, behavior?: ScrollBehavior): Promise<void> => {
      // If the date is outside the loaded range, expand first.
      if (!isWithinRange(iso, loadedRange)) {
        const direction: ChunkDirection =
          daysBetween(iso, loadedRange.start) >= 0 ? 'leading' : 'trailing';
        // Expand directly to cover the requested date plus a small buffer.
        const expandTo: DateWindow =
          direction === 'leading'
            ? { start: addDays(iso, -chunkDays), end: loadedRange.end }
            : { start: loadedRange.start, end: addDays(iso, chunkDays + 1) };
        const clamped = bounds ? clampToBounds(expandTo, bounds, cushionDays) : expandTo;
        const ac = new AbortController();
        try {
          if (direction === 'leading') setIsFetchingLeading(true);
          else setIsFetchingTrailing(true);
          await loadChunkRef.current({
            windowStart: clamped.start,
            windowEnd: addDays(clamped.end, -1),
            signal: ac.signal,
          });
          setLoadedRange(clamped);
        } catch (err: unknown) {
          const e = err instanceof Error ? err : new Error(String(err));
          if (e.name !== 'AbortError') {
            setLoadError({ direction, error: e });
          }
          return;
        } finally {
          if (direction === 'leading') setIsFetchingLeading(false);
          else setIsFetchingTrailing(false);
        }
      }
      const el = scrollerRef.current;
      if (!el) return;
      // After expansion, recompute target relative to the (possibly grown) start.
      const start = scrollerRef.current ? loadedRange.start : loadedRange.start;
      const viewportPx = el.clientWidth || initialViewportDays * dayPx;
      const target = Math.max(
        0,
        daysBetween(start, iso) * dayPx - Math.floor(viewportPx * TODAY_LEAD_FRACTION),
      );
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [loadedRange, chunkDays, bounds, cushionDays, dayPx, initialViewportDays],
  );

  const retryFailedChunk = useCallback(() => {
    if (!loadError) return;
    void fetchChunk(loadError.direction);
  }, [loadError, fetchChunk]);

  // Keyboard shortcuts: Home, End, Cmd/Ctrl+G, ArrowRight, Shift+ArrowRight, PageDown.
  useEffect(() => {
    if (!scrollerEl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when focus is in an editable field.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const el = scrollerEl;
      if (!el) return;
      if (e.key === 'Home' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        scrollToStart('auto');
      } else if (e.key === 'End' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        scrollToEnd('auto');
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        el.scrollBy({ left: el.clientWidth * 0.9, behavior: respectMotionPref() });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        el.scrollBy({ left: -el.clientWidth * 0.9, behavior: respectMotionPref() });
      } else if (e.key === 'ArrowRight') {
        const step = e.shiftKey ? dayPx * 7 : dayPx;
        el.scrollBy({ left: step, behavior: respectMotionPref() });
      } else if (e.key === 'ArrowLeft') {
        const step = e.shiftKey ? dayPx * 7 : dayPx;
        el.scrollBy({ left: -step, behavior: respectMotionPref() });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollerEl, dayPx, scrollToStart, scrollToEnd]);

  return {
    loadedRange,
    totalWidthPx,
    todayPx,
    initialScrollLeft,
    scrollerRef,
    isFetchingLeading,
    isFetchingTrailing,
    loadError,
    scrollToToday,
    scrollToStart,
    scrollToEnd,
    scrollToDate,
    retryFailedChunk,
  };
}
