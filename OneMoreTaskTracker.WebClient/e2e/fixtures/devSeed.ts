// Mirror of OneMoreTaskTracker.Users/Data/DevDataSeeder.cs — seeded only when
// ASPNETCORE_ENVIRONMENT=Development. Update both sides when roster changes.
import type { UserRole } from '../../src/common/auth/roles';

export const DEV_SEED_PASSWORD = 'Password123!';

export interface SeedUser {
  readonly email: string;
  readonly role: UserRole;
  readonly displayNameHint: string;
}

export const DEV_MANAGER: SeedUser = {
  email: 'manager@example.com',
  role: 'Manager',
  displayNameHint: 'manager',
};

export const DEV_DEVELOPERS: readonly SeedUser[] = [
  { email: 'alice.frontend@example.com',   role: 'FrontendDeveloper', displayNameHint: 'alice' },
  { email: 'bob.frontend@example.com',     role: 'FrontendDeveloper', displayNameHint: 'bob' },
  { email: 'charlie.backend@example.com',  role: 'BackendDeveloper',  displayNameHint: 'charlie' },
  { email: 'dave.backend@example.com',     role: 'BackendDeveloper',  displayNameHint: 'dave' },
  { email: 'eve.qa@example.com',           role: 'Qa',                displayNameHint: 'eve' },
];

export const DEV_ALL_USERS: readonly SeedUser[] = [DEV_MANAGER, ...DEV_DEVELOPERS];
