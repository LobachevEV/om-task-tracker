import type { CSSProperties } from 'react';
import { daysBetween } from '../../ganttMath';
import type { DateWindow } from '../../ganttMath';

interface StageBarDragPreviewProps {
  previewStart: string;
  previewEnd: string;
  loadedRange: DateWindow;
  dayPx: number;
  tokenVar: string;
  chip: string;
}

export function StageBarDragPreview({
  previewStart,
  previewEnd,
  loadedRange,
  dayPx,
  tokenVar,
  chip,
}: StageBarDragPreviewProps) {
  const totalDays = daysBetween(loadedRange.start, loadedRange.end);
  if (totalDays <= 0) return null;

  const startDelta = daysBetween(loadedRange.start, previewStart);
  const endDelta = daysBetween(loadedRange.start, previewEnd) + 1;

  const clippedStart = Math.max(0, startDelta);
  const clippedEnd = Math.min(totalDays, endDelta);
  if (clippedEnd <= clippedStart) return null;

  const leftPx = clippedStart * dayPx;
  const widthPx = (clippedEnd - clippedStart) * dayPx;

  const style: CSSProperties & Record<string, string | number> = {
    left: leftPx,
    width: widthPx,
    ['--preview-color' as string]: `var(${tokenVar})`,
  };

  return (
    <div
      className="stage-bar-drag-preview"
      style={style}
      aria-hidden="true"
      data-testid="stage-bar-drag-preview"
    >
      {chip ? (
        <span className="stage-bar-drag-preview__chip" aria-hidden="true" data-testid="stage-bar-range-chip">
          {chip}
        </span>
      ) : null}
    </div>
  );
}
