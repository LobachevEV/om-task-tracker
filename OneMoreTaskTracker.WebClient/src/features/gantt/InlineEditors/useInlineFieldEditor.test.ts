import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import { ApiError } from '../../../shared/api/ApiError';

describe('useInlineFieldEditor', () => {
  it('initial status is idle and draft mirrors committed', () => {
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'Hello', onSave: vi.fn() }),
    );
    expect(result.current.draft).toBe('Hello');
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('commit does not call onSave when the draft matches committed', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'Hello', onSave }),
    );
    await act(() => result.current.commit());
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('commit calls onSave with the current draft and flips status through pending → idle', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'Hello', onSave }),
    );
    act(() => result.current.setDraft('World'));
    expect(result.current.draft).toBe('World');
    await act(() => result.current.commit());
    expect(onSave).toHaveBeenCalledWith('World');
    expect(result.current.status).toBe('idle');
  });

  it('rolls back draft and surfaces error when onSave throws', async () => {
    const onSave = vi.fn().mockRejectedValue(new ApiError(500, 'boom'));
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'Hello', onSave }),
    );
    act(() => result.current.setDraft('Bad'));
    await act(() => result.current.commit());
    expect(result.current.status).toBe('error');
    expect(result.current.draft).toBe('Hello');
    expect(result.current.error?.kind).toBe('network');
  });

  it('maps ApiError(409) to a conflict-kind InlineEditorError', async () => {
    const onSave = vi.fn().mockRejectedValue(
      new ApiError(409, 'Version conflict', { kind: 'version', currentVersion: 9 }),
    );
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'A', onSave }),
    );
    act(() => result.current.setDraft('B'));
    await act(() => result.current.commit());
    expect(result.current.error?.kind).toBe('conflict');
    expect(result.current.error?.conflict?.currentVersion).toBe(9);
  });

  it('cancel reverts draft to the last committed value', () => {
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'Hello', onSave: vi.fn() }),
    );
    act(() => result.current.setDraft('Typing'));
    expect(result.current.draft).toBe('Typing');
    act(() => result.current.cancel());
    expect(result.current.draft).toBe('Hello');
    expect(result.current.status).toBe('idle');
  });

  it('preserves the rejected draft and re-fires it via retry()', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'A', onSave }),
    );
    act(() => result.current.setDraft('B'));
    await act(() => result.current.commit());
    expect(result.current.status).toBe('error');
    expect(result.current.draft).toBe('A');
    expect(result.current.lastRejectedDraft).toEqual({ value: 'B' });

    await act(() => result.current.retry());
    expect(onSave).toHaveBeenNthCalledWith(2, 'B');
    expect(result.current.status).toBe('idle');
    expect(result.current.lastRejectedDraft).toBeNull();
  });

  it('cancel clears the lastRejectedDraft', async () => {
    const onSave = vi.fn().mockRejectedValue(new ApiError(500, 'boom'));
    const { result } = renderHook(() =>
      useInlineFieldEditor({ committed: 'A', onSave }),
    );
    act(() => result.current.setDraft('B'));
    await act(() => result.current.commit());
    expect(result.current.lastRejectedDraft).toEqual({ value: 'B' });
    act(() => result.current.cancel());
    expect(result.current.lastRejectedDraft).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('client-side validation blocks the network call and surfaces the message', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useInlineFieldEditor({
        committed: 'Hello',
        onSave,
        validate: (next) => (next.trim() === '' ? "Title can't be empty" : null),
      }),
    );
    act(() => result.current.setDraft(''));
    await act(() => result.current.commit());
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.error?.kind).toBe('validation');
    expect(result.current.error?.message).toBe("Title can't be empty");
    // Draft rolled back to committed.
    expect(result.current.draft).toBe('Hello');
  });
});
