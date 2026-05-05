import { useMemo, type CSSProperties } from 'react';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { SubStageBarGeometry } from '../../ganttStageGeometry';
import type { FeatureMutationCallbacks } from '../InlineEditors';
import { GanttSubStageRowGutter } from './GanttSubStageRowGutter';
import './GanttSubStageRow.css';

export interface GanttSubStageRowProps {
  feature: FeatureSummary;
  track: Track;
  phase: PhaseKind;
  geom: SubStageBarGeometry;
  index: number;
  total: number;
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
  onRemove?: (subStageId: number, version: number) => void;
}

const PHASE_COLOR_BY_KIND: Readonly<Record<PhaseKind, string>> = {
  development: '--state-in-dev',
  'stand-testing': '--state-in-test',
  'ethalon-testing': '--state-mr-master',
  'live-release': '--state-completed',
};

export function GanttSubStageRow({
  feature,
  track,
  phase,
  geom,
  index,
  total,
  resolvePerformer,
  canEdit,
  mutations,
  roster,
  onAnnounce,
  onRemove,
}: GanttSubStageRowProps) {
  const subStage = geom.subStage;
  const performer = resolvePerformer(subStage.ownerUserId ?? null);
  const inlineEnabled = canEdit && mutations != null;

  const segGeom = geom.bar ?? geom.ghost;
  const segStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {
      '--seg-color': `var(${PHASE_COLOR_BY_KIND[phase]})`,
    };
    if (segGeom) {
      style['--seg-left'] = `${segGeom.leftPx}px`;
      style['--seg-width'] = `${segGeom.widthPx}px`;
    } else {
      style['--seg-left'] = '0px';
      style['--seg-width'] = '0px';
    }
    return style as CSSProperties;
  }, [phase, segGeom]);

  return (
    <div
      className="gantt-substage-row"
      data-testid={`substage-row-${feature.id}-${track}-${phase}-${subStage.id}`}
      data-track={track}
      data-phase={phase}
      data-overdue={geom.isOverdue ? 'true' : 'false'}
    >
      <GanttSubStageRowGutter
        feature={feature}
        track={track}
        phase={phase}
        geom={geom}
        index={index}
        total={total}
        performer={performer}
        inlineEnabled={inlineEnabled}
        mutations={mutations}
        roster={roster}
        onAnnounce={onAnnounce}
        onRemove={onRemove}
      />
      <div className="gantt-substage-row__lane">
        {segGeom ? (
          <span
            className="gantt-substage-row__segment"
            data-variant={geom.bar ? 'solid' : 'ghost'}
            style={segStyle}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
