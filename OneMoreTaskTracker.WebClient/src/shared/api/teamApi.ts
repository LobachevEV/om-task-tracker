import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import type { DeveloperRole } from '../../features/team/InviteRow';

export interface InviteMemberResponse {
  userId: number;
  email: string;
  role: DeveloperRole;
  managerId: number;
  temporaryPassword: string;
}

export interface StateMix {
  inDev: number;
  mrToRelease: number;
  inTest: number;
  mrToMaster: number;
  completed: number;
}

export interface UserStatus {
  active: number;
  lastActive: string | null;
  mix: StateMix;
}

export interface TeamRosterMember {
  userId: number;
  email: string;
  role: string;
  managerId: number | null;
  displayName: string;
  isSelf: boolean;
  status: UserStatus;
}

export async function inviteMember(args: {
  email: string;
  role: DeveloperRole;
}): Promise<InviteMemberResponse> {
  const response = await fetch(`${API_BASE_URL}/api/team/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(args),
  });

  const data = await handleResponse<unknown>(response);
  return data as InviteMemberResponse;
}

export async function getRoster(): Promise<TeamRosterMember[]> {
  const response = await fetch(`${API_BASE_URL}/api/team/members`, {
    method: 'GET',
    headers: {
      ...authHeaders(),
    },
  });

  const data = await handleResponse<unknown>(response);
  return data as TeamRosterMember[];
}

export async function removeMember(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/team/members/${userId}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
    },
  });

  await handleResponse<void>(response);
}
