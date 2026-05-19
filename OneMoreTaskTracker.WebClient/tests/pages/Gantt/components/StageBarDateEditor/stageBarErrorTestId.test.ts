import { describe, it, expect } from 'vitest';
import { stageBarErrorTestId } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/stageBarErrorTestId';

describe('stageBarErrorTestId', () => {
  it('produces the spec pattern for a multi-word PascalCase stage key', () => {
    expect(stageBarErrorTestId(2, 'Backend', 'EthalonTesting')).toBe(
      'stage-bar-save-error-2-backend-ethalon_testing',
    );
  });

  it('handles a single-word stage key', () => {
    expect(stageBarErrorTestId(5, 'Frontend', 'Development')).toBe(
      'stage-bar-save-error-5-frontend-development',
    );
  });

  it('handles a kind that is already lowercase', () => {
    expect(stageBarErrorTestId(1, 'qa', 'InTest')).toBe(
      'stage-bar-save-error-1-qa-in_test',
    );
  });

  it('emits prefix stage-bar-save-error, not track-stage-bar', () => {
    const id = stageBarErrorTestId(3, 'Backend', 'Development');
    expect(id.startsWith('stage-bar-save-error-')).toBe(true);
  });
});
