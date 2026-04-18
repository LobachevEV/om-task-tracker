import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatLastActiveRu } from './time';

describe('formatLastActiveRu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "—" for null', () => {
    expect(formatLastActiveRu(null)).toBe('—');
  });

  it('formats minutes ago (< 60 minutes)', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-18T11:45:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('15 мин назад');
  });

  it('formats hours ago (< 24 hours)', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-18T08:00:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('4 ч назад');
  });

  it('formats yesterday (exactly 24 hours ago)', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-17T12:00:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('вчера');
  });

  it('formats days ago (> 24 hours)', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-15T12:00:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('3 дн назад');
  });

  it('formats edge case: 23 hours 59 minutes ago as hours', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-17T12:01:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('23 ч назад');
  });

  it('formats edge case: 59 minutes ago as minutes', () => {
    const now = new Date('2026-04-18T12:00:00Z');
    vi.setSystemTime(now);

    const then = new Date('2026-04-18T11:01:00Z');
    expect(formatLastActiveRu(then.toISOString())).toBe('59 мин назад');
  });
});
