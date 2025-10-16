import type { UserRole } from '../auth/auth';

export type { UserRole };

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  managerId?: number;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
}
