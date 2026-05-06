import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import {
  featureIsOverdue,
  plannedSubStageCount,
  type FeatureBarGeometry,
} from '../../ganttStageGeometry';
import { GanttTrackRow } from '../GanttTrackRow';
import type { GanttLaneVariant } from '../../useGanttLayout';
import { InlineLiveRegion, type FeatureMutationCallbacks } from '../InlineEditors';
import { GanttFeatureRowGutter } from './GanttFeatureRowGutter';
import { GanttFeatureRowLane } from './GanttFeatureRowLane';
import { computeFeatureDtr } from './computeFeatureDtr';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  geometry: FeatureBarGeometry;
  today: string;
  lead: MiniTeamMember;
  variant?: GanttLaneVariant;
  expanded: boolean;
  expandedPhases: ReadonlyMap<Track, ReadonlySet<PhaseKind>>;
  onToggleExpand: (featureId: number) => void;
  onTogglePhase: (featureId: number, track: Track, phase: PhaseKind) => void;
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit?: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
}

const EMPTY_PHASE_SET: ReadonlySet<PhaseKind> = new Set();

function GanttFeatureRowInner({
  feature,
  geometry,
  today,
  lead,
  variant = 'planned',
  expanded,
  expandedPhases,
  onToggleExpand,
  onTogglePhase,
  resolvePerformer,
  canEdit = false,
  mutations,
  roster,
}: GanttFeatureRowProps) {
  const { t } = useTranslation('gantt');

  const isOverdue = useMemo(() => featureIsOverdue(feature, today), [feature, today]);
  const planned = useMemo(() => plannedSubStageCount(feature), [feature]);
  const doneLabel = t('row.done', { defaultValue: 'Done' });
  const dtr = useMemo(
    () => computeFeatureDtr(geometry, feature, today, doneLabel),
    [geometry, feature, today, doneLabel],
  );

  const ariaLabel = t('row.rowAria', {
    title: feature.title,
    lead: lead.displayName,
    state: t(`state.${feature.state}`),
    variant,
  });

  const handleToggleExpand = useCallback(
    () => onToggleExpand(feature.id),
    [onToggleExpand, feature.id],
  );

  const handleTogglePhase = useCallback(
    (track: Track, phase: PhaseKind) => onTogglePhase(feature.id, track, phase),
    [feature.id, onTogglePhase],
  );

  const inlineEnabled = canEdit && mutations != null;

  const [announcement, setAnnouncement] = useState<string>('');
  const handleAnnounce = useCallback((message: string) => setAnnouncement(message), []);
  const buildTitleAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.titleSaved', { defaultValue: 'Feature title saved.' })
        : t('inlineEdit.announce.titleError', {
            defaultValue: 'Feature title change was rejected.',
          }),
    [t],
  );
  const buildLeadAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.leadSaved', { defaultValue: 'Feature lead saved.' })
        : t('inlineEdit.announce.leadError', {
            defaultValue: 'Feature lead change was rejected.',
          }),
    [t],
  );

  return (
    <>
      <div
        className="gantt-row"
        data-feature-id={feature.id}
        data-feature-row={feature.id}
        data-testid={`feature-row-${feature.id}`}
        data-variant={variant}
        data-spec-blocked={geometry.specBlocked ? 'true' : 'false'}
      >
        <GanttFeatureRowGutter
          feature={feature}
          lead={lead}
          variant={variant}
          expanded={expanded}
          isOverdue={isOverdue}
          planned={planned}
          dtr={dtr}
          ariaLabel={ariaLabel}
          inlineEnabled={inlineEnabled}
          mutations={mutations}
          roster={roster}
          onToggleExpand={handleToggleExpand}
          onAnnounce={handleAnnounce}
          buildTitleAnnouncement={buildTitleAnnouncement}
          buildLeadAnnouncement={buildLeadAnnouncement}
        />
        <GanttFeatureRowLane
          feature={feature}
          geometry={geometry}
          variant={variant}
          inlineEnabled={inlineEnabled}
          mutations={mutations}
          roster={roster}
          onTogglePhase={handleTogglePhase}
          onAnnounce={handleAnnounce}
        />
      </div>

      {expanded
        ? geometry.tracks.map((trackGeom) => (
            <GanttTrackRow
              key={`${feature.id}-${trackGeom.track}`}
              feature={feature}
              trackGeom={trackGeom}
              expandedPhases={expandedPhases.get(trackGeom.track) ?? EMPTY_PHASE_SET}
              canEdit={inlineEnabled}
              mutations={mutations}
              roster={roster}
              resolvePerformer={resolvePerformer}
              onTogglePhase={handleTogglePhase}
              onAnnounce={handleAnnounce}
            />
          ))
        : null}
      {inlineEnabled ? <InlineLiveRegion message={announcement} /> : null}
    </>
  );
}

export const GanttFeatureRow = memo(GanttFeatureRowInner);
