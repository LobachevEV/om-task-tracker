import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './StatusDot';

const meta: Meta<typeof StatusDot> = {
  title: 'Primitives/StatusDot',
  component: StatusDot,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StatusDot>;

export const Gallery: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 12px', alignItems: 'center', fontSize: 13 }}>
      <StatusDot tone="blocked" label="Blocked" />
      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>blocked — ожидание</code>
      <StatusDot tone="passed" label="Passed" />
      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>passed — проверено</code>
      <StatusDot tone="failed" label="Failed" />
      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>failed — ошибка</code>
      <StatusDot tone="neutral" label="Neutral" />
      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>neutral — не применимо</code>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <StatusDot tone="blocked" size={4} label="4px" />
      <StatusDot tone="blocked" size={6} label="6px" />
      <StatusDot tone="blocked" size={8} label="8px" />
      <StatusDot tone="blocked" size={12} label="12px" />
    </div>
  ),
};

export const InlineOnRow: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
      }}
    >
      <StatusDot tone="blocked" />
      <span style={{ color: 'var(--text)' }}>PROJ-1234</span>
      <span style={{ color: 'var(--text-muted)' }}>Ожидает ревью Confluence</span>
    </div>
  ),
};
