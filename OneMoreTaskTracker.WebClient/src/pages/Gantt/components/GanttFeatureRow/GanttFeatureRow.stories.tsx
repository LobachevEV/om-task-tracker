import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GanttFeatureRow } from './GanttFeatureRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  SOLO_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../ganttMath';
import { computeStageBars } from '../../ganttStageGeometry';
import type { MiniTeamMember } from '../../../../common/types/feature';

const { qa, fe, be, mg } = MINI_TEAM_MEMBERS;
const roster = [fe, be, qa, mg];
const resolve = (id: number | null | undefined): MiniTeamMember | undefined =>
  id == null ? undefined : roster.find((m) => m.userId === id);

const monthWindow = windowForZoom(FIXTURE_TODAY, 'month');
const weekWindow = windowForZoom(FIXTURE_TODAY, 'week');
const DAY_PX = 32;

const meta: Meta<typeof GanttFeatureRow> = {
  title: 'Plan/Primitives/GanttFeatureRow',
  component: GanttFeatureRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onOpenStage: fn(),
    onToggleExpand: fn(),
    today: FIXTURE_TODAY,
    resolvePerformer: resolve,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 960,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GanttFeatureRow>;

export const SoloOwner: Story = {
  args: {
    feature: SOLO_FEATURE,
    stageBars: computeStageBars(monthWindow, SOLO_FEATURE, FIXTURE_TODAY, DAY_PX),
    lead: fe,
    miniTeam: [fe],
    expanded: false,
  },
};

export const MiniTeam: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    stageBars: computeStageBars(monthWindow, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX),
    lead: be,
    miniTeam: [be, fe, qa],
    expanded: false,
  },
};

export const Expanded: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    stageBars: computeStageBars(monthWindow, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX),
    lead: be,
    miniTeam: [be, fe, qa],
    expanded: true,
  },
};

export const Overdue: Story = {
  args: {
    feature: OVERDUE_FEATURE,
    stageBars: computeStageBars(monthWindow, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX),
    lead: be,
    miniTeam: [be, fe],
    expanded: false,
  },
};

export const Unscheduled: Story = {
  args: {
    feature: UNSCHEDULED_FEATURE,
    stageBars: computeStageBars(monthWindow, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX),
    lead: fe,
    miniTeam: [fe],
    expanded: false,
  },
};

export const ClampedBoth: Story = {
  args: {
    feature: {
      ...MINI_TEAM_FEATURE,
      id: 999,
      title: 'Long-running initiative',
      plannedStart: '2026-01-01',
      plannedEnd: '2026-12-31',
    },
    stageBars: computeStageBars(
      weekWindow,
      {
        ...MINI_TEAM_FEATURE,
        plannedStart: '2026-01-01',
        plannedEnd: '2026-12-31',
      },
      FIXTURE_TODAY,
      DAY_PX,
    ),
    lead: be,
    miniTeam: [be, fe, qa],
    expanded: false,
  },
};
