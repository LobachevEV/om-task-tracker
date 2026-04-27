import type { IntegrationKind } from '../../integrationStatus';

/**
 * Monoline 14x14 SVG path data for each integration icon. Extracted from the
 * component file so IntegrationIcon.tsx satisfies the Vite fast-refresh
 * "only exports components" rule.
 */
export const SVG_PATHS: Record<IntegrationKind | 'slack', string> = {
  git: 'M6 3a3 3 0 110 6 3 3 0 010-6zM6 12a6 6 0 100-12 6 6 0 000 12zM10 7a1 1 0 11-2 0 1 1 0 012 0z',
  jira: 'M2 3h10v2H2V3zm0 4h10v2H2V7zm0 4h10v2H2v-2zm0 4h10v2H2v-2z',
  confluence: 'M2 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm6 0H4v8h4V2zm4 0h-2v8h2V2z',
  slack: 'M3 5a2 2 0 012-2h2a2 2 0 012 2v2H5a2 2 0 00-2 2v2a2 2 0 002 2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2h2V7H3V5z',
};
