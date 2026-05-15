import { useTranslation } from 'react-i18next';
import { daysBetween, formatShortDate } from '../../ganttMath';
import { InlineDateCell } from '../InlineEditors';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import type { FeatureTrackKind, FeatureTrackStageKey } from '../../../../common/types/featureTrack';

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
  cssPrefix?: string;
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
  cssPrefix = 'gantt-track-stage-row',
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
      <span className={`${cssPrefix}__dates`}>
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
        <span className={`${cssPrefix}__sep ${cssPrefix}__sep--range`} aria-hidden="true">
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
        <span className={`${cssPrefix}__sep`} aria-hidden="true">
          {' · '}
        </span>
        <span
          className={`${cssPrefix}__dtr`}
          data-overdue={overdueAttr}
        >
          {dtr}
        </span>
      </span>
    );
  }

  return (
    <span className={`${cssPrefix}__dates`}>
      <span className={`${cssPrefix}__date`}>{shortStart}</span>
      <span className={`${cssPrefix}__sep ${cssPrefix}__sep--range`} aria-hidden="true">
        {' – '}
      </span>
      <span className={`${cssPrefix}__date`}>{shortEnd}</span>
      <span className={`${cssPrefix}__sep`} aria-hidden="true">
        {' · '}
      </span>
      <span
        className={`${cssPrefix}__dtr`}
        data-overdue={overdueAttr}
      >
        {dtr}
      </span>
    </span>
  );
}
