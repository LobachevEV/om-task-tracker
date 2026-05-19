import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type {
  FeatureTrack,
  FeatureTrackKind,
  FeatureTrackStage,
} from '../../../../common/types/featureTrack';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { dateToPixel, formatShortDate, type DateWindow } from '../../ganttMath';
import { getTrackStageMeta } from '../../trackStageMeta';
import { computeTrackStageBars } from '../../trackStageGeometry';
import { GanttStageBar } from '../GanttStageBar';
import { StageBarDateEditor } from '../StageBarDateEditor';
import { Grid } from '../../../../common/ds/spatial';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import { InlineCellError } from '../InlineEditors/InlineCellError';
import type { InlineEditorError } from '../InlineEditors/InlineEditorError';
import { GanttRow } from '../GanttRow';
import { OwnerCell } from '../RowParts/OwnerCell';
import { StageDateRange } from '../RowParts/StageDateRange';
import { resolveStageSaveErrorMessage } from '../StageBarDateEditor/resolveStageSaveErrorMessage';
import { resolveStageSaveAnnounceMessage } from '../StageBarDateEditor/resolveStageSaveAnnounceMessage';
import { stageBarErrorTestId } from '../StageBarDateEditor/stageBarErrorTestId';
import './GanttTrackStageRow.css';

type SaveErrorState = {
  error: InlineEditorError;
  range: { plannedStart: string | null; plannedEnd: string | null };
  barLeftPx: number;
};

export interface GanttTrackStageRowProps {
  track: FeatureTrack;
  stage: FeatureTrackStage;
  kind: FeatureTrackKind;
  featureTitle: string;
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
  index: number;
  resolveOwner: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit?: boolean;
  mutations?: TrackMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
}

export function GanttTrackStageRow({
  track,
  stage,
  kind,
  featureTitle,
  today,
  loadedRange,
  dayPx,
  index,
  resolveOwner,
  canEdit = false,
  mutations,
  roster,
  onAnnounce,
}: GanttTrackStageRowProps) {
  const { t, i18n } = useTranslation('gantt');
  const meta = getTrackStageMeta(kind, stage.stageKey);
  const locale = i18n.language || 'en';

  const barTestId = `track-stage-bar-${track.featureId}-${kind}-${stage.stageKey}`;

  const [saveErrorState, setSaveErrorState] = useState<SaveErrorState | null>(null);
  const pausedRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const restoreFocusToBarIfChipFocused = useCallback(() => {
    const ae = document.activeElement;
    const chip = document.querySelector('.inline-cell__error');
    if (chip && ae && chip.contains(ae)) {
      const bar = document.querySelector<HTMLElement>(`[data-testid="${barTestId}"]`);
      bar?.focus();
    }
  }, [barTestId]);

  const scheduleDismiss = useCallback(() => {
    clearDismissTimer();
    dismissTimerRef.current = window.setTimeout(() => {
      if (!pausedRef.current) {
        setSaveErrorState(null);
        restoreFocusToBarIfChipFocused();
      }
    }, 4000);
  }, [clearDismissTimer, restoreFocusToBarIfChipFocused]);

  const clearError = useCallback(() => {
    clearDismissTimer();
    setSaveErrorState(null);
  }, [clearDismissTimer]);

  const clearErrorSync = useCallback(() => {
    flushSync(() => {
      clearDismissTimer();
      setSaveErrorState(null);
    });
  }, [clearDismissTimer]);

  const handleAnchorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      clearError();
      const bar = document.querySelector<HTMLElement>(`[data-testid="${barTestId}"]`);
      bar?.focus();
    },
    [clearError, barTestId],
  );

  // Clean up timer on unmount.
  useEffect(() => clearDismissTimer, [clearDismissTimer]);

  const stageName = t(meta.ariaKey, { defaultValue: stage.stageKey });

  const bars = computeTrackStageBars(loadedRange, track, today, dayPx);
  const barEntry = bars[index] ?? null;

  const shortStart = stage.plannedStart ? formatShortDate(stage.plannedStart, locale) : '—';
  const shortEnd = stage.plannedEnd ? formatShortDate(stage.plannedEnd, locale) : '—';

  const hasOwnerId = stage.stageOwnerUserId != null;
  const inheritedOwner = !hasOwnerId ? resolveOwner(track.trackOwnerUserId) : undefined;
  const hideDates =
    !hasOwnerId &&
    inheritedOwner == null &&
    !stage.plannedStart &&
    !stage.plannedEnd;

  const barGeometry = barEntry && (barEntry.bar ?? barEntry.ghost) ? (barEntry.bar ?? barEntry.ghost)! : null;

  const handleFail = useCallback(
    (error: InlineEditorError, range: { plannedStart: string | null; plannedEnd: string | null }) => {
      const anchor = range.plannedStart ?? range.plannedEnd;
      const barLeftPx = Math.max(
        0,
        anchor != null
          ? dateToPixel(loadedRange.start, anchor, dayPx)
          : barGeometry?.leftPx ?? dateToPixel(loadedRange.start, today, dayPx),
      );
      setSaveErrorState({ error, range, barLeftPx });
      scheduleDismiss();
      if (onAnnounce) onAnnounce(resolveStageSaveAnnounceMessage(error, t));
    },
    [barGeometry, loadedRange.start, today, dayPx, scheduleDismiss, onAnnounce, t],
  );

  const barVisual = barGeometry ? (
    <GanttStageBar
      bar={barGeometry}
      status={barEntry!.status}
      tokenVar={meta.tokenVar}
      stripeAxis={meta.stripeAxis}
      ariaLabel={`${stageName}: ${shortStart} – ${shortEnd}`}
      dataTestId={`stage-bar-${track.featureId}-${kind}-${stage.stageKey}`}
    />
  ) : null;

  const barNode = canEdit && mutations && barGeometry ? (
    <StageBarDateEditor
      featureId={track.featureId}
      kind={kind}
      stageKey={stage.stageKey}
      stageVersion={stage.stageVersion}
      plannedStart={stage.plannedStart}
      plannedEnd={stage.plannedEnd}
      today={today}
      loadedRange={loadedRange}
      dayPx={dayPx}
      tokenVar={meta.tokenVar}
      mutations={mutations}
      ariaLabel={t('stageBarEditor.ariaLabel', {
        defaultValue: 'Set date range for {{stage}} stage of "{{title}}"',
        stage: stageName,
        title: featureTitle,
      })}
      onAnnounce={onAnnounce}
      onFail={handleFail}
      onClearError={clearErrorSync}
      dataTestId={`track-stage-bar-${track.featureId}-${kind}-${stage.stageKey}`}
    >
      {barVisual}
    </StageBarDateEditor>
  ) : barVisual;

  return (
    <GanttRow
      className="gantt-track-stage-row"
      gutterClassName="gantt-track-stage-row__gutter"
      data-testid={`track-stage-row-${track.featureId}-${kind}-${stage.stageKey}`}
      data-kind={kind.toLowerCase()}
      gutter={
        <Grid columns="var(--gantt-row-columns)" className="gantt-row__grid">
          <span
            className="gantt-track-stage-row__name"
            aria-hidden="true"
            style={{ color: `var(${meta.tokenVar})` }}
          >
            {stageName}
          </span>
          <span className="gantt-track-stage-row__owner" data-testid="track-stage-owner">
            <OwnerCell
              stageOwnerUserId={stage.stageOwnerUserId}
              inheritedOwnerUserId={track.trackOwnerUserId}
              resolveOwner={resolveOwner}
              plannedStart={stage.plannedStart}
              plannedEnd={stage.plannedEnd}
              canEdit={canEdit}
              mutations={
                mutations
                  ? {
                      saveOwner: (next) =>
                        mutations.saveTrackStageOwner(
                          track.featureId,
                          kind,
                          stage.stageKey,
                          next,
                          stage.stageVersion,
                        ),
                    }
                  : undefined
              }
              roster={roster}
              onAnnounce={onAnnounce}
              buildAnnouncement={(outcome) =>
                outcome === 'saved'
                  ? t('inlineEdit.announce.ownerSaved', {
                      defaultValue: '{{stage}} stage owner saved.',
                      stage: stageName,
                    })
                  : t('inlineEdit.announce.ownerError', {
                      defaultValue: '{{stage}} stage owner change was rejected.',
                      stage: stageName,
                    })
              }
              ariaLabel={t('inlineEdit.ownerAria', {
                defaultValue: 'Owner for {{stage}} stage of "{{title}}"',
                stage: stageName,
                title: featureTitle,
              })}
              testId={`track-stage-owner-${track.featureId}-${kind}-${stage.stageKey}`}
              removedLabel={t('row.removed')}
              inheritedSuffixLabel={t('tracks.row.inheritedOwnerSuffix', { defaultValue: '· по треку' })}
            />
          </span>
          {!hideDates && (
            <StageDateRange
              featureId={track.featureId}
              kind={kind}
              stageKey={stage.stageKey}
              stageVersion={stage.stageVersion}
              plannedStart={stage.plannedStart}
              plannedEnd={stage.plannedEnd}
              today={today}
              locale={locale}
              featureTitle={featureTitle}
              stageName={stageName}
              canEdit={false}
              onAnnounce={onAnnounce}
            />
          )}
        </Grid>
      }
      lane={
        <>
          <div aria-hidden="true">{barNode}</div>
          {saveErrorState != null && (
            <div
              className="gantt-track-stage-row__error-chip-anchor"
              style={{ left: saveErrorState.barLeftPx }}
              onMouseEnter={() => { pausedRef.current = true; clearDismissTimer(); }}
              onFocus={() => { pausedRef.current = true; clearDismissTimer(); }}
              onMouseLeave={() => { pausedRef.current = false; scheduleDismiss(); }}
              onBlur={() => { pausedRef.current = false; scheduleDismiss(); }}
              onKeyDown={handleAnchorKeyDown}
            >
              <InlineCellError
                error={saveErrorState.error}
                resolveMessage={(err) => resolveStageSaveErrorMessage(err, t)}
                onRetry={saveErrorState.error.kind !== 'validation' && mutations ? () => {
                  const range = saveErrorState.range;
                  clearError();
                  const startChanged = range.plannedStart !== (stage.plannedStart ?? null);
                  const endChanged = range.plannedEnd !== (stage.plannedEnd ?? null);
                  if (startChanged && !endChanged) {
                    void mutations.saveTrackStagePlannedStart(track.featureId, kind, stage.stageKey, range.plannedStart, stage.stageVersion).catch(() => { /* retry failure silent */ });
                  } else if (!startChanged && endChanged) {
                    void mutations.saveTrackStagePlannedEnd(track.featureId, kind, stage.stageKey, range.plannedEnd, stage.stageVersion).catch(() => { /* retry failure silent */ });
                  } else {
                    void mutations.saveTrackStageRange(track.featureId, kind, stage.stageKey, range, stage.stageVersion).catch(() => { /* retry failure silent */ });
                  }
                } : undefined}
                onRevert={() => { clearError(); restoreFocusToBarIfChipFocused(); }}
                testId={stageBarErrorTestId(track.featureId, kind, stage.stageKey)}
              />
            </div>
          )}
        </>
      }
      laneClassName={`gantt-track-stage-row__lane${saveErrorState != null ? ' gantt-track-stage-row__lane--has-chip' : ''}`}
    />
  );
}
