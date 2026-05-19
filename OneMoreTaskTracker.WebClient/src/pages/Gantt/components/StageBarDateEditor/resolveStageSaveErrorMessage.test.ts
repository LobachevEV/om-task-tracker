import { describe, it, expect } from 'vitest';
import { resolveStageSaveErrorMessage } from './resolveStageSaveErrorMessage';
import type { InlineEditorError } from '../InlineEditors/InlineEditorError';
import type { TFunction } from 'i18next';

function stubT(key: string, opts?: Record<string, unknown>): string {
  return key + (opts ? ':' + JSON.stringify(opts) : '');
}

const t = stubT as unknown as TFunction;

function makeError(overrides: Partial<InlineEditorError> = {}): InlineEditorError {
  return {
    kind: 'network',
    message: 'error',
    conflict: null,
    ...overrides,
  };
}

describe('resolveStageSaveErrorMessage', () => {
  it('returns generic key when no conflict', () => {
    const result = resolveStageSaveErrorMessage(makeError(), t);
    expect(result).toMatch(/^stageBarEditor\.errors\.generic/);
  });

  it('returns overlap key when kind=overlap and no neighbour', () => {
    const error = makeError({ conflict: { kind: 'overlap' } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.overlap:/);
  });

  it('returns overlapWithNeighbour key when kind=overlap with neighbour', () => {
    const error = makeError({ conflict: { kind: 'overlap', neighbour: 'Development' } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.overlapWithNeighbour/);
    expect(result).toContain('neighbour');
  });

  it('localises neighbour via tracks.stage.<snake_case>', () => {
    const error = makeError({ conflict: { kind: 'overlap', neighbour: 'StandTesting' } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toContain('stageBarEditor.errors.overlapWithNeighbour');
    // The neighbour value passed in should use the snake_case tracks.stage key
    expect(result).toContain('tracks.stage.stand_testing');
  });

  it('returns version key when kind=version', () => {
    const error = makeError({ conflict: { kind: 'version', currentVersion: 5 } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.version/);
  });

  it('returns order key when kind=order', () => {
    const error = makeError({ conflict: { kind: 'order' } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.order/);
  });

  it('returns rangeInvalid key when kind=rangeInvalid', () => {
    const error = makeError({ conflict: { kind: 'rangeInvalid' } });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.rangeInvalid/);
  });

  it('returns generic key when conflict kind is unknown (null conflict)', () => {
    const error = makeError({ kind: 'conflict', conflict: null });
    const result = resolveStageSaveErrorMessage(error, t);
    expect(result).toMatch(/^stageBarEditor\.errors\.generic/);
  });
});
