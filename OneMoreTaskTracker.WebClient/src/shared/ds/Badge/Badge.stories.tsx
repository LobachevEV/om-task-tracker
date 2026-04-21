import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, type BadgeTone } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Badge',
    tone: 'neutral',
    dot: false,
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Playground: Story = {};

const roleTones: BadgeTone[] = ['role-manager', 'role-frontend', 'role-backend', 'role-qa'];
const stateTones: BadgeTone[] = [
  'state-not-started',
  'state-in-dev',
  'state-mr-release',
  'state-in-test',
  'state-mr-master',
  'state-completed',
];
const feedbackTones: BadgeTone[] = ['success', 'warning', 'danger', 'neutral'];

function Row({ label, tones }: { label: string; tones: BadgeTone[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tones.map((tone) => (
          <Badge key={tone} tone={tone} dot={tone.startsWith('state-')}>
            {tone.replace(/^(role|state)-/, '')}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export const Gallery: Story = {
  render: () => (
    <div>
      <Row label="Role" tones={roleTones} />
      <Row label="Pipeline state" tones={stateTones} />
      <Row label="Feedback" tones={feedbackTones} />
    </div>
  ),
};
