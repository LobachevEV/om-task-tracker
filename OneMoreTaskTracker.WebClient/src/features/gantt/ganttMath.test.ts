import { describe, expect, it } from 'vitest';
import {
  addDays,
  barGeometry,
  barGeometryPx,
  chunkRange,
  clampToBounds,
  dateToPixel,
  daysBetween,
  loadedRangeFromBuffer,
  mondayOf,
  parseIsoDate,
  pixelToDate,
  toIsoDate,
  todayPercent,
  windowForZoom,
} from './ganttMath';

describe('parseIsoDate / toIsoDate', () => {
  it('round-trips ISO dates at UTC midnight', () => {
    const d = parseIsoDate('2026-04-21');
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCDate()).toBe(21);
    expect(toIsoDate(d)).toBe('2026-04-21');
  });

  it('rejects invalid ISO strings', () => {
    expect(() => parseIsoDate('not-a-date')).toThrow();
    expect(() => parseIsoDate('2026-02-30')).toThrow();
  });
});

describe('addDays / daysBetween', () => {
  it('addDays handles week boundary', () => {
    expect(addDays('2026-04-20', 7)).toBe('2026-04-27');
  });

  it('addDays handles negatives', () => {
    expect(addDays('2026-04-20', -1)).toBe('2026-04-19');
  });

  it('daysBetween is floor of b-a', () => {
    expect(daysBetween('2026-04-20', '2026-04-27')).toBe(7);
    expect(daysBetween('2026-04-27', '2026-04-20')).toBe(-7);
  });
});

describe('mondayOf', () => {
  it('snaps Tue 2026-04-21 to Mon 2026-04-20', () => {
    expect(mondayOf('2026-04-21')).toBe('2026-04-20');
  });
  it('snaps Sun 2026-04-19 to Mon 2026-04-13', () => {
    expect(mondayOf('2026-04-19')).toBe('2026-04-13');
  });
  it('returns the same Monday for a Monday', () => {
    expect(mondayOf('2026-04-20')).toBe('2026-04-20');
  });
});

describe('windowForZoom', () => {
  it('week zoom yields a 7-day window from Monday', () => {
    expect(windowForZoom('2026-04-21', 'week')).toEqual({
      start: '2026-04-20',
      end: '2026-04-27',
    });
  });
  it('twoWeeks zoom yields 14 days', () => {
    expect(windowForZoom('2026-04-21', 'twoWeeks')).toEqual({
      start: '2026-04-20',
      end: '2026-05-04',
    });
  });
  it('month zoom yields 30 days', () => {
    expect(windowForZoom('2026-04-21', 'month')).toEqual({
      start: '2026-04-20',
      end: '2026-05-20',
    });
  });
});

describe('barGeometry', () => {
  const windowWeek = { start: '2026-04-20', end: '2026-04-27' };

  it('returns null when both endpoints are null', () => {
    expect(barGeometry(windowWeek, { start: null, end: null })).toBeNull();
  });

  it('clamps left when feature starts before window', () => {
    const g = barGeometry(windowWeek, { start: '2026-04-15', end: '2026-04-23' });
    expect(g).not.toBeNull();
    expect(g!.leftPercent).toBe(0);
    // Planned end 2026-04-23 inclusive → exclusive end 2026-04-24, which is day 4 of the window.
    expect(g!.widthPercent).toBeCloseTo((4 / 7) * 100, 5);
    expect(g!.clampedLeft).toBe(true);
    expect(g!.clampedRight).toBe(false);
  });

  it('clamps right when feature ends after window', () => {
    const g = barGeometry(windowWeek, { start: '2026-04-22', end: '2026-05-10' });
    expect(g).not.toBeNull();
    expect(g!.clampedLeft).toBe(false);
    expect(g!.clampedRight).toBe(true);
    expect(g!.leftPercent).toBeCloseTo((2 / 7) * 100, 5);
    expect(g!.widthPercent).toBeCloseTo((5 / 7) * 100, 5);
  });

  it('fully outside (before) returns null', () => {
    expect(
      barGeometry(windowWeek, { start: '2026-03-01', end: '2026-03-02' }),
    ).toBeNull();
  });

  it('fully outside (after) returns null', () => {
    expect(
      barGeometry(windowWeek, { start: '2026-06-01', end: '2026-06-02' }),
    ).toBeNull();
  });

  it('degenerate window (end<=start) returns null', () => {
    expect(
      barGeometry(
        { start: '2026-04-20', end: '2026-04-20' },
        { start: '2026-04-20', end: '2026-04-20' },
      ),
    ).toBeNull();
  });

  it('degenerate planned (end<start) returns null', () => {
    expect(
      barGeometry(windowWeek, { start: '2026-04-25', end: '2026-04-21' }),
    ).toBeNull();
  });

  it('single-endpoint planned collapses to a 1-day point', () => {
    const g = barGeometry(windowWeek, { start: null, end: '2026-04-22' });
    expect(g).not.toBeNull();
    expect(g!.widthPercent).toBeCloseTo((1 / 7) * 100, 5);
  });
});

describe('todayPercent', () => {
  const windowWeek = { start: '2026-04-20', end: '2026-04-27' };
  it('is null when today is before the window', () => {
    expect(todayPercent(windowWeek, '2026-04-19')).toBeNull();
  });
  it('is null when today is at/after the exclusive end', () => {
    expect(todayPercent(windowWeek, '2026-04-27')).toBeNull();
  });
  it('is 0 on the window start', () => {
    expect(todayPercent(windowWeek, '2026-04-20')).toBe(0);
  });
  it('is proportional mid-window', () => {
    expect(todayPercent(windowWeek, '2026-04-23')).toBeCloseTo((3 / 7) * 100, 5);
  });
});

describe('dateToPixel / pixelToDate', () => {
  const start = '2026-04-20';
  it('dateToPixel measures days × dayPx from rangeStart', () => {
    expect(dateToPixel(start, '2026-04-20', 24)).toBe(0);
    expect(dateToPixel(start, '2026-04-21', 24)).toBe(24);
    expect(dateToPixel(start, '2026-05-04', 24)).toBe(14 * 24);
  });
  it('pixelToDate floors to the day index', () => {
    expect(pixelToDate(start, 0, 24)).toBe('2026-04-20');
    expect(pixelToDate(start, 23, 24)).toBe('2026-04-20');
    expect(pixelToDate(start, 24, 24)).toBe('2026-04-21');
    expect(pixelToDate(start, 49, 24)).toBe('2026-04-22');
  });
  it('pixelToDate rejects non-positive dayPx', () => {
    expect(() => pixelToDate(start, 24, 0)).toThrow();
  });
});

describe('barGeometryPx', () => {
  const range = { start: '2026-04-20', end: '2026-04-27' };

  it('returns null when both endpoints are null', () => {
    expect(barGeometryPx(range, { start: null, end: null }, 24)).toBeNull();
  });
  it('positions a fully-inside bar at integer px', () => {
    const g = barGeometryPx(range, { start: '2026-04-22', end: '2026-04-23' }, 24);
    expect(g).not.toBeNull();
    expect(g!.leftPx).toBe(2 * 24);
    expect(g!.widthPx).toBe(2 * 24);
    expect(g!.clampedLeft).toBe(false);
    expect(g!.clampedRight).toBe(false);
  });
  it('clamps left when feature starts before range', () => {
    const g = barGeometryPx(range, { start: '2026-04-15', end: '2026-04-23' }, 24);
    expect(g).not.toBeNull();
    expect(g!.leftPx).toBe(0);
    expect(g!.widthPx).toBe(4 * 24);
    expect(g!.clampedLeft).toBe(true);
  });
  it('clamps right when feature ends after range', () => {
    const g = barGeometryPx(range, { start: '2026-04-22', end: '2026-05-10' }, 24);
    expect(g).not.toBeNull();
    expect(g!.leftPx).toBe(2 * 24);
    expect(g!.widthPx).toBe(5 * 24);
    expect(g!.clampedRight).toBe(true);
  });
  it('returns null fully outside', () => {
    expect(
      barGeometryPx(range, { start: '2026-03-01', end: '2026-03-02' }, 24),
    ).toBeNull();
  });
});

describe('loadedRangeFromBuffer', () => {
  it('expands by bufferDays on each side of today plus viewportDays', () => {
    const r = loadedRangeFromBuffer('2026-04-21', 30, 30);
    expect(r.start).toBe('2026-03-22');
    expect(daysBetween(r.start, r.end)).toBe(90);
  });
  it('handles zero buffer', () => {
    const r = loadedRangeFromBuffer('2026-04-21', 14, 0);
    expect(r.start).toBe('2026-04-21');
    expect(daysBetween(r.start, r.end)).toBe(14);
  });
});

describe('chunkRange', () => {
  const loaded = { start: '2026-04-20', end: '2026-04-27' };
  it('leading direction prepends a chunk before the loaded range', () => {
    expect(chunkRange('leading', loaded, 7)).toEqual({
      start: '2026-04-13',
      end: '2026-04-20',
    });
  });
  it('trailing direction appends a chunk after the loaded range', () => {
    expect(chunkRange('trailing', loaded, 7)).toEqual({
      start: '2026-04-27',
      end: '2026-05-04',
    });
  });
});

describe('clampToBounds', () => {
  const range = { start: '2026-01-01', end: '2026-12-31' };
  it('clips overflow past the latest end + cushion', () => {
    const r = clampToBounds(
      range,
      { earliestPlannedStart: '2026-04-01', latestPlannedEnd: '2026-06-30' },
      14,
    );
    expect(r.start).toBe('2026-03-18'); // 2026-04-01 - 14
    expect(r.end).toBe('2026-07-15'); // 2026-06-30 + 14 + 1 (half-open)
  });
  it('leaves a side untouched when its bound is null', () => {
    const r = clampToBounds(
      range,
      { earliestPlannedStart: null, latestPlannedEnd: '2026-06-30' },
      14,
    );
    expect(r.start).toBe('2026-01-01');
    expect(r.end).toBe('2026-07-15');
  });
  it('returns input when bounds are both null', () => {
    expect(
      clampToBounds(range, { earliestPlannedStart: null, latestPlannedEnd: null }, 14),
    ).toEqual(range);
  });
  it('does not invert when range is fully outside bounds (left)', () => {
    const r = clampToBounds(
      { start: '2027-01-01', end: '2027-02-01' },
      { earliestPlannedStart: '2026-04-01', latestPlannedEnd: '2026-06-30' },
      14,
    );
    expect(daysBetween(r.start, r.end)).toBeGreaterThan(0);
  });
});
