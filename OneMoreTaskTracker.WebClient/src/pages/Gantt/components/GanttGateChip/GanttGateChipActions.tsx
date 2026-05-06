import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GateStatus } from '../../../../common/types/feature';

const STATUS_ORDER: GateStatus[] = ['approved', 'waiting', 'rejected'];

export interface GanttGateChipActionsProps {
  testIdBase: string;
  gateLabel: string;
  status: GateStatus;
  pending: boolean;
  onSelectStatus: (next: GateStatus) => void;
}

export function GanttGateChipActions({
  testIdBase,
  gateLabel,
  status,
  pending,
  onSelectStatus,
}: GanttGateChipActionsProps) {
  const { t } = useTranslation('gantt');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => STATUS_ORDER.indexOf(status));
  const listboxRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openPopover = useCallback(() => {
    if (pending) return;
    setActiveIndex(STATUS_ORDER.indexOf(status));
    setOpen(true);
  }, [pending, status]);

  const closePopover = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) {
      const items = listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
      items?.[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % STATUS_ORDER.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + STATUS_ORDER.length) % STATUS_ORDER.length);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePopover();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const next = STATUS_ORDER[activeIndex];
        if (next != null) {
          onSelectStatus(next);
          setOpen(false);
        }
      }
    },
    [open, activeIndex, onSelectStatus, closePopover],
  );

  const statusLabel = useCallback(
    (s: GateStatus) => t(`gateStatus.${s}`),
    [t],
  );

  return (
    <span className="gantt-gate-chip__actions">
      <button
        ref={triggerRef}
        type="button"
        className="gantt-gate-chip__action gantt-gate-chip__action--toggle"
        data-testid={`${testIdBase}-toggle`}
        aria-label={t('gates.changeStatusAria', {
          defaultValue: 'Change {{name}} gate status',
          name: gateLabel,
        })}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={pending}
        onClick={openPopover}
      >
        ▾
      </button>
      {open ? (
        <ul
          ref={listboxRef}
          role="listbox"
          className="gantt-gate-chip__listbox"
          aria-label={t('gates.statusListAria', {
            defaultValue: 'Gate status options',
          })}
          data-testid={`${testIdBase}-listbox`}
          onKeyDown={handleKeyDown}
        >
          {STATUS_ORDER.map((s, idx) => (
            <li
              key={s}
              role="option"
              tabIndex={idx === activeIndex ? 0 : -1}
              aria-selected={s === status}
              data-status={s}
              data-testid={`${testIdBase}-option-${s}`}
              className="gantt-gate-chip__listbox-option"
              onClick={() => {
                onSelectStatus(s);
                setOpen(false);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {statusLabel(s)}
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
