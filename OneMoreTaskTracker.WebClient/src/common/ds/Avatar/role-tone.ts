import type { AvatarTone } from './Avatar';

const ROLE_TO_TONE: Record<string, AvatarTone> = {
  Manager: 'manager',
  FrontendDeveloper: 'frontend',
  BackendDeveloper: 'backend',
  Qa: 'qa',
};

export function roleToAvatarTone(role: string): AvatarTone {
  return ROLE_TO_TONE[role] ?? 'default';
}
