import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GanttFeatureRow } from './GanttFeatureRow';
import {
  FIXTURE_TODAY,
  MINI_TEAM_FEATURE,
  MINI_TEAM_FEATURE_DETAIL,
  MINI_TEAM_MEMBERS,
} from '../__fixtures__/FeatureFixtures';
import { barGeometry, windowForZoom } from '../ganttMath';

const { fe, be, qa } = MINI_TEAM_MEMBERS;
const windowMonth = windowForZoom(FIXTURE_TODAY, 'month');
const miniTeamBar = barGeometry(windowMonth, {
  start: MINI_TEAM_FEATURE.plannedStart,
  end: MINI_TEAM_FEATURE.plannedEnd,
});

describe('GanttFeatureRow', () => {
  it('calls onOpen when the title button is clicked', () => {
    const onOpen = vi.fn();
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        bar={miniTeamBar}
        window={windowMonth}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be, fe, qa]}
        onOpen={onOpen}
      />,
    );
    const titleBtn = screen
      .getAllByRole('button', { name: new RegExp(MINI_TEAM_FEATURE.title, 'i') })
      .find((el) => el.classList.contains('gantt-row__title'))!;
    fireEvent.click(titleBtn);
    expect(onOpen).toHaveBeenCalledWith(MINI_TEAM_FEATURE.id);
  });

  it('invokes onRevealTasks on mouse enter/leave of the lane', () => {
    const onRevealTasks = vi.fn();
    const { container } = render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        bar={miniTeamBar}
        window={windowMonth}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be, fe, qa]}
        onOpen={vi.fn()}
        onRevealTasks={onRevealTasks}
      />,
    );
    const lane = container.querySelector('.gantt-row__lane') as HTMLElement;
    expect(lane).not.toBeNull();
    fireEvent.mouseEnter(lane);
    expect(onRevealTasks).toHaveBeenCalledWith(true);
    fireEvent.mouseLeave(lane);
    expect(onRevealTasks).toHaveBeenCalledWith(false);
  });

  it('renders one sub-bar per task when isTasksRevealed and tasks are provided', () => {
    render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        bar={miniTeamBar}
        window={windowMonth}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={MINI_TEAM_FEATURE_DETAIL.miniTeam}
        tasks={MINI_TEAM_FEATURE_DETAIL.tasks}
        onOpen={vi.fn()}
        isTasksRevealed
      />,
    );
    const subBars = screen
      .getAllByRole('button')
      .filter((el) => el.className.includes('gantt-row__task-bar'));
    expect(subBars).toHaveLength(MINI_TEAM_FEATURE_DETAIL.tasks.length);
  });

  it('renders a skeleton strip when isTasksRevealed but tasks is undefined', () => {
    const { container } = render(
      <GanttFeatureRow
        feature={MINI_TEAM_FEATURE}
        bar={miniTeamBar}
        window={windowMonth}
        today={FIXTURE_TODAY}
        lead={be}
        miniTeam={[be]}
        onOpen={vi.fn()}
        isTasksRevealed
      />,
    );
    expect(container.querySelector('.gantt-row__task-skeleton')).not.toBeNull();
  });
});
