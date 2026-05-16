import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GanttTimelineScroller } from '../../../src/pages/Gantt/components/GanttTimelineScroller';
import { respectMotionPref } from '../../../src/pages/Gantt/useGanttTimelineScroll';

describe('GanttTimelineScroller today chip — click handler does not forward the event', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onJumpToToday with no arguments when the chip is clicked', () => {
    const onJumpToToday = vi.fn();

    render(
      <GanttTimelineScroller
        contentWidthPx={5000}
        todayPx={2500}
        onJumpToToday={onJumpToToday}
      >
        <div />
      </GanttTimelineScroller>,
    );

    const chip = screen.getByRole('button');
    fireEvent.click(chip);

    expect(onJumpToToday).toHaveBeenCalledTimes(1);
    expect(onJumpToToday).toHaveBeenCalledWith();
  });

  it('does not forward the MouseEvent object to onJumpToToday', () => {
    const onJumpToToday = vi.fn();

    render(
      <GanttTimelineScroller
        contentWidthPx={5000}
        todayPx={2500}
        onJumpToToday={onJumpToToday}
      >
        <div />
      </GanttTimelineScroller>,
    );

    const chip = screen.getByRole('button');
    fireEvent.click(chip);

    const firstArg = onJumpToToday.mock.calls[0]?.[0];
    expect(firstArg).toBeUndefined();
  });
});

describe('respectMotionPref — allowlist coercion', () => {
  it('returns motion-pref default for a MouseEvent-like object', () => {
    const result = respectMotionPref({ type: 'click', target: null });
    expect(['auto', 'smooth', 'instant']).toContain(result);
  });

  it('returns motion-pref default for null', () => {
    const result = respectMotionPref(null);
    expect(['auto', 'smooth', 'instant']).toContain(result);
  });

  it('returns motion-pref default for 0', () => {
    const result = respectMotionPref(0);
    expect(['auto', 'smooth', 'instant']).toContain(result);
  });

  it('returns motion-pref default for an invalid string', () => {
    const result = respectMotionPref('invalid');
    expect(['auto', 'smooth', 'instant']).toContain(result);
  });

  it('returns motion-pref default for a plain object', () => {
    const result = respectMotionPref({});
    expect(['auto', 'smooth', 'instant']).toContain(result);
  });

  it('round-trips "smooth" correctly', () => {
    expect(respectMotionPref('smooth')).toBe('smooth');
  });

  it('round-trips "auto" correctly', () => {
    expect(respectMotionPref('auto')).toBe('auto');
  });

  it('round-trips "instant" correctly', () => {
    expect(respectMotionPref('instant')).toBe('instant');
  });
});
