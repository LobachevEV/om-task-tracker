import type { FeatureState } from '../../shared/types/feature';

export interface FeatureStateEntry {
  state: FeatureState;
  i18nKey: `state.${FeatureState}`;
  cssVar: string;
}

export const FEATURE_STATE_ENTRIES: readonly FeatureStateEntry[] = [
  { state: 'CsApproving',    i18nKey: 'state.CsApproving',    cssVar: '--state-not-started' },
  { state: 'Development',    i18nKey: 'state.Development',    cssVar: '--state-in-dev' },
  { state: 'Testing',        i18nKey: 'state.Testing',        cssVar: '--state-in-test' },
  { state: 'EthalonTesting', i18nKey: 'state.EthalonTesting', cssVar: '--state-mr-master' },
  { state: 'LiveRelease',    i18nKey: 'state.LiveRelease',    cssVar: '--state-completed' },
] as const;

export const FEATURE_STATE_CSS: Readonly<Record<FeatureState, string>> =
  Object.fromEntries(FEATURE_STATE_ENTRIES.map((e) => [e.state, e.cssVar])) as Readonly<
    Record<FeatureState, string>
  >;

/**
 * 0..4 canonical ordering of feature states, used for O(1) active-stage
 * index lookups without scanning `FEATURE_STATES`. Exported for consumers
 * who need to compare "stage x is before / equal / after current state".
 */
export const FEATURE_STATE_ORDER: Readonly<Record<FeatureState, number>> =
  Object.fromEntries(
    FEATURE_STATE_ENTRIES.map((e, index) => [e.state, index]),
  ) as Readonly<Record<FeatureState, number>>;
