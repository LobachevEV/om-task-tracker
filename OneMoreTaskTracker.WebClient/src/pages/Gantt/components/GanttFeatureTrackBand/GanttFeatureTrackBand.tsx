import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type { FeatureTrack, FeatureTrackKind } from '../../../../common/types/featureTrack';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { Avatar } from '../../../../common/ds';
import type { DateWindow } from '../../ganttMath';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import { GanttTrackStageRow } from '../GanttTrackStageRow';
import { selectStagesForKind } from '../../selectStagesForKind';
import './GanttFeatureTrackBand.css';

function avatarTone(
  role: MiniTeamMember['role'],
): 'manager' | 'frontend' | 'backend' | 'qa' {
  switch (role) {
    case 'Manager':
      return 'manager';
    case 'FrontendDeveloper':
      return 'frontend';
    case 'BackendDeveloper':
      return 'backend';
    case 'Qa':
      return 'qa';
  }
}

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

  const stagesForKind = useMemo(
    () => selectStagesForKind(track.stages, kind),
    [track.stages, kind],
  );

  const trackOwner = resolveOwner(track.trackOwnerUserId);
  const trackLabel =
    kind === 'Frontend'
      ? t('tracks.labelFrontend', { defaultValue: 'Front' })
      : t('tracks.labelBackend', { defaultValue: 'Back' });

  const toggleLabel = expanded
    ? t('tracks.collapseAria', { defaultValue: 'Collapse {{kind}} track', kind: trackLabel })
    : t('tracks.expandAria', { defaultValue: 'Expand {{kind}} track', kind: trackLabel });

  return (
    <div
      className="gantt-track-band"
      data-kind={kind.toLowerCase()}
      data-testid={`track-band-${track.featureId}-${kind}`}
    >
      <div className="gantt-track-band__header">
        <div className="gantt-track-band__gutter">
          <button
            type="button"
            className="gantt-track-band__toggle"
            aria-label={toggleLabel}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <span
              className="gantt-track-band__chevron"
              aria-hidden="true"
              data-expanded={expanded}
            >
              {expanded ? '▾' : '▸'}
            </span>
          </button>
          <span className="gantt-track-band__tag">{trackLabel}</span>
          {trackOwner ? (
            <span className="gantt-track-band__owner">
              <Avatar
                name={trackOwner.displayName}
                size="sm"
                tone={avatarTone(trackOwner.role)}
              />
              <span className="gantt-track-band__owner-name">{trackOwner.displayName}</span>
            </span>
          ) : (
            <span className="gantt-track-band__owner gantt-track-band__owner--unassigned">
              {t('row.unassigned')}
            </span>
          )}
        </div>
        <div className="gantt-track-band__lane-placeholder" aria-hidden="true" />
      </div>

      {expanded && (
        <div className="gantt-track-band__stages">
          {stagesForKind.map((stage, index) => (
            <GanttTrackStageRow
              key={stage.stageKey}
              track={track}
              stage={stage}
              kind={kind}
              featureTitle={featureTitle}
              today={today}
              loadedRange={loadedRange}
              dayPx={dayPx}
              index={index}
              resolveOwner={resolveOwner}
              canEdit={canEdit}
              mutations={mutations}
              roster={roster}
              onAnnounce={onAnnounce}
            />
          ))}
        </div>
      )}
    </div>
  );
}
