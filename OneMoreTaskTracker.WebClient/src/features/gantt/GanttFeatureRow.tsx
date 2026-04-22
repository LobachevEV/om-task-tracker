import { useMemo, type CSSProperties, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  AttachedTask,
  FeatureSummary,
  MiniTeamMember,
} from '../../shared/types/feature';
import { STATE_CLASS } from '../../shared/constants/taskConstants';
import { FEATURE_STATE_CSS } from './stateConfig';
import { GanttAssigneeStack } from './GanttAssigneeStack';
import type { BarGeometry, DateWindow } from './ganttMath';
import { daysBetween } from './ganttMath';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  bar: BarGeometry | null;
  window: DateWindow;
  today: string;
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
  tasks?: AttachedTask[];
  onOpen: (featureId: number) => void;
  isTasksRevealed?: boolean;
  onRevealTasks?: (next: boolean) => void;
}

function daysOverdue(today: string, plannedEnd: string | null): number {
  if (!plannedEnd) return 0;
  return Math.max(0, daysBetween(plannedEnd, today));
}

export function GanttFeatureRow({
  feature,
  bar,
  window: _window,
  today,
  lead,
  miniTeam,
  tasks,
  onOpen,
  isTasksRevealed = false,
  onRevealTasks,
}: GanttFeatureRowProps) {
  const { t } = useTranslation('gantt');

  const barStyle = useMemo<CSSProperties>(() => {
    return {
      ['--bar-left' as string]: bar ? String(bar.leftPercent) : '0',
      ['--bar-width' as string]: bar ? String(bar.widthPercent) : '0',
      ['--bar-color' as string]: `var(${FEATURE_STATE_CSS[feature.state]})`,
    };
  }, [bar, feature.state]);

  const overdueDays = useMemo(
    () => daysOverdue(today, feature.plannedEnd),
    [today, feature.plannedEnd],
  );
  const isOverdue = overdueDays > 0 && feature.state !== 'LiveRelease';

  const ariaLabel = `${feature.title}. ${t('row.lead')}: ${lead.displayName}. ${t('row.team')}: ${miniTeam.length}`;

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(feature.id);
    }
  };

  const narrowBar = bar != null && bar.widthPercent < 6;

  const showBar = bar != null;
  const laneClass = showBar ? 'gantt-row__lane' : 'gantt-row__lane gantt-row__lane--unscheduled';

  return (
    <div
      className="gantt-row"
      data-feature-id={feature.id}
    >
      <div className="gantt-row__gutter">
        <button
          type="button"
          className="gantt-row__title"
          aria-label={ariaLabel}
          aria-expanded={onRevealTasks ? isTasksRevealed : undefined}
          onClick={() => onOpen(feature.id)}
          onKeyDown={handleTitleKeyDown}
        >
          {onRevealTasks ? (
            <span
              className="gantt-row__chevron"
              data-open={isTasksRevealed ? 'true' : 'false'}
              aria-hidden="true"
            >
              ▶
            </span>
          ) : null}
          <span>{feature.title}</span>
        </button>
        <div className="gantt-row__lead">
          {t('row.lead')}: {lead.displayName}
        </div>
        <GanttAssigneeStack members={miniTeam} aria-label={t('row.team')} />
      </div>

      <div
        className={laneClass}
        style={barStyle}
        onMouseEnter={onRevealTasks ? () => onRevealTasks(true) : undefined}
        onMouseLeave={onRevealTasks ? () => onRevealTasks(false) : undefined}
      >
        {!showBar ? (
          <span>{t('row.unscheduled')}</span>
        ) : (
          <>
            <button
              type="button"
              className={[
                'gantt-row__bar',
                narrowBar ? 'gantt-row__bar--narrow' : '',
                isOverdue ? 'gantt-row__bar--overdue' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={ariaLabel}
              title={feature.title}
              onClick={() => onOpen(feature.id)}
            >
              {bar.clampedLeft ? (
                <span className="gantt-row__clamp gantt-row__clamp--left" aria-hidden="true">‹</span>
              ) : null}
              <span>{feature.title}</span>
              {bar.clampedRight ? (
                <span className="gantt-row__clamp gantt-row__clamp--right" aria-hidden="true">›</span>
              ) : null}
            </button>
            {narrowBar ? (
              <span className="gantt-row__bar-label-outside">{feature.title}</span>
            ) : null}
            {isOverdue ? (
              <span className="gantt-row__sr-only">
                {t('row.dueOverdue', { count: overdueDays })}
              </span>
            ) : null}
            {isTasksRevealed ? (
              tasks == null ? (
                <div className="gantt-row__task-skeleton" aria-hidden="true" />
              ) : tasks.length > 0 ? (
                <>
                  <span className="gantt-row__sr-only" id={`gantt-row-tasks-${feature.id}`}>
                    {t('row.tasks')}
                  </span>
                  <div
                    className="gantt-row__tasks"
                    role="group"
                    aria-labelledby={`gantt-row-tasks-${feature.id}`}
                  >
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        className={`gantt-row__task-bar gantt-row__task-bar--${STATE_CLASS[task.state]}`}
                        title={`${task.jiraId} · ${task.state}`}
                        aria-label={`${task.jiraId} · ${task.state}`}
                      />
                    ))}
                  </div>
                </>
              ) : null
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
