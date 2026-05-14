import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureSummary } from '../../../../common/types/feature';
import { FEATURE_STATE_CSS } from '../../stateConfig';
import type { BarGeometryPx } from '../../ganttMath';
import { computeLifecycleStageWindow } from '../../ganttStageGeometry';
import type { StageBarGeometry } from '../../ganttStageGeometry';
import './GanttSegmentedBar.css';

export interface GanttSegmentedBarProps {
  feature: FeatureSummary;
  stageBars: StageBarGeometry[];
  today: string;
  /**
   * Lane-level context: `noPlan` renders a ghost lane with the 'Not planned
   * yet' label instead of dim segments. Defaults to `planned` when the lane
   * has bar geometry.
   */
  laneVariant?: 'planned' | 'noPlan';
  /** Feature-level span; rendered as a summary bar when all stages are ghost. */
  summaryBar?: BarGeometryPx | null;
}

interface SegmentLabelParams {
  index: number;
  stageName: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  statusPhrase: string;
}

function buildSegmentAriaLabel(p: SegmentLabelParams): string {
  const { index, stageName, plannedStart, plannedEnd, statusPhrase } = p;
  const dateFragment =
    plannedStart != null && plannedEnd != null
      ? `Planned ${plannedStart} to ${plannedEnd}.`
      : 'Not planned.';
  return `Stage ${index + 1} of 5: ${stageName}. ${dateFragment} ${statusPhrase}.`;
}

export function GanttSegmentedBar({
  feature,
  stageBars,
  today,
  laneVariant = 'planned',
  summaryBar,
}: GanttSegmentedBarProps) {
  const { t } = useTranslation('gantt');

  const allGhost = useMemo(
    () => stageBars.every((s) => s.status === 'ghost'),
    [stageBars],
  );
  const isGhostLane = allGhost || laneVariant !== 'planned';
  const showSummaryBar = isGhostLane && summaryBar != null && summaryBar.widthPx > 0;

  const summaryStyle = summaryBar
    ? ({
        ['--summary-left' as string]: `${summaryBar.leftPx}px`,
        ['--summary-width' as string]: `${summaryBar.widthPx}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="gantt-seg-bar"
      data-testid="segmented-bar"
      data-variant={isGhostLane ? 'ghost' : 'planned'}
      data-lane-variant={laneVariant}
      role="group"
      aria-label={t('segmentedBar.ariaLabel', { title: feature.title })}
    >
      {showSummaryBar ? (
        <div
          className="gantt-seg-bar__summary"
          style={summaryStyle}
          data-testid="segmented-bar-summary"
          aria-hidden="true"
        />
      ) : null}
      {isGhostLane && !showSummaryBar ? (
        <span className="gantt-seg-bar__empty-label" aria-hidden="true">
          {t('row.notPlannedYet')}
        </span>
      ) : null}
      {stageBars.map((seg, index) => {
        const plan = computeLifecycleStageWindow(feature, seg.stage);
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
          <div
            key={seg.stage}
            role="img"
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
              plannedStart: plan.plannedStart,
              plannedEnd: plan.plannedEnd,
              statusPhrase,
            })}
            title={stageName}
          >
            {seg.isCurrent ? (
              <span className="gantt-seg-bar__active-dot" aria-hidden="true" />
            ) : null}
            {seg.status === 'completed' ? (
              <span className="gantt-seg-bar__completed-glyph" aria-hidden="true">
                {'✓'}
              </span>
            ) : null}
          </div>
        );
      })}
      {/* today forwarded for potential future DTR annotation */}
      <span hidden data-today={today} />
    </div>
  );
}
