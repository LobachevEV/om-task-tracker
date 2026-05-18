import { addDays, daysBetween, pixelToDate, toIsoDate, parseIsoDate } from '../../ganttMath';

export interface DragRange {
  plannedStart: string;
  plannedEnd: string;
}

/**
 * Given a pointer-down day and current pointer day, compute the normalised
 * preview range (start ≤ end always).
 */
export function computePreviewRange(anchorDay: string, cursorDay: string): DragRange {
  if (daysBetween(anchorDay, cursorDay) >= 0) {
    return { plannedStart: anchorDay, plannedEnd: cursorDay };
  }
  return { plannedStart: cursorDay, plannedEnd: anchorDay };
}

/**
 * When the bar already has dates, determine which endpoint is nearer to
 * `clickedDay` so we know which end to extend on a set-bar click.
 * Returns 'start' | 'end'.
 */
export function nearerEndpoint(
  plannedStart: string,
  plannedEnd: string,
  clickedDay: string,
): 'start' | 'end' {
  const distToStart = Math.abs(daysBetween(clickedDay, plannedStart));
  const distToEnd = Math.abs(daysBetween(clickedDay, plannedEnd));
  return distToStart <= distToEnd ? 'start' : 'end';
}

/**
 * Apply the set-bar click rule from the design brief §7.2.
 *
 * - Day BEFORE startDate  → PATCH only { plannedStart: clickedDay }
 * - Day AFTER endDate     → PATCH only { plannedEnd: clickedDay }
 * - Day BETWEEN inclusive → PATCH only { plannedEnd: clickedDay }
 *
 * If resulting start === end → clear both (returns null start & end).
 */
export function coerceClickToCommit(
  plannedStart: string,
  plannedEnd: string,
  clickedDay: string,
): { plannedStart: string | null; plannedEnd: string | null } {
  const isBefore = daysBetween(clickedDay, plannedStart) > 0;
  const isAfter = daysBetween(plannedEnd, clickedDay) > 0;
  const isOnEnd = clickedDay === plannedEnd;

  if (isBefore) {
    const nextStart = clickedDay;
    if (nextStart === plannedEnd) {
      return { plannedStart: null, plannedEnd: null };
    }
    return { plannedStart: nextStart, plannedEnd };
  }

  if (isAfter) {
    return { plannedStart, plannedEnd: clickedDay };
  }

  if (isOnEnd) {
    return { plannedStart: null, plannedEnd: null };
  }

  return { plannedStart, plannedEnd: clickedDay };
}

/**
 * Convert a raw pointer-event X offset inside the bar container into an ISO
 * date, clamped to [rangeStart, rangeEnd).
 */
export function pointerXToDay(
  pointerX: number,
  containerLeft: number,
  rangeStart: string,
  rangeEnd: string,
  dayPx: number,
): string {
  const relX = Math.max(0, pointerX - containerLeft);
  const raw = pixelToDate(rangeStart, relX, dayPx);
  const clampMax = addDays(rangeEnd, -1);
  if (daysBetween(raw, clampMax) < 0) return clampMax;
  return raw;
}

/**
 * Number of calendar days spanned by [start, end] inclusive.
 * `daysBetween` is exclusive end so we add 1.
 */
export function spanDays(start: string, end: string): number {
  const d = daysBetween(start, end);
  return d < 0 ? 0 : d + 1;
}

/**
 * Return ISO yyyy-MM-dd for today (UTC midnight).
 */
export function utcToday(): string {
  return toIsoDate(new Date(Date.now()));
}

/**
 * Snap `dayIso` to within [min, max] inclusive.
 */
export function clampDay(dayIso: string, min: string, max: string): string {
  if (daysBetween(dayIso, min) > 0) return min;
  if (daysBetween(dayIso, max) < 0) return max;
  return dayIso;
}

/**
 * Given the current bar dates and arrow key delta (±1), compute updated
 * range for the keyboard caret mode:
 *   caretMode='start' → move plannedStart by delta days
 *   caretMode='end'   → move plannedEnd by delta days
 *
 * Returns null if the resulting range would be invalid (end < start).
 */
export function shiftRangeBy(
  plannedStart: string,
  plannedEnd: string,
  caretMode: 'start' | 'end',
  delta: number,
): DragRange | null {
  if (caretMode === 'start') {
    const next = addDays(plannedStart, delta);
    if (daysBetween(next, plannedEnd) < 0) return null;
    return { plannedStart: next, plannedEnd };
  }
  const next = addDays(plannedEnd, delta);
  if (daysBetween(plannedStart, next) < 0) return null;
  return { plannedStart, plannedEnd: next };
}

/**
 * Return true if `iso` is a syntactically valid yyyy-MM-dd ISO date string.
 */
export function isValidIso(iso: string): boolean {
  try {
    parseIsoDate(iso);
    return true;
  } catch {
    return false;
  }
}
