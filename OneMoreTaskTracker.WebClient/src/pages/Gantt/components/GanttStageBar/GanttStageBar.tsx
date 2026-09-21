import type { CSSProperties, ReactNode } from 'react';
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
  children?: ReactNode;
  dataTestId?: string;
}

export function GanttStageBar({
  bar,
  status,
  tokenVar,
  stripeAxis,
  ariaLabel,
  children,
  dataTestId,
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

  return (
    <div
      className={classNames}
      style={style}
      aria-label={ariaLabel}
      role="img"
      data-testid={dataTestId}
    >
      <span className="gantt-stage-bar__stripe" aria-hidden="true" />
      {children}
    </div>
  );
}
