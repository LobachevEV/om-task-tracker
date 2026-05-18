import { useCallback, useReducer } from 'react';
import { addDays } from '../../ganttMath';
import { coerceClickToCommit, shiftRangeBy } from './stageBarDragMath';

type KeyboardPhase =
  | 'idle'
  | 'selectStart'
  | 'selectEnd'
  | 'rewrite'
  | 'awaitDeleteConfirm'
  | 'committing';

interface KeyboardState {
  phase: KeyboardPhase;
  draftStart: string | null;
  draftEnd: string | null;
  caretDay: string | null;
  caretMode: 'start' | 'end';
}

type KeyboardAction =
  | { type: 'OPEN_EMPTY'; today: string }
  | { type: 'OPEN_SET'; start: string; end: string }
  | { type: 'MOVE_CARET'; delta: number; start: string | null; end: string | null }
  | { type: 'SNAP_CARET'; day: string }
  | { type: 'CONFIRM_START'; day: string }
  | { type: 'CONFIRM_END'; day: string }
  | { type: 'COMMIT' }
  | { type: 'COMMITTED' }
  | { type: 'CANCEL' }
  | { type: 'REQUEST_DELETE' }
  | { type: 'CONFIRM_DELETE' };

const INITIAL: KeyboardState = {
  phase: 'idle',
  draftStart: null,
  draftEnd: null,
  caretDay: null,
  caretMode: 'end',
};

function reducer(state: KeyboardState, action: KeyboardAction): KeyboardState {
  switch (action.type) {
    case 'OPEN_EMPTY': {
      return {
        ...INITIAL,
        phase: 'selectStart',
        caretDay: action.today,
        caretMode: 'start',
        draftStart: null,
        draftEnd: null,
      };
    }
    case 'OPEN_SET': {
      return {
        ...INITIAL,
        phase: 'rewrite',
        draftStart: action.start,
        draftEnd: action.end,
        caretDay: action.end,
        caretMode: 'end',
      };
    }
    case 'MOVE_CARET': {
      if (state.phase === 'idle') return state;
      const base = state.caretDay ?? action.start ?? action.end;
      if (base == null) return state;
      const next = addDays(base, action.delta);

      if (state.phase === 'rewrite' && state.draftStart != null && state.draftEnd != null) {
        const shifted = shiftRangeBy(state.draftStart, state.draftEnd, state.caretMode, action.delta);
        if (shifted == null) return state;
        return {
          ...state,
          draftStart: shifted.plannedStart,
          draftEnd: shifted.plannedEnd,
          caretDay: state.caretMode === 'start' ? shifted.plannedStart : shifted.plannedEnd,
        };
      }

      return { ...state, caretDay: next };
    }
    case 'SNAP_CARET': {
      if (state.phase === 'idle') return state;
      return { ...state, caretDay: action.day };
    }
    case 'CONFIRM_START': {
      if (state.phase !== 'selectStart') return state;
      return {
        ...state,
        phase: 'selectEnd',
        draftStart: action.day,
        caretDay: action.day,
        caretMode: 'end',
      };
    }
    case 'CONFIRM_END': {
      if (state.phase !== 'selectEnd') return state;
      if (state.draftStart == null) return state;
      const end = action.day;
      const start = state.draftStart;
      const finalStart = start <= end ? start : end;
      const finalEnd = start <= end ? end : start;
      return {
        ...state,
        phase: 'committing',
        draftStart: finalStart,
        draftEnd: finalEnd,
      };
    }
    case 'COMMIT': {
      return { ...state, phase: 'committing' };
    }
    case 'COMMITTED': {
      return INITIAL;
    }
    case 'CANCEL': {
      return INITIAL;
    }
    case 'REQUEST_DELETE': {
      return { ...state, phase: 'awaitDeleteConfirm' };
    }
    case 'CONFIRM_DELETE': {
      return { ...state, phase: 'committing', draftStart: null, draftEnd: null };
    }
  }
}

export interface UseStageBarKeyboardModeOptions {
  plannedStart: string | null | undefined;
  plannedEnd: string | null | undefined;
  today: string;
  loadedRangeEnd?: string;
  disabled?: boolean;
  onSave: (range: { plannedStart: string | null; plannedEnd: string | null }) => Promise<void>;
  onAnnounce?: (message: string) => void;
  announceCommitted: (start: string | null, end: string | null) => string;
}

export interface UseStageBarKeyboardModeResult {
  kbState: KeyboardState;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export function useStageBarKeyboardMode(
  opts: UseStageBarKeyboardModeOptions,
): UseStageBarKeyboardModeResult {
  const {
    plannedStart,
    plannedEnd,
    today,
    loadedRangeEnd,
    disabled = false,
    onSave,
    onAnnounce,
    announceCommitted,
  } = opts;

  const [kbState, dispatch] = useReducer(reducer, INITIAL);

  const commitDraft = useCallback(
    (start: string | null, end: string | null) => {
      dispatch({ type: 'COMMIT' });
      onSave({ plannedStart: start, plannedEnd: end }).then(
        () => {
          dispatch({ type: 'COMMITTED' });
          if (onAnnounce) onAnnounce(announceCommitted(start, end));
        },
        () => {
          dispatch({ type: 'CANCEL' });
        },
      );
    },
    [onSave, onAnnounce, announceCommitted],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (disabled) return;

      const { key } = e;
      const { phase } = kbState;

      if (phase === 'committing') return;

      if (phase === 'idle') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          if (plannedStart != null && plannedEnd != null) {
            dispatch({ type: 'OPEN_SET', start: plannedStart, end: plannedEnd });
          } else {
            dispatch({ type: 'OPEN_EMPTY', today });
          }
        }
        return;
      }

      if (key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'CANCEL' });
        return;
      }

      if (key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -7 : -1;
        dispatch({ type: 'MOVE_CARET', delta, start: plannedStart ?? null, end: plannedEnd ?? null });
        return;
      }

      if (key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 7 : 1;
        dispatch({ type: 'MOVE_CARET', delta, start: plannedStart ?? null, end: plannedEnd ?? null });
        return;
      }

      if (key === 'Home') {
        e.preventDefault();
        dispatch({ type: 'SNAP_CARET', day: today });
        return;
      }

      if (key === 'End') {
        e.preventDefault();
        if (loadedRangeEnd != null) {
          dispatch({ type: 'SNAP_CARET', day: loadedRangeEnd });
        }
        return;
      }

      if (phase === 'selectStart' && (key === 'Enter' || key === ' ')) {
        e.preventDefault();
        if (kbState.caretDay != null) {
          dispatch({ type: 'CONFIRM_START', day: kbState.caretDay });
        }
        return;
      }

      if (phase === 'selectEnd' && (key === 'Enter' || key === ' ')) {
        e.preventDefault();
        if (kbState.caretDay != null && kbState.draftStart != null) {
          dispatch({ type: 'CONFIRM_END', day: kbState.caretDay });
          const end = kbState.caretDay;
          const start = kbState.draftStart;
          const finalStart = start <= end ? start : end;
          const finalEnd = start <= end ? end : start;
          commitDraft(finalStart, finalEnd);
        }
        return;
      }

      if (phase === 'rewrite') {
        if (key === 'Tab') {
          e.preventDefault();
          dispatch({
            type: 'OPEN_SET',
            start: kbState.draftStart ?? plannedStart ?? today,
            end: kbState.draftEnd ?? plannedEnd ?? today,
          });
          return;
        }

        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          if (kbState.draftStart != null && kbState.draftEnd != null) {
            if (kbState.caretMode === 'end') {
              const result = coerceClickToCommit(
                kbState.draftStart,
                kbState.draftEnd,
                kbState.caretDay ?? kbState.draftEnd,
              );
              commitDraft(result.plannedStart, result.plannedEnd);
            } else {
              commitDraft(kbState.draftStart, kbState.draftEnd);
            }
          }
          return;
        }

        if (key === 'Delete' || key === 'Backspace') {
          e.preventDefault();
          dispatch({ type: 'REQUEST_DELETE' });
          return;
        }
      }

      if (phase === 'awaitDeleteConfirm') {
        if (key === 'Enter' || key === ' ') {
          e.preventDefault();
          dispatch({ type: 'CONFIRM_DELETE' });
          commitDraft(null, null);
          return;
        }
        if (key === 'Escape' || key === 'Delete' || key === 'Backspace') {
          e.preventDefault();
          dispatch({ type: 'CANCEL' });
          return;
        }
      }
    },
    [disabled, kbState, plannedStart, plannedEnd, today, commitDraft, loadedRangeEnd],
  );

  return { kbState, onKeyDown };
}
