import type { MiniTeamMember } from '../../common/types/feature';

/**
 * Side tag vocabulary used on the Gantt stage timeline. Derived from the
 * performer's role on the FE — the shared contract does not carry a `side`
 * field. See gan-harness-feature/gantt-feature-info/codebase-context.md
 * "Side Tag Derivation".
 */
export type StageSide = 'Back' | 'Front' | 'Common';

/**
 * Derive the display `Side` tag for a stage from its performer's role.
 *
 * - `BackendDeveloper`  → `Back`
 * - `FrontendDeveloper` → `Front`
 * - `Manager` / `Qa`    → `Common` (Manager owns CS approving / Live release;
 *                         QA spans both Back and Front during Testing)
 * - unknown role        → `Common` + a single `console.warn` (enum-fallback
 *                         rule from microservices/composition.md).
 */
export function roleToSide(role: MiniTeamMember['role'] | string | undefined | null): StageSide {
  switch (role) {
    case 'BackendDeveloper':
      return 'Back';
    case 'FrontendDeveloper':
      return 'Front';
    case 'Manager':
    case 'Qa':
      return 'Common';
    default:
      console.warn(`[gantt] roleToSide: unknown role "${String(role)}", falling back to Common`);
      return 'Common';
  }
}
