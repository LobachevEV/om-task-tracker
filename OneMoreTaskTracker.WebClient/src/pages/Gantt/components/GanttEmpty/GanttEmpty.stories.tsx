import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GanttEmpty } from './GanttEmpty';

const meta: Meta<typeof GanttEmpty> = {
  title: 'Plan/Composed/GanttEmpty',
  component: GanttEmpty,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    onCreate: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof GanttEmpty>;

export const WithCTA: Story = { args: { canCreate: true } };
export const WithoutCTA: Story = { args: { canCreate: false, onCreate: undefined } };
