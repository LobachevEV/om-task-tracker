import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import type { DeveloperRole } from '../../features/team/InviteRow';

export interface InviteMemberResponse {
  userId: number;
  email: string;
  role: DeveloperRole;
  managerId: number;
  temporaryPassword: string;
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
