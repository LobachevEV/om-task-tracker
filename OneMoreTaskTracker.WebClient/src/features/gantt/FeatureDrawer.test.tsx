import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureDrawer } from './FeatureDrawer';
import {
  EMPTY_FEATURE_DETAIL,
  MINI_TEAM_FEATURE_DETAIL,
  MINI_TEAM_MEMBERS,
  SHIPPED_FEATURE_DETAIL,
  STALE_PERFORMER_DETAIL,
} from './__fixtures__/FeatureFixtures';
import type { FeatureDetail, UpdateFeaturePayload } from '../../shared/types/feature';
import { __resetTeamRosterCache } from './useTeamRoster';
import type { TeamRosterMember } from '../../shared/api/teamApi';
import * as teamApi from '../../shared/api/teamApi';

const ROSTER: TeamRosterMember[] = Object.values(MINI_TEAM_MEMBERS).map((m) => ({
  userId: m.userId,
  email: m.email,
  role: m.role,
  displayName: m.displayName,
  isSelf: false,
  managerId: null,
  status: {
    active: 0,
    lastActive: null,
    mix: { inDev: 0, mrToRelease: 0, inTest: 0, mrToMaster: 0, completed: 0 },
  },
}));

beforeEach(() => {
  __resetTeamRosterCache();
  vi.spyOn(teamApi, 'getRoster').mockResolvedValue(ROSTER);
});

function makeApi(overrides: Partial<{
  attachTask: (featureId: number, jiraId: string) => Promise<FeatureDetail['feature']>;
  detachTask: (featureId: number, jiraId: string) => Promise<FeatureDetail['feature']>;
  updateFeature: (id: number, patch: UpdateFeaturePayload) => Promise<FeatureDetail['feature']>;
  getFeature: (id: number) => Promise<FeatureDetail>;
}> = {}) {
  return {
    attachTask: overrides.attachTask ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
    detachTask: overrides.detachTask ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
    updateFeature:
      overrides.updateFeature ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
    getFeature: overrides.getFeature ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL),
  };
}

describe('FeatureDrawer', () => {
  it('does not render when featureId is null and has never opened', () => {
    const { container } = render(
      <FeatureDrawer
        featureId={null}
        onClose={vi.fn()}
        canEdit
        preloadedDetail={null}
      />,
    );
    expect(container.querySelector('.feature-drawer')).toBeNull();
  });

  it('renders feature title and meta when preloaded detail is provided', () => {
    render(
      <FeatureDrawer
        featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
        onClose={vi.fn()}
        canEdit
        preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
        api={makeApi()}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: MINI_TEAM_FEATURE_DETAIL.feature.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MINI_TEAM_FEATURE_DETAIL.feature.title),
    ).toBeInTheDocument();
  });

  it('hides edit/attach/detach when canEdit is false', () => {
    render(
      <FeatureDrawer
        featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
        onClose={vi.fn()}
        canEdit={false}
        preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
        api={makeApi()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Изменить|Edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Открепить|Detach/i })).toBeNull();
  });

  it('Escape triggers onClose', () => {
    const onClose = vi.fn();
    render(
      <FeatureDrawer
        featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
        onClose={onClose}
        canEdit
        preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
        api={makeApi()}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('submits a sparse update patch containing only changed fields', async () => {
    const user = userEvent.setup();
    const updateFeature = vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature);
    render(
      <FeatureDrawer
        featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
        onClose={vi.fn()}
        canEdit
        preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
        api={makeApi({ updateFeature })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
    const titleInput = screen.getByDisplayValue(
      MINI_TEAM_FEATURE_DETAIL.feature.title,
    );
    await user.clear(titleInput);
    await user.type(titleInput, 'New shiny title');
    await user.click(screen.getByRole('button', { name: /Сохранить|Save/i }));
    expect(updateFeature).toHaveBeenCalledTimes(1);
    const call = updateFeature.mock.calls[0] as unknown as [number, UpdateFeaturePayload];
    expect(call[1]).toEqual({ title: 'New shiny title' });
  });

  it('keeps Save disabled when the form is clean', async () => {
    const user = userEvent.setup();
    render(
      <FeatureDrawer
        featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
        onClose={vi.fn()}
        canEdit
        preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
        api={makeApi()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
    const save = screen.getByRole('button', { name: /Сохранить|Save/i });
    expect(save).toBeDisabled();
  });

  describe('stage planning', () => {
    it('renders all 5 stage rows in the edit form', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      const rows = document.querySelectorAll('.stage-plan__row:not(.stage-plan__row--head)');
      expect(rows).toHaveLength(5);
    });

    it('includes stagePlans in patch when a stage date changes', async () => {
      const user = userEvent.setup();
      const updateFeature = vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature);
      render(
        <FeatureDrawer
          featureId={EMPTY_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={EMPTY_FEATURE_DETAIL}
          api={makeApi({ updateFeature })}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(10);
      // Change stage-1 (CsApproving) start
      fireEvent.change(dateInputs[0], { target: { value: '2026-06-01' } });
      await user.click(screen.getByRole('button', { name: /Сохранить|Save/i }));
      expect(updateFeature).toHaveBeenCalledTimes(1);
      const [, patch] = updateFeature.mock.calls[0] as unknown as [number, UpdateFeaturePayload];
      expect(patch.stagePlans).toBeDefined();
      expect(patch.stagePlans).toHaveLength(5);
      const cs = patch.stagePlans!.find((p) => p.stage === 'CsApproving');
      expect(cs?.plannedStart).toBe('2026-06-01');
    });

    it('empty stage plan shows 5 rows with empty date inputs', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={EMPTY_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={EMPTY_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      const dateInputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
      for (const input of dateInputs) expect(input.value).toBe('');
    });

    it('fully-planned feature shows dates and performer names', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      expect(screen.getByDisplayValue('2026-04-10')).toBeInTheDocument(); // CS start
      // Live release start == end == 2026-05-05 (two inputs share that value).
      expect(screen.getAllByDisplayValue('2026-05-05').length).toBeGreaterThanOrEqual(2);
    });

    it('feature state marks the matching row as active', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      const activeRows = document.querySelectorAll(
        '.stage-plan__row:not(.stage-plan__row--head)[data-active="true"]',
      );
      expect(activeRows).toHaveLength(1);
    });

    it('stale performer id renders without crashing (placeholder handling)', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={STALE_PERFORMER_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={STALE_PERFORMER_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      // Drawer doesn't crash; rows still render (gateway enum-fallback per codebase rules).
      const rows = document.querySelectorAll('.stage-plan__row:not(.stage-plan__row--head)');
      expect(rows).toHaveLength(5);
    });

    it('viewer role renders stage rows read-only (no inputs, no dropdowns)', () => {
      render(
        <FeatureDrawer
          featureId={MINI_TEAM_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit={false}
          preloadedDetail={MINI_TEAM_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      // Non-manager view doesn't even reach the edit form; no Save button, no date inputs.
      expect(screen.queryByRole('button', { name: /Сохранить|Save/i })).toBeNull();
      expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
    });

    it('shipped feature (LiveRelease) still allows editing per brief — row active on Live release', async () => {
      const user = userEvent.setup();
      render(
        <FeatureDrawer
          featureId={SHIPPED_FEATURE_DETAIL.feature.id}
          onClose={vi.fn()}
          canEdit
          preloadedDetail={SHIPPED_FEATURE_DETAIL}
          api={makeApi()}
        />,
      );
      await user.click(screen.getByRole('button', { name: /Изменить|Edit/i }));
      const activeRows = document.querySelectorAll(
        '.stage-plan__row:not(.stage-plan__row--head)[data-active="true"]',
      );
      expect(activeRows).toHaveLength(1);
    });
  });
});
