import { daysBetween, formatShortDate } from '../../ganttMath';
import type { FeatureTrackKind, FeatureTrackStageKey } from '../../../../common/types/featureTrack';

const CLS_DATES = 'gantt-track-stage-row__dates';
const CLS_SEP_RANGE = 'gantt-track-stage-row__sep gantt-track-stage-row__sep--range';
const CLS_SEP = 'gantt-track-stage-row__sep';
const CLS_DTR = 'gantt-track-stage-row__dtr';

export interface StageDateRangeProps {
  featureId: number;
  kind: FeatureTrackKind;
  stageKey: FeatureTrackStageKey;
  stageVersion: number;
  plannedStart: string | null | undefined;
  plannedEnd: string | null | undefined;
  today: string;
  locale: string;
  featureTitle: string;
  stageName: string;
  canEdit?: boolean;
  onAnnounce?: (message: string) => void;
}

export function StageDateRange({
  plannedStart,
  plannedEnd,
  today,
  locale,
}: StageDateRangeProps) {
  const shortStart = plannedStart ? formatShortDate(plannedStart, locale) : '—';
  const shortEnd = plannedEnd ? formatShortDate(plannedEnd, locale) : '—';

  const dtr = (() => {
    if (!plannedEnd) return '—';
    const delta = daysBetween(today, plannedEnd);
    if (delta < 0) return `-${Math.abs(delta)}d`;
    return `${delta}d`;
  })();

  const overdueAttr =
    plannedEnd && daysBetween(plannedEnd, today) > 0 ? 'true' : 'false';

  return (
    <span className={CLS_DATES}>
      <span className="gantt-track-stage-row__date">{shortStart}</span>
      <span className={CLS_SEP_RANGE} aria-hidden="true">
        {' – '}
      </span>
      <span className="gantt-track-stage-row__date">{shortEnd}</span>
      <span className={CLS_SEP} aria-hidden="true">
        {' · '}
      </span>
      <span
        className={CLS_DTR}
        data-overdue={overdueAttr}
      >
        {dtr}
      </span>
    </span>
  );
}
