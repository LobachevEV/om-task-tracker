import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader } from './Card';
import { Button } from '../Button/Button';
import { Badge } from '../Badge/Badge';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => (
    <Card>
      <h2>Спринт 42</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
        47 задач, 12 на ревью, 3 заблокированы
      </p>
    </Card>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Card>
      <CardHeader
        title="Активные релизы"
        actions={
          <Button variant="ghost" size="sm">
            Все
          </Button>
        }
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone="state-in-dev" dot>
          In dev
        </Badge>
        <Badge tone="state-mr-release" dot>
          MR → release
        </Badge>
        <Badge tone="state-in-test" dot>
          In test
        </Badge>
      </div>
    </Card>
  ),
};
