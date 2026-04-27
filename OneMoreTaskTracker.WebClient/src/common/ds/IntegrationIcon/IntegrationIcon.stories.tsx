import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IntegrationIcon } from './IntegrationIcon';

const meta: Meta<typeof IntegrationIcon> = {
  title: 'Primitives/IntegrationIcon',
  component: IntegrationIcon,
  tags: ['autodocs'],
  args: {
    kind: 'jira',
    tone: 'blocked',
    title: 'Ожидает ревью',
  },
  argTypes: {
    kind: { control: 'inline-radio', options: ['gitlab', 'github', 'jira', 'confluence', 'slack'] },
    tone: { control: 'inline-radio', options: ['blocked', 'passed', 'failed', 'neutral'] },
  },
};
export default meta;

type Story = StoryObj<typeof IntegrationIcon>;

export const Playground: Story = {};

export const AllIntegrations: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
      <IntegrationIcon kind="jira" tone="blocked" title="Jira: waiting for PM" />
      <IntegrationIcon kind="gitlab" tone="passed" title="GitLab: MR merged" />
      <IntegrationIcon kind="github" tone="passed" title="GitHub: checks green" />
      <IntegrationIcon kind="confluence" tone="blocked" title="Confluence: approval pending" />
      <IntegrationIcon kind="slack" tone="neutral" title="Slack: open thread" />
    </div>
  ),
};

export const Interactive: Story = {
  name: 'Clickable (Slack quick action)',
  render: () => (
    <IntegrationIcon
      kind="slack"
      tone="neutral"
      title="Open #release-pipeline in Slack"
      onActivate={fn()}
    />
  ),
};

export const OnTaskRow: Story = {
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
        width: 500,
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 13 }}>
        PROJ-1234
      </span>
      <span style={{ flex: 1, color: 'var(--text)', fontSize: 13 }}>
        Автоматизация pipeline релизов
      </span>
      <IntegrationIcon kind="jira" tone="passed" title="Jira: in progress" />
      <IntegrationIcon kind="gitlab" tone="blocked" title="GitLab: MR open, 2 reviewers" />
      <IntegrationIcon kind="confluence" tone="failed" title="Confluence: review rejected" />
      <IntegrationIcon
        kind="slack"
        tone="neutral"
        title="Open #proj-1234 in Slack"
        onActivate={fn()}
      />
    </div>
  ),
};
