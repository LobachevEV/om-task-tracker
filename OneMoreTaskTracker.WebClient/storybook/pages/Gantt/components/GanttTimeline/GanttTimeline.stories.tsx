import type { Meta, StoryObj } from '@storybook/react-vite';
import { GanttTimeline } from '../../../../../src/pages/Gantt/components/GanttTimeline/GanttTimeline';
import { FIXTURE_TODAY } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';
import { daysBetween, windowForZoom, type ZoomLevel } from '../../../../../src/pages/Gantt/ganttMath';

const meta: Meta<typeof GanttTimeline> = {
  title: 'Plan/Primitives/GanttTimeline',
  component: GanttTimeline,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 960, background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GanttTimeline>;

function todayPercentFor(zoom: ZoomLevel, dayOffset: number): number {
  const win = windowForZoom(FIXTURE_TODAY, zoom);
  const total = daysBetween(win.start, win.end);
  return (dayOffset / total) * 100;
}

export const Week: Story = {
  args: {
    zoom: 'week',
    window: windowForZoom(FIXTURE_TODAY, 'week'),
    todayPercent: todayPercentFor('week', 2),
  },
};

export const TwoWeeks: Story = {
  args: {
    zoom: 'twoWeeks',
    window: windowForZoom(FIXTURE_TODAY, 'twoWeeks'),
    todayPercent: todayPercentFor('twoWeeks', 8),
  },
};

export const Month: Story = {
  args: {
    zoom: 'month',
    window: windowForZoom(FIXTURE_TODAY, 'month'),
    todayPercent: todayPercentFor('month', 15),
  },
};

export const TodayOutsideWindow: Story = {
  args: {
    zoom: 'week',
    window: windowForZoom(FIXTURE_TODAY, 'week'),
    todayPercent: null,
  },
};
