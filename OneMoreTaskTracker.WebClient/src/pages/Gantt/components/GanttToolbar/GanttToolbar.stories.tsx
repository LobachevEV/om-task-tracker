import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GanttToolbar } from './GanttToolbar';

const meta: Meta<typeof GanttToolbar> = {
  title: 'Plan/Composed/GanttToolbar',
  component: GanttToolbar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    role: 'Manager',
    zoom: 'twoWeeks',
    scope: 'all',
    stateFilter: 'all',
    onZoomChange: fn(),
    onScopeChange: fn(),
    onStateFilterChange: fn(),
    onNewFeature: fn(),
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

export const ManagerDefault: Story = {
  args: { role: 'Manager', zoom: 'twoWeeks', scope: 'all', stateFilter: 'all' },
};

export const NonManager: Story = {
  args: { role: 'FrontendDeveloper', zoom: 'twoWeeks', scope: 'mine', stateFilter: 'all', onNewFeature: undefined },
};

export const MonthZoom: Story = {
  args: { role: 'Manager', zoom: 'month', scope: 'all', stateFilter: 'all' },
};

export const FiltersApplied: Story = {
  args: { role: 'Manager', zoom: 'week', scope: 'mine', stateFilter: 'Development' },
};
