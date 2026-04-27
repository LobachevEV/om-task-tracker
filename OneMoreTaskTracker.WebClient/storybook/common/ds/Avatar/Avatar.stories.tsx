import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '../../../../src/common/ds/Avatar/Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: {
    name: 'Евгений Лобачёв',
    size: 'md',
    tone: 'default',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    tone: { control: 'inline-radio', options: ['default', 'manager', 'frontend', 'backend', 'qa'] },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar name="Анна Петрова" size="sm" tone="frontend" />
      <Avatar name="Анна Петрова" size="md" tone="frontend" />
      <Avatar name="Анна Петрова" size="lg" tone="frontend" />
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <Avatar name="Manager User" tone="manager" />
      <Avatar name="Frontend Dev" tone="frontend" />
      <Avatar name="Backend Dev" tone="backend" />
      <Avatar name="QA User" tone="qa" />
      <Avatar name="Unknown" tone="default" />
    </div>
  ),
};

export const WithCyrillicInitials: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <Avatar name="Евгений Лобачёв" tone="backend" />
      <Avatar name="Анна Петрова" tone="frontend" />
      <Avatar name="Иван Сидоров" tone="manager" />
      <Avatar name="Команда QA" tone="qa" />
    </div>
  ),
};
