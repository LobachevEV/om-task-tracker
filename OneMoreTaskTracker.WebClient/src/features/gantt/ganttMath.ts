export type ZoomLevel = 'week' | 'twoWeeks' | 'month';

export const ZOOM_DAYS: Readonly<Record<ZoomLevel, number>> = {
  week: 7,
  twoWeeks: 14,
  month: 30,
};

export interface DateWindow {
  /** inclusive, ISO yyyy-mm-dd */ start: string;
  /** exclusive, ISO yyyy-mm-dd */ end: string;
}

export interface BarGeometry {
  leftPercent: number;
  widthPercent: number;
  clampedLeft: boolean;
  clampedRight: boolean;
}

export const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(iso: string): Date {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ts = Date.UTC(y, mo - 1, d);
  const back = new Date(ts);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return back;
}

export function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, '0');
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = d.getUTCDate().toString().padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

const MS_PER_DAY = 86_400_000;

export function addDays(iso: string, n: number): string {
  const base = parseIsoDate(iso);
  return toIsoDate(new Date(base.getTime() + n * MS_PER_DAY));
}

/** Floor of (b - a) in days, treating inputs as UTC midnights. */
export function daysBetween(a: string, b: string): number {
  const da = parseIsoDate(a).getTime();
  const db = parseIsoDate(b).getTime();
  return Math.floor((db - da) / MS_PER_DAY);
}

/** Snap to the Monday of the week containing `isoDate`, per ISO 8601. */
export function mondayOf(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  // getUTCDay: Sunday = 0 ... Saturday = 6. Monday-based offset: (day + 6) % 7.
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(isoDate, -offset);
}

export function windowForZoom(today: string, zoom: ZoomLevel): DateWindow {
  const start = mondayOf(today);
  return { start, end: addDays(start, ZOOM_DAYS[zoom]) };
}

/**
 * Compute the bar geometry for `planned` inside `window`. Returns null when
 * the planned window is fully outside `window`, degenerate (end < start), or
 * both endpoints are null. If only one endpoint is known, the bar collapses
 * to a point at the known end.
 */
export function barGeometry(
  window: DateWindow,
  planned: { start: string | null; end: string | null },
): BarGeometry | null {
  const { start: windowStart, end: windowEnd } = window;
  const totalDays = daysBetween(windowStart, windowEnd);
  if (totalDays <= 0) return null;

  let plannedStart = planned.start;
  let plannedEnd = planned.end;
  if (plannedStart == null && plannedEnd == null) return null;
  if (plannedStart == null) plannedStart = plannedEnd;
  if (plannedEnd == null) plannedEnd = plannedStart;

  // At this point both are non-null.
  if (daysBetween(plannedStart!, plannedEnd!) < 0) return null; // degenerate: end < start

  const startDelta = daysBetween(windowStart, plannedStart!);
  // Exclusive end: treat planned end as inclusive-day, so the bar covers [startDelta, endDelta+1).
  const endDelta = daysBetween(windowStart, plannedEnd!) + 1;

  // Fully outside window.
  if (endDelta <= 0) return null;
  if (startDelta >= totalDays) return null;

  const clampedLeft = startDelta < 0;
  const clampedRight = endDelta > totalDays;
  const clippedStart = Math.max(startDelta, 0);
  const clippedEnd = Math.min(endDelta, totalDays);

  const leftPercent = (clippedStart / totalDays) * 100;
  const widthPercent = ((clippedEnd - clippedStart) / totalDays) * 100;

  return { leftPercent, widthPercent, clampedLeft, clampedRight };
}

/** Convenience for consumers that need `todayPercent`. */
export function todayPercent(window: DateWindow, today: string): number | null {
  const totalDays = daysBetween(window.start, window.end);
  if (totalDays <= 0) return null;
  const delta = daysBetween(window.start, today);
  if (delta < 0 || delta >= totalDays) return null;
  return (delta / totalDays) * 100;
}

/**
 * Px-based geometry primitives — used by the scrollable Gantt where the date
 * axis lives in a single horizontally-scrolling element of width
 * `dayCount * dayPx`. Both endpoints are inclusive ISO yyyy-MM-dd.
 */
export interface BarGeometryPx {
  leftPx: number;
  widthPx: number;
  clampedLeft: boolean;
  clampedRight: boolean;
}

export function dateToPixel(rangeStart: string, iso: string, dayPx: number): number {
  return daysBetween(rangeStart, iso) * dayPx;
}

export function pixelToDate(rangeStart: string, px: number, dayPx: number): string {
  if (dayPx <= 0) throw new Error('dayPx must be > 0');
  return addDays(rangeStart, Math.floor(px / dayPx));
}

/**
 * Px-positioned bar inside a `range` with the given `dayPx`. Same null
 * semantics as `barGeometry`: returns null when fully outside, both
 * endpoints null, or end < start.
 */
export function barGeometryPx(
  range: DateWindow,
  planned: { start: string | null; end: string | null },
  dayPx: number,
): BarGeometryPx | null {
  const totalDays = daysBetween(range.start, range.end);
  if (totalDays <= 0) return null;

  let plannedStart = planned.start;
  let plannedEnd = planned.end;
  if (plannedStart == null && plannedEnd == null) return null;
  if (plannedStart == null) plannedStart = plannedEnd;
  if (plannedEnd == null) plannedEnd = plannedStart;
  if (daysBetween(plannedStart!, plannedEnd!) < 0) return null;

  const startDelta = daysBetween(range.start, plannedStart!);
  const endDelta = daysBetween(range.start, plannedEnd!) + 1;

  if (endDelta <= 0) return null;
  if (startDelta >= totalDays) return null;

  const clampedLeft = startDelta < 0;
  const clampedRight = endDelta > totalDays;
  const clippedStart = Math.max(startDelta, 0);
  const clippedEnd = Math.min(endDelta, totalDays);

  return {
    leftPx: clippedStart * dayPx,
    widthPx: (clippedEnd - clippedStart) * dayPx,
    clampedLeft,
    clampedRight,
  };
}

/**
 * Initial loaded range: `bufferDays` on each side of `today` plus the visible
 * `viewportDays` itself. Result is half-open `[start, end)`.
 */
export function loadedRangeFromBuffer(
  today: string,
  viewportDays: number,
  bufferDays: number,
): DateWindow {
  const span = Math.max(1, viewportDays + bufferDays * 2);
  const start = addDays(today, -bufferDays);
  return { start, end: addDays(start, span) };
}

export type ChunkDirection = 'leading' | 'trailing';

/**
 * Compute the next chunk window to fetch when the user pans toward an edge.
 * Returns the chunk's own [start, end) (also half-open). Caller merges into
 * the loaded range.
 */
export function chunkRange(
  direction: ChunkDirection,
  loaded: DateWindow,
  chunkDays: number,
): DateWindow {
  const days = Math.max(1, chunkDays);
  if (direction === 'leading') {
    const start = addDays(loaded.start, -days);
    return { start, end: loaded.start };
  }
  const start = loaded.end;
  return { start, end: addDays(loaded.end, days) };
}

/**
 * Clip `range` so it does not extend past
 * `[bounds.earliestPlannedStart - cushion, bounds.latestPlannedEnd + cushion + 1)`
 * — this prevents loading unbounded empty space past the global plan edges.
 * Either bound may be null (no data yet); the corresponding side is left as-is.
 */
export function clampToBounds(
  range: DateWindow,
  bounds: { earliestPlannedStart: string | null; latestPlannedEnd: string | null },
  cushionDays: number,
): DateWindow {
  let { start, end } = range;
  const cushion = Math.max(0, cushionDays);
  if (bounds.earliestPlannedStart) {
    const min = addDays(bounds.earliestPlannedStart, -cushion);
    // Pull start forward (later) if it sits before the cushion.
    if (daysBetween(start, min) > 0) start = min;
  }
  if (bounds.latestPlannedEnd) {
    // bounds.latestPlannedEnd is inclusive; treat as +1 for half-open end.
    const max = addDays(bounds.latestPlannedEnd, cushion + 1);
    // Pull end backward (earlier) if it sits past the cushion.
    if (daysBetween(max, end) > 0) end = max;
  }
  if (daysBetween(start, end) <= 0) {
    end = addDays(start, 1);
  }
  return { start, end };
}
