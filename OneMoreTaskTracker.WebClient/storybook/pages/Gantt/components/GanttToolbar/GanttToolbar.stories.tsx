import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GanttToolbar } from '../../../../../src/pages/Gantt/components/GanttToolbar/GanttToolbar';

const meta: Meta<typeof GanttToolbar> = {
  title: 'Plan/Composed/GanttToolbar',
  component: GanttToolbar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    zoom: 'twoWeeks',
    scope: 'all',
    stateFilter: 'all',
    onZoomChange: fn(),
    onScopeChange: fn(),
    onStateFilterChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ background: 'var(--bg)', minHeight: '140px' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GanttToolbar>;

export const Default: Story = {
  args: { zoom: 'twoWeeks', scope: 'all', stateFilter: 'all' },
};

export const MineScope: Story = {
  args: { zoom: 'twoWeeks', scope: 'mine', stateFilter: 'all' },
};

export const MonthZoom: Story = {
  args: { zoom: 'month', scope: 'all', stateFilter: 'all' },
};

export const FiltersApplied: Story = {
  args: { zoom: 'week', scope: 'mine', stateFilter: 'Development' },
};
