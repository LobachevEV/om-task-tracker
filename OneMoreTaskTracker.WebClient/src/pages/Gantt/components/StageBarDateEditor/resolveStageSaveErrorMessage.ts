import type { TFunction } from 'i18next';
import type { InlineEditorError } from '../InlineEditors/InlineEditorError';

function pascalToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

export function resolveStageSaveErrorMessage(error: InlineEditorError, t: TFunction): string {
  const kind = error.conflict?.kind;

  if (kind === 'overlap') {
    const neighbour = error.conflict?.neighbour;
    if (neighbour) {
      const localisedNeighbour = t(`stageBarEditor.stageName.${pascalToSnake(neighbour)}`, {
        defaultValue: neighbour,
      });
      return t('stageBarEditor.errors.overlapWithNeighbour', {
        defaultValue: 'Conflicts with the {{neighbour}} stage — pick a non-overlapping date.',
        neighbour: localisedNeighbour,
      });
    }
    return t('stageBarEditor.errors.overlap', {
      defaultValue: 'Stage order violation — pick a non-overlapping date.',
    });
  }

  if (kind === 'version') {
    return t('stageBarEditor.errors.version', {
      defaultValue: 'Stage was updated elsewhere — refresh to see the latest.',
    });
  }

  if (kind === 'order') {
    return t('stageBarEditor.errors.order', {
      defaultValue: 'Stage order violation.',
    });
  }

  if (kind === 'rangeInvalid') {
    return t('stageBarEditor.errors.rangeInvalid', {
      defaultValue: 'Invalid date range.',
    });
  }

  return t('stageBarEditor.errors.generic', {
    defaultValue: 'Could not save — try again.',
  });
}
