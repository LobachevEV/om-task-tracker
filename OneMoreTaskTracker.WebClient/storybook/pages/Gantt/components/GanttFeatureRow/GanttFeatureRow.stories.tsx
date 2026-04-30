import type { Meta, StoryObj } from '@storybook/react-vite';

const Placeholder = () => (
  <div style={{ padding: 16, color: 'var(--color-text-subtle)' }}>
    GanttFeatureRow stories are pending a v2-taxonomy rewrite (see
    GanttPage stories for the integrated v2 view).
  </div>
);

const meta: Meta<typeof Placeholder> = {
  title: 'Pages/Gantt/Components/GanttFeatureRow (v2 rewrite pending)',
  component: Placeholder,
};

export default meta;
type Story = StoryObj<typeof Placeholder>;

export const Pending: Story = {};
