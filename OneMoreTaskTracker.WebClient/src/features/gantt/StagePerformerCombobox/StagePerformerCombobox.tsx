import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../shared/types/feature';
import type { TeamRosterMember } from '../../../shared/api/teamApi';

/**
 * Typeahead combobox for assigning a per-stage performer.
 *
 * Keyboard contract (from design-brief §6):
 * - Typing filters the roster by `displayName` / `email` (case-insensitive).
 * - `Enter` commits the highlighted option (or the exact match if nothing
 *   is highlighted).
 * - `Escape` reverts to the previously committed value.
 * - `ArrowDown` / `ArrowUp` move the highlight.
 * - The "×" clear affordance resets to `Unassigned`.
 *
 * Display contract: the dropdown renders `"Name · Role"`; the closed input
 * shows the display name alone so the column stays scannable.
 *
 * Stale performer (design-brief §5): when `value` is set but the performer is
 * no longer on the roster (both the injected roster AND the resolved
 * `performer` detail payload come back null) the combobox renders a neutral
 * outline avatar + `"Name · removed"` copy + a `Reassign` link. This keeps
 * historic context visible instead of silently collapsing to "unassigned".
 */
export interface StagePerformerComboboxProps {
  value: number | null;
  roster: readonly TeamRosterMember[];
  onChange: (userId: number | null) => void;
  disabled?: boolean;
  /**
   * Accessible label for the input. Falls back to the i18n'd `stagePlan.performerLabel`
   * when omitted — but callers are expected to pass a stage-qualified label so screen
   * readers announce the row context.
   */
  ariaLabel?: string;
  /** When true, renders a plain-text read-only cell (viewer role). */
  readOnly?: boolean;
  /**
   * Optional resolved performer mini-member from `FeatureDetail.stagePlans[i].performer`.
   * Distinguishes "unassigned" (value=null && performer=null) from "stale"
   * (value!=null && performer=null), per api-contract.md + brief §5.
   */
  performer?: MiniTeamMember | null;
}

function roleSuffix(role: string): string {
  switch (role) {
    case 'FrontendDeveloper': return 'FE';
    case 'BackendDeveloper':  return 'BE';
    case 'Qa':                return 'QA';
    case 'Manager':           return 'PM';
    default:                  return role;
  }
}

function rosterMatches(member: TeamRosterMember, query: string): boolean {
  if (query === '') return true;
  const lower = query.toLowerCase();
  return (
    member.displayName.toLowerCase().includes(lower) ||
    member.email.toLowerCase().includes(lower) ||
    member.role.toLowerCase().includes(lower)
  );
}

export function StagePerformerCombobox({
  value,
  roster,
  onChange,
  disabled,
  ariaLabel,
  readOnly,
  performer,
}: StagePerformerComboboxProps) {
  const { t } = useTranslation('gantt');
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value == null ? null : roster.find((m) => m.userId === value) ?? null),
    [value, roster],
  );

  // A non-null value that the roster cannot resolve is a "stale" reference.
  // The referenced user is no longer on the manager's roster. If the detail
  // payload still echoes a resolved `performer` (historic audit data) we
  // surface their displayName in the removed copy; otherwise we fall back to
  // the generic "removed" label.
  const isStale = value != null && selected == null;
  const stalePerformerName = isStale ? performer?.displayName ?? null : null;

  const [query, setQuery] = useState<string>(selected?.displayName ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Track the previously-rendered `value` so we can sync the query string
  // DURING render when the parent mutates `value` externally — this avoids
  // the setState-in-effect anti-pattern while still keeping the input in
  // sync after a save/reset.
  const [lastValue, setLastValue] = useState<number | null>(value);
  if (value !== lastValue) {
    setLastValue(value);
    setQuery(selected?.displayName ?? '');
  }
  // Snapshot of committed value so Escape can revert an in-progress edit.
  const committedRef = useRef<number | null>(value);
  useEffect(() => {
    committedRef.current = value;
  }, [value]);

  const filtered = useMemo(() => {
    // If the input exactly matches the selected member's display name, show
    // the unfiltered roster — user is probably opening the dropdown to switch.
    const trimmed = query.trim();
    if (selected && trimmed === selected.displayName) return roster;
    return roster.filter((m) => rosterMatches(m, trimmed));
  }, [query, roster, selected]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Revert any typed-but-uncommitted query.
        setQuery(selected?.displayName ?? '');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, selected?.displayName]);

  const commit = useCallback(
    (userId: number | null) => {
      committedRef.current = userId;
      onChange(userId);
      const member = userId == null ? null : roster.find((m) => m.userId === userId) ?? null;
      setQuery(member?.displayName ?? '');
      setOpen(false);
    },
    [onChange, roster],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (open && filtered[highlight]) {
          commit(filtered[highlight].userId);
        } else if (!open) {
          setOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery(selected?.displayName ?? '');
        setOpen(false);
        break;
      default:
        // typing — already handled by onChange
        break;
    }
  };

  const clear = () => {
    commit(null);
    inputRef.current?.focus();
  };

  const handleReassign = () => {
    // Clearing first keeps the form payload honest (no dangling stale id)
    // and opens the combobox focused so the manager can pick a replacement
    // without an extra click.
    commit(null);
    setOpen(true);
    // Defer focus so the input exists post-commit render.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  if (readOnly) {
    return (
      <span className="stage-plan__performer stage-plan__performer--read-only">
        {selected ? (
          <>
            <span className="stage-plan__performer-name">{selected.displayName}</span>
            <span className="stage-plan__performer-role">{roleSuffix(selected.role)}</span>
          </>
        ) : isStale ? (
          <span
            className="stage-plan__performer-stale"
            data-testid="stage-performer-stale"
          >
            <span className="stage-plan__performer-stale-avatar" aria-hidden="true" />
            <span className="stage-plan__performer-name stage-plan__performer-name--muted">
              {stalePerformerName
                ? t('stagePlan.performerRemoved', { name: stalePerformerName })
                : t('stagePlan.performerRemovedUnknown', { defaultValue: 'removed' })}
            </span>
          </span>
        ) : (
          <span className="stage-plan__performer-unassigned">
            {t('stagePlan.unassigned', { defaultValue: 'Unassigned' })}
          </span>
        )}
      </span>
    );
  }

  if (isStale) {
    return (
      <div
        ref={rootRef}
        className="stage-plan__combobox stage-plan__combobox--stale"
        data-testid="stage-performer-stale"
      >
        <span className="stage-plan__performer-stale-avatar" aria-hidden="true" />
        <span className="stage-plan__performer-name stage-plan__performer-name--muted">
          {stalePerformerName
            ? t('stagePlan.performerRemoved', { name: stalePerformerName })
            : t('stagePlan.performerRemovedUnknown', { defaultValue: 'removed' })}
        </span>
        <button
          type="button"
          className="stage-plan__performer-reassign"
          onClick={handleReassign}
          disabled={disabled}
        >
          {t('stagePlan.reassign', { defaultValue: 'Reassign' })}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="stage-plan__combobox"
      data-open={open ? 'true' : 'false'}
    >
      <input
        ref={inputRef}
        type="text"
        className="stage-plan__combobox-input"
        role="combobox"
        aria-label={ariaLabel ?? t('stagePlan.performerLabel', { defaultValue: 'Performer' })}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && filtered[highlight] ? `${listboxId}-opt-${filtered[highlight].userId}` : undefined
        }
        placeholder={t('stagePlan.unassigned', { defaultValue: 'Unassigned' })}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={handleKeyDown}
      />

      {value != null && !disabled ? (
        <button
          type="button"
          className="stage-plan__combobox-clear"
          aria-label={t('stagePlan.clearPerformer', { defaultValue: 'Clear performer' })}
          onClick={clear}
          tabIndex={-1}
        >
          ×
        </button>
      ) : null}

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="stage-plan__combobox-list"
        >
          {filtered.length === 0 ? (
            <li className="stage-plan__combobox-empty" role="option" aria-selected="false">
              {t('stagePlan.performerEmpty', {
                defaultValue: 'No teammate matches "{{query}}".',
                query,
              })}
            </li>
          ) : (
            filtered.map((member, idx) => {
              const active = idx === highlight;
              const isSelected = member.userId === value;
              return (
                <li
                  key={member.userId}
                  id={`${listboxId}-opt-${member.userId}`}
                  role="option"
                  aria-selected={isSelected}
                  className="stage-plan__combobox-option"
                  data-active={active ? 'true' : 'false'}
                  onMouseDown={(e) => {
                    // Prevent input blur before click can fire.
                    e.preventDefault();
                    commit(member.userId);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <span className="stage-plan__performer-name">{member.displayName}</span>
                  <span className="stage-plan__performer-sep">·</span>
                  <span className="stage-plan__performer-role">{roleSuffix(member.role)}</span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
