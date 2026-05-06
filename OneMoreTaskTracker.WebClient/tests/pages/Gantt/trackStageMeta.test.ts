import { describe, expect, it } from 'vitest';
import { getTrackStageMeta } from '../../../src/pages/Gantt/trackStageMeta';

describe('getTrackStageMeta — Frontend', () => {
  it('returns correct meta for SrApproving', () => {
    const meta = getTrackStageMeta('Frontend', 'SrApproving');
    expect(meta.code3).toBe('SRA');
    expect(meta.tokenVar).toBe('--warning');
    expect(meta.ariaKey).toBe('tracks.stage.sr_approving');
    expect(meta.stripeAxis).toBe('btt');
  });

  it('returns correct meta for Development', () => {
    const meta = getTrackStageMeta('Frontend', 'Development');
    expect(meta.code3).toBe('DEV');
    expect(meta.tokenVar).toBe('--state-development');
    expect(meta.stripeAxis).toBe('btt');
  });

  it('returns correct meta for StandTesting', () => {
    const meta = getTrackStageMeta('Frontend', 'StandTesting');
    expect(meta.code3).toBe('STE');
    expect(meta.ariaKey).toBe('tracks.stage.stand_testing');
    expect(meta.stripeAxis).toBe('btt');
  });

  it('returns correct meta for EthalonTesting', () => {
    const meta = getTrackStageMeta('Frontend', 'EthalonTesting');
    expect(meta.code3).toBe('ETH');
    expect(meta.ariaKey).toBe('tracks.stage.ethalon_testing');
    expect(meta.stripeAxis).toBe('btt');
  });

  it('returns correct meta for ReleaseToLive', () => {
    const meta = getTrackStageMeta('Frontend', 'ReleaseToLive');
    expect(meta.code3).toBe('RTL');
    expect(meta.tokenVar).toBe('--state-release-to-live');
    expect(meta.ariaKey).toBe('tracks.stage.release_to_live');
    expect(meta.stripeAxis).toBe('btt');
  });

  it('returns fallback meta for unknown stage key', () => {
    // Cast to bypass type — simulates a future/unknown stage coming from the API
    const meta = getTrackStageMeta('Frontend', 'FutureStage' as never);
    expect(meta.ariaKey).toBe('tracks.stage.unknown');
    expect(meta.stripeAxis).toBe('btt');
    expect(meta.tokenVar).toBe('--state-not-started');
    expect(meta.code3).toHaveLength(3);
  });
});

describe('getTrackStageMeta — Backend', () => {
  it('returns correct meta for CsApproving', () => {
    const meta = getTrackStageMeta('Backend', 'CsApproving');
    expect(meta.code3).toBe('CSA');
    expect(meta.tokenVar).toBe('--warning');
    expect(meta.ariaKey).toBe('tracks.stage.cs_approving');
    expect(meta.stripeAxis).toBe('ttb');
  });

  it('returns correct meta for Development', () => {
    const meta = getTrackStageMeta('Backend', 'Development');
    expect(meta.code3).toBe('DEV');
    expect(meta.stripeAxis).toBe('ttb');
  });

  it('returns correct meta for ReleaseToLive', () => {
    const meta = getTrackStageMeta('Backend', 'ReleaseToLive');
    expect(meta.code3).toBe('RTL');
    expect(meta.stripeAxis).toBe('ttb');
  });

  it('returns fallback meta for unknown stage key with ttb stripe', () => {
    const meta = getTrackStageMeta('Backend', 'FutureStage' as never);
    expect(meta.ariaKey).toBe('tracks.stage.unknown');
    expect(meta.stripeAxis).toBe('ttb');
  });
});

describe('getTrackStageMeta — stripe axis contract', () => {
  it('all Frontend stages use btt axis', () => {
    const keys: string[] = ['SrApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of keys) {
      expect(getTrackStageMeta('Frontend', key as never).stripeAxis).toBe('btt');
    }
  });

  it('all Backend stages use ttb axis', () => {
    const keys: string[] = ['CsApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive'];
    for (const key of keys) {
      expect(getTrackStageMeta('Backend', key as never).stripeAxis).toBe('ttb');
    }
  });
});
