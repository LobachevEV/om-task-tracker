import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Roster } from './Roster';
import type { TeamRosterMember } from '../../shared/api/teamApi';

const createMember = (
  userId: number,
  displayName: string,
  role: string = 'FrontendDeveloper',
  isSelf = false,
  lastActive: string | null = null
): TeamRosterMember => ({
  userId,
  email: `user${userId}@example.com`,
  displayName,
  role,
  managerId: 1,
  isSelf,
  status: {
    active: 1,
    lastActive,
    mix: {
      inDev: 1,
      mrToRelease: 0,
      inTest: 0,
      mrToMaster: 0,
      completed: 0,
    },
  },
});

describe('Roster', () => {
  it('pins self row with YOU chip', () => {
    const members = [
      createMember(1, 'Bob', 'Manager', true),
      createMember(2, 'Alice', 'FrontendDeveloper'),
    ];

    const { container } = render(<Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />);

    const rows = container.querySelectorAll('tbody tr');
    // First tbody row should be self
    expect(rows[0]).toHaveClass('roster-table__row--self');
    expect(screen.getByText(/ВЫ/)).toBeInTheDocument();
  });

  it('shows menu only for non-self rows when viewer is Manager', () => {
    const members = [
      createMember(1, 'Manager User', 'Manager', true),
      createMember(2, 'Developer User', 'FrontendDeveloper', false),
    ];

    const { container } = render(
      <Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />
    );

    const menus = container.querySelectorAll('.row-menu');
    expect(menus).toHaveLength(1); // Only one menu for the non-self row
  });

  it('hides menu for self row even when Manager', () => {
    const members = [createMember(1, 'Manager User', 'Manager', true)];

    const { container } = render(
      <Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />
    );

    const menus = container.querySelectorAll('.row-menu');
    expect(menus).toHaveLength(0);
  });

  it('hides menu when viewer is Developer', () => {
    const members = [
      createMember(1, 'Dev User', 'FrontendDeveloper', true),
      createMember(2, 'Other Dev', 'BackendDeveloper', false),
    ];

    const { container } = render(
      <Roster members={members} viewerRole="FrontendDeveloper" onRemoveClick={vi.fn()} />
    );

    const menus = container.querySelectorAll('.row-menu');
    expect(menus).toHaveLength(0);
  });

  it('displays member name and email', () => {
    const members = [createMember(1, 'Alice Smith', 'FrontendDeveloper')];

    render(<Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
  });

  it('displays role badge', () => {
    const members = [createMember(1, 'Alice', 'BackendDeveloper')];

    render(<Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />);

    expect(screen.getByText(/Бэкенд/)).toBeInTheDocument();
  });

  it('displays active count', () => {
    const members = [
      {
        ...createMember(1, 'Alice', 'FrontendDeveloper'),
        status: {
          active: 5,
          lastActive: null,
          mix: {
            inDev: 2,
            mrToRelease: 1,
            inTest: 1,
            mrToMaster: 1,
            completed: 0,
          },
        },
      },
    ];

    render(<Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onRemoveClick when menu item clicked', async () => {
    const onRemoveClick = vi.fn();
    const members = [
      createMember(1, 'Manager', 'Manager', true),
      createMember(2, 'Developer', 'FrontendDeveloper'),
    ];

    const { container } = render(
      <Roster members={members} viewerRole="Manager" onRemoveClick={onRemoveClick} />
    );

    const trigger = container.querySelector('.row-menu__trigger') as HTMLButtonElement;
    trigger?.click();

    // Wait for menu to open
    const removeItem = await screen.findByText(/Удалить из команды/);
    removeItem.click();

    expect(onRemoveClick).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, displayName: 'Developer' })
    );
  });

  it('renders StateBar for mix data', () => {
    const members = [
      {
        ...createMember(1, 'Alice', 'FrontendDeveloper'),
        status: {
          active: 4,
          lastActive: null,
          mix: {
            inDev: 2,
            mrToRelease: 1,
            inTest: 1,
            mrToMaster: 0,
            completed: 0,
          },
        },
      },
    ];

    const { container } = render(
      <Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />
    );

    const statebar = container.querySelector('.statebar');
    expect(statebar).toBeInTheDocument();
  });

  it('renders last active time', () => {
    const members = [
      createMember(1, 'Alice', 'FrontendDeveloper', true, '2026-04-18T11:30:00Z'),
    ];

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));

    render(<Roster members={members} viewerRole="Manager" onRemoveClick={vi.fn()} />);

    expect(screen.getByText(/30 мин назад/)).toBeInTheDocument();

    vi.useRealTimers();
  });
});
