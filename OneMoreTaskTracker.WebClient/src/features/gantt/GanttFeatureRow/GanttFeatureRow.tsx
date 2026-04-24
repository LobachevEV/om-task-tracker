import { useMemo, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureState,
  FeatureSummary,
  MiniTeamMember,
} from '../../../shared/types/feature';
import { GanttAssigneeStack } from '../GanttAssigneeStack';
import type { BarGeometry, DateWindow } from '../ganttMath';
import { daysBetween } from '../ganttMath';
import type { StageBarGeometry } from '../ganttStageGeometry';
import { featureIsOverdue, plannedStageCount } from '../ganttStageGeometry';
import { GanttSegmentedBar } from '../GanttSegmentedBar';
import { GanttStageSubRow } from '../GanttStageSubRow';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  bar: BarGeometry | null;
  stageBars: StageBarGeometry[];
  window: DateWindow;
  today: string;
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
  /** Inline expansion of the stage sub-rows (session-scoped). */
  expanded: boolean;
  onToggleExpand: () => void;
  /** Open the drawer for this feature, optionally pre-selecting a stage. */
  onOpen: (featureId: number) => void;
  onOpenStage: (stage: FeatureState) => void;
  /** Resolve a performer id against the cached roster for sub-row owner rendering. */
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
}

function computeFeatureDtr(feature: FeatureSummary, today: string): string {
  if (feature.state === 'LiveRelease') return '✓';
  const active = feature.stagePlans.find((p) => p.stage === feature.state);
  const plannedEnd = active?.plannedEnd ?? feature.plannedEnd;
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  if (delta < 0) return `-${Math.abs(delta)}d`;
  return `${delta}d`;
}

export function GanttFeatureRow({
  feature,
  bar,
  stageBars,
  today,
  lead,
  miniTeam,
  expanded,
  onToggleExpand,
  onOpen,
  onOpenStage,
  resolvePerformer,
}: GanttFeatureRowProps) {
  const { t } = useTranslation('gantt');

  const isOverdue = useMemo(() => featureIsOverdue(feature, today), [feature, today]);
  const planned = useMemo(() => plannedStageCount(feature), [feature]);
  const dtr = useMemo(() => computeFeatureDtr(feature, today), [feature, today]);
  const totalStages = feature.stagePlans.length;

  const ariaLabel = `${feature.title}. ${t('row.lead')}: ${lead.displayName}. ${t('row.team')}: ${miniTeam.length}`;

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  };

  const showBar = bar != null;
  const laneClass = showBar
    ? 'gantt-row__lane'
    : 'gantt-row__lane gantt-row__lane--unscheduled';

  return (
    <>
      <div
        className="gantt-row"
        data-feature-id={feature.id}
        data-testid={`feature-row-${feature.id}`}
      >
        <div className="gantt-row__gutter" data-testid="feature-info-panel">
          <div className="gantt-row__title-line">
            <button
              type="button"
              className="gantt-row__caret"
              data-testid="expand-caret"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? t('row.collapseAria', { title: feature.title })
                  : t('row.expandAria', { title: feature.title })
              }
              onClick={onToggleExpand}
            >
              {expanded ? '▾' : '▸'}
            </button>
            <button
              type="button"
              className="gantt-row__title"
              aria-label={ariaLabel}
              onClick={() => onOpen(feature.id)}
              onKeyDown={handleTitleKeyDown}
            >
              <span>{feature.title}</span>
            </button>
          </div>
          <div className="gantt-row__lead">
            {t('row.lead')}: {lead.displayName}
          </div>
          <div className="gantt-row__meta">
            <span className="gantt-row__dates">
              {feature.plannedStart ?? '—'}
              <span className="gantt-row__meta-sep">{' · '}</span>
              {feature.plannedEnd ?? '—'}
            </span>
            <span className="gantt-row__meta-sep">{'·'}</span>
            <span
              className="gantt-row__dtr"
              data-testid="feature-dtr"
              data-overdue={isOverdue ? 'true' : 'false'}
            >
              {dtr}
            </span>
            <span className="gantt-row__meta-sep">{'·'}</span>
            <span
              className="gantt-row__planned-counter"
              data-testid="feature-planned-counter"
              data-partial={planned < totalStages ? 'true' : 'false'}
            >
              {t('row.plannedCounter', { planned, total: totalStages })}
            </span>
            {isOverdue ? (
              <span
                className="gantt-row__overdue-badge"
                data-testid="feature-overdue-badge"
              >
                {t('row.overdue')}
              </span>
            ) : null}
          </div>
          <GanttAssigneeStack members={miniTeam} aria-label={t('row.team')} />
        </div>

        <div className={laneClass}>
          {!showBar ? (
            <span>{t('row.unscheduled')}</span>
          ) : (
            <GanttSegmentedBar
              feature={feature}
              stageBars={stageBars}
              today={today}
              resolvePerformer={resolvePerformer}
              onOpenStage={onOpenStage}
            />
          )}
        </div>
      </div>

      {expanded
        ? stageBars.map((seg, index) => (
            <GanttStageSubRow
              key={seg.stage}
              feature={feature}
              seg={seg}
              today={today}
              resolvePerformer={resolvePerformer}
              index={index}
              onOpenStage={onOpenStage}
            />
          ))
        : null}
    </>
  );
}
