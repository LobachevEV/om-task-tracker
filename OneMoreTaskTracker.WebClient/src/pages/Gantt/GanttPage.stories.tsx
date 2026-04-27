import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { GanttPageInternal } from './GanttPage';
import { useGanttPageState } from './useGanttPageState';
import {
  ALL_FEATURES,
  FIXTURE_TODAY,
  MINI_TEAM_MEMBERS,
  SOLO_FEATURE,
} from './__fixtures__/FeatureFixtures';
import type { MiniTeamMember } from '../../common/types/feature';
import type { UserRole } from '../../common/auth/auth';

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
  initialSelectedFeatureId?: number | null;
}

function PageHarness({
  role,
  features = ALL_FEATURES,
  loading = false,
  error = null,
  initialSelectedFeatureId = null,
}: HarnessProps) {
  const state = useGanttPageState(role);
  // Stories need a deterministic `today` matching the fixtures. We patch it on first mount
  // via the internal ref — acceptable only because this is a story-only harness.
  useEffect(() => {
    if (state.today !== FIXTURE_TODAY) {
      (state as unknown as { today: string }).today = FIXTURE_TODAY;
    }
    if (initialSelectedFeatureId != null) {
      state.toggleFeatureExpanded(initialSelectedFeatureId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GanttPageInternal
      role={role}
      features={features}
      roster={ROSTER}
      rawRoster={[]}
      rosterLoading={false}
      rosterError={null}
      onRosterRetry={() => {}}
      loading={loading}
      error={error}
      onRetry={() => {}}
      state={state}
      onFeatureUpdated={() => {}}
      loadChunk={async () => {}}
    />
  );
}

const meta: Meta<typeof PageHarness> = {
  title: 'Plan/Pages/GanttPage',
  component: PageHarness,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PageHarness>;

export const Populated: Story = {
  args: { role: 'Manager', features: ALL_FEATURES },
};

export const PopulatedQa: Story = {
  args: { role: 'Qa', features: ALL_FEATURES },
};

export const EmptyManager: Story = {
  args: { role: 'Manager', features: [] },
};

export const EmptyQa: Story = {
  args: { role: 'Qa', features: [] },
};

export const LoadingState: Story = {
  args: { role: 'Manager', features: [], loading: true },
};

export const ErrorState: Story = {
  args: { role: 'Manager', features: [], error: new Error('Network') },
};

export const DrawerOpen: Story = {
  args: {
    role: 'Manager',
    features: ALL_FEATURES,
    initialSelectedFeatureId: SOLO_FEATURE.id,
  },
};
