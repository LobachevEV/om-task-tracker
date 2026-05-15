import { useTranslation } from 'react-i18next';
import { daysBetween, formatShortDate } from '../../ganttMath';
import { InlineDateCell } from '../InlineEditors';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
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
  mutations?: TrackMutationCallbacks;
  onAnnounce?: (message: string) => void;
}

export function StageDateRange({
  featureId,
  kind,
  stageKey,
  stageVersion,
  plannedStart,
  plannedEnd,
  today,
  locale,
  featureTitle,
  stageName,
  canEdit = false,
  mutations,
  onAnnounce,
}: StageDateRangeProps) {
  const { t } = useTranslation('gantt');

  const shortStart = plannedStart ? formatShortDate(plannedStart, locale) : '—';
  const shortEnd = plannedEnd ? formatShortDate(plannedEnd, locale) : '—';

  const dtr = (() => {
    if (!plannedEnd) return '—';
    const delta = daysBetween(today, plannedEnd);
    if (delta < 0) return `-${Math.abs(delta)}d`;
    return `${delta}d`;
  })();

  const announceStart = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.startSaved', {
          defaultValue: '{{stage}} planned start saved.',
          stage: stageName,
        })
      : t('inlineEdit.announce.startError', {
          defaultValue: '{{stage}} planned start change was rejected.',
          stage: stageName,
        });

  const announceEnd = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.endSaved', {
          defaultValue: '{{stage}} planned end saved.',
          stage: stageName,
        })
      : t('inlineEdit.announce.endError', {
          defaultValue: '{{stage}} planned end change was rejected.',
          stage: stageName,
        });

  const inlineEnabled = canEdit && mutations != null;

  const overdueAttr =
    plannedEnd && daysBetween(plannedEnd, today) > 0 ? 'true' : 'false';

  if (inlineEnabled) {
    return (
      <span className={CLS_DATES}>
        <InlineDateCell
          value={plannedStart ?? null}
          ariaLabel={t('inlineEdit.plannedStartAria', {
            defaultValue: 'Planned start for {{stage}} stage of "{{title}}"',
            stage: stageName,
            title: featureTitle,
          })}
          testId={`track-stage-start-${featureId}-${kind}-${stageKey}`}
          onSave={async (next) => {
            await mutations!.saveTrackStagePlannedStart(
              featureId,
              kind,
              stageKey,
              next,
              stageVersion,
            );
          }}
          onAnnounce={onAnnounce}
          buildAnnouncement={announceStart}
        />
        <span className={CLS_SEP_RANGE} aria-hidden="true">
          {' – '}
        </span>
        <InlineDateCell
          value={plannedEnd ?? null}
          ariaLabel={t('inlineEdit.plannedEndAria', {
            defaultValue: 'Planned end for {{stage}} stage of "{{title}}"',
            stage: stageName,
            title: featureTitle,
          })}
          testId={`track-stage-end-${featureId}-${kind}-${stageKey}`}
          onSave={async (next) => {
            await mutations!.saveTrackStagePlannedEnd(
              featureId,
              kind,
              stageKey,
              next,
              stageVersion,
            );
          }}
          onAnnounce={onAnnounce}
          buildAnnouncement={announceEnd}
        />
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
