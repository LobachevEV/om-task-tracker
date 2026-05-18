import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageBarKeyboardMode } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/useStageBarKeyboardMode';

const TODAY = '2026-05-18';
const START = '2026-05-05';
const END = '2026-05-15';

function makeKeyEvent(key: string): React.KeyboardEvent<HTMLElement> {
  return {
    key,
    preventDefault: vi.fn(),
    shiftKey: false,
  } as unknown as React.KeyboardEvent<HTMLElement>;
}

function setup(plannedStart: string | null = START, plannedEnd: string | null = END) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onAnnounce = vi.fn();
  const announceCommitted = vi.fn().mockReturnValue('announced');

  const { result } = renderHook(() =>
    useStageBarKeyboardMode({
      plannedStart,
      plannedEnd,
      today: TODAY,
      onSave,
      onAnnounce,
      announceCommitted,
    }),
  );

  return { result, onSave, onAnnounce, announceCommitted };
}

describe('useStageBarKeyboardMode — Delete from idle', () => {
  it('arms awaitDeleteConfirm phase on Delete from idle when dates are set', () => {
    const { result } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');
  });

  it('arms awaitDeleteConfirm phase on Backspace from idle when dates are set', () => {
    const { result } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Backspace'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');
  });

  it('does NOT arm when Delete pressed from idle with no dates', () => {
    const { result } = setup(null, null);
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    expect(result.current.kbState.phase).toBe('idle');
  });
});

describe('useStageBarKeyboardMode — Tab+Delete+Delete commits', () => {
  it('enters rewrite phase on Tab while in rewrite (re-open)', () => {
    const { result } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Enter'));
    });
    expect(result.current.kbState.phase).toBe('rewrite');
  });

  it('arms awaitDeleteConfirm from rewrite on Delete', () => {
    const { result } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Enter'));
    });
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');
  });

  it('commits (calls onSave with null/null) on second Delete from awaitDeleteConfirm', async () => {
    const { result, onSave } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');

    await act(async () => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });

    expect(onSave).toHaveBeenCalledWith({ plannedStart: null, plannedEnd: null });
  });

  it('commits on second Backspace from awaitDeleteConfirm (Tab+Backspace+Backspace)', async () => {
    const { result, onSave } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Backspace'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');

    await act(async () => {
      result.current.onKeyDown(makeKeyEvent('Backspace'));
    });

    expect(onSave).toHaveBeenCalledWith({ plannedStart: null, plannedEnd: null });
  });

  it('commits on Enter from awaitDeleteConfirm', async () => {
    const { result, onSave } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });

    await act(async () => {
      result.current.onKeyDown(makeKeyEvent('Enter'));
    });

    expect(onSave).toHaveBeenCalledWith({ plannedStart: null, plannedEnd: null });
  });
});

describe('useStageBarKeyboardMode — Tab+Delete+Escape cancels (no commit)', () => {
  it('cancels (returns to idle) on Escape from awaitDeleteConfirm', async () => {
    const { result, onSave } = setup();
    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    expect(result.current.kbState.phase).toBe('awaitDeleteConfirm');

    act(() => {
      result.current.onKeyDown(makeKeyEvent('Escape'));
    });

    expect(result.current.kbState.phase).toBe('idle');
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('useStageBarKeyboardMode — announce on commit', () => {
  it('calls onAnnounce with the result of announceCommitted after null/null commit', async () => {
    const { result, onAnnounce, announceCommitted } = setup();
    announceCommitted.mockReturnValue('Dates cleared.');

    act(() => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });
    await act(async () => {
      result.current.onKeyDown(makeKeyEvent('Delete'));
    });

    expect(announceCommitted).toHaveBeenCalledWith(null, null);
    expect(onAnnounce).toHaveBeenCalledWith('Dates cleared.');
  });
});
