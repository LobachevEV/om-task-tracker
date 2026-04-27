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
      rawRoster={[]}
      rosterLoading={rosterLoading}
      rosterError={rosterError}
      onRosterRetry={onRosterRetry}
      loading={loading}
      error={error}
      onRetry={onRetry}
      state={state}
      onFeatureUpdated={() => {}}
      loadChunk={async () => {}}
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
    // Viewer role renders static title buttons — used to assert row presence
    // without picking up on manager-only inline-edit input affordances.
    renderHarness({ role: 'Qa' });
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

  it('switching zoom updates the --day-px inline custom property on the page', () => {
    const { container } = renderHarness({ role: 'Manager' });
    const main = container.querySelector<HTMLElement>('main.gantt-page')!;
    expect(main.style.getPropertyValue('--day-px')).toBe('32px'); // default twoWeeks
    const monthBtn = screen.getByRole('button', { name: 'Month' });
    fireEvent.click(monthBtn);
    expect(main.style.getPropertyValue('--day-px')).toBe('24px');
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

  it('clicking a row title expands the row for non-manager viewers', () => {
    const { container } = renderHarness({ role: 'Qa' });
    const titleBtn = container.querySelector<HTMLButtonElement>('.gantt-row__title');
    expect(titleBtn).not.toBeNull();
    const caret = container.querySelector<HTMLButtonElement>('[data-testid="expand-caret"]');
    expect(caret!.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      titleBtn!.click();
    });
    expect(caret!.getAttribute('aria-expanded')).toBe('true');
    const subRows = container.querySelectorAll('[data-testid^="stage-subrow-"]');
    expect(subRows).toHaveLength(5);
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
