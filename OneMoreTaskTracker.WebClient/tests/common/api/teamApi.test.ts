import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as teamApi from '../../../src/common/api/teamApi';

// Mock the httpClient
vi.mock('../../../src/common/api/httpClient', () => ({
  API_BASE_URL: 'http://localhost:5000',
  authHeaders: () => ({ Authorization: 'Bearer test-token' }),
  handleResponse: vi.fn(async (response: Response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'HTTP Error');
    }
    if (response.status === 204) {
      return undefined;
    }
    return response.json();
  }),
}));

describe('teamApi', () => {
  const mockFetch = window.fetch as unknown as ReturnType<typeof vi.fn>;

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

  describe('getRoster', () => {
    it('should GET /api/team/members and return roster', async () => {
      const mockRoster = [
        {
          userId: 7,
          email: 'manager@example.com',
          role: 'Manager',
          managerId: null,
          displayName: 'Manager',
          isSelf: true,
          status: {
            active: 2,
            lastActive: null,
            mix: { inDev: 1, mrToRelease: 1, inTest: 0, mrToMaster: 0, completed: 0 },
          },
        },
        {
          userId: 5,
          email: 'dev@example.com',
          role: 'FrontendDeveloper',
          managerId: 7,
          displayName: 'Dev',
          isSelf: false,
          status: {
            active: 1,
            lastActive: '2026-04-18T10:00:00Z',
            mix: { inDev: 1, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRoster,
      });

      const result = await teamApi.getRoster();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/team/members',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );

      expect(result).toEqual(mockRoster);
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

      await expect(teamApi.getRoster()).rejects.toThrow();
    });

    it('should throw error on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 'invalid_manager',
          message: 'Manager not found',
        }),
      });

      await expect(teamApi.getRoster()).rejects.toThrow();
    });
  });

  describe('removeMember', () => {
    it('should DELETE /api/team/members/{userId} and return 204', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await teamApi.removeMember(5);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/team/members/5',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
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

      await expect(teamApi.removeMember(5)).rejects.toThrow();
    });

    it('should throw error on 403 Forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          code: 'forbidden',
          message: 'User is not on your team',
        }),
      });

      await expect(teamApi.removeMember(5)).rejects.toThrow();
    });

    it('should throw error on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          code: 'not_found',
          message: 'User not found',
        }),
      });

      await expect(teamApi.removeMember(9999)).rejects.toThrow();
    });
  });
});
