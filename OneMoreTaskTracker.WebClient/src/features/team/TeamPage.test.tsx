import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamPage from './TeamPage';
import * as teamApi from '../../shared/api/teamApi';

vi.mock('../../shared/api/teamApi');

const mockTeamApi = teamApi as any;

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

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load and display team roster', async () => {
    mockTeamApi.getRoster.mockResolvedValue(mockRoster);

    render(<TeamPage />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('manager@example.com')).toBeInTheDocument();
      expect(screen.getByText('dev@example.com')).toBeInTheDocument();
    });
  });

  it('should display error message on load failure', async () => {
    mockTeamApi.getRoster.mockRejectedValue(new Error('Failed to load roster'));

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading roster/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no members', async () => {
    mockTeamApi.getRoster.mockResolvedValue([]);

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText(/No team members/i)).toBeInTheDocument();
    });
  });

  it('should remove member on confirm', async () => {
    mockTeamApi.getRoster.mockResolvedValue(mockRoster);
    mockTeamApi.removeMember.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('dev@example.com')).toBeInTheDocument();
    });

    // Click remove button for the developer
    const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i });
    await user.click(removeButtons[0]);

    // Confirm removal
    const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockTeamApi.removeMember).toHaveBeenCalledWith(5);
    });
  });

  it('should refetch roster after member removal', async () => {
    mockTeamApi.getRoster.mockResolvedValue(mockRoster);
    mockTeamApi.removeMember.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText('dev@example.com')).toBeInTheDocument();
    });

    // First call to getRoster in useEffect
    expect(mockTeamApi.getRoster).toHaveBeenCalledTimes(1);

    // Remove a member
    const removeButtons = screen.getAllByRole('button', { name: /remove|delete/i });
    await user.click(removeButtons[0]);

    const confirmButton = await screen.findByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);

    await waitFor(() => {
      // Should be called again after removal
      expect(mockTeamApi.getRoster).toHaveBeenCalledTimes(2);
    });
  });
});
