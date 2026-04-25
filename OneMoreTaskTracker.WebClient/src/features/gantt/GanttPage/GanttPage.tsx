import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { Spinner, Button, Callout } from '../../../shared/ds';
import { isUserRole, type UserRole } from '../../../shared/auth/roles';
import type { FeatureSummary, MiniTeamMember } from '../../../shared/types/feature';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
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
import { useOptimisticFeatureMutation } from '../InlineEditors';
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

function placeholderMember(userId: number): MiniTeamMember {
  return {
    userId,
    email: null,
    displayName: `#${userId}`,
    role: PLACEHOLDER_ROLE,
  };
}

export interface GanttPageInternalProps {
  role: UserRole;
  features: FeatureSummary[];
  roster: MiniTeamMember[];
  /**
   * Raw roster rows kept around so the inline owner picker can send the
   * full (email / role / manager flag) mini-member to the editor without
   * a second mapping pass. The `roster` prop above is the display-facing
   * subset.
   */
  rawRoster: readonly TeamRosterMember[];
  rosterLoading: boolean;
  rosterError: Error | null;
  onRosterRetry: () => void;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  state: GanttPageState;
  /**
   * Patch a single feature row in place after an inline-edit PATCH.
   * Supplied by `usePlanFeatures.applyFeatureUpdate`.
   */
  onFeatureUpdated: (next: FeatureSummary) => void;
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
  rawRoster,
  rosterLoading,
  rosterError,
  onRosterRetry,
  loading,
  error,
  onRetry,
  state,
  onFeatureUpdated,
}: GanttPageInternalProps) {
  const { t } = useTranslation('gantt');
  const [createOpen, setCreateOpen] = useState(false);

  const layout = useGanttLayout({ features, today: state.today, zoom: state.zoom });
  const isManager = role === 'Manager';
  const mutations = useOptimisticFeatureMutation({ onApplied: onFeatureUpdated });

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
      state.toggleFeatureExpanded(id);
      onRetry();
    },
    [state, onRetry],
  );

  const hasAnyFeatures = layout.lanes.length + layout.unscheduled.length > 0;

  const pageStyle = { '--day-count': String(ZOOM_DAYS[state.zoom]) } as CSSProperties;

  return (
    <main className="gantt-page" style={pageStyle} data-testid="gantt-page">
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
            {layout.todayPercent != null ? (
              <>
                <div
                  className="gantt-page__today-hairline"
                  role="separator"
                  aria-label={t('legend.todayAt', {
                    defaultValue: 'Today {{date}}',
                    date: state.today,
                  })}
                  style={
                    {
                      ['--today-percent' as string]: String(layout.todayPercent),
                    } as CSSProperties
                  }
                />
                <span
                  className="gantt-page__today-chip"
                  aria-hidden="true"
                  style={
                    {
                      ['--today-percent' as string]: String(layout.todayPercent),
                    } as CSSProperties
                  }
                >
                  {t('legend.today')}
                </span>
              </>
            ) : null}
            {layout.lanes.map((lane: GanttLane) => {
              const lead = resolveMember(lane.feature.leadUserId);
              const expanded = state.expandedFeatureIds.has(lane.feature.id);
              return (
                <GanttFeatureRow
                  key={lane.feature.id}
                  feature={lane.feature}
                  bar={lane.bar}
                  stageBars={lane.stageBars}
                  window={layout.window}
                  today={state.today}
                  lead={lead}
                  variant={lane.variant}
                  expanded={expanded}
                  onToggleExpand={() => state.toggleFeatureExpanded(lane.feature.id)}
                  onOpenStage={() => state.toggleFeatureExpanded(lane.feature.id)}
                  resolvePerformer={(id) =>
                    id == null ? undefined : rosterById.get(id)
                  }
                  canEdit={isManager}
                  mutations={isManager ? mutations : undefined}
                  roster={isManager ? rawRoster : undefined}
                />
              );
            })}
          </div>
          <UnscheduledSection
            features={layout.unscheduled}
            onOpen={state.toggleFeatureExpanded}
          />
        </section>
      )}

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

const ANONYMOUS_ROLE: UserRole = 'FrontendDeveloper';

export function GanttPage() {
  const { user } = useAuth();
  // All hooks must execute unconditionally; we gate rendering, not hook calls.
  const role: UserRole = user?.role ?? ANONYMOUS_ROLE;
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

  if (!user) return null;

  return (
    <GanttPageInternal
      role={role}
      features={features.data ?? []}
      roster={rosterMembers}
      rawRoster={roster.data ?? []}
      rosterLoading={roster.loading}
      rosterError={roster.error}
      onRosterRetry={roster.refetch}
      loading={features.loading}
      error={features.error}
      onRetry={features.refetch}
      state={state}
      onFeatureUpdated={features.applyFeatureUpdate}
    />
  );
}
