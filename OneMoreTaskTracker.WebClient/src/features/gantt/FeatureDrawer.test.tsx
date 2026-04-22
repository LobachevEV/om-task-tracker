import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureDrawer } from './FeatureDrawer';
import { MINI_TEAM_FEATURE_DETAIL } from './__fixtures__/FeatureFixtures';
import type { FeatureDetail } from '../../shared/types/feature';

function makeApi(overrides: Partial<{
  attachTask: (featureId: number, jiraId: string) => Promise<FeatureDetail['feature']>;
  detachTask: (featureId: number, jiraId: string) => Promise<FeatureDetail['feature']>;
  updateFeature: (id: number, patch: unknown) => Promise<FeatureDetail['feature']>;
  getFeature: (id: number) => Promise<FeatureDetail>;
}> = {}) {
  return {
    attachTask: overrides.attachTask ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
    detachTask: overrides.detachTask ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
    updateFeature: overrides.updateFeature ?? vi.fn(async () => MINI_TEAM_FEATURE_DETAIL.feature),
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
    const call = updateFeature.mock.calls[0] as unknown as [number, unknown];
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
});
