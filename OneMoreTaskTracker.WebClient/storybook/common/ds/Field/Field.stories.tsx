import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from '../../../../src/common/ds/Field/Field';

const meta: Meta<typeof TextField> = {
  title: 'Primitives/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: {
    label: 'Email',
    placeholder: 'you@company.tld',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const Playground: Story = {};

export const WithHint: Story = {
  args: {
    label: 'Jira project key',
    hint: 'Например: PROJ, INFRA',
    placeholder: 'PROJ',
  },
};

export const WithError: Story = {
  args: {
    label: 'Пароль',
    type: 'password',
    error: 'Минимум 8 символов',
    defaultValue: '123',
  },
};

export const Compact: Story = {
  args: {
    label: 'Поиск',
    placeholder: 'Найти задачу…',
    compact: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Проект',
    defaultValue: 'OneMoreTaskTracker',
    disabled: true,
  },
};
