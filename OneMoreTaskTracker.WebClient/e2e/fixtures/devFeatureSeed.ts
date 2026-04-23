// Mirror of OneMoreTaskTracker.Features/Features/Data/DevFeatureSeeder.cs —
// seeded only when ASPNETCORE_ENVIRONMENT=Development. Update both sides when
// the roster changes.
//
// Owned by the canonical seeded manager (see ./devSeed.ts DEV_MANAGER).

export type DevFeatureState =
  | 'CsApproving'
  | 'Development'
  | 'Testing'
  | 'EthalonTesting'
  | 'LiveRelease';

export interface SeedFeature {
  readonly title: string;
  readonly description: string;
  readonly state: DevFeatureState;
  readonly plannedStart: string; // YYYY-MM-DD
  readonly plannedEnd: string;   // YYYY-MM-DD
  readonly leadEmail: string;    // mirrors LeadUserId via the Users seed roster
}

// Backend IDs come from the Users seeder insert order:
//   1 manager@example.com
//   2 alice.frontend@example.com
//   3 bob.frontend@example.com
//   4 charlie.backend@example.com
//   5 dave.backend@example.com
//   6 eve.qa@example.com
export const DEV_SEED_FEATURES: readonly SeedFeature[] = [
  {
    title: 'Checkout redesign',
    description: 'Ship the new multi-step checkout flow end to end.',
    state: 'Development',
    plannedStart: '2026-04-01',
    plannedEnd:   '2026-06-15',
    leadEmail: 'alice.frontend@example.com',
  },
  {
    title: 'Search infra upgrade',
    description: 'Move full-text search to the new backend cluster.',
    state: 'CsApproving',
    plannedStart: '2026-05-01',
    plannedEnd:   '2026-07-31',
    leadEmail: 'charlie.backend@example.com',
  },
  {
    title: 'Legacy API sunset',
    description: 'Retire v1 REST endpoints and migrate remaining callers.',
    state: 'LiveRelease',
    plannedStart: '2026-01-15',
    plannedEnd:   '2026-03-30',
    leadEmail: 'manager@example.com',
  },
];
