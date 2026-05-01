import type { Meta, StoryObj } from '@storybook/react-vite';

const Placeholder = () => (
  <div style={{ padding: 16, color: 'var(--color-text-subtle)' }}>
    GanttSegmentedBar is removed in the v2 feature taxonomy. See
    GanttPhaseSegment / GanttSubStageRow stories instead.
  </div>
);

const meta: Meta<typeof Placeholder> = {
  title: 'Pages/Gantt/Components/GanttSegmentedBar (removed)',
  component: Placeholder,
};

export default meta;
type Story = StoryObj<typeof Placeholder>;

export const Removed: Story = {};
