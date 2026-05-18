import { describe, expect, it } from 'vitest';
import {
  clampDay,
  coerceClickToCommit,
  computePreviewRange,
  nearerEndpoint,
  shiftRangeBy,
  spanDays,
} from '../../../../../src/pages/Gantt/components/StageBarDateEditor/stageBarDragMath';

describe('computePreviewRange', () => {
  it('returns anchor as start when cursor is after anchor', () => {
    const result = computePreviewRange('2026-05-01', '2026-05-10');
    expect(result).toEqual({ plannedStart: '2026-05-01', plannedEnd: '2026-05-10' });
  });

  it('swaps when cursor is before anchor', () => {
    const result = computePreviewRange('2026-05-10', '2026-05-01');
    expect(result).toEqual({ plannedStart: '2026-05-01', plannedEnd: '2026-05-10' });
  });

  it('returns single-day range when anchor equals cursor', () => {
    const result = computePreviewRange('2026-05-05', '2026-05-05');
    expect(result).toEqual({ plannedStart: '2026-05-05', plannedEnd: '2026-05-05' });
  });
});

describe('nearerEndpoint', () => {
  it('returns start when clicked day is nearer to start', () => {
    expect(nearerEndpoint('2026-05-01', '2026-05-20', '2026-05-03')).toBe('start');
  });

  it('returns end when clicked day is nearer to end', () => {
    expect(nearerEndpoint('2026-05-01', '2026-05-20', '2026-05-18')).toBe('end');
  });

  it('returns start when equidistant (tie-breaks to start)', () => {
    expect(nearerEndpoint('2026-05-01', '2026-05-11', '2026-05-06')).toBe('start');
  });
});

describe('coerceClickToCommit — set-bar click rules', () => {
  const START = '2026-05-05';
  const END = '2026-05-15';

  it('moves start when click is before start', () => {
    const result = coerceClickToCommit(START, END, '2026-05-01');
    expect(result).toEqual({ plannedStart: '2026-05-01', plannedEnd: END });
  });

  it('moves end when click is after end', () => {
    const result = coerceClickToCommit(START, END, '2026-05-20');
    expect(result).toEqual({ plannedStart: START, plannedEnd: '2026-05-20' });
  });

  it('moves end when click is between start and end (inclusive)', () => {
    const result = coerceClickToCommit(START, END, '2026-05-10');
    expect(result).toEqual({ plannedStart: START, plannedEnd: '2026-05-10' });
  });

  it('moves end when click equals start', () => {
    const result = coerceClickToCommit(START, END, START);
    expect(result).toEqual({ plannedStart: START, plannedEnd: START });
  });

  it('clears both when result would be start === end (click before start lands on end)', () => {
    const result = coerceClickToCommit('2026-05-05', '2026-05-05', '2026-05-05');
    expect(result).toEqual({ plannedStart: null, plannedEnd: null });
  });

  it('clears both when start-move makes start equal end', () => {
    const result = coerceClickToCommit('2026-05-04', '2026-05-05', '2026-05-05');
    expect(result).toEqual({ plannedStart: null, plannedEnd: null });
  });
});

describe('spanDays', () => {
  it('returns 1 for same-day range', () => {
    expect(spanDays('2026-05-05', '2026-05-05')).toBe(1);
  });

  it('returns correct count for multi-day range', () => {
    expect(spanDays('2026-05-01', '2026-05-10')).toBe(10);
  });

  it('returns 0 when end is before start', () => {
    expect(spanDays('2026-05-10', '2026-05-01')).toBe(0);
  });
});

describe('clampDay', () => {
  it('returns the day unchanged when within range', () => {
    expect(clampDay('2026-05-10', '2026-05-01', '2026-05-31')).toBe('2026-05-10');
  });

  it('clamps to min when day is before min', () => {
    expect(clampDay('2026-04-20', '2026-05-01', '2026-05-31')).toBe('2026-05-01');
  });

  it('clamps to max when day is after max', () => {
    expect(clampDay('2026-06-15', '2026-05-01', '2026-05-31')).toBe('2026-05-31');
  });

  it('returns min when day equals min', () => {
    expect(clampDay('2026-05-01', '2026-05-01', '2026-05-31')).toBe('2026-05-01');
  });
});

describe('shiftRangeBy', () => {
  const START = '2026-05-05';
  const END = '2026-05-15';

  it('moves plannedStart forward by delta when caretMode is start', () => {
    const result = shiftRangeBy(START, END, 'start', 3);
    expect(result).toEqual({ plannedStart: '2026-05-08', plannedEnd: END });
  });

  it('moves plannedStart backward by delta', () => {
    const result = shiftRangeBy(START, END, 'start', -2);
    expect(result).toEqual({ plannedStart: '2026-05-03', plannedEnd: END });
  });

  it('moves plannedEnd forward by delta when caretMode is end', () => {
    const result = shiftRangeBy(START, END, 'end', 5);
    expect(result).toEqual({ plannedStart: START, plannedEnd: '2026-05-20' });
  });

  it('returns null when start shift makes start pass end', () => {
    expect(shiftRangeBy(START, END, 'start', 20)).toBeNull();
  });

  it('returns null when end shift makes end before start', () => {
    expect(shiftRangeBy(START, END, 'end', -20)).toBeNull();
  });

  it('allows start to equal end after shift', () => {
    const result = shiftRangeBy(START, END, 'start', 10);
    expect(result).toEqual({ plannedStart: END, plannedEnd: END });
  });
});
