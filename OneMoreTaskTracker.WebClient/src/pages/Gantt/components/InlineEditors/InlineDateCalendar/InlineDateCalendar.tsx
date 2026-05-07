import { useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import './InlineDateCalendar.css';

export interface InlineDateCalendarProps {
  /** Currently selected ISO yyyy-MM-dd string, or null when unset. */
  selected: string | null;
  /** Called with an ISO yyyy-MM-dd string when the user picks a day. */
  onSelect: (iso: string) => void;
  /** Called when the calendar should close without a selection. */
  onClose: () => void;
  /** Accessible label for the dialog. */
  ariaLabel: string;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function InlineDateCalendar({
  selected,
  onSelect,
  onClose,
  ariaLabel,
}: InlineDateCalendarProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [tabindex="0"]',
    );
    first?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex="0"], [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const selectedDate = selected != null ? isoToDate(selected) : undefined;

  const handleSelect = (day: Date | undefined) => {
    if (day == null) return;
    onSelect(dateToIso(day));
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="inline-date-calendar"
    >
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        defaultMonth={selectedDate}
        classNames={{
          root: 'rdp-root',
          months: 'rdp-months',
          month: 'rdp-month',
          month_caption: 'rdp-month-caption',
          caption_label: 'rdp-caption-label',
          nav: 'rdp-nav',
          button_previous: 'rdp-nav-btn rdp-nav-btn--prev',
          button_next: 'rdp-nav-btn rdp-nav-btn--next',
          month_grid: 'rdp-month-grid',
          weekdays: 'rdp-weekdays',
          weekday: 'rdp-weekday',
          week: 'rdp-week',
          day: 'rdp-day',
          day_button: 'rdp-day-btn',
          selected: 'rdp-day--selected',
          today: 'rdp-day--today',
          outside: 'rdp-day--outside',
          disabled: 'rdp-day--disabled',
          hidden: 'rdp-day--hidden',
          range_start: 'rdp-day--range-start',
          range_end: 'rdp-day--range-end',
          range_middle: 'rdp-day--range-middle',
        }}
      />
    </div>
  );
}
