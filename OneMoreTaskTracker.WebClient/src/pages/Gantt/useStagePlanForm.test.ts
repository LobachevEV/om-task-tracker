import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  fromDraft,
  toDraft,
  useStagePlanForm,
} from './useStagePlanForm';
import type { FeatureStagePlan } from '../../common/types/feature';
import { FEATURE_STATES } from '../../common/types/feature';

function emptyPlans(): FeatureStagePlan[] {
  return FEATURE_STATES.map((stage) => ({
    stage,
    plannedStart: null,
    plannedEnd: null,
    performerUserId: null,
    stageVersion: 0,
  }));
}

describe('useStagePlanForm', () => {
  it('toDraft materializes exactly 5 rows in canonical order even when the input is empty', () => {
    const draft = toDraft([]);
    expect(draft).toHaveLength(5);
    expect(draft.map((r) => r.stage)).toEqual(FEATURE_STATES);
    for (const row of draft) {
      expect(row.plannedStart).toBe('');
      expect(row.plannedEnd).toBe('');
      expect(row.performerUserId).toBeNull();
    }
  });

  it('fromDraft maps empty strings to null and preserves ids', () => {
    const draft = toDraft([
      { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: '2026-05-20', performerUserId: 7, stageVersion: 0 },
    ]);
    const out = fromDraft(draft);
    const dev = out.find((p) => p.stage === 'Development');
    expect(dev).toEqual({
      stage: 'Development',
      plannedStart: '2026-05-10',
      plannedEnd: '2026-05-20',
      performerUserId: 7,
      stageVersion: 0,
    });
    const cs = out.find((p) => p.stage === 'CsApproving');
    expect(cs).toEqual({
      stage: 'CsApproving',
      plannedStart: null,
      plannedEnd: null,
      performerUserId: null,
      stageVersion: 0,
    });
  });

  it('setDate produces a dirty draft', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    expect(result.current.dirty).toBe(false);
    act(() => result.current.setDate('Development', 'plannedStart', '2026-05-10'));
    expect(result.current.dirty).toBe(true);
  });

  it('flags end<start as a hard error and blocks canSubmit', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    act(() => {
      result.current.setDate('Development', 'plannedStart', '2026-05-20');
      result.current.setDate('Development', 'plannedEnd', '2026-05-10');
    });
    expect(result.current.validations.Development.dateRangeInvalid).toBe(true);
    expect(result.current.hasHardError).toBe(true);
  });

  it('computes aligned/gap/overlap continuity hints', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    act(() => {
      // CS ends 2026-05-12, Dev starts 2026-05-12 — aligned
      result.current.setDate('CsApproving', 'plannedEnd', '2026-05-12');
      result.current.setDate('Development', 'plannedStart', '2026-05-12');
      // Dev ends 2026-05-30, Testing starts 2026-06-02 — 3-day gap
      result.current.setDate('Development', 'plannedEnd', '2026-05-30');
      result.current.setDate('Testing', 'plannedStart', '2026-06-02');
      // Testing ends 2026-06-10, Ethalon starts 2026-06-08 — 2-day overlap
      result.current.setDate('Testing', 'plannedEnd', '2026-06-10');
      result.current.setDate('EthalonTesting', 'plannedStart', '2026-06-08');
    });
    const hints = result.current.continuityHints;
    expect(hints).toHaveLength(3);
    expect(hints[0].kind).toBe('aligned');
    expect(hints[0].days).toBe(0);
    expect(hints[1].kind).toBe('gap');
    expect(hints[1].days).toBe(3);
    expect(hints[2].kind).toBe('overlap');
    expect(hints[2].days).toBe(-2);
  });

  it('does not emit a continuity hint when one side of the pair is empty', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    act(() => {
      result.current.setDate('CsApproving', 'plannedEnd', '2026-05-12');
      // Dev.plannedStart intentionally empty
    });
    expect(result.current.continuityHints).toHaveLength(0);
  });

  it('toPayload emits exactly 5 entries with performer and date updates', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    act(() => {
      result.current.setDate('Development', 'plannedStart', '2026-05-10');
      result.current.setDate('Development', 'plannedEnd', '2026-05-20');
      result.current.setPerformer('Development', 42);
    });
    const out = result.current.toPayload();
    expect(out).toHaveLength(5);
    const dev = out.find((p) => p.stage === 'Development');
    expect(dev).toMatchObject({
      plannedStart: '2026-05-10',
      plannedEnd: '2026-05-20',
      performerUserId: 42,
    });
  });

  it('reset clears dirty and updates draft to new initial', () => {
    const { result } = renderHook(() => useStagePlanForm(emptyPlans()));
    act(() => result.current.setDate('Development', 'plannedStart', '2026-05-10'));
    expect(result.current.dirty).toBe(true);
    act(() =>
      result.current.reset([
        { stage: 'Development', plannedStart: '2026-05-10', plannedEnd: null, performerUserId: null, stageVersion: 0 },
      ]),
    );
    expect(result.current.dirty).toBe(false);
    expect(result.current.draft.find((r) => r.stage === 'Development')?.plannedStart).toBe(
      '2026-05-10',
    );
  });
});
