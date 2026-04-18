import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as teamApi from '../teamApi';

// Mock the httpClient
vi.mock('../httpClient', () => ({
  API_BASE_URL: 'http://localhost:5000',
  authHeaders: () => ({ Authorization: 'Bearer test-token' }),
  handleResponse: vi.fn(async (response: any) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'HTTP Error');
    }
    return response.json();
  }),
}));

describe('teamApi', () => {
  const mockFetch = window.fetch as any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('inviteMember', () => {
    it('should POST to /api/team/members with email and role', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          userId: 42,
          email: 'dev@example.com',
          role: 'FrontendDeveloper',
          managerId: 7,
          temporaryPassword: 'Xa7$9kLmPq2v',
        }),
      });

      const result = await teamApi.inviteMember({
        email: 'dev@example.com',
        role: 'FrontendDeveloper',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/team/members',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: 'dev@example.com',
            role: 'FrontendDeveloper',
          }),
        })
      );

      expect(result).toEqual({
        userId: 42,
        email: 'dev@example.com',
        role: 'FrontendDeveloper',
        managerId: 7,
        temporaryPassword: 'Xa7$9kLmPq2v',
      });
    });

    it('should throw error on 409 Conflict with email_already_registered code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'email_already_registered',
          message: 'Этот email уже зарегистрирован',
        }),
      });

      await expect(
        teamApi.inviteMember({
          email: 'existing@example.com',
          role: 'FrontendDeveloper',
        })
      ).rejects.toThrow();
    });

    it('should throw error on 400 Bad Request for invalid email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'validation_error',
          message: 'Некорректный email',
        }),
      });

      await expect(
        teamApi.inviteMember({
          email: 'invalid-email',
          role: 'FrontendDeveloper',
        })
      ).rejects.toThrow();
    });

    it('should throw error on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          code: 'unauthorized',
          message: 'Session expired',
        }),
      });

      await expect(
        teamApi.inviteMember({
          email: 'dev@example.com',
          role: 'FrontendDeveloper',
        })
      ).rejects.toThrow();
    });

    it('should throw error on 403 Forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          code: 'forbidden',
          message: 'Only a manager can add members',
        }),
      });

      await expect(
        teamApi.inviteMember({
          email: 'dev@example.com',
          role: 'FrontendDeveloper',
        })
      ).rejects.toThrow();
    });

    it('should include Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          userId: 42,
          email: 'dev@example.com',
          role: 'FrontendDeveloper',
          managerId: 7,
          temporaryPassword: 'password',
        }),
      });

      await teamApi.inviteMember({
        email: 'dev@example.com',
        role: 'BackendDeveloper',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });
});
