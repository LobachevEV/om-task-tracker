import type { Meta, StoryObj } from '@storybook/react-vite';
import { GanttSegmentedBar } from '../../../../../src/pages/Gantt/components/GanttSegmentedBar/GanttSegmentedBar';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../../../../src/pages/Gantt/ganttMath';
import { computeStageBars } from '../../../../../src/pages/Gantt/ganttStageGeometry';

const win = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

const meta: Meta<typeof GanttSegmentedBar> = {
  title: 'features/gantt/GanttSegmentedBar',
  component: GanttSegmentedBar,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '640px',
          height: '48px',
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
type Story = StoryObj<typeof GanttSegmentedBar>;

export const FullyPlannedActiveTesting: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    stageBars: computeStageBars(win, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX),
    today: FIXTURE_TODAY,
  },
};

export const OverdueDevelopment: Story = {
  args: {
    feature: OVERDUE_FEATURE,
    stageBars: computeStageBars(win, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX),
    today: FIXTURE_TODAY,
  },
};

export const ShippedLiveRelease: Story = {
  args: {
    feature: SHIPPED_FEATURE,
    stageBars: computeStageBars(win, SHIPPED_FEATURE, FIXTURE_TODAY, DAY_PX),
    today: FIXTURE_TODAY,
  },
};

export const UnplannedGhost: Story = {
  args: {
    feature: UNSCHEDULED_FEATURE,
    stageBars: computeStageBars(win, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX),
    today: FIXTURE_TODAY,
  },
};
