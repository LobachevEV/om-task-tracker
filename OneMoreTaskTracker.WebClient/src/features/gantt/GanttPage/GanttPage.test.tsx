import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import { GanttPageInternal } from './GanttPage';
import {
  ALL_FEATURES,
  FIXTURE_TODAY,
  MINI_TEAM_MEMBERS,
  SOLO_FEATURE,
} from '../__fixtures__/FeatureFixtures';
import { useGanttPageState } from '../useGanttPageState';
import type { MiniTeamMember } from '../../../shared/types/feature';
import type { UserRole } from '../../../shared/auth/auth';

const ROSTER: MiniTeamMember[] = [
  MINI_TEAM_MEMBERS.mg,
  MINI_TEAM_MEMBERS.fe,
  MINI_TEAM_MEMBERS.be,
  MINI_TEAM_MEMBERS.qa,
];

interface HarnessProps {
  role: UserRole;
  features?: typeof ALL_FEATURES;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  rosterError?: Error | null;
  rosterLoading?: boolean;
  onRosterRetry?: () => void;
}

function Harness({
  role,
  features = ALL_FEATURES,
  loading = false,
  error = null,
  onRetry = () => {},
  rosterError = null,
  rosterLoading = false,
  onRosterRetry = () => {},
}: HarnessProps) {
  const state = useGanttPageState(role);
  return (
    <GanttPageInternal
      role={role}
      features={features}
      roster={ROSTER}
      rosterLoading={rosterLoading}
      rosterError={rosterError}
      onRosterRetry={onRosterRetry}
      loading={loading}
      error={error}
      onRetry={onRetry}
      state={state}
    />
  );
}

function renderHarness(props: HarnessProps) {
  return render(
    <I18nextProvider i18n={i18n}>
      <Harness {...props} />
    </I18nextProvider>,
  );
}

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
  // Pin system date so layout windows are deterministic regardless of CI clock.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${FIXTURE_TODAY}T12:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('GanttPageInternal', () => {
  it('renders a spinner in the loading state', () => {
    renderHarness({ role: 'Manager', loading: true, features: [] });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the timeline + feature rows when features are present', () => {
    renderHarness({ role: 'Manager' });
    // Each scheduled feature yields a row with a title button
    const titles = screen
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .join('|');
    expect(titles).toContain(SOLO_FEATURE.title);
  });

  it('shows the empty state with a Create button for Managers when no features', () => {
    renderHarness({ role: 'Manager', features: [] });
    const empty = screen.getByRole('status');
    expect(within(empty).getByRole('button')).toBeInTheDocument();
  });

  it('does NOT show a Create button for Qa when no features', () => {
    renderHarness({ role: 'Qa', features: [] });
    const empty = screen.getByRole('status');
    expect(within(empty).queryByRole('button')).toBeNull();
  });

  it('switching zoom updates the --day-count inline custom property on the page', () => {
    const { container } = renderHarness({ role: 'Manager' });
    const main = container.querySelector<HTMLElement>('main.gantt-page')!;
    expect(main.style.getPropertyValue('--day-count')).toBe('14'); // default twoWeeks
    const monthBtn = screen.getByRole('button', { name: 'Month' });
    fireEvent.click(monthBtn);
    expect(main.style.getPropertyValue('--day-count')).toBe('30');
  });

  it('clicking the expand caret reveals five stage sub-rows for that feature', () => {
    const { container } = renderHarness({ role: 'Manager' });
    const firstCaret = container.querySelector<HTMLButtonElement>(
      '[data-testid="expand-caret"]',
    );
    expect(firstCaret).not.toBeNull();
    expect(firstCaret!.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      firstCaret!.click();
    });
    expect(firstCaret!.getAttribute('aria-expanded')).toBe('true');
    const subRows = container.querySelectorAll('[data-testid^="stage-subrow-"]');
    expect(subRows).toHaveLength(5);
  });

  it('clicking a row title opens the drawer (FeatureDrawer becomes mounted)', () => {
    const { container } = renderHarness({ role: 'Manager' });
    const titleBtn = container.querySelector<HTMLButtonElement>('.gantt-row__title');
    expect(titleBtn).not.toBeNull();
    act(() => {
      titleBtn!.click();
    });
    expect(document.querySelector('.feature-drawer')).not.toBeNull();
  });

  it('renders an error state with a retry button when `error` is set', () => {
    const onRetry = vi.fn();
    renderHarness({ role: 'Manager', error: new Error('boom'), features: [], onRetry });
    const alert = screen.getByRole('alert');
    const retry = within(alert).getByRole('button');
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalled();
  });

  it('roster warning banner includes a retry button that calls onRosterRetry', () => {
    const onRosterRetry = vi.fn();
    renderHarness({
      role: 'Manager',
      rosterError: new Error('roster down'),
      onRosterRetry,
      features: [],
    });
    const warning = screen.getByRole('alert', { name: /team/i });
    fireEvent.click(within(warning).getByRole('button'));
    expect(onRosterRetry).toHaveBeenCalledTimes(1);
  });
});
