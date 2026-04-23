import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CreateFeatureDialog } from './CreateFeatureDialog';
import { SOLO_FEATURE } from '../__fixtures__/FeatureFixtures';

const okApi = {
  createFeature: async () => SOLO_FEATURE,
};

const pendingApi = {
  createFeature: () => new Promise<typeof SOLO_FEATURE>(() => {}),
};

const failingApi = {
  createFeature: async () => {
    throw new Error('Title is required');
  },
};

const meta: Meta<typeof CreateFeatureDialog> = {
  title: 'Plan/Composed/CreateFeatureDialog',
  component: CreateFeatureDialog,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  args: {
    open: true,
    onClose: fn(),
    onCreated: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof CreateFeatureDialog>;

export const Open: Story = {
  args: { api: okApi },
};

export const Submitting: Story = {
  args: { api: pendingApi },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const titleInput = doc.querySelector<HTMLInputElement>('.dialog__message input');
    if (titleInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeSetter?.call(titleInput, 'New feature');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const submit = doc.querySelector<HTMLButtonElement>('.dialog__message button[type="submit"]');
    submit?.click();
  },
};

export const ValidationError: Story = {
  args: { api: failingApi },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const titleInput = doc.querySelector<HTMLInputElement>('.dialog__message input');
    if (titleInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeSetter?.call(titleInput, 'Bad');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const form = doc.querySelector<HTMLFormElement>('.dialog__message form');
    form?.requestSubmit();
  },
};
