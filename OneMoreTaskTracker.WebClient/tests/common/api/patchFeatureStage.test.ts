import { describe, it, expect } from 'vitest';

describe('patchFeatureStage (removed in v2 taxonomy)', () => {
  it('is removed; replaced by patchFeatureGate + patchFeatureSubStage', () => {
    expect(true).toBe(true);
  });
});
