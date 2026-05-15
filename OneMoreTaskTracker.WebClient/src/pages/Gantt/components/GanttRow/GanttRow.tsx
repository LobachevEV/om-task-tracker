import type { ReactNode } from 'react';
import './GanttRow.css';

export interface GanttRowProps {
  gutter: ReactNode;
  lane: ReactNode;
  className?: string;
  gutterClassName?: string;
  laneClassName?: string;
  borderVariant?: 'soft' | 'strong' | 'none';
  'data-testid'?: string;
  [key: `data-${string}`]: string | undefined;
}

export function GanttRow({
  gutter,
  lane,
  className,
  gutterClassName,
  laneClassName,
  borderVariant = 'soft',
  ...dataProps
}: GanttRowProps) {
  const borderClass =
    borderVariant === 'soft'
      ? 'gantt-row-frame--border-bottom'
      : borderVariant === 'strong'
        ? 'gantt-row-frame--border-bottom-strong'
        : '';

  return (
    <div
      className={'gantt-row-frame' + (borderClass ? ' ' + borderClass : '') + (className ? ' ' + className : '')}
      {...dataProps}
    >
      <div className={'gantt-row-frame__gutter' + (gutterClassName ? ' ' + gutterClassName : '')}>
        {gutter}
      </div>
      <div className={'gantt-row-frame__lane' + (laneClassName ? ' ' + laneClassName : '')}>
        {lane}
      </div>
    </div>
  );
}
