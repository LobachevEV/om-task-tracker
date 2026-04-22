import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GanttFeatureRow } from './GanttFeatureRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_FEATURE_DETAIL,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  SOLO_FEATURE,
  UNSCHEDULED_FEATURE,
} from './__fixtures__/FeatureFixtures';
import { barGeometry, windowForZoom } from './ganttMath';

const { qa, fe, be } = MINI_TEAM_MEMBERS;
const monthWindow = windowForZoom(FIXTURE_TODAY, 'month');
const weekWindow = windowForZoom(FIXTURE_TODAY, 'week');

const meta: Meta<typeof GanttFeatureRow> = {
  title: 'Plan/Primitives/GanttFeatureRow',
  component: GanttFeatureRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onOpen: fn(),
    onRevealTasks: fn(),
    today: FIXTURE_TODAY,
    window: monthWindow,
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
    bar: barGeometry(monthWindow, {
      start: SOLO_FEATURE.plannedStart,
      end: SOLO_FEATURE.plannedEnd,
    }),
    lead: fe,
    miniTeam: [fe],
    isTasksRevealed: false,
  },
};

export const MiniTeam: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    bar: barGeometry(monthWindow, {
      start: MINI_TEAM_FEATURE.plannedStart,
      end: MINI_TEAM_FEATURE.plannedEnd,
    }),
    lead: be,
    miniTeam: [be, fe, qa],
    isTasksRevealed: false,
  },
};

export const TasksRevealed: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    bar: barGeometry(monthWindow, {
      start: MINI_TEAM_FEATURE.plannedStart,
      end: MINI_TEAM_FEATURE.plannedEnd,
    }),
    lead: be,
    miniTeam: MINI_TEAM_FEATURE_DETAIL.miniTeam,
    tasks: MINI_TEAM_FEATURE_DETAIL.tasks,
    isTasksRevealed: true,
  },
};

export const Overdue: Story = {
  args: {
    feature: OVERDUE_FEATURE,
    bar: barGeometry(monthWindow, {
      start: OVERDUE_FEATURE.plannedStart,
      end: OVERDUE_FEATURE.plannedEnd,
    }),
    lead: be,
    miniTeam: [be, fe],
    isTasksRevealed: false,
  },
};

export const Unscheduled: Story = {
  args: {
    feature: UNSCHEDULED_FEATURE,
    bar: null,
    lead: fe,
    miniTeam: [fe],
    isTasksRevealed: false,
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
    bar: barGeometry(weekWindow, { start: '2026-01-01', end: '2026-12-31' }),
    window: weekWindow,
    lead: be,
    miniTeam: [be, fe, qa],
    isTasksRevealed: false,
  },
};
