import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './Kbd';

const meta: Meta<typeof Kbd> = {
  title: 'Primitives/Kbd',
  component: Kbd,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Kbd>;

export const Single: Story = {
  render: () => <Kbd>⌘</Kbd>,
};

export const Combo: Story = {
  render: () => <Kbd keys={['⌘', 'K']} />,
};

export const InProse: Story = {
  render: () => (
    <p style={{ fontSize: 14, color: 'var(--text)' }}>
      Нажмите <Kbd keys={['⌘', 'K']} size="sm" /> чтобы открыть палитру команд, или{' '}
      <Kbd size="sm">Esc</Kbd> чтобы закрыть диалог.
    </p>
  ),
};

export const ShortcutLegend: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '8px 16px',
        maxWidth: 320,
        fontSize: 13,
        color: 'var(--text-muted)',
      }}
    >
      <Kbd keys={['⌘', 'K']} size="sm" />
      <span>Открыть палитру</span>
      <Kbd keys={['⌘', 'N']} size="sm" />
      <span>Новая задача</span>
      <Kbd keys={['G', 'P']} size="sm" />
      <span>Перейти к пайплайну</span>
      <Kbd size="sm">/</Kbd>
      <span>Фокус на поиск</span>
    </div>
  ),
};
