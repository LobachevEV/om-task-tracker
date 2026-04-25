import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureState, FeatureSummary, MiniTeamMember } from '../../../shared/types/feature';
import { FEATURE_STATE_CSS } from '../stateConfig';
import type { StageBarGeometry } from '../ganttStageGeometry';
import './GanttSegmentedBar.css';

export interface GanttSegmentedBarProps {
  feature: FeatureSummary;
  stageBars: StageBarGeometry[];
  today: string;
  /** Resolve performer id → mini member (or undefined if stale). */
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  /** Click handler — opens the drawer at the given stage. */
  onOpenStage: (stage: FeatureState) => void;
  /**
   * Lane-level context: `noPlan` renders a ghost lane with the 'Not planned
   * yet' label instead of dim segments. Defaults to `planned` when the lane
   * has bar geometry.
   */
  laneVariant?: 'planned' | 'noPlan';
}

interface SegmentLabelParams {
  index: number;
  stageName: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  ownerName: string | null;
  statusPhrase: string;
}

function buildSegmentAriaLabel(p: SegmentLabelParams): string {
  const { index, stageName, plannedStart, plannedEnd, ownerName, statusPhrase } = p;
  const dateFragment =
    plannedStart != null && plannedEnd != null
      ? `Planned ${plannedStart} to ${plannedEnd}.`
      : 'Not planned.';
  const ownerFragment = ownerName != null ? `Owner ${ownerName}.` : 'Owner Unassigned.';
  return `Stage ${index + 1} of 5: ${stageName}. ${dateFragment} ${ownerFragment} ${statusPhrase}.`;
}

export function GanttSegmentedBar({
  feature,
  stageBars,
  today,
  resolvePerformer,
  onOpenStage,
  laneVariant = 'planned',
}: GanttSegmentedBarProps) {
  const { t } = useTranslation('gantt');

  // Is the feature fully unplanned? → the entire bar becomes a dashed ghost block.
  const allGhost = useMemo(
    () => stageBars.every((s) => s.status === 'ghost'),
    [stageBars],
  );
  const isGhostLane = allGhost || laneVariant !== 'planned';

  return (
    <div
      className="gantt-seg-bar"
      data-testid="segmented-bar"
      data-variant={isGhostLane ? 'ghost' : 'planned'}
      data-lane-variant={laneVariant}
      role="group"
      aria-label={t('segmentedBar.ariaLabel', { title: feature.title })}
    >
      {isGhostLane ? (
        <span className="gantt-seg-bar__empty-label" aria-hidden="true">
          {t('row.notPlannedYet')}
        </span>
      ) : null}
      {stageBars.map((seg, index) => {
        const plan = feature.stagePlans.find((p) => p.stage === seg.stage);
        const performer = resolvePerformer(plan?.performerUserId ?? null);
        const geometry = seg.bar ?? seg.ghost;
        const cssVar = FEATURE_STATE_CSS[seg.stage];
        const stageName = t(`state.${seg.stage}`);
        const statusPhrase = seg.isOverdue
          ? t('segmentedBar.status.overdue')
          : seg.status === 'completed'
            ? t('segmentedBar.status.completed')
            : seg.isCurrent
              ? t('segmentedBar.status.current')
              : seg.status === 'ghost'
                ? t('segmentedBar.status.notPlanned')
                : t('segmentedBar.status.upcoming');

        const style = {
          ['--seg-left' as string]: geometry ? `${geometry.leftPx}px` : '0px',
          ['--seg-width' as string]: geometry ? `${geometry.widthPx}px` : '0px',
          ['--seg-color' as string]: `var(${cssVar})`,
        } as CSSProperties;

        return (
          <button
            key={seg.stage}
            type="button"
            className="gantt-seg-bar__segment"
            style={style}
            data-testid={`segment-${seg.stage}`}
            data-stage={seg.stage}
            data-status={seg.status}
            data-variant={seg.status === 'ghost' ? 'ghost' : 'solid'}
            data-overdue={seg.isOverdue ? 'true' : 'false'}
            data-active={seg.isCurrent ? 'true' : 'false'}
            aria-current={seg.isCurrent ? 'step' : undefined}
            aria-label={buildSegmentAriaLabel({
              index,
              stageName,
              plannedStart: plan?.plannedStart ?? null,
              plannedEnd: plan?.plannedEnd ?? null,
              ownerName: performer?.displayName ?? null,
              statusPhrase,
            })}
            title={stageName}
            onClick={() => onOpenStage(seg.stage)}
          >
            {seg.isCurrent ? (
              <span className="gantt-seg-bar__active-dot" aria-hidden="true" />
            ) : null}
            {seg.status === 'completed' ? (
              <span className="gantt-seg-bar__completed-glyph" aria-hidden="true">
                {'✓'}
              </span>
            ) : null}
          </button>
        );
      })}
      {/* reduce unused-var lint warning on `today` while keeping the prop for future DTR work */}
      <span hidden data-today={today} />
    </div>
  );
}
