import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageBarDrag } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/useStageBarDrag';
import type { UseStageBarDragOptions } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/useStageBarDrag';

const LOADED_RANGE = { start: '2026-05-01', end: '2026-05-31' };
const DAY_PX = 20;

function makePointerEvent(clientX: number): React.PointerEvent<HTMLElement> {
  const el = {
    getBoundingClientRect: () =>
      ({ left: 0, top: 0, width: 620, height: 24, right: 620, bottom: 24 } as DOMRect),
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  };
  return {
    button: 0,
    clientX,
    pointerId: 1,
    currentTarget: el,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<HTMLElement>;
}

function setup(overrides?: Partial<UseStageBarDragOptions>) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onAnnounce = vi.fn();
  const announceCommitted = vi.fn().mockImplementation((start, end) => {
    if (start == null || end == null) return 'Date range cleared.';
    return `Range set: ${start} to ${end}`;
  });
  const announceCancelled = vi.fn().mockReturnValue('Cancelled.');

  const { result } = renderHook(() =>
    useStageBarDrag({
      plannedStart: null,
      plannedEnd: null,
      loadedRange: LOADED_RANGE,
      dayPx: DAY_PX,
      onSave,
      onAnnounce,
      announceCommitted,
      announceCancelled,
      ...overrides,
    }),
  );

  return { result, onSave, onAnnounce, announceCommitted, announceCancelled };
}

describe('useStageBarDrag — null/null commit announces rangeCleared', () => {
  it('calls onAnnounce with announceCommitted(null, null) when existing bar collapses to null on pointer-up', async () => {
    const { result, onSave, onAnnounce, announceCommitted } = setup({
      plannedStart: '2026-05-10',
      plannedEnd: '2026-05-10',
    });

    // 2026-05-10 is 9 days after loadedRange.start 2026-05-01; with DAY_PX=20 that is pixel 180.
    // coerceClickToCommit: clickedDay === plannedEnd ('2026-05-10') → isOnEnd → {null, null}.
    act(() => {
      result.current.onPointerDown(makePointerEvent(180));
    });
    expect(result.current.dragState.status).toBe('dragging');

    await act(async () => {
      result.current.onPointerUp(makePointerEvent(180));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith({ plannedStart: null, plannedEnd: null });
    expect(announceCommitted).toHaveBeenCalledWith(null, null);
    expect(onAnnounce).toHaveBeenCalledWith('Date range cleared.');
  });

  it('calls onAnnounce with announceCommitted(start, end) for a normal drag commit', async () => {
    const { result, onSave, onAnnounce, announceCommitted } = setup();

    act(() => {
      result.current.onPointerDown(makePointerEvent(100));
    });
    act(() => {
      result.current.onPointerMove(makePointerEvent(300));
    });

    await act(async () => {
      result.current.onPointerUp(makePointerEvent(300));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalled();
    const savedRange = onSave.mock.calls[0][0] as { plannedStart: string | null; plannedEnd: string | null };
    expect(announceCommitted).toHaveBeenCalledWith(savedRange.plannedStart, savedRange.plannedEnd);
    expect(onAnnounce).toHaveBeenCalled();
  });

  it('does NOT call onAnnounce when onAnnounce is undefined', async () => {
    const { result, onSave, onAnnounce } = setup({
      plannedStart: '2026-05-10',
      plannedEnd: '2026-05-10',
      onAnnounce: undefined,
    });

    act(() => {
      result.current.onPointerDown(makePointerEvent(200));
    });

    await act(async () => {
      result.current.onPointerUp(makePointerEvent(200));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalled();
    expect(onAnnounce).not.toHaveBeenCalled();
  });
});

describe('useStageBarDrag — state transitions', () => {
  it('starts in idle state', () => {
    const { result } = setup();
    expect(result.current.dragState.status).toBe('idle');
  });

  it('enters dragging on pointer-down', () => {
    const { result } = setup();
    act(() => {
      result.current.onPointerDown(makePointerEvent(100));
    });
    expect(result.current.dragState.status).toBe('dragging');
  });

  it('cancels on Escape key during drag and announces cancellation', () => {
    const { result, onAnnounce, announceCancelled } = setup();
    act(() => {
      result.current.onPointerDown(makePointerEvent(100));
    });
    act(() => {
      result.current.onDragKeyDown({
        key: 'Escape',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLElement>);
    });
    expect(result.current.dragState.status).toBe('idle');
    expect(announceCancelled).toHaveBeenCalled();
    expect(onAnnounce).toHaveBeenCalledWith('Cancelled.');
  });
});
