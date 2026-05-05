import type { TFunction } from 'i18next';

export type AnnounceOutcome = 'saved' | 'error';

export function makeSubStageAnnouncements(t: TFunction<'gantt'>, phaseLabel: string) {
  return {
    owner: (outcome: AnnounceOutcome) =>
      outcome === 'saved'
        ? t('inlineEdit.announce.subStageOwnerSaved', {
            defaultValue: '{{phase}} sub-stage owner saved.',
            phase: phaseLabel,
          })
        : t('inlineEdit.announce.subStageOwnerError', {
            defaultValue: '{{phase}} sub-stage owner change was rejected.',
            phase: phaseLabel,
          }),
    start: (outcome: AnnounceOutcome) =>
      outcome === 'saved'
        ? t('inlineEdit.announce.subStageStartSaved', {
            defaultValue: '{{phase}} sub-stage start saved.',
            phase: phaseLabel,
          })
        : t('inlineEdit.announce.subStageStartError', {
            defaultValue: '{{phase}} sub-stage start change was rejected.',
            phase: phaseLabel,
          }),
    end: (outcome: AnnounceOutcome) =>
      outcome === 'saved'
        ? t('inlineEdit.announce.subStageEndSaved', {
            defaultValue: '{{phase}} sub-stage end saved.',
            phase: phaseLabel,
          })
        : t('inlineEdit.announce.subStageEndError', {
            defaultValue: '{{phase}} sub-stage end change was rejected.',
            phase: phaseLabel,
          }),
  };
}
