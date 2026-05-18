import { useCallback, useReducer, useRef } from 'react';
import type { DateWindow } from '../../ganttMath';
import { computePreviewRange, coerceClickToCommit, pointerXToDay } from './stageBarDragMath';

type DragStatus = 'idle' | 'dragging' | 'committing' | 'error';

interface DragState {
  status: DragStatus;
  anchorDay: string | null;
  cursorDay: string | null;
  previewStart: string | null;
  previewEnd: string | null;
  errorMessage: string | null;
}

type DragAction =
  | { type: 'BEGIN'; anchorDay: string }
  | { type: 'MOVE'; cursorDay: string }
  | { type: 'COMMIT' }
  | { type: 'COMMITTED' }
  | { type: 'FAIL'; message: string }
  | { type: 'CANCEL' };

const INITIAL: DragState = {
  status: 'idle',
  anchorDay: null,
  cursorDay: null,
  previewStart: null,
  previewEnd: null,
  errorMessage: null,
};

function reducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'BEGIN': {
      return {
        ...INITIAL,
        status: 'dragging',
        anchorDay: action.anchorDay,
        cursorDay: action.anchorDay,
        previewStart: action.anchorDay,
        previewEnd: action.anchorDay,
      };
    }
    case 'MOVE': {
      if (state.status !== 'dragging' || state.anchorDay == null) return state;
      const range = computePreviewRange(state.anchorDay, action.cursorDay);
      return {
        ...state,
        cursorDay: action.cursorDay,
        previewStart: range.plannedStart,
        previewEnd: range.plannedEnd,
      };
    }
    case 'COMMIT': {
      if (state.status !== 'dragging') return state;
      return { ...state, status: 'committing' };
    }
    case 'COMMITTED': {
      return INITIAL;
    }
    case 'FAIL': {
      return { ...state, status: 'error', errorMessage: action.message };
    }
    case 'CANCEL': {
      return INITIAL;
    }
  }
}

export interface UseStageBarDragOptions {
  plannedStart: string | null | undefined;
  plannedEnd: string | null | undefined;
  loadedRange: DateWindow;
  dayPx: number;
  disabled?: boolean;
  onSave: (range: { plannedStart: string | null; plannedEnd: string | null }) => Promise<void>;
  onAnnounce?: (message: string) => void;
  announceCommitted: (start: string, end: string) => string;
  announceCancelled: () => string;
}

export interface UseStageBarDragResult {
  dragState: DragState;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onDragKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export function useStageBarDrag(opts: UseStageBarDragOptions): UseStageBarDragResult {
  const {
    plannedStart,
    plannedEnd,
    loadedRange,
    dayPx,
    disabled = false,
    onSave,
    onAnnounce,
    announceCommitted,
    announceCancelled,
  } = opts;

  const [dragState, dispatch] = useReducer(reducer, INITIAL);
  const containerRectRef = useRef<DOMRect | null>(null);

  const getDay = useCallback(
    (e: React.PointerEvent<HTMLElement>): string => {
      const rect = containerRectRef.current ?? (e.currentTarget as HTMLElement).getBoundingClientRect();
      containerRectRef.current = rect;
      return pointerXToDay(
        e.clientX,
        rect.left,
        loadedRange.start,
        loadedRange.end,
        dayPx,
      );
    },
    [loadedRange.start, loadedRange.end, dayPx],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      containerRectRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickedDay = getDay(e);

      if (plannedStart != null && plannedEnd != null) {
        dispatch({ type: 'BEGIN', anchorDay: clickedDay });
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      dispatch({ type: 'BEGIN', anchorDay: clickedDay });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disabled, getDay, plannedStart, plannedEnd],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (dragState.status !== 'dragging') return;
      const day = getDay(e);
      dispatch({ type: 'MOVE', cursorDay: day });
    },
    [dragState.status, getDay],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (dragState.status === 'committing') return;
      if (dragState.status !== 'dragging') return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const day = getDay(e);

      const anchor = dragState.anchorDay;

      let rangeToCommit: { plannedStart: string | null; plannedEnd: string | null };

      if (anchor == null) {
        dispatch({ type: 'CANCEL' });
        return;
      }

      if (plannedStart != null && plannedEnd != null) {
        rangeToCommit = coerceClickToCommit(plannedStart, plannedEnd, day);
      } else {
        const { plannedStart: ps, plannedEnd: pe } = computePreviewRange(anchor, day);
        rangeToCommit = { plannedStart: ps, plannedEnd: pe };
      }

      dispatch({ type: 'COMMIT' });

      onSave(rangeToCommit).then(
        () => {
          dispatch({ type: 'COMMITTED' });
          if (
            onAnnounce &&
            rangeToCommit.plannedStart != null &&
            rangeToCommit.plannedEnd != null
          ) {
            onAnnounce(announceCommitted(rangeToCommit.plannedStart, rangeToCommit.plannedEnd));
          }
        },
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Save failed';
          dispatch({ type: 'FAIL', message: msg });
        },
      );
    },
    [
      dragState.status,
      dragState.anchorDay,
      getDay,
      plannedStart,
      plannedEnd,
      onSave,
      onAnnounce,
      announceCommitted,
    ],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (dragState.status !== 'dragging' && dragState.status !== 'committing') return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      dispatch({ type: 'CANCEL' });
      if (onAnnounce) onAnnounce(announceCancelled());
    },
    [dragState.status, onAnnounce, announceCancelled],
  );

  const onDragKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (dragState.status !== 'dragging') return;
      if (e.key !== 'Escape') return;
      e.preventDefault();
      dispatch({ type: 'CANCEL' });
      if (onAnnounce) onAnnounce(announceCancelled());
    },
    [dragState.status, onAnnounce, announceCancelled],
  );

  return { dragState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDragKeyDown };
}
