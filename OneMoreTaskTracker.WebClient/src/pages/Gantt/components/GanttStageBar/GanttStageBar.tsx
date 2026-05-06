import type { CSSProperties } from 'react';
import type { BarGeometryPx } from '../../ganttMath';
import type { TrackStageBarStatus } from '../../trackStageGeometry';
import type { StripeAxis } from '../../trackStageMeta';
import './GanttStageBar.css';

interface GanttStageBarProps {
  bar: BarGeometryPx;
  status: TrackStageBarStatus;
  tokenVar: string;
  stripeAxis: StripeAxis;
  ariaLabel: string;
  onClick?: () => void;
  canEdit?: boolean;
}

export function GanttStageBar({
  bar,
  status,
  tokenVar,
  stripeAxis,
  ariaLabel,
  onClick,
  canEdit = false,
}: GanttStageBarProps) {
  const style: CSSProperties & Record<string, string | number> = {
    left: bar.leftPx,
    width: bar.widthPx,
    ['--bar-color' as string]: `var(${tokenVar})`,
  };

  const classNames = [
    'gantt-stage-bar',
    `gantt-stage-bar--${status}`,
    `gantt-stage-bar--stripe-${stripeAxis}`,
  ].join(' ');

  if (canEdit && onClick) {
    return (
      <button
        type="button"
        className={classNames}
        style={style}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <span className="gantt-stage-bar__stripe" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className={classNames}
      style={style}
      aria-label={ariaLabel}
      role="img"
    >
      <span className="gantt-stage-bar__stripe" aria-hidden="true" />
    </div>
  );
}
