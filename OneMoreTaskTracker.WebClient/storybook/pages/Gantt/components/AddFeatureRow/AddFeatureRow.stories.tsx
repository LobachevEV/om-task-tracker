import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AddFeatureRow } from '../../../../../src/pages/Gantt/components/AddFeatureRow';
import type { FeatureSummary } from '../../../../../src/common/types/feature';
import { UNSCHEDULED_FEATURE } from '../../../../../src/pages/Gantt/__fixtures__/FeatureFixtures';

const summary: FeatureSummary = {
  id: 1,
  title: 'New feature',
  description: null,
  state: 'CsApproving',
  plannedStart: null,
  plannedEnd: null,
  leadUserId: 1,
  managerUserId: 1,
  taskCount: 0,
  taskIds: [],
  taxonomy: UNSCHEDULED_FEATURE.taxonomy,
  version: 0,
};

const okApi = { createFeature: async () => summary };
const slowApi = {
  createFeature: () =>
    new Promise<FeatureSummary>((resolve) =>
      setTimeout(() => resolve(summary), 1200),
    ),
};
const failingApi = {
  createFeature: async (): Promise<FeatureSummary> => {
    throw new Error("Couldn't add. Try again.");
  },
};

const meta: Meta<typeof AddFeatureRow> = {
  title: 'Plan/Composed/AddFeatureRow',
  component: AddFeatureRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    onCreated: fn(),
    api: okApi,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          minWidth: '720px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AddFeatureRow>;

export const RowGhost: Story = { args: { variant: 'row' } };

export const RowSlowSubmit: Story = {
  args: { variant: 'row', api: slowApi },
};

export const RowFailingSubmit: Story = {
  args: { variant: 'row', api: failingApi },
};

export const Standalone: Story = {
  args: { variant: 'standalone' },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--bg)',
          padding: '32px',
          minHeight: '240px',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Story />
      </div>
    ),
  ],
};
