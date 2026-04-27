import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { isDeveloperRole } from '../../../common/auth/roles';
import type { UserRole } from '../../../common/auth/roles';
import * as teamApi from '../../../common/api/teamApi';
import type { TeamRosterMember } from '../../../common/api/teamApi';
import { InviteRow } from '../InviteRow';
import type { DeveloperRole } from '../InviteRow';
import { Roster } from '../Roster';
import { StateBarLegend } from '../StateBarLegend';
import { ConfirmDialog } from '../../../common/components/ConfirmDialog';
import { Button, Callout } from '../../../common/ds';
import { sortRoster } from '../sort';
import './TeamPage.css';

const TOAST_AUTO_DISMISS_MS = 30_000;

interface PasswordToast {
  email: string;
  role: UserRole;
  password: string;
}

export default function TeamPage() {
  const { t } = useTranslation('team');
  const { user } = useAuth();

  const [roster, setRoster] = useState<TeamRosterMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<TeamRosterMember | null>(null);
  const [passwordToast, setPasswordToast] = useState<PasswordToast | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const loadRoster = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await teamApi.getRoster();
      setRoster(data);
    } catch {
      setLoadError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (passwordToast) {
      const timer = setTimeout(() => {
        setPasswordToast(null);
      }, TOAST_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [passwordToast]);

  const viewerUserId = user?.userId ?? 0;
  const sortedRoster = useMemo(() => {
    const source = roster ?? [];
    const filtered = query
      ? source.filter((m) => {
          const q = query.toLowerCase();
          return (
            m.displayName.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q)
          );
        })
      : source;
    return sortRoster(filtered, viewerUserId);
  }, [roster, query, viewerUserId]);

  const developerCount = useMemo(
    () => (roster ?? []).filter((m) => !m.isSelf && m.role !== 'Manager').length,
    [roster],
  );

  if (!user) return null;

  const viewerRole = user.role as UserRole;
  const isManager = viewerRole === 'Manager';
  const isDev = isDeveloperRole(viewerRole);

  const handleInvite = async (args: { email: string; role: DeveloperRole }) => {
    try {
      setInviteError(null);
      const response = await teamApi.inviteMember(args);
      setPasswordToast({
        email: args.email,
        role: args.role,
        password: response.temporaryPassword,
      });
      await loadRoster();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setInviteError(errorMsg);
      throw err;
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
    } catch {
      setRemoveError(t('removeFailed'));
    }
  };

  const handleCancelRemove = () => {
    setConfirmRemoveUser(null);
    setRemoveError(null);
  };

  const showEmptyState =
    sortedRoster.length === 0 && (query !== '' || (roster ?? []).length > 1);

  if (loadError) {
    return (
      <div className="app-shell">
        <main className="team-main">
          <div className="team-page">
            <Callout
              tone="danger"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void loadRoster();
                  }}
                >
                  {t('retry')}
                </Button>
              }
            >
              {loadError}
            </Callout>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="team-main">
        <div className="team-page">
        <div className="team-toolbar">
          <div className="team-toolbar__info">
            <h1 className="team-toolbar__title">{t('title')}</h1>
            <p className="team-toolbar__summary">
              {isManager ? (
                <>
                  {t('managerLabel')}: <strong>{user.email}</strong> · {developerCount > 0 ? t('developersCount', { count: developerCount }) : t('emptyTeam')}
                </>
              ) : (
                <>
                  {t('managerLabel')}: <strong>{roster?.[0]?.displayName}</strong> · {t('developersCount', { count: developerCount })}
                </>
              )}
            </p>
          </div>
          <div className="team-toolbar__search">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="team-search-input"
            />
          </div>
        </div>

        {isManager && (
          <InviteRow
            onInvite={handleInvite}
            disabled={loading}
          />
        )}

        {inviteError && <Callout tone="danger">{inviteError}</Callout>}

        {passwordToast && (
          <div className="team-toast" role="status" aria-live="polite" aria-atomic="true">
            <div className="team-toast__content">
              <p>
                {t('passwordToast.message', { email: passwordToast.email, role: passwordToast.role })}{' '}
                <code className="team-toast__password">{passwordToast.password}</code>
              </p>
            </div>
            <div className="team-toast__actions">
              <button
                className="team-toast__copy-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(passwordToast.password);
                    setCopyState('copied');
                    setTimeout(() => setCopyState('idle'), 1500);
                  } catch {
                    setCopyState('error');
                    setTimeout(() => setCopyState('idle'), 2500);
                  }
                }}
              >
                {copyState === 'copied' ? t('passwordToast.copied') : copyState === 'error' ? t('passwordToast.copyError') : t('passwordToast.copy')}
              </button>
              <button
                className="team-toast__close-btn"
                onClick={() => {
                  setPasswordToast(null);
                  setCopyState('idle');
                }}
                aria-label={t('passwordToast.close')}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {isDev && <Callout tone="info">{t('readonly')}</Callout>}

        <StateBarLegend />

        {loading && (
          <div className="team-page__spinner">
            <div className="spinner" role="status" aria-label={t('loading')} />
          </div>
        )}

        {!loading && showEmptyState && (
          <div className="team-empty-state">
            {t('noMatches')}
          </div>
        )}

        {!loading && !showEmptyState && sortedRoster.length > 0 && (
          <Roster
            members={sortedRoster}
            viewerRole={viewerRole}
            onRemoveClick={handleRemoveClick}
          />
        )}

        {removeError && <Callout tone="danger">{removeError}</Callout>}

        <ConfirmDialog
          isOpen={!!confirmRemoveUser}
          title={t('remove.title')}
          message={
            confirmRemoveUser
              ? t('remove.message', { name: confirmRemoveUser.displayName, email: confirmRemoveUser.email })
              : ''
          }
          confirmLabel={t('remove.confirm')}
          onConfirm={handleConfirmRemove}
          onCancel={handleCancelRemove}
        />
      </div>
      </main>
    </div>
  );
}
