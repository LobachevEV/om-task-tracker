import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import { InlineCellChevron } from './InlineCellChevron';
import { InlineCellError } from './InlineCellError';
import './InlineEditors.css';

export interface InlineOwnerPickerProps {
  /** Committed stageOwnerUserId — null means "unassigned". */
  value: number | null;
  /** Manager's roster — source of the filterable list. */
  roster: readonly TeamRosterMember[];
  /** Display-name fallback for the closed-cell label; resolved outside. */
  displayName: string | null;
  /** Commit handler — throw on failure so the cell rolls back. */
  onSave: (next: number | null) => Promise<void>;
  /** Accessible label — must carry field + stage + feature context. */
  ariaLabel: string;
  /** Disable the editor (viewer role / submitting). */
  readOnly?: boolean;
  /** Hook into the test id seam. */
  testId?: string;
  /** Relay a commit outcome into the parent's aria-live region. */
  onAnnounce?: (message: string) => void;
  /** Build the announcement message. */
  buildAnnouncement?: (outcome: 'saved' | 'error', value: number | null, error: InlineEditorError | null) => string;
}

function rosterMatches(m: TeamRosterMember, q: string): boolean {
  if (q === '') return true;
  const lower = q.toLowerCase();
  return (
    m.displayName.toLowerCase().includes(lower) ||
    m.email.toLowerCase().includes(lower) ||
    m.role.toLowerCase().includes(lower)
  );
}

/**
 * Per-stage owner cell. Click / focus opens an anchored listbox; typing
 * filters; arrow keys + Enter select. Iter 1 skeleton — anchoring is
 * static (below the cell); viewport-edge flipping + refetch-on-open land
 * in Phase B.
 */
export function InlineOwnerPicker({
  value,
  roster,
  displayName,
  onSave,
  ariaLabel,
  readOnly,
  testId,
  onAnnounce,
  buildAnnouncement,
}: InlineOwnerPickerProps) {
  const { t } = useTranslation('gantt');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const editor = useInlineFieldEditor<number | null>({
    committed: value,
    onSave,
    buildAnnouncement,
    onAnnounce,
    formatRejectedLabel: (next) => resolveOwnerLabel(next, roster),
  });

  const [query, setQuery] = useState<string>(displayName ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Sync the filter text when the committed value changes (e.g. after save).
  // Use a state-tracking pattern (not a ref read during render) to satisfy
  // the React Compiler strict lint.
  const [trackedValue, setTrackedValue] = useState<number | null>(value);
  if (trackedValue !== value) {
    setTrackedValue(value);
    setQuery(displayName ?? '');
  }

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    // When the input matches the committed display name exactly, surface
    // the full roster — the user is probably opening to switch.
    if (displayName && trimmed === displayName) return roster;
    return roster.filter((m) => rosterMatches(m, trimmed));
  }, [displayName, query, roster]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(displayName ?? '');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [displayName, open]);

  const commitUser = useCallback(
    async (userId: number | null) => {
      setOpen(false);
      // `commit(override)` bypasses the stale-draft captured-by-closure
      // problem: the hook validates + saves the exact value the picker
      // selected without waiting for React's state propagation.
      try {
        await editor.commit(userId);
      } finally {
        // Mirror the committed value in the filter input.
        if (userId == null) {
          setQuery('');
        } else {
          const match = roster.find((m) => m.userId === userId);
          setQuery(match?.displayName ?? '');
        }
      }
    },
    [editor, roster],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (readOnly) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // First ArrowDown when closed opens the listbox with highlight 0;
          // subsequent ArrowDowns advance the highlight, capped at the list
          // tail. Parity with `StagePerformerCombobox`.
          if (!open) {
            setOpen(true);
            setHighlight(0);
          } else {
            setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlight((h) => Math.max(h - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          if (open && filtered[highlight]) {
            void commitUser(filtered[highlight].userId);
          } else if (!open) {
            setOpen(true);
          }
          break;
        }
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          setQuery(displayName ?? '');
          editor.cancel();
          break;
        default:
          break;
      }
    },
    [commitUser, displayName, editor, filtered, highlight, open, readOnly],
  );

  if (readOnly) {
    return (
      <span className="inline-cell inline-cell--read" data-testid={testId}>
        {displayName ?? t('row.unassigned')}
      </span>
    );
  }

  return (
    <div
      ref={rootRef}
      className="inline-cell inline-cell--owner"
      data-status={editor.status}
      data-open={open ? 'true' : 'false'}
      data-flash={editor.flashing ? 'true' : undefined}
      data-testid={testId}
    >
      <input
        ref={inputRef}
        type="text"
        className="inline-cell__input inline-cell__input--owner"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-invalid={editor.status === 'error' || undefined}
        placeholder={t('row.unassigned')}
        value={query}
        onFocus={() => {
          editor.enterEdit();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.currentTarget.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <InlineCellChevron />
      {value == null ? (
        // Visually-hidden mirror of the placeholder so screen readers and
        // text-based assertions can still find "Unassigned" without relying
        // on the input's placeholder attribute (placeholders aren't text
        // content for `Element.textContent`).
        <span className="inline-live-region" data-testid="inline-cell-empty-label">
          {t('row.unassigned')}
        </span>
      ) : null}
      {value != null ? (
        <button
          type="button"
          className="inline-cell__clear"
          aria-label={t('stagePlan.clearPerformer', { defaultValue: 'Clear performer' })}
          onMouseDown={(e) => {
            // Keep focus in the input.
            e.preventDefault();
            void commitUser(null);
          }}
          tabIndex={-1}
        >
          ×
        </button>
      ) : null}
      {open ? (
        <ul className="inline-cell__listbox" role="listbox">
          {filtered.length === 0 ? (
            <li className="inline-cell__listbox-empty" role="option" aria-selected="false">
              {t('stagePlan.performerEmpty', {
                defaultValue: 'No teammate matches "{{query}}".',
                query,
              })}
            </li>
          ) : (
            filtered.map((m, idx) => {
              const active = idx === highlight;
              const isSelected = m.userId === value;
              return (
                <li
                  key={m.userId}
                  role="option"
                  aria-selected={isSelected}
                  className="inline-cell__listbox-option"
                  data-active={active ? 'true' : 'false'}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void commitUser(m.userId);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                >
                  <span className="inline-cell__listbox-name">{m.displayName}</span>
                  <span className="inline-cell__listbox-sep">·</span>
                  <span className="inline-cell__listbox-role">{m.role}</span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
      <InlineCellError
        error={editor.error}
        onRetry={() => void editor.retry()}
        onRevert={editor.cancel}
        rejectedValueLabel={editor.lastRejectedLabel}
      />
    </div>
  );
}

function resolveOwnerLabel(
  userId: number | null | undefined,
  roster: readonly TeamRosterMember[],
): string | null {
  if (userId == null) return null;
  const match = roster.find((m) => m.userId === userId);
  return match?.displayName ?? null;
}
