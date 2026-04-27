import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, daysBetween, parseIsoDate, type DateWindow } from '../../ganttMath';
import './GanttDateHeader.css';

export interface GanttDateHeaderProps {
  loadedRange: DateWindow;
  today: string;
  dayPx: number;
  className?: string;
}

interface DayCell {
  iso: string;
  /** 0=Mon..6=Sun */
  dayOfWeek: number;
  /** Day of the month, 1..31. */
  dayOfMonth: number;
  /** True for the first column of an ISO calendar week (Mon). */
  isWeekStart: boolean;
  /** True for the first column of a calendar month. */
  isMonthStart: boolean;
  /** True for Saturday/Sunday — used for the imperceptible weekend tint. */
  isWeekend: boolean;
  /** Single-letter weekday glyph (locale-specific). */
  weekdayLetter: string;
  /** True for `today`. */
  isToday: boolean;
}

interface MonthBand {
  /** Inclusive ISO of the first day of the month visible in this range. */
  startIso: string;
  /** Localised "May 2026" / "Май 2026" label. */
  label: string;
  /** Px offset from `loadedRange.start`. */
  leftPx: number;
  /** Width of this month's slice inside the loaded range. */
  widthPx: number;
}

const ISO_WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function buildDays(range: DateWindow, today: string, locale: string): DayCell[] {
  const totalDays = daysBetween(range.start, range.end);
  if (totalDays <= 0) return [];
  const cells: DayCell[] = [];
  const weekdayFormatter = (() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    } catch {
      return new Intl.DateTimeFormat('en', { weekday: 'narrow' });
    }
  })();
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(range.start, i);
    const date = parseIsoDate(iso);
    const jsDay = date.getUTCDay(); // 0=Sun..6=Sat
    const dayOfWeek = (jsDay + 6) % 7; // 0=Mon..6=Sun
    cells.push({
      iso,
      dayOfWeek,
      dayOfMonth: date.getUTCDate(),
      isWeekStart: dayOfWeek === 0,
      isMonthStart: date.getUTCDate() === 1,
      isWeekend: jsDay === 0 || jsDay === 6,
      weekdayLetter: weekdayFormatter.format(date),
      isToday: iso === today,
    });
  }
  return cells;
}

function buildMonthBands(
  range: DateWindow,
  dayPx: number,
  locale: string,
): MonthBand[] {
  const totalDays = daysBetween(range.start, range.end);
  if (totalDays <= 0) return [];
  const monthFormatter = (() => {
    try {
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    } catch {
      return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
    }
  })();
  const bands: MonthBand[] = [];
  let cursorIso = range.start;
  while (daysBetween(cursorIso, range.end) > 0) {
    const cursorDate = parseIsoDate(cursorIso);
    const year = cursorDate.getUTCFullYear();
    const monthIdx = cursorDate.getUTCMonth();
    // First day of the next month (UTC) — clamp to range.end.
    const nextMonthFirst = new Date(Date.UTC(year, monthIdx + 1, 1));
    const nextMonthIso = `${nextMonthFirst.getUTCFullYear().toString().padStart(4, '0')}-${(nextMonthFirst.getUTCMonth() + 1).toString().padStart(2, '0')}-01`;
    const sliceEndIso =
      daysBetween(nextMonthIso, range.end) >= 0 ? nextMonthIso : range.end;
    const leftPx = daysBetween(range.start, cursorIso) * dayPx;
    const widthPx = daysBetween(cursorIso, sliceEndIso) * dayPx;
    bands.push({
      startIso: cursorIso,
      label: monthFormatter.format(cursorDate),
      leftPx,
      widthPx,
    });
    cursorIso = sliceEndIso;
  }
  return bands;
}

export function GanttDateHeader({
  loadedRange,
  today,
  dayPx,
  className,
}: GanttDateHeaderProps) {
  const { i18n, t } = useTranslation('gantt');
  const days = useMemo(
    () => buildDays(loadedRange, today, i18n.language),
    [loadedRange, today, i18n.language],
  );
  const monthBands = useMemo(
    () => buildMonthBands(loadedRange, dayPx, i18n.language),
    [loadedRange, dayPx, i18n.language],
  );
  const longDateFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return new Intl.DateTimeFormat('en', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }, [i18n.language]);

  const totalWidthPx = days.length * dayPx;
  const style: CSSProperties = {
    ['--day-px' as string]: `${dayPx}px`,
    ['--day-count' as string]: String(days.length),
    inlineSize: `${totalWidthPx}px`,
  };

  const rootClassName = className
    ? `gantt-date-header ${className}`
    : 'gantt-date-header';

  return (
    <div className={rootClassName} style={style} role="presentation">
      <div className="gantt-date-header__month-band" aria-hidden="true">
        {monthBands.map((band) => (
          <div
            key={band.startIso}
            className="gantt-date-header__month-cell"
            data-month-start={band.startIso}
            style={{
              insetInlineStart: `${band.leftPx}px`,
              inlineSize: `${band.widthPx}px`,
            }}
          >
            <span className="gantt-date-header__month-label">{band.label}</span>
          </div>
        ))}
      </div>
      <div
        className="gantt-date-header__day-band"
        role="row"
        aria-label={t('dateHeader.daysAria', {
          defaultValue: 'Calendar days, scrollable',
        })}
      >
        {days.map((day) => {
          const cellClassName = [
            'gantt-date-header__day-cell',
            day.isWeekStart ? 'gantt-date-header__day-cell--week-start' : '',
            day.isMonthStart ? 'gantt-date-header__day-cell--month-start' : '',
            day.isWeekend ? 'gantt-date-header__day-cell--weekend' : '',
            day.isToday ? 'gantt-date-header__day-cell--today' : '',
          ]
            .filter(Boolean)
            .join(' ');
          let longDate: string;
          try {
            longDate = longDateFormatter.format(parseIsoDate(day.iso));
          } catch {
            longDate = day.iso;
          }
          return (
            <div
              key={day.iso}
              className={cellClassName}
              data-date={day.iso}
              data-day-cell={day.iso}
              role="gridcell"
              aria-label={longDate}
            >
              <span className="gantt-date-header__day-num">{day.dayOfMonth}</span>
              <span
                className="gantt-date-header__weekday"
                aria-hidden="true"
              >
                {day.weekdayLetter ||
                  t(`weekday.${ISO_WEEKDAY_KEYS[day.dayOfWeek]}`, {
                    defaultValue: ISO_WEEKDAY_KEYS[day.dayOfWeek],
                  })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
