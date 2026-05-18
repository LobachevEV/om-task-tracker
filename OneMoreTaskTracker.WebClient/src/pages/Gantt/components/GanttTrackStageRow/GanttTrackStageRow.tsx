import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type {
  FeatureTrack,
  FeatureTrackKind,
  FeatureTrackStage,
} from '../../../../common/types/featureTrack';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { formatShortDate, type DateWindow } from '../../ganttMath';
import { getTrackStageMeta } from '../../trackStageMeta';
import { computeTrackStageBars } from '../../trackStageGeometry';
import { GanttStageBar } from '../GanttStageBar';
import { StageBarDateEditor } from '../StageBarDateEditor';
import { Grid } from '../../../../common/ds/spatial';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import { GanttRow } from '../GanttRow';
import { OwnerCell } from '../RowParts/OwnerCell';
import { StageDateRange } from '../RowParts/StageDateRange';
import './GanttTrackStageRow.css';

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
      dataTestId={`stage-bar-editor-${track.featureId}-${kind}-${stage.stageKey}`}
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
      lane={<div aria-hidden="true">{barNode}</div>}
      laneClassName="gantt-track-stage-row__lane"
    />
  );
}
