import { describe, it, expect } from 'vitest';

describe('useGanttLayout (v1 lane shape removed in v2 taxonomy)', () => {
  it('is removed; GanttLane now exposes geometry instead of bar/stageBars', () => {
    expect(true).toBe(true);
  });
});
