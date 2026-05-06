import type { FeatureTrackKind, FeatureTrackStageKey } from '../../common/types/featureTrack';

export type StripeAxis = 'btt' | 'ttb';

export interface TrackStageMeta {
  /** 3-letter abbreviation for compact display. */
  code3: string;
  /** CSS custom-property token name for the stage fill colour. */
  tokenVar: string;
  /** i18n key under the `gantt` namespace for ARIA labels. */
  ariaKey: string;
  /**
   * Diagonal stripe direction painted over the bar.
   * `btt` = bottom-to-top (\\ pattern) for Frontend.
   * `ttb` = top-to-bottom (/  pattern) for Backend.
   */
  stripeAxis: StripeAxis;
}

const FRONTEND_STAGE_META: Record<string, TrackStageMeta> = {
  SrApproving: {
    code3: 'SRA',
    tokenVar: '--warning',
    ariaKey: 'tracks.stage.sr_approving',
    stripeAxis: 'btt',
  },
  Development: {
    code3: 'DEV',
    tokenVar: '--state-development',
    ariaKey: 'tracks.stage.development',
    stripeAxis: 'btt',
  },
  StandTesting: {
    code3: 'STE',
    tokenVar: '--state-mr-release',
    ariaKey: 'tracks.stage.stand_testing',
    stripeAxis: 'btt',
  },
  EthalonTesting: {
    code3: 'ETH',
    tokenVar: '--state-in-test',
    ariaKey: 'tracks.stage.ethalon_testing',
    stripeAxis: 'btt',
  },
  ReleaseToLive: {
    code3: 'RTL',
    tokenVar: '--state-release-to-live',
    ariaKey: 'tracks.stage.release_to_live',
    stripeAxis: 'btt',
  },
};

const BACKEND_STAGE_META: Record<string, TrackStageMeta> = {
  CsApproving: {
    code3: 'CSA',
    tokenVar: '--warning',
    ariaKey: 'tracks.stage.cs_approving',
    stripeAxis: 'ttb',
  },
  Development: {
    code3: 'DEV',
    tokenVar: '--state-development',
    ariaKey: 'tracks.stage.development',
    stripeAxis: 'ttb',
  },
  StandTesting: {
    code3: 'STE',
    tokenVar: '--state-mr-release',
    ariaKey: 'tracks.stage.stand_testing',
    stripeAxis: 'ttb',
  },
  EthalonTesting: {
    code3: 'ETH',
    tokenVar: '--state-in-test',
    ariaKey: 'tracks.stage.ethalon_testing',
    stripeAxis: 'ttb',
  },
  ReleaseToLive: {
    code3: 'RTL',
    tokenVar: '--state-release-to-live',
    ariaKey: 'tracks.stage.release_to_live',
    stripeAxis: 'ttb',
  },
};

export function getTrackStageMeta(
  kind: FeatureTrackKind,
  stageKey: FeatureTrackStageKey,
): TrackStageMeta {
  const map = kind === 'Frontend' ? FRONTEND_STAGE_META : BACKEND_STAGE_META;
  const meta = map[stageKey];
  if (!meta) {
    return {
      code3: stageKey.slice(0, 3).toUpperCase(),
      tokenVar: '--state-not-started',
      ariaKey: 'tracks.stage.unknown',
      stripeAxis: kind === 'Frontend' ? 'btt' : 'ttb',
    };
  }
  return meta;
}
