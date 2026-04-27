import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  chunkRange,
  daysBetween,
  loadedRangeAroundToday,
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
  /**
   * Width of the sticky leading gutter (px) that occupies the first column of
   * each row. Date columns and segment bars start at scroller-x = gutterPx;
   * scrollLeft anchors are offset by it so "today at viewport 1/3" lands the
   * actual today column there, not the gutter.
   */
  gutterPx?: number;
  /** Initial visible width in days (used for viewport-fallback math). */
  initialViewportDays: number;
  /** Half-window in days around `today` for the initial loaded range. */
  initialHalfWindowDays: number;
  /** Days per leading/trailing edge-prefetch chunk. */
  chunkDays: number;
  /** Caller's chunk fetcher (e.g. usePlanFeatures.loadChunk). */
  loadChunk: (req: ScrollChunkRequest) => Promise<void> | Promise<unknown>;
}

export interface ScrollState {
  loadedRange: DateWindow;
  totalWidthPx: number;
  /** Px offset of `today` from `loadedRange.start` (inner-content coordinate, == scrollLeft origin). */
  todayPx: number;
  /** Initial scrollLeft to apply once on mount: today anchored at leading 1/3 of viewport. */
  initialScrollLeft: number;
  /** Stable callback ref to attach the scrollable element. */
  attachScroller: (el: HTMLDivElement | null) => void;
  isFetchingLeading: boolean;
  isFetchingTrailing: boolean;
  loadError: { direction: ChunkDirection; error: Error } | null;
  /** Scrolls `today` to leading 1/3 of the viewport. */
  scrollToToday: (behavior?: ScrollBehavior) => void;
  /** Pans to a specific date (snaps to its day column at viewport leading 1/3). */
  scrollToDate: (iso: string, behavior?: ScrollBehavior) => Promise<void>;
  /** Retry a failed leading/trailing chunk. */
  retryFailedChunk: () => void;
}

const EDGE_PREFETCH_DAYS = 14;
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
    gutterPx = 0,
    initialViewportDays,
    initialHalfWindowDays,
    chunkDays,
    loadChunk,
  } = params;

  const [loadedRange, setLoadedRange] = useState<DateWindow>(() =>
    loadedRangeAroundToday(today, initialHalfWindowDays),
  );
  const [isFetchingLeading, setIsFetchingLeading] = useState(false);
  const [isFetchingTrailing, setIsFetchingTrailing] = useState(false);
  const [loadError, setLoadError] = useState<{ direction: ChunkDirection; error: Error } | null>(
    null,
  );
  // `scrollerEl` is stored as state (not just a ref) so the scroll-listener
  // and keyboard effects re-bind when consumers attach the DOM node
  // imperatively after mount (or via a callback ref).
  const [scrollerEl, setScrollerEl] = useState<HTMLDivElement | null>(null);
  const leadingAbortRef = useRef<AbortController | null>(null);
  const trailingAbortRef = useRef<AbortController | null>(null);
  const loadChunkRef = useRef(loadChunk);
  // Element identity — a boolean would skip re-anchoring when the page
  // swaps in a fresh scroller (e.g. filter-driven remount).
  const initialScrollAppliedForRef = useRef<HTMLDivElement | null>(null);
  // Tracks the previous loadedRange.start so leading-side extensions can
  // compensate scrollLeft (anchor the user to the same calendar date).
  // Without this, a leading prefetch grows the DOM but scrollLeft stays
  // numerically the same, the user stays under the prefetch threshold,
  // and the next scroll tick fires another fetch — runaway loop.
  const prevLoadedStartRef = useRef(loadedRange.start);

  useEffect(() => {
    loadChunkRef.current = loadChunk;
  }, [loadChunk]);

  const attachScroller = useCallback((el: HTMLDivElement | null) => {
    setScrollerEl((prev) => (prev === el ? prev : el));
  }, []);

  const totalDays = daysBetween(loadedRange.start, loadedRange.end);
  const totalWidthPx = totalDays * dayPx;
  const todayPx = daysBetween(loadedRange.start, today) * dayPx;

  const initialScrollLeft = useMemo(() => {
    const viewportPx = scrollerEl?.clientWidth || initialViewportDays * dayPx;
    return Math.max(0, todayPx + gutterPx - Math.floor(viewportPx * TODAY_LEAD_FRACTION));
  }, [todayPx, gutterPx, initialViewportDays, dayPx, scrollerEl]);

  useLayoutEffect(() => {
    if (!scrollerEl) return;
    if (initialScrollAppliedForRef.current === scrollerEl) return;
    if (scrollerEl.scrollWidth <= 0) return;
    scrollerEl.scrollLeft = initialScrollLeft;
    initialScrollAppliedForRef.current = scrollerEl;
  }, [scrollerEl, initialScrollLeft]);

  useLayoutEffect(() => {
    const prev = prevLoadedStartRef.current;
    const curr = loadedRange.start;
    if (prev === curr) return;
    prevLoadedStartRef.current = curr;
    const el = scrollerEl;
    if (!el) return;
    if (initialScrollAppliedForRef.current !== el) return;
    const addedLeadingDays = daysBetween(curr, prev);
    if (addedLeadingDays > 0) {
      el.scrollLeft += addedLeadingDays * dayPx;
    }
  }, [loadedRange.start, scrollerEl, dayPx]);

  const fetchChunk = useCallback(
    async (direction: ChunkDirection) => {
      const chunk = chunkRange(direction, loadedRange, chunkDays);
      if (daysBetween(chunk.start, chunk.end) <= 0) return;

      const ref = direction === 'leading' ? leadingAbortRef : trailingAbortRef;
      ref.current?.abort();
      const ac = new AbortController();
      ref.current = ac;
      if (direction === 'leading') setIsFetchingLeading(true);
      else setIsFetchingTrailing(true);
      setLoadError((prev) => (prev?.direction === direction ? null : prev));
      try {
        await loadChunkRef.current({
          windowStart: chunk.start,
          windowEnd: addDays(chunk.end, -1),
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setLoadedRange((prev) => {
          if (direction === 'leading') {
            const newStart =
              daysBetween(chunk.start, prev.start) > 0 ? chunk.start : prev.start;
            return { start: newStart, end: prev.end };
          }
          const newEnd =
            daysBetween(prev.end, chunk.end) > 0 ? chunk.end : prev.end;
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
    [loadedRange, chunkDays],
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
      const leadingThresholdPx = gutterPx + EDGE_PREFETCH_DAYS * dayPx;
      const trailingThresholdPx = sw - cw - EDGE_PREFETCH_DAYS * dayPx;
      if (sl < leadingThresholdPx && !isFetchingLeading) {
        void fetchChunk('leading');
      }
      if (sl > trailingThresholdPx && !isFetchingTrailing) {
        void fetchChunk('trailing');
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
    gutterPx,
    fetchChunk,
    isFetchingLeading,
    isFetchingTrailing,
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
      const el = scrollerEl;
      if (!el) return;
      const viewportPx = el.clientWidth || initialViewportDays * dayPx;
      const target = Math.max(0, todayPx + gutterPx - Math.floor(viewportPx * TODAY_LEAD_FRACTION));
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [scrollerEl, todayPx, gutterPx, dayPx, initialViewportDays],
  );

  const scrollToDate = useCallback(
    async (iso: string, behavior?: ScrollBehavior): Promise<void> => {
      if (!isWithinRange(iso, loadedRange)) {
        const direction: ChunkDirection =
          daysBetween(iso, loadedRange.start) >= 0 ? 'leading' : 'trailing';
        const expandTo: DateWindow =
          direction === 'leading'
            ? { start: addDays(iso, -chunkDays), end: loadedRange.end }
            : { start: loadedRange.start, end: addDays(iso, chunkDays + 1) };
        const ac = new AbortController();
        try {
          if (direction === 'leading') setIsFetchingLeading(true);
          else setIsFetchingTrailing(true);
          await loadChunkRef.current({
            windowStart: expandTo.start,
            windowEnd: addDays(expandTo.end, -1),
            signal: ac.signal,
          });
          setLoadedRange(expandTo);
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
      const el = scrollerEl;
      if (!el) return;
      const viewportPx = el.clientWidth || initialViewportDays * dayPx;
      const target = Math.max(
        0,
        daysBetween(loadedRange.start, iso) * dayPx +
          gutterPx -
          Math.floor(viewportPx * TODAY_LEAD_FRACTION),
      );
      el.scrollTo({ left: target, behavior: respectMotionPref(behavior) });
    },
    [scrollerEl, loadedRange, chunkDays, dayPx, gutterPx, initialViewportDays],
  );

  const retryFailedChunk = useCallback(() => {
    if (!loadError) return;
    void fetchChunk(loadError.direction);
  }, [loadError, fetchChunk]);

  useEffect(() => {
    if (!scrollerEl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      const el = scrollerEl;
      if (!el) return;
      if (e.key === 'Home' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        scrollToToday('auto');
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
  }, [scrollerEl, dayPx, scrollToToday]);

  return {
    loadedRange,
    totalWidthPx,
    todayPx,
    initialScrollLeft,
    attachScroller,
    isFetchingLeading,
    isFetchingTrailing,
    loadError,
    scrollToToday,
    scrollToDate,
    retryFailedChunk,
  };
}
