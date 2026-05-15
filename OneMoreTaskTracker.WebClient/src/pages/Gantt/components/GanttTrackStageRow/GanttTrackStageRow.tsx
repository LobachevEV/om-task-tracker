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
import { Box, Grid } from '../../../../common/ds/spatial';
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

  const hasOwnerId = stage.stageOwnerUserId != null;
  const inheritedOwner = !hasOwnerId ? resolveOwner(track.trackOwnerUserId) : undefined;

  const bars = computeTrackStageBars(loadedRange, track, today, dayPx);
  const barEntry = bars[index] ?? null;

  const shortStart = stage.plannedStart ? formatShortDate(stage.plannedStart, locale) : '—';
  const shortEnd = stage.plannedEnd ? formatShortDate(stage.plannedEnd, locale) : '—';

  const noSignal =
    !hasOwnerId &&
    inheritedOwner == null &&
    !stage.plannedStart &&
    !stage.plannedEnd;

  const barNode =
    barEntry && (barEntry.bar || barEntry.ghost) ? (
      <GanttStageBar
        bar={(barEntry.bar ?? barEntry.ghost)!}
        status={barEntry.status}
        tokenVar={meta.tokenVar}
        stripeAxis={meta.stripeAxis}
        ariaLabel={`${stageName}: ${shortStart} – ${shortEnd}`}
      />
    ) : null;

  return (
    <GanttRow
      className="gantt-track-stage-row"
      data-testid={`track-stage-row-${track.featureId}-${kind}-${stage.stageKey}`}
      data-kind={kind.toLowerCase()}
      gutter={
        <Box className="gantt-track-stage-row__gutter-inner">
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
                noSignal={noSignal}
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
                unassignedLabel={t('row.unassigned')}
                removedLabel={t('row.removed')}
                inheritedSuffixLabel={t('tracks.row.inheritedOwnerSuffix', { defaultValue: '· по треку' })}
              />
            </span>
            {!noSignal && (
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
                canEdit={canEdit}
                mutations={mutations}
                onAnnounce={onAnnounce}
              />
            )}
          </Grid>
        </Box>
      }
      lane={<div aria-hidden="true">{barNode}</div>}
      laneClassName="gantt-track-stage-row__lane"
    />
  );
}
