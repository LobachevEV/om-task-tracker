import type { Meta, StoryObj } from '@storybook/react-vite';
import { GanttAssigneeStack } from './GanttAssigneeStack';
import { MINI_TEAM_MEMBERS } from './__fixtures__/FeatureFixtures';
import type { MiniTeamMember } from '../../shared/types/feature';

const { qa, fe, be, mg } = MINI_TEAM_MEMBERS;

const extras: MiniTeamMember[] = [
  { userId: 21, email: 'dev1@example.com', displayName: 'Dev One',   role: 'FrontendDeveloper' },
  { userId: 22, email: 'dev2@example.com', displayName: 'Dev Two',   role: 'BackendDeveloper' },
  { userId: 23, email: 'dev3@example.com', displayName: 'Dev Three', role: 'Qa' },
];

const meta: Meta<typeof GanttAssigneeStack> = {
  title: 'Plan/Primitives/GanttAssigneeStack',
  component: GanttAssigneeStack,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Feature team',
  },
};
export default meta;

type Story = StoryObj<typeof GanttAssigneeStack>;

export const Solo: Story = {
  args: { members: [fe] },
};

export const Pair: Story = {
  args: { members: [be, fe] },
};

export const Full: Story = {
  args: { members: [be, fe, qa, mg] },
};

export const Overflow: Story = {
  args: { members: [be, fe, qa, mg, ...extras] },
};

export const Empty: Story = {
  args: { members: [] },
};
