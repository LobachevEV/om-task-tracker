import type { IntegrationKind } from './IntegrationIcon';

/**
 * Monoline 14×14 SVG path data for each integration brand.
 * Extracted here so IntegrationIcon.tsx satisfies the Vite fast-refresh
 * "only exports components" rule.
 */
export const SVG_PATHS: Record<IntegrationKind, string> = {
  gitlab:
    'M6 3a3 3 0 110 6 3 3 0 010-6zM6 12a6 6 0 100-12 6 6 0 000 12zM10 7a1 1 0 11-2 0 1 1 0 012 0z',
  github:
    'M7 0C3.13 0 0 3.13 0 7c0 3.09 2.01 5.72 4.79 6.65.35.06.48-.15.48-.34v-1.2c-1.95.42-2.36-.94-2.36-.94-.32-.81-.78-1.02-.78-1.02-.64-.44.05-.43.05-.43.7.05 1.07.72 1.07.72.62 1.07 1.64.76 2.04.58.06-.45.24-.76.44-.94-1.56-.18-3.2-.78-3.2-3.47 0-.77.27-1.39.72-1.88-.07-.18-.31-.89.07-1.85 0 0 .59-.19 1.93.72a6.7 6.7 0 011.76-.24c.6 0 1.2.08 1.76.24 1.34-.91 1.93-.72 1.93-.72.38.96.14 1.67.07 1.85.45.49.72 1.11.72 1.88 0 2.7-1.64 3.29-3.21 3.47.25.22.48.65.48 1.31v1.94c0 .19.13.4.49.34C12 12.72 14 10.09 14 7c0-3.87-3.13-7-7-7z',
  jira: 'M2 3h10v2H2V3zm0 4h10v2H2V7zm0 4h10v2H2v-2zm0 4h10v2H2v-2z',
  confluence:
    'M2 2a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V2zm6 0H4v8h4V2zm4 0h-2v8h2V2z',
  slack:
    'M3 5a2 2 0 012-2h2a2 2 0 012 2v2H5a2 2 0 00-2 2v2a2 2 0 002 2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2h2V7H3V5z',
};
