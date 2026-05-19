import { describe, it, expect } from 'vitest';
import { resolveStageSaveAnnounceMessage } from './resolveStageSaveAnnounceMessage';
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

describe('resolveStageSaveAnnounceMessage', () => {
  it('includes the error.prefix key in every result', () => {
    const result = resolveStageSaveAnnounceMessage(makeError(), t);
    expect(result).toContain('stageBarEditor.announce.error.prefix');
  });

  it('returns generic announce key when no conflict', () => {
    const result = resolveStageSaveAnnounceMessage(makeError(), t);
    expect(result).toContain('stageBarEditor.announce.error.generic');
  });

  it('returns overlap announce key when kind=overlap and no neighbour', () => {
    const error = makeError({ conflict: { kind: 'overlap' } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.overlap');
    expect(result).not.toContain('overlapWithNeighbour');
  });

  it('returns overlapWithNeighbour announce key when kind=overlap with neighbour', () => {
    const error = makeError({ conflict: { kind: 'overlap', neighbour: 'Development' } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.overlapWithNeighbour');
    expect(result).toContain('neighbour');
  });

  it('localises neighbour via stageBarEditor.stageName.<snake_case>', () => {
    const error = makeError({ conflict: { kind: 'overlap', neighbour: 'StandTesting' } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.overlapWithNeighbour');
    expect(result).toContain('stageBarEditor.stageName.stand_testing');
  });

  it('returns version announce key when kind=version', () => {
    const error = makeError({ conflict: { kind: 'version', currentVersion: 5 } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.version');
  });

  it('returns order announce key when kind=order', () => {
    const error = makeError({ conflict: { kind: 'order' } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.order');
  });

  it('returns rangeInvalid announce key when kind=rangeInvalid', () => {
    const error = makeError({ conflict: { kind: 'rangeInvalid' } });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.rangeInvalid');
  });

  it('returns generic announce key when conflict kind is unknown (null conflict)', () => {
    const error = makeError({ kind: 'conflict', conflict: null });
    const result = resolveStageSaveAnnounceMessage(error, t);
    expect(result).toContain('stageBarEditor.announce.error.generic');
  });
});
