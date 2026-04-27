import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Kbd } from '../Kbd/Kbd';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    block: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    children: 'Создать задачу',
    variant: 'primary',
    size: 'md',
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const Primary: Story = {
  args: { variant: 'primary', children: 'Создать релиз' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Отменить' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Подробнее' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Удалить задачу' },
};

export const Loading: Story = {
  args: { loading: true, children: 'Сохраняем…' },
};

export const WithShortcut: Story = {
  name: 'With trailing shortcut',
  args: {
    variant: 'secondary',
    children: 'Открыть палитру',
    trailing: <Kbd keys={['⌘', 'K']} size="sm" />,
  },
};

export const AllSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

