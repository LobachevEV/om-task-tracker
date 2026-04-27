import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GanttDateHeader } from './GanttDateHeader';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../common/i18n/config';

const wrap = (ui: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

describe('GanttDateHeader', () => {
  it('renders one day cell per day in the loaded range with correct data-date attributes', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          loadedRange={{ start: '2026-04-20', end: '2026-04-25' }}
          today="2026-04-22"
          dayPx={32}
        />,
      ),
    );
    const cells = container.querySelectorAll('[data-date]');
    expect(cells).toHaveLength(5);
    expect(Array.from(cells).map((c) => c.getAttribute('data-date'))).toEqual([
      '2026-04-20',
      '2026-04-21',
      '2026-04-22',
      '2026-04-23',
      '2026-04-24',
    ]);
  });

  it('marks today, week starts, month starts, and weekends', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          // Range straddles a month seam (Apr → May 2026) and a Monday.
          loadedRange={{ start: '2026-04-25', end: '2026-05-04' }}
          today="2026-04-25"
          dayPx={32}
        />,
      ),
    );

    const today = container.querySelector('[data-date="2026-04-25"]');
    expect(today?.classList.contains('gantt-date-header__day-cell--today')).toBe(
      true,
    );
    // 2026-04-25 is a Saturday → weekend.
    expect(
      today?.classList.contains('gantt-date-header__day-cell--weekend'),
    ).toBe(true);

    // 2026-04-27 is the Monday in this range → week start.
    const monday = container.querySelector('[data-date="2026-04-27"]');
    expect(
      monday?.classList.contains('gantt-date-header__day-cell--week-start'),
    ).toBe(true);

    // 2026-05-01 is a month start.
    const monthStart = container.querySelector('[data-date="2026-05-01"]');
    expect(
      monthStart?.classList.contains(
        'gantt-date-header__day-cell--month-start',
      ),
    ).toBe(true);
  });

  it('renders a month band cell per visible month with correct px geometry', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          loadedRange={{ start: '2026-04-25', end: '2026-05-04' }}
          today="2026-04-25"
          dayPx={32}
        />,
      ),
    );
    const bandCells = container.querySelectorAll('[data-month-start]');
    // Apr 2026 (25..30, 6 days) + May 2026 (1..3, 3 days) → 2 bands.
    expect(bandCells).toHaveLength(2);
    const aprStart = bandCells[0]?.getAttribute('data-month-start');
    const mayStart = bandCells[1]?.getAttribute('data-month-start');
    expect(aprStart).toBe('2026-04-25');
    expect(mayStart).toBe('2026-05-01');
    // Apr band: leftPx=0, widthPx = 6 days * 32px = 192.
    expect((bandCells[0] as HTMLElement).style.insetInlineStart).toBe('0px');
    expect((bandCells[0] as HTMLElement).style.inlineSize).toBe('192px');
    // May band: leftPx = 6 * 32 = 192, widthPx = 3 days * 32px = 96.
    expect((bandCells[1] as HTMLElement).style.insetInlineStart).toBe('192px');
    expect((bandCells[1] as HTMLElement).style.inlineSize).toBe('96px');
  });

  it('exposes a long aria-label per day cell for screen-reader navigation', () => {
    render(
      wrap(
        <GanttDateHeader
          loadedRange={{ start: '2026-04-25', end: '2026-04-26' }}
          today="2026-04-25"
          dayPx={32}
        />,
      ),
    );
    const cell = screen.getByRole('gridcell');
    const label = cell.getAttribute('aria-label') ?? '';
    expect(label.length).toBeGreaterThan(5);
    // Label should mention the day numeral.
    expect(label).toMatch(/25/);
  });

  it('sizes the root container to total width = days * dayPx', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          loadedRange={{ start: '2026-04-20', end: '2026-04-30' }}
          today="2026-04-25"
          dayPx={28}
        />,
      ),
    );
    const root = container.firstElementChild as HTMLElement;
    // 10 days × 28px = 280px.
    expect(root.style.inlineSize).toBe('280px');
  });

  it('marks the first day cell as both week-start and month-start when applicable', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          // 2026-06-01 is a Monday and the first of June.
          loadedRange={{ start: '2026-06-01', end: '2026-06-08' }}
          today="2026-06-01"
          dayPx={32}
        />,
      ),
    );
    const first = container.querySelector('[data-date="2026-06-01"]');
    expect(first?.classList.contains('gantt-date-header__day-cell--week-start')).toBe(
      true,
    );
    expect(
      first?.classList.contains('gantt-date-header__day-cell--month-start'),
    ).toBe(true);
  });

  it('renders nothing meaningful for an empty range', () => {
    const { container } = render(
      wrap(
        <GanttDateHeader
          loadedRange={{ start: '2026-04-25', end: '2026-04-25' }}
          today="2026-04-25"
          dayPx={32}
        />,
      ),
    );
    expect(container.querySelectorAll('[data-date]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-month-start]')).toHaveLength(0);
  });
});

