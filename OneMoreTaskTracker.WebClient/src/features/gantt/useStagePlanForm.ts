import { useCallback, useMemo, useReducer } from 'react';
import { FEATURE_STATES, type FeatureState, type FeatureStagePlan } from '../../shared/types/feature';

/**
 * Draft state for the 5-row stage plan table.
 *
 * We keep date values as strings (matching the native `<input type="date">`
 * value contract) and only coerce to ISO or null when building the payload.
 * Performer is `number | null` because `null` = unassigned.
 */
export interface StageRowDraft {
  stage: FeatureState;
  plannedStart: string; // '' = not set
  plannedEnd: string;   // '' = not set
  performerUserId: number | null;
}

export type StagePlanDraft = readonly StageRowDraft[]; // length === 5

export interface StageRowValidation {
  /** `plannedEnd < plannedStart`. */
  dateRangeInvalid: boolean;
  /** `plannedEnd` is set but `plannedStart` is empty. Non-blocking. */
  missingStart: boolean;
}

export type ContinuityHintKind = 'aligned' | 'gap' | 'overlap';

export interface ContinuityHint {
  /** Stage whose `plannedEnd` anchors the hint. */
  fromStage: FeatureState;
  /** Stage whose `plannedStart` anchors the hint. */
  toStage: FeatureState;
  kind: ContinuityHintKind;
  /** Days between fromStage.plannedEnd and toStage.plannedStart. Sign encodes kind. */
  days: number;
  /** ISO date string the hint references for `fromStage.plannedEnd`. */
  fromDate: string;
  /** ISO date string the hint references for `toStage.plannedStart`. */
  toDate: string;
}

type Action =
  | { type: 'setDate'; stage: FeatureState; which: 'plannedStart' | 'plannedEnd'; value: string }
  | { type: 'setPerformer'; stage: FeatureState; userId: number | null }
  | { type: 'reset'; draft: StagePlanDraft };

interface FormState {
  draft: StagePlanDraft;
  /** The baseline we compare against for `dirty`. Updated on `reset`. */
  baseline: StagePlanDraft;
}

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'setDate':
      return {
        ...state,
        draft: state.draft.map((row) =>
          row.stage === action.stage ? { ...row, [action.which]: action.value } : row,
        ),
      };
    case 'setPerformer':
      return {
        ...state,
        draft: state.draft.map((row) =>
          row.stage === action.stage ? { ...row, performerUserId: action.userId } : row,
        ),
      };
    case 'reset':
      return { draft: action.draft, baseline: action.draft };
  }
}

/**
 * Canonicalize an input stage plan list into a 5-row draft in the canonical
 * `FEATURE_STATES` order. If the server ever drops or reorders rows, we still
 * produce 5 stable rows keyed by stage — the table never renders <5.
 */
export function toDraft(plans: readonly FeatureStagePlan[]): StagePlanDraft {
  const byStage = new Map(plans.map((p) => [p.stage, p]));
  return FEATURE_STATES.map<StageRowDraft>((stage) => {
    const p = byStage.get(stage);
    return {
      stage,
      plannedStart: p?.plannedStart ?? '',
      plannedEnd: p?.plannedEnd ?? '',
      performerUserId: p?.performerUserId ?? null,
    };
  });
}

/** Inverse of `toDraft`: emit exactly 5 API-shaped entries. */
export function fromDraft(draft: StagePlanDraft): FeatureStagePlan[] {
  return draft.map((row) => ({
    stage: row.stage,
    plannedStart: row.plannedStart === '' ? null : row.plannedStart,
    plannedEnd: row.plannedEnd === '' ? null : row.plannedEnd,
    performerUserId: row.performerUserId,
  }));
}

function rowValidation(row: StageRowDraft): StageRowValidation {
  const start = row.plannedStart;
  const end = row.plannedEnd;
  const dateRangeInvalid = start !== '' && end !== '' && end < start;
  const missingStart = start === '' && end !== '';
  return { dateRangeInvalid, missingStart };
}

function sameDraftRow(a: StageRowDraft, b: StageRowDraft): boolean {
  return (
    a.plannedStart === b.plannedStart &&
    a.plannedEnd === b.plannedEnd &&
    a.performerUserId === b.performerUserId
  );
}

function diffDays(fromIso: string, toIso: string): number {
  // Both strings are YYYY-MM-DD; construct UTC to avoid DST slippage.
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function computeContinuityHints(draft: StagePlanDraft): ContinuityHint[] {
  const hints: ContinuityHint[] = [];
  for (let i = 0; i < draft.length - 1; i += 1) {
    const fromRow = draft[i];
    const toRow = draft[i + 1];
    const fromDate = fromRow.plannedEnd;
    const toDate = toRow.plannedStart;
    if (fromDate === '' || toDate === '') continue; // only when BOTH sides are set
    const days = diffDays(fromDate, toDate);
    let kind: ContinuityHintKind;
    if (days === 0) kind = 'aligned';
    else if (days > 0) kind = 'gap';
    else kind = 'overlap';
    hints.push({
      fromStage: fromRow.stage,
      toStage: toRow.stage,
      kind,
      days,
      fromDate,
      toDate,
    });
  }
  return hints;
}

export interface UseStagePlanFormResult {
  draft: StagePlanDraft;
  /** Per-row validation, indexed by stage. */
  validations: Readonly<Record<FeatureState, StageRowValidation>>;
  /** Adjacent-stage continuity hints (only emitted when both sides are set). */
  continuityHints: readonly ContinuityHint[];
  /** Any row has a hard validation error (blocks save). Missing-start is advisory. */
  hasHardError: boolean;
  /** True when the draft differs from `initial`. */
  dirty: boolean;
  setDate: (stage: FeatureState, which: 'plannedStart' | 'plannedEnd', value: string) => void;
  setPerformer: (stage: FeatureState, userId: number | null) => void;
  /** Reinitialize (e.g. after a successful save). */
  reset: (plans: readonly FeatureStagePlan[]) => void;
  /** Build the API-shaped 5-row array for submission. */
  toPayload: () => FeatureStagePlan[];
}

export function useStagePlanForm(
  initial: readonly FeatureStagePlan[],
): UseStagePlanFormResult {
  const [state, dispatch] = useReducer(
    reducer,
    initial,
    (i): FormState => {
      const d = toDraft(i);
      return { draft: d, baseline: d };
    },
  );
  const { draft, baseline } = state;

  const validations = useMemo(() => {
    const out = {} as Record<FeatureState, StageRowValidation>;
    for (const row of draft) out[row.stage] = rowValidation(row);
    return out;
  }, [draft]);

  const continuityHints = useMemo(() => computeContinuityHints(draft), [draft]);

  const hasHardError = useMemo(
    () => draft.some((r) => rowValidation(r).dateRangeInvalid),
    [draft],
  );

  const dirty = useMemo(() => {
    if (draft.length !== baseline.length) return true;
    for (let i = 0; i < draft.length; i += 1) {
      if (!sameDraftRow(draft[i], baseline[i])) return true;
    }
    return false;
  }, [draft, baseline]);

  const setDate = useCallback(
    (stage: FeatureState, which: 'plannedStart' | 'plannedEnd', value: string) => {
      dispatch({ type: 'setDate', stage, which, value });
    },
    [],
  );

  const setPerformer = useCallback(
    (stage: FeatureState, userId: number | null) => {
      dispatch({ type: 'setPerformer', stage, userId });
    },
    [],
  );

  const reset = useCallback((plans: readonly FeatureStagePlan[]) => {
    dispatch({ type: 'reset', draft: toDraft(plans) });
  }, []);

  const toPayload = useCallback(() => fromDraft(draft), [draft]);

  return {
    draft,
    validations,
    continuityHints,
    hasHardError,
    dirty,
    setDate,
    setPerformer,
    reset,
    toPayload,
  };
}
