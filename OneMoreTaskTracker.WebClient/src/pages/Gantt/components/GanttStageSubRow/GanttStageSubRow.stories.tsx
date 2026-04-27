import type { Meta, StoryObj } from '@storybook/react-vite';
import { GanttStageSubRow } from './GanttStageSubRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_MEMBERS,
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  UNSCHEDULED_FEATURE,
} from '../../__fixtures__/FeatureFixtures';
import { windowForZoom } from '../../ganttMath';
import { computeStageBars } from '../../ganttStageGeometry';
import type { MiniTeamMember } from '../../../../common/types/feature';

const members = Object.values(MINI_TEAM_MEMBERS) as MiniTeamMember[];
const resolve = (id: number | null | undefined): MiniTeamMember | undefined =>
  id == null ? undefined : members.find((m) => m.userId === id);
const win = windowForZoom(FIXTURE_TODAY, 'month');
const DAY_PX = 32;

const meta: Meta<typeof GanttStageSubRow> = {
  title: 'features/gantt/GanttStageSubRow',
  component: GanttStageSubRow,
  decorators: [
    (Story) => (
      <div style={{ width: 960, background: 'var(--bg)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GanttStageSubRow>;

const miniTeamBars = computeStageBars(win, MINI_TEAM_FEATURE, FIXTURE_TODAY, DAY_PX);
const overdueBars = computeStageBars(win, OVERDUE_FEATURE, FIXTURE_TODAY, DAY_PX);
const shippedBars = computeStageBars(win, SHIPPED_FEATURE, FIXTURE_TODAY, DAY_PX);
const unscheduledBars = computeStageBars(win, UNSCHEDULED_FEATURE, FIXTURE_TODAY, DAY_PX);

export const ActiveTestingStage: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    seg: miniTeamBars.find((b) => b.stage === 'Testing')!,
    today: FIXTURE_TODAY,
    resolvePerformer: resolve,
    index: 2,
    onOpenStage: () => undefined,
  },
};

export const OverdueDevelopment: Story = {
  args: {
    feature: OVERDUE_FEATURE,
    seg: overdueBars.find((b) => b.stage === 'Development')!,
    today: FIXTURE_TODAY,
    resolvePerformer: resolve,
    index: 1,
    onOpenStage: () => undefined,
  },
};

export const CompletedLiveRelease: Story = {
  args: {
    feature: SHIPPED_FEATURE,
    seg: shippedBars.find((b) => b.stage === 'LiveRelease')!,
    today: FIXTURE_TODAY,
    resolvePerformer: resolve,
    index: 4,
    onOpenStage: () => undefined,
  },
};

export const UnassignedCsApproving: Story = {
  args: {
    feature: UNSCHEDULED_FEATURE,
    seg: unscheduledBars[0],
    today: FIXTURE_TODAY,
    resolvePerformer: resolve,
    index: 0,
    onOpenStage: () => undefined,
  },
};

export const RemovedPerformer: Story = {
  args: {
    feature: MINI_TEAM_FEATURE,
    seg: miniTeamBars.find((b) => b.stage === 'Development')!,
    today: FIXTURE_TODAY,
    removedPerformerName: 'Ex Dev',
    resolvePerformer: () => undefined,
    index: 1,
    onOpenStage: () => undefined,
  },
};
