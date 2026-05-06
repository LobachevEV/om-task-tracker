import { useCallback, useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureSummary, PhaseKind, Track } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { FeatureBarGeometry } from '../../ganttStageGeometry';
import { GanttGateChip } from '../GanttGateChip';
import { GanttPhaseSegment } from '../GanttPhaseSegment';
import type { GanttLaneVariant } from '../../useGanttLayout';
import type { FeatureMutationCallbacks } from '../InlineEditors';

export interface GanttFeatureRowLaneProps {
  feature: FeatureSummary;
  geometry: FeatureBarGeometry;
  variant: GanttLaneVariant;
  inlineEnabled: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onTogglePhase: (track: Track, phase: PhaseKind) => void;
  onAnnounce?: (message: string) => void;
}

export function GanttFeatureRowLane({
  feature,
  geometry,
  variant,
  inlineEnabled,
  mutations,
  roster,
  onTogglePhase,
  onAnnounce,
}: GanttFeatureRowLaneProps) {
  const { t } = useTranslation('gantt');

  const summaryStyle = useMemo<CSSProperties | undefined>(() => {
    const summary = geometry.summaryBar;
    if (summary == null) return undefined;
    return {
      ['--summary-left' as string]: `${summary.leftPx}px`,
      ['--summary-width' as string]: `${summary.widthPx}px`,
    } as CSSProperties;
  }, [geometry.summaryBar]);

  const trackBarStyle = useCallback((bar: { leftPx: number; widthPx: number } | null) => {
    if (bar == null) return undefined;
    return {
      ['--track-summary-left' as string]: `${bar.leftPx}px`,
      ['--track-summary-width' as string]: `${bar.widthPx}px`,
    } as CSSProperties;
  }, []);

  const handleGateStatus = useMemo(() => {
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
      onAnnounce?.(
        t('gates.statusSavedAnnounce', {
          defaultValue: '{{gate}} gate status saved.',
          gate: t(`gates.${gateKey}`),
        }),
      );
    };
  }, [feature.id, inlineEnabled, mutations, onAnnounce, t]);

  return (
    <div className="gantt-row__lane" data-variant={variant}>
      {geometry.summaryBar != null ? (
        <span
          className="gantt-row__summary"
          data-testid="feature-summary-bar"
          style={summaryStyle}
          aria-hidden="true"
        />
      ) : (
        <span className="gantt-row__empty-label" aria-hidden="true">
          {t('row.notPlannedYet')}
        </span>
      )}
      {geometry.tracks.map((trackGeom) => (
        <div
          key={`${feature.id}-${trackGeom.track}-summary`}
          className="gantt-row__track-summary"
          data-testid={`feature-track-summary-${feature.id}-${trackGeom.track}`}
          data-track={trackGeom.track}
          data-dimmed={trackGeom.dimmed ? 'true' : 'false'}
          data-in-flight={trackGeom.inFlightPhase != null ? trackGeom.inFlightPhase.phase : 'none'}
          aria-label={
            trackGeom.inFlightPhase != null
              ? t('gates.inFlightAria', {
                  defaultValue: '{{track}} in flight: {{phase}}',
                  track: t(`tracks.${trackGeom.track}`),
                  phase: t(`phases.${trackGeom.inFlightPhase.phase}`),
                })
              : undefined
          }
        >
          {trackGeom.trackBar != null ? (
            <span
              className="gantt-row__track-summary-bar"
              style={trackBarStyle(trackGeom.trackBar)}
              aria-hidden="true"
            />
          ) : null}
          {trackGeom.inFlightPhase != null && trackGeom.inFlightPhase.bar != null ? (
            <GanttPhaseSegment
              track={trackGeom.track}
              phaseGeom={trackGeom.inFlightPhase}
              dimmed={trackGeom.dimmed}
              expanded={false}
              onToggleExpand={onTogglePhase}
            />
          ) : null}
        </div>
      ))}
      <GanttGateChip
        gate={geometry.specGate.gate}
        leftPx={geometry.specGate.leftPx}
        chipIndex={0}
        roster={roster}
        canEdit={inlineEnabled}
        onChangeStatus={handleGateStatus}
      />
      {geometry.tracks.map((trackGeom, idx) => (
        <GanttGateChip
          key={`${feature.id}-${trackGeom.track}-prep-collapsed`}
          gate={trackGeom.prepGate.gate}
          leftPx={trackGeom.prepGate.leftPx}
          chipIndex={idx + 1}
          roster={roster}
          canEdit={inlineEnabled}
          testIdScope="collapsed"
          onChangeStatus={handleGateStatus}
        />
      ))}
    </div>
  );
}
