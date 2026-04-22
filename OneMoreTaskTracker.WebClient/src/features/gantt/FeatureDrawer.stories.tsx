import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FeatureDrawer } from './FeatureDrawer';
import { MINI_TEAM_FEATURE_DETAIL } from './__fixtures__/FeatureFixtures';
import type { FeatureDetail } from '../../shared/types/feature';

const mockApi = {
  attachTask: async () => MINI_TEAM_FEATURE_DETAIL.feature,
  detachTask: async () => MINI_TEAM_FEATURE_DETAIL.feature,
  updateFeature: async () => MINI_TEAM_FEATURE_DETAIL.feature,
  getFeature: async (): Promise<FeatureDetail> => MINI_TEAM_FEATURE_DETAIL,
};

const meta: Meta<typeof FeatureDrawer> = {
  title: 'Plan/Composed/FeatureDrawer',
  component: FeatureDrawer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
    featureId: MINI_TEAM_FEATURE_DETAIL.feature.id,
    api: mockApi,
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof FeatureDrawer>;

export const ReadOnly_Manager_Viewing: Story = {
  args: {
    canEdit: true,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
};

export const ReadOnly_Qa_Viewing: Story = {
  args: {
    canEdit: false,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
};

export const Editing: Story = {
  args: {
    canEdit: true,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
  play: async ({ canvasElement }) => {
    const editBtn = canvasElement.ownerDocument.querySelector<HTMLButtonElement>(
      '.feature-drawer__footer button',
    );
    editBtn?.click();
  },
};

export const EditingWithValidationError: Story = {
  args: {
    canEdit: true,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
  play: async ({ canvasElement }) => {
    const editBtn = canvasElement.ownerDocument.querySelector<HTMLButtonElement>(
      '.feature-drawer__footer button',
    );
    editBtn?.click();
    await new Promise((r) => setTimeout(r, 0));
    const input = canvasElement.ownerDocument.querySelector<HTMLInputElement>(
      '.feature-drawer__form input[type="text"], .feature-drawer__form input:not([type])',
    );
    if (input) {
      input.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeSetter?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
};

export const AttachingTask: Story = {
  args: {
    canEdit: true,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
};

export const Detaching: Story = {
  args: {
    canEdit: true,
    preloadedDetail: MINI_TEAM_FEATURE_DETAIL,
  },
  play: async ({ canvasElement }) => {
    const detachBtn = canvasElement.ownerDocument.querySelector<HTMLButtonElement>(
      '.feature-drawer__task-item button',
    );
    detachBtn?.click();
  },
};

export const Loading: Story = {
  args: {
    canEdit: true,
    preloadedDetail: null,
    forceLoading: true,
  },
};

export const ErrorState: Story = {
  name: 'Error',
  args: {
    canEdit: true,
    preloadedDetail: null,
    forceError: new globalThis.Error('Network'),
  },
};
