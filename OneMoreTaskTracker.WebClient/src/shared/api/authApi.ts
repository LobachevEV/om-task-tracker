import { API_BASE_URL, handleResponse } from './httpClient';
import { authResponseSchema } from './schemas';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return authResponseSchema.parse(data);
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return authResponseSchema.parse(data);
}
