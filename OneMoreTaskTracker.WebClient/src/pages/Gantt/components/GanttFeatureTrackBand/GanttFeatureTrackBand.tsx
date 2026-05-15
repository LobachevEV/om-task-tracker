import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type { FeatureTrack, FeatureTrackKind } from '../../../../common/types/featureTrack';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { DateWindow } from '../../ganttMath';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import { GanttTrackStageRow } from '../GanttTrackStageRow';
import { selectStagesForKind } from '../../selectStagesForKind';
import { Box, Grid } from '../../../../common/ds/spatial';
import { GanttRow } from '../GanttRow';
import { OwnerCell } from '../RowParts/OwnerCell';
import './GanttFeatureTrackBand.css';

export interface GanttFeatureTrackBandProps {
  track: FeatureTrack;
  kind: FeatureTrackKind;
  featureTitle: string;
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
  resolveOwner: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit?: boolean;
  mutations?: TrackMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
}

export function GanttFeatureTrackBand({
  track,
  kind,
  featureTitle,
  today,
  loadedRange,
  dayPx,
  resolveOwner,
  canEdit = false,
  mutations,
  roster,
  onAnnounce,
}: GanttFeatureTrackBandProps) {
  const { t } = useTranslation('gantt');
  const [expanded, setExpanded] = useState(true);

  const stagesForKind = useMemo(() => selectStagesForKind(track.stages, kind), [track.stages, kind]);

  const trackLabel = kind === 'Frontend'
    ? t('tracks.labelFrontend', { defaultValue: 'Front' })
    : t('tracks.labelBackend', { defaultValue: 'Back' });

  const toggleLabel = expanded
    ? t('tracks.collapseAria', { defaultValue: 'Collapse {{kind}} track', kind: trackLabel })
    : t('tracks.expandAria', { defaultValue: 'Expand {{kind}} track', kind: trackLabel });

  const inlineEnabled = canEdit && mutations != null && roster != null;
  const ownerMutations = inlineEnabled
    ? { saveOwner: (next: number | null) => next == null ? Promise.resolve() : mutations!.saveTrackOwner(track.featureId, kind, next, track.version) }
    : undefined;

  // If the stored owner ID cannot be resolved (e.g. user was removed from roster),
  // treat it as unassigned at the band level to preserve baseline read behaviour.
  const resolvedTrackOwnerId = resolveOwner(track.trackOwnerUserId) != null ? track.trackOwnerUserId : null;

  return (
    <div className="gantt-track-band" data-kind={kind.toLowerCase()} data-testid={`track-band-${track.featureId}-${kind}`}>
      <GanttRow
        className="gantt-track-band__header"
        gutterClassName="gantt-track-band__gutter"
        borderVariant="none"
        gutter={
          <Box className="gantt-track-band__gutter-inner">
            <Grid columns="28px 120px 1fr" className="gantt-track-band__grid">
              <button
                type="button"
                className="gantt-track-band__toggle"
                aria-label={toggleLabel}
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                <span className="gantt-track-band__chevron" aria-hidden="true" data-expanded={expanded}>
                  {expanded ? '▾' : '▸'}
                </span>
              </button>
              <span className="gantt-track-band__tag">{trackLabel}</span>
              <span className="gantt-track-band__owner">
                <OwnerCell
                  stageOwnerUserId={resolvedTrackOwnerId}
                  resolveOwner={resolveOwner}
                  canEdit={inlineEnabled}
                  mutations={ownerMutations}
                  roster={roster}
                  onAnnounce={onAnnounce}
                  buildAnnouncement={(outcome) => outcome === 'saved'
                    ? t('inlineEdit.announce.leadSaved', { defaultValue: 'Feature lead saved.' })
                    : t('inlineEdit.announce.leadError', { defaultValue: 'Feature lead change was rejected.' })}
                  ariaLabel={t('tracks.ownerAria', { defaultValue: 'Owner for {{kind}} track of "{{title}}"', kind: trackLabel, title: featureTitle })}
                  testId={`track-owner-editor-${track.featureId}-${kind}`}
                  unassignedLabel={t('row.unassigned')}
                  removedLabel={t('row.removed', { defaultValue: 'Removed' })}
                  inheritedSuffixLabel=""
                  allowInherit={false}
                  cssPrefix="gantt-track-band"
                />
              </span>
            </Grid>
          </Box>
        }
        lane={<div className="gantt-track-band__lane-placeholder" aria-hidden="true" />}
      />

      {expanded && (
        <div className="gantt-track-band__stages">
          {stagesForKind.map((stage, index) => (
            <GanttTrackStageRow key={stage.stageKey} track={track} stage={stage} kind={kind}
              featureTitle={featureTitle} today={today} loadedRange={loadedRange} dayPx={dayPx}
              index={index} resolveOwner={resolveOwner} canEdit={canEdit} mutations={mutations}
              roster={roster} onAnnounce={onAnnounce} />
          ))}
        </div>
      )}
    </div>
  );
}
