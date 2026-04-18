import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { isDeveloperRole } from '../../shared/auth/roles';
import type { UserRole } from '../../shared/auth/roles';
import * as teamApi from '../../shared/api/teamApi';
import type { TeamRosterMember } from '../../shared/api/teamApi';
import { InviteRow } from './InviteRow';
import type { DeveloperRole } from './InviteRow';
import { Roster } from './Roster';
import { StateBarLegend } from './StateBarLegend';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { sortRoster } from './sort';
import './TeamPage.css';

interface PasswordToast {
  email: string;
  role: UserRole;
  password: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  if (!user) return null; // Should not happen due to ProtectedRoute, but guard anyway

  const viewerRole = user.role as UserRole;
  const isManager = viewerRole === 'Manager';
  const isDev = isDeveloperRole(viewerRole);

  const [roster, setRoster] = useState<TeamRosterMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<TeamRosterMember | null>(null);
  const [passwordToast, setPasswordToast] = useState<PasswordToast | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const loadRoster = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await teamApi.getRoster();
      setRoster(data);
    } catch (err) {
      setLoadError('Не удалось загрузить команду · Could not load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  // Auto-dismiss toast after 30 seconds
  useEffect(() => {
    if (passwordToast) {
      const timer = setTimeout(() => {
        setPasswordToast(null);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [passwordToast]);

  const handleInvite = async (args: { email: string; role: DeveloperRole }) => {
    try {
      setInviteError(null);
      const response = await teamApi.inviteMember(args);
      // Show toast with password
      setPasswordToast({
        email: args.email,
        role: args.role,
        password: response.temporaryPassword,
      });
      // Refetch roster
      await loadRoster();
    } catch (err: unknown) {
      // Parse error response
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setInviteError(errorMsg);
      throw err; // Re-throw so InviteRow can handle it
    }
  };

  const handleRemoveClick = (member: TeamRosterMember) => {
    setConfirmRemoveUser(member);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveUser) return;

    try {
      setRemoveError(null);
      const userId = confirmRemoveUser.userId;
      await teamApi.removeMember(userId);
      setConfirmRemoveUser(null);
      await loadRoster();
    } catch (err) {
      // Show error and don't close dialog; user can dismiss and retry
      setRemoveError('Не удалось удалить участника · Could not remove member');
    }
  };

  const handleCancelRemove = () => {
    setConfirmRemoveUser(null);
    setRemoveError(null);
  };

  // Filter roster by query
  let filteredRoster = roster || [];
  if (query) {
    const q = query.toLowerCase();
    filteredRoster = filteredRoster.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }

  // Sort roster
  const sortedRoster = sortRoster(filteredRoster, user.userId);

  // Count developers in unfiltered roster
  const developerCount = (roster || []).filter(
    (m) => !m.isSelf && m.role !== 'Manager'
  ).length;

  // Determine if showing empty state:
  // - Show if filter results in zero rows AND
  // - Either there's an active filter OR the team has more than just self
  const showEmptyState = sortedRoster.length === 0 && (query || (roster || []).length > 1);

  if (loadError) {
    return (
      <div className="team-page">
        <div className="team-page__error">
          <p>{loadError}</p>
          <button onClick={loadRoster} className="secondary-button">
            Повторить · Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="team-main">
      <div className="team-page">
        {/* Team toolbar */}
        <div className="team-toolbar">
          <div className="team-toolbar__info">
            <h1 className="team-toolbar__title">Моя команда · My team</h1>
            <p className="team-toolbar__summary">
              {isManager ? (
                <>
                  Менеджер · Manager: <strong>{user.email}</strong> · {developerCount > 0 ? `${developerCount} разраб. · developers` : 'команда пуста · team is empty'}
                </>
              ) : (
                <>
                  Менеджер · Manager: <strong>{roster?.[0]?.displayName}</strong> · {developerCount} разраб. · developers
                </>
              )}
            </p>
          </div>
          <div className="team-toolbar__search">
            <input
              type="text"
              placeholder="Поиск · Search by name / email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="team-search-input"
            />
          </div>
        </div>

        {/* Invite row (Manager only) */}
        {isManager && (
          <InviteRow
            onInvite={handleInvite}
            disabled={loading}
          />
        )}

        {/* Invite error banner */}
        {inviteError && (
          <div className="team-error-banner">
            {inviteError}
          </div>
        )}

        {/* Password toast */}
        {passwordToast && (
          <div className="team-toast">
            <div className="team-toast__content">
              <p>
                {passwordToast.email} добавлен как {passwordToast.role}. Временный пароль:{' '}
                <code className="team-toast__password">{passwordToast.password}</code>
              </p>
            </div>
            <div className="team-toast__actions">
              <button
                className="team-toast__copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(passwordToast.password);
                }}
              >
                Copy · Скопировать
              </button>
              <button
                className="team-toast__close-btn"
                onClick={() => setPasswordToast(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Read-only banner (Developer only) */}
        {isDev && (
          <div className="team-readonly-note">
            Только для просмотра. Управлять командой может менеджер · Read-only — only managers can modify.
          </div>
        )}

        {/* State legend */}
        <StateBarLegend />

        {/* Loading spinner */}
        {loading && (
          <div className="team-page__spinner">
            <div className="spinner" aria-label="Loading" />
          </div>
        )}

        {/* Empty state */}
        {!loading && showEmptyState && (
          <div className="team-empty-state">
            Никого не найдено · No members match
          </div>
        )}

        {/* Roster table */}
        {!loading && !showEmptyState && sortedRoster.length > 0 && (
          <Roster
            members={sortedRoster}
            viewerRole={viewerRole}
            onRemoveClick={handleRemoveClick}
          />
        )}

        {/* Remove error */}
        {removeError && (
          <div className="team-error-banner">
            {removeError}
          </div>
        )}

        {/* Remove confirm dialog */}
        <ConfirmDialog
          isOpen={!!confirmRemoveUser}
          title="Удалить из команды · Remove from team"
          message={
            confirmRemoveUser
              ? `${confirmRemoveUser.displayName} (${confirmRemoveUser.email}) будет удалён из вашей команды. Задачи останутся, но без исполнителя.`
              : ''
          }
          confirmLabel="Удалить · Remove"
          cancelLabel="Отмена · Cancel"
          onConfirm={handleConfirmRemove}
          onCancel={handleCancelRemove}
        />
      </div>
    </div>
  );
}
