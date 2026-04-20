import type { StateMix } from '../../shared/api/teamApi';

export interface TeamStateEntry {
  key: keyof StateMix;
  i18nKey: string;
  cssVar: string;
}

export const TEAM_STATE_ENTRIES: readonly TeamStateEntry[] = [
  { key: 'inDev', i18nKey: 'state.InDev', cssVar: '--state-in-dev' },
  { key: 'mrToRelease', i18nKey: 'state.MrToRelease', cssVar: '--state-mr-release' },
  { key: 'inTest', i18nKey: 'state.InTest', cssVar: '--state-in-test' },
  { key: 'mrToMaster', i18nKey: 'state.MrToMaster', cssVar: '--state-mr-master' },
  { key: 'completed', i18nKey: 'state.Completed', cssVar: '--state-completed' },
] as const;
