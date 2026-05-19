import type { TFunction } from 'i18next';
import type { InlineEditorError } from '../InlineEditors/InlineEditorError';

function pascalToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export function resolveStageSaveAnnounceMessage(error: InlineEditorError, t: TFunction): string {
  const prefix = t('stageBarEditor.announce.error.prefix', {
    defaultValue: 'Stage date change rejected: ',
  });

  const kind = error.conflict?.kind;

  if (kind === 'overlap') {
    const neighbour = error.conflict?.neighbour;
    if (neighbour) {
      const localisedNeighbour = t(`tracks.stage.${pascalToSnake(neighbour)}`, {
        defaultValue: neighbour,
      });
      return (
        prefix +
        t('stageBarEditor.announce.error.overlapWithNeighbour', {
          defaultValue: 'conflicts with the {{neighbour}} stage — pick a non-overlapping date.',
          neighbour: localisedNeighbour,
        })
      );
    }
    return (
      prefix +
      t('stageBarEditor.announce.error.overlap', {
        defaultValue: 'stage order violation — pick a non-overlapping date.',
      })
    );
  }

  if (kind === 'version') {
    return (
      prefix +
      t('stageBarEditor.announce.error.version', {
        defaultValue: 'stage was updated elsewhere — refresh to see the latest.',
      })
    );
  }

  if (kind === 'order') {
    return (
      prefix +
      t('stageBarEditor.announce.error.order', {
        defaultValue: 'stage order violation.',
      })
    );
  }

  if (kind === 'rangeInvalid') {
    return (
      prefix +
      t('stageBarEditor.announce.error.rangeInvalid', {
        defaultValue: 'invalid date range.',
      })
    );
  }

  return (
    prefix +
    t('stageBarEditor.announce.error.generic', {
      defaultValue: 'could not save — try again.',
    })
  );
}
