import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { TrackBarGeometry } from '../../ganttStageGeometry';
import { GanttGateChip } from '../GanttGateChip';
import { GanttPhaseSegment } from '../GanttPhaseSegment';
import { GanttSubStageRow } from '../GanttSubStageRow';
import { AddSubStageButton } from '../AddSubStageButton';
import type { FeatureMutationCallbacks } from '../InlineEditors';
import './GanttTrackRow.css';

export interface GanttTrackRowProps {
  feature: FeatureSummary;
  trackGeom: TrackBarGeometry;
  expandedPhases: ReadonlySet<PhaseKind>;
  canEdit: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  onTogglePhase: (track: Track, phase: PhaseKind) => void;
  onAnnounce?: (message: string) => void;
}

export function GanttTrackRow({
  feature,
  trackGeom,
  expandedPhases,
  canEdit,
  mutations,
  roster,
  resolvePerformer,
  onTogglePhase,
  onAnnounce,
}: GanttTrackRowProps) {
  const { t } = useTranslation('gantt');
  const { track, prepGate, phases, dimmed } = trackGeom;
  const inlineEnabled = canEdit && mutations != null;

  const trackLabel = t(`tracks.${track}`);

  const handleGateChange = useMemo(() => {
    if (!inlineEnabled || mutations == null) return undefined;
    return async (
      gateKey: Parameters<FeatureMutationCallbacks['saveGateStatus']>[1],
      next: Parameters<FeatureMutationCallbacks['saveGateStatus']>[2],
      rejectionReason: Parameters<FeatureMutationCallbacks['saveGateStatus']>[3],
      gateVersion: Parameters<FeatureMutationCallbacks['saveGateStatus']>[4],
    ) => {
      await mutations.saveGateStatus(
        feature.id,
        gateKey,
        next,
        rejectionReason,
        gateVersion,
      );
    };
  }, [feature.id, inlineEnabled, mutations]);

  const handleAppend = useMemo(() => {
    if (!inlineEnabled || mutations == null) return undefined;
    return (phase: PhaseKind) => {
      void mutations.appendSubStage(feature.id, track, phase);
    };
  }, [feature.id, inlineEnabled, mutations, track]);

  const handleRemove = useMemo(() => {
    if (!inlineEnabled || mutations == null) return undefined;
    return (subStageId: number, version: number) => {
      void mutations.removeSubStage(feature.id, subStageId, version);
    };
  }, [feature.id, inlineEnabled, mutations]);

  const rowStyle = useMemo<CSSProperties>(
    () => ({
      ['--track-dim-opacity' as string]: dimmed ? '0.55' : '1',
    }),
    [dimmed],
  );

  return (
    <div
      className="gantt-track-row"
      data-testid={`track-row-${feature.id}-${track}`}
      data-track={track}
      data-dimmed={dimmed ? 'true' : 'false'}
      style={rowStyle}
    >
      <div className="gantt-track-row__header">
        <div className="gantt-track-row__gutter">
          <span className="gantt-track-row__label">{trackLabel}</span>
        </div>
        <div className="gantt-track-row__lane">
          <GanttGateChip
            gate={prepGate.gate}
            leftPx={prepGate.leftPx}
            canEdit={inlineEnabled}
            onChangeStatus={handleGateChange}
          />
          {phases.map((phaseGeom) => (
            <GanttPhaseSegment
              key={`${track}-${phaseGeom.phase}`}
              track={track}
              phaseGeom={phaseGeom}
              dimmed={dimmed}
              expanded={expandedPhases.has(phaseGeom.phase)}
              onToggleExpand={onTogglePhase}
            />
          ))}
        </div>
      </div>
      {phases.map((phaseGeom) => {
        if (!expandedPhases.has(phaseGeom.phase)) return null;
        const total = phaseGeom.subStages.length;
        return (
          <div
            key={`${track}-${phaseGeom.phase}-cascade`}
            className="gantt-track-row__cascade"
            data-phase={phaseGeom.phase}
          >
            {phaseGeom.subStages.map((subGeom, idx) => (
              <GanttSubStageRow
                key={subGeom.subStage.id}
                feature={feature}
                track={track}
                phase={phaseGeom.phase}
                geom={subGeom}
                index={idx}
                total={total}
                resolvePerformer={resolvePerformer}
                canEdit={inlineEnabled}
                mutations={mutations}
                roster={roster}
                onAnnounce={onAnnounce}
                onRemove={handleRemove}
              />
            ))}
            {phaseGeom.multiOwner && handleAppend != null ? (
              <AddSubStageButton
                atCap={total >= phaseGeom.cap}
                cap={phaseGeom.cap}
                onAppend={() => handleAppend(phaseGeom.phase)}
                testId={`add-substage-${feature.id}-${track}-${phaseGeom.phase}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
