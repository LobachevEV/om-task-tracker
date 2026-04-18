import { useState } from 'react';
import { ROLE_LABEL_SHORT } from '../../shared/auth/roles';
import type { UserRole } from '../../shared/auth/roles';
import './InviteRow.css';

export type DeveloperRole = 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';

export interface InviteRowProps {
  onInvite: (args: { email: string; role: DeveloperRole }) => Promise<void>;
  disabled?: boolean;
  error?: string | null;
}

const DEVELOPER_ROLES: DeveloperRole[] = [
  'FrontendDeveloper',
  'BackendDeveloper',
  'Qa',
];

export function InviteRow({ onInvite, disabled = false }: InviteRowProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<DeveloperRole>('FrontendDeveloper');
  const [busy, setBusy] = useState(false);

  const isSubmitDisabled =
    !email || disabled || !DEVELOPER_ROLES.includes(role) || busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setBusy(true);
    try {
      await onInvite({ email, role });
      // On success, reset form
      setEmail('');
      setRole('FrontendDeveloper');
    } catch {
      // On error, preserve form state and let error bubble to parent
      // or handle error display if needed
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = (newRole: DeveloperRole) => {
    setRole(newRole);
  };

  return (
    <form className="invite-row" onSubmit={handleSubmit}>
      <div className="invite-row__plus">+</div>

      <input
        type="email"
        className="invite-row__email"
        placeholder="dev@onemore.dev · добавить по email · add by email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy || disabled}
        required
      />

      <div className="invite-row__role">
        {DEVELOPER_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={`invite-role-chip ${
              role === r ? 'invite-role-chip--on' : ''
            }`}
            onClick={() => handleRoleChange(r)}
            title={
              r === 'FrontendDeveloper'
                ? 'Фронтенд · Frontend'
                : r === 'BackendDeveloper'
                  ? 'Бэкенд · Backend'
                  : 'QA · QA'
            }
            disabled={busy || disabled}
          >
            {ROLE_LABEL_SHORT[r as UserRole]}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="primary-button invite-row__submit"
        disabled={isSubmitDisabled}
      >
        {busy ? 'Добавление…' : 'Добавить · Add'}
      </button>
    </form>
  );
}
