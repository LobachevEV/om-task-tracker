import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { Spinner, Button, Callout } from '../../../shared/ds';
import { isUserRole, type UserRole } from '../../../shared/auth/roles';
import type { FeatureSummary, MiniTeamMember } from '../../../shared/types/feature';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
import { FeatureDrawer } from '../FeatureDrawer';
import { GanttEmpty } from '../GanttEmpty';
import { GanttFeatureRow } from '../GanttFeatureRow';
import { GanttTimeline } from '../GanttTimeline';
import { GanttToolbar } from '../GanttToolbar';
import { CreateFeatureDialog } from '../CreateFeatureDialog';
import { usePlanFeatures } from '../usePlanFeatures';
import { useTeamRoster } from '../useTeamRoster';
import { useGanttLayout, type GanttLane } from '../useGanttLayout';
import { useGanttPageState, type GanttPageState } from '../useGanttPageState';
import { ZOOM_DAYS } from '../ganttMath';
import './GanttPage.css';

const PLACEHOLDER_ROLE: MiniTeamMember['role'] = 'FrontendDeveloper';

function toMiniMember(row: TeamRosterMember): MiniTeamMember {
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: isUserRole(row.role) ? row.role : PLACEHOLDER_ROLE,
  };
}

// Synthetic stand-in when a feature references a user that is no longer in the
// roster (e.g. removed manager/dev). email is intentionally non-deliverable —
// it is only ever rendered, never sent.
function placeholderMember(userId: number): MiniTeamMember {
  return {
    userId,
    email: `user-${userId}@placeholder`,
    displayName: `#${userId}`,
    role: PLACEHOLDER_ROLE,
  };
}

export interface GanttPageInternalProps {
  role: UserRole;
  features: FeatureSummary[];
  roster: MiniTeamMember[];
  rosterLoading: boolean;
  rosterError: Error | null;
  onRosterRetry: () => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  state: GanttPageState;
}

interface UnscheduledSectionProps {
  features: FeatureSummary[];
  onOpen: (id: number) => void;
}

function UnscheduledSection({ features, onOpen }: UnscheduledSectionProps) {
  const { t } = useTranslation('gantt');
  if (features.length === 0) return null;
  return (
    <section className="gantt-page__unscheduled" aria-label={t('row.unscheduled')}>
      <h3 className="gantt-page__section-title">{t('row.unscheduled')}</h3>
      <ul className="gantt-page__unscheduled-list">
        {features.map((feature) => (
          <li key={feature.id}>
            <button
              type="button"
              className="gantt-page__unscheduled-item"
              onClick={() => onOpen(feature.id)}
            >
              <span>{feature.title}</span>
              <span className="gantt-page__unscheduled-state">{t(`state.${feature.state}`)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GanttPageInternal({
  role,
  features,
  roster,
  rosterLoading,
  rosterError,
  onRosterRetry,
  loading,
  error,
  onRetry,
  state,
}: GanttPageInternalProps) {
  const { t } = useTranslation('gantt');
  const [createOpen, setCreateOpen] = useState(false);

  const layout = useGanttLayout({ features, today: state.today, zoom: state.zoom });
  const isManager = role === 'Manager';

  const rosterById = useMemo(() => {
    const map = new Map<number, MiniTeamMember>();
    for (const m of roster) map.set(m.userId, m);
    return map;
  }, [roster]);

  const resolveMember = useCallback(
    (userId: number): MiniTeamMember => rosterById.get(userId) ?? placeholderMember(userId),
    [rosterById],
  );

  const handleCreated = useCallback(
    (id: number) => {
      setCreateOpen(false);
      state.openFeature(id);
      onRetry();
    },
    [state, onRetry],
  );

  const hasAnyFeatures = layout.lanes.length + layout.unscheduled.length > 0;

  const pageStyle = { '--day-count': String(ZOOM_DAYS[state.zoom]) } as CSSProperties;

  return (
    <main className="gantt-page" style={pageStyle}>
      <GanttToolbar
        role={role}
        zoom={state.zoom}
        scope={state.scope}
        stateFilter={state.stateFilter}
        onZoomChange={state.setZoom}
        onScopeChange={state.setScope}
        onStateFilterChange={state.setStateFilter}
        onNewFeature={isManager ? () => setCreateOpen(true) : undefined}
      />

      {rosterError ? (
        <Callout
          tone="warning"
          layout="banner"
          aria-label={t('row.team')}
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRosterRetry}
              loading={rosterLoading}
            >
              {t('retry')}
            </Button>
          }
        >
          {t('row.team')}: {t('failed')}
        </Callout>
      ) : null}

      {loading ? (
        <div className="gantt-page__centered">
          <Spinner label={t('loading')} />
        </div>
      ) : error ? (
        <div className="gantt-page__centered">
          <Callout
            tone="danger"
            action={
              <Button type="button" variant="primary" onClick={onRetry}>
                {t('retry')}
              </Button>
            }
          >
            {t('failed')}
          </Callout>
        </div>
      ) : !hasAnyFeatures ? (
        <GanttEmpty
          canCreate={isManager}
          onCreate={isManager ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <section className="gantt-page__timeline-wrap">
          <GanttTimeline window={layout.window} zoom={state.zoom} todayPercent={layout.todayPercent} />
          <div className="gantt-page__lanes" role="list">
            {layout.lanes.map((lane: GanttLane) => {
              const lead = resolveMember(lane.feature.leadUserId);
              // Summary view knows only the lead; task-assignee resolution requires
              // FeatureDetail (lazy), so the mini-team fills in once the drawer opens.
              const miniTeam = [lead];
              return (
                <GanttFeatureRow
                  key={lane.feature.id}
                  feature={lane.feature}
                  bar={lane.bar}
                  window={layout.window}
                  today={state.today}
                  lead={lead}
                  miniTeam={miniTeam}
                  isTasksRevealed={state.revealedFeatureId === lane.feature.id}
                  onRevealTasks={(next) =>
                    state.revealTasks(next ? lane.feature.id : null)
                  }
                  onOpen={() => state.openFeature(lane.feature.id)}
                />
              );
            })}
          </div>
          <UnscheduledSection
            features={layout.unscheduled}
            onOpen={state.openFeature}
          />
        </section>
      )}

      <FeatureDrawer
        featureId={state.selectedFeatureId}
        onClose={state.closeFeature}
        canEdit={isManager}
      />

      {isManager ? (
        <CreateFeatureDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(feature) => handleCreated(feature.id)}
        />
      ) : null}
    </main>
  );
}

export function GanttPage() {
  const { user } = useAuth();
  if (!user) return null;
  const role = user.role;
  const state = useGanttPageState(role);
  const features = usePlanFeatures({
    scope: state.scope,
    state: state.stateFilter === 'all' ? undefined : state.stateFilter,
  });
  const roster = useTeamRoster();

  const rosterMembers = useMemo<MiniTeamMember[]>(
    () => (roster.data ?? []).map(toMiniMember),
    [roster.data],
  );

  return (
    <GanttPageInternal
      role={role}
      features={features.data ?? []}
      roster={rosterMembers}
      rosterLoading={roster.loading}
      rosterError={roster.error}
      onRosterRetry={roster.refetch}
      loading={features.loading}
      error={features.error}
      onRetry={features.refetch}
      state={state}
    />
  );
}
