import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DateWindow } from '../../ganttMath';
import { dateToPixel } from '../../ganttMath';
import type { FeatureTrackKind, FeatureTrackStageKey } from '../../../../common/types/featureTrack';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import { useStageBarDrag } from './useStageBarDrag';
import { useStageBarKeyboardMode } from './useStageBarKeyboardMode';
import { StageBarDragPreview } from './StageBarDragPreview';
import { spanDays } from './stageBarDragMath';
import './StageBarDateEditor.css';

export interface StageBarDateEditorProps {
  featureId: number;
  kind: FeatureTrackKind;
  stageKey: FeatureTrackStageKey;
  stageVersion: number;
  plannedStart: string | null | undefined;
  plannedEnd: string | null | undefined;
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
  tokenVar: string;
  mutations: TrackMutationCallbacks;
  ariaLabel: string;
  onAnnounce?: (message: string) => void;
  children: ReactNode;
  dataTestId: string;
}

export function StageBarDateEditor({
  featureId,
  kind,
  stageKey,
  stageVersion,
  plannedStart,
  plannedEnd,
  today,
  loadedRange,
  dayPx,
  tokenVar,
  mutations,
  ariaLabel,
  onAnnounce,
  children,
  dataTestId,
}: StageBarDateEditorProps) {
  const { t, i18n } = useTranslation('gantt');
  const locale = i18n.language || 'en';

  const onSave = async (range: { plannedStart: string | null; plannedEnd: string | null }) => {
    const startChanged = range.plannedStart !== (plannedStart ?? null);
    const endChanged = range.plannedEnd !== (plannedEnd ?? null);
    if (startChanged && !endChanged) {
      await mutations.saveTrackStagePlannedStart(featureId, kind, stageKey, range.plannedStart, stageVersion);
    } else if (!startChanged && endChanged) {
      await mutations.saveTrackStagePlannedEnd(featureId, kind, stageKey, range.plannedEnd, stageVersion);
    } else {
      await mutations.saveTrackStageRange(featureId, kind, stageKey, range, stageVersion);
    }
  };

  const announceCommitted = (start: string, end: string) => {
    const days = spanDays(start, end);
    return t('stageBarEditor.announce.rangeSet', {
      defaultValue: 'Date range set: {{start}} to {{end}}, {{count}} day.',
      defaultValue_other: 'Date range set: {{start}} to {{end}}, {{count}} days.',
      start,
      end,
      count: days,
    });
  };

  const announceCancelled = () =>
    t('stageBarEditor.announce.cancelled', { defaultValue: 'Date selection cancelled.' });

  const { dragState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDragKeyDown } =
    useStageBarDrag({
      plannedStart,
      plannedEnd,
      loadedRange,
      dayPx,
      onSave,
      onAnnounce,
      announceCommitted,
      announceCancelled,
    });

  const { kbState, onKeyDown } = useStageBarKeyboardMode({
    plannedStart,
    plannedEnd,
    today,
    loadedRangeEnd: loadedRange.end,
    onSave,
    onAnnounce,
    announceCommitted: (start, end) => {
      if (start == null || end == null) {
        return t('stageBarEditor.announce.rangeCleared', {
          defaultValue: 'Date range cleared.',
        });
      }
      return announceCommitted(start, end);
    },
  });

  const hasDates = plannedStart != null && plannedEnd != null;
  const isDragging = dragState.status === 'dragging';
  const isCommitting = dragState.status === 'committing' || kbState.phase === 'committing';

  let dataState: string = kbState.phase !== 'idle' ? `kb-${kbState.phase}` : dragState.status;
  if (isCommitting) dataState = 'committing';

  const showPreview =
    isDragging &&
    dragState.previewStart != null &&
    dragState.previewEnd != null;

  const showKbCaret =
    kbState.phase !== 'idle' &&
    kbState.phase !== 'committing' &&
    kbState.caretDay != null;

  const previewChip = (() => {
    if (!showPreview || !dragState.previewStart || !dragState.previewEnd) return '';
    const days = spanDays(dragState.previewStart, dragState.previewEnd);

    const startFmt = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const startDate = new Date(dragState.previewStart + 'T00:00:00Z');
    const endDate = new Date(dragState.previewEnd + 'T00:00:00Z');
    const startLabel = startFmt.format(startDate);
    const endLabel = startFmt.format(endDate);

    return `${startLabel} → ${endLabel} · ${days}d`;
  })();

  const kbCaretStyle: CSSProperties | undefined = showKbCaret
    ? {
        left: dateToPixel(loadedRange.start, kbState.caretDay!, dayPx),
      }
    : undefined;

  const showDeleteConfirm = kbState.phase === 'awaitDeleteConfirm';

  const kbHint = (() => {
    if (kbState.phase === 'selectStart') {
      return t('stageBarEditor.kb.pickStart', { defaultValue: 'Arrow keys to move · Enter to set start' });
    }
    if (kbState.phase === 'selectEnd') {
      return t('stageBarEditor.kb.pickEnd', { defaultValue: 'Arrow keys to move · Enter to set end' });
    }
    if (kbState.phase === 'rewrite') {
      return t('stageBarEditor.kb.rewrite', { defaultValue: 'Arrow keys to adjust · Enter to confirm · Del to clear' });
    }
    if (kbState.phase === 'awaitDeleteConfirm') {
      return t('stageBarEditor.kb.confirmDelete', { defaultValue: 'Enter to clear dates · Esc to cancel' });
    }
    return null;
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      className="stage-bar-date-editor"
      aria-label={ariaLabel}
      data-testid={dataTestId}
      data-state={dataState}
      data-has-dates={hasDates ? 'true' : 'false'}
      data-planned-start={plannedStart ?? undefined}
      data-planned-end={plannedEnd ?? undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => {
        onDragKeyDown(e);
        if (!e.defaultPrevented) onKeyDown(e);
      }}
    >
      {children}
      {showPreview && (
        <StageBarDragPreview
          previewStart={dragState.previewStart!}
          previewEnd={dragState.previewEnd!}
          loadedRange={loadedRange}
          dayPx={dayPx}
          tokenVar={tokenVar}
          chip={previewChip}
        />
      )}
      {showKbCaret && (
        <div
          className="stage-bar-kb-caret"
          style={kbCaretStyle}
          aria-hidden="true"
          data-testid="stage-bar-kb-caret"
        />
      )}
      {kbHint != null && kbState.phase !== 'idle' && (
        <span className="stage-bar-date-editor__kb-hint" aria-live="polite">
          {kbHint}
        </span>
      )}
      {showDeleteConfirm && (
        <div
          className="stage-bar-date-editor__delete-confirm"
          aria-live="assertive"
        >
          {t('stageBarEditor.kb.confirmDeleteLabel', { defaultValue: 'Enter to clear' })}
        </div>
      )}
    </div>
  );
}
