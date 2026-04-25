import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, parseIsoDate, daysBetween, type DateWindow, type ZoomLevel } from '../ganttMath';
import './GanttTimeline.css';

export interface GanttTimelineProps {
  window: DateWindow;
  zoom: ZoomLevel;
  todayPercent: number | null;
  className?: string;
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

interface DayCell {
  iso: string;
  dayOfWeek: number; // 0=Mon..6=Sun
  dayOfMonth: number;
  isWeekStart: boolean;
  shortWeekday: string;
}

function buildDays(window: DateWindow, locale: string): DayCell[] {
  const totalDays = daysBetween(window.start, window.end);
  const cells: DayCell[] = [];
  const weekdayFormatter = (() => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'short' });
    } catch {
      return new Intl.DateTimeFormat('en', { weekday: 'short' });
    }
  })();
  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(window.start, i);
    const date = parseIsoDate(iso);
    const jsDay = date.getUTCDay(); // Sun=0..Sat=6
    const dayOfWeek = (jsDay + 6) % 7; // Mon=0..Sun=6
    cells.push({
      iso,
      dayOfWeek,
      dayOfMonth: date.getUTCDate(),
      isWeekStart: dayOfWeek === 0,
      shortWeekday: weekdayFormatter.format(date),
    });
  }
  return cells;
}

export function GanttTimeline({ window, zoom, todayPercent, className }: GanttTimelineProps) {
  const { t, i18n } = useTranslation('gantt');
  const days = useMemo(() => buildDays(window, i18n.language), [window, i18n.language]);
  const narrow = zoom === 'week' || zoom === 'twoWeeks';

  const style: CSSProperties = {
    ['--day-count' as string]: String(days.length),
  };

  const rootClassName = className ? `gantt-timeline ${className}` : 'gantt-timeline';

  return (
    <div className={rootClassName} style={style} role="presentation">
      {days.map((day) => {
        const primary = narrow
          ? day.shortWeekday || t(`weekday.${WEEKDAY_KEYS[day.dayOfWeek]}`, {
              defaultValue: WEEKDAY_KEYS[day.dayOfWeek],
            })
          : String(day.dayOfMonth);
        const sub = narrow ? String(day.dayOfMonth) : null;
        return (
          <div
            key={day.iso}
            className={`gantt-timeline__day${day.isWeekStart ? ' gantt-timeline__day--week-start' : ''}`}
            data-date={day.iso}
          >
            <span className="gantt-timeline__day-label">{primary}</span>
            {sub ? <span className="gantt-timeline__day-sub">{sub}</span> : null}
          </div>
        );
      })}
      {todayPercent != null ? (
        <div
          className="gantt-timeline__today"
          style={{ left: `${todayPercent}%` }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
