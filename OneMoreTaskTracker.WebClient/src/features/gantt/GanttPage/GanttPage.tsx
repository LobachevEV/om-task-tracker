import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { Spinner, Button, Callout } from '../../../shared/ds';
import { isUserRole, type UserRole } from '../../../shared/auth/roles';
import type {
  FeatureBounds,
  FeatureSummary,
  MiniTeamMember,
} from '../../../shared/types/feature';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
import { GanttChunkStripe } from '../GanttChunkStripe';
import { GanttDateHeader } from '../GanttDateHeader';
import { GanttEmpty } from '../GanttEmpty';
import { GanttFeatureRow } from '../GanttFeatureRow';
import { GanttGoToDate } from '../GanttGoToDate';
import { GanttHardBoundCushion } from '../GanttHardBoundCushion';
import { GanttTimelineScroller } from '../GanttTimelineScroller';
import { GanttToolbar } from '../GanttToolbar';
import { CreateFeatureDialog } from '../CreateFeatureDialog';
import { usePlanFeatures } from '../usePlanFeatures';
import { useTeamRoster } from '../useTeamRoster';
import { useFeatureBounds } from '../useFeatureBounds';
import { useGanttLayout, type GanttLane } from '../useGanttLayout';
import { useGanttPageState, type GanttPageState } from '../useGanttPageState';
import {
  useGanttTimelineScroll,
  type ScrollChunkRequest,
} from '../useGanttTimelineScroll';
import type { ZoomLevel } from '../ganttMath';
import { useFeatureMutationCallbacks } from '../InlineEditors';
import './GanttPage.css';

const PLACEHOLDER_ROLE: MiniTeamMember['role'] = 'FrontendDeveloper';

/** Day-column px width per zoom level. Week zoom = roomy, month zoom = compact. */
const DAY_PX_BY_ZOOM: Readonly<Record<ZoomLevel, number>> = {
  week: 48,
  twoWeeks: 32,
  month: 24,
};

const INITIAL_VIEWPORT_DAYS = 60;
const INITIAL_BUFFER_DAYS = 30;
const CHUNK_DAYS = 30;
const CUSHION_DAYS = 30;

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
  /** Chunk-fetch callback wired into the scrollable timeline. */
  loadChunk: (req: ScrollChunkRequest) => Promise<unknown>;
  /** Global plan bounds used to clamp scrollable range + render cushions. */
  bounds: FeatureBounds | null;
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
  loadChunk,
  bounds,
}: GanttPageInternalProps) {
  const { t } = useTranslation('gantt');
  const [createOpen, setCreateOpen] = useState(false);
  const [goToOpen, setGoToOpen] = useState(false);

  const dayPx = DAY_PX_BY_ZOOM[state.zoom];
  const isManager = role === 'Manager';
  const mutations = useFeatureMutationCallbacks({ onApplied: onFeatureUpdated });

  const scroll = useGanttTimelineScroll({
    today: state.today,
    dayPx,
    initialViewportDays: INITIAL_VIEWPORT_DAYS,
    initialBufferDays: INITIAL_BUFFER_DAYS,
    chunkDays: CHUNK_DAYS,
    cushionDays: CUSHION_DAYS,
    bounds,
    loadChunk,
  });

  const layout = useGanttLayout({
    features,
    today: state.today,
    loadedRange: scroll.loadedRange,
    dayPx,
  });

  const rosterById = useMemo(() => {
    const map = new Map<number, MiniTeamMember>();
    for (const m of roster) map.set(m.userId, m);
    return map;
  }, [roster]);

  const resolveMember = useCallback(
    (userId: number): MiniTeamMember => rosterById.get(userId) ?? placeholderMember(userId),
    [rosterById],
  );

  const resolvePerformer = useCallback(
    (id: number | null | undefined): MiniTeamMember | undefined =>
      id == null ? undefined : rosterById.get(id),
    [rosterById],
  );

  const handleOpenStage = useCallback(
    (featureId: number) => state.toggleFeatureExpanded(featureId),
    [state],
  );

  const handleCreated = useCallback(
    (id: number) => {
      setCreateOpen(false);
      state.toggleFeatureExpanded(id);
      onRetry();
    },
    [state, onRetry],
  );

  // Cmd/Ctrl+G opens the "Go to date" mini-form.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'g' || e.key === 'G')) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setGoToOpen((prev) => !prev);
      } else if (e.key === 'Escape' && goToOpen) {
        setGoToOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToOpen]);

  const handleGoToSubmit = useCallback(
    (iso: string) => {
      setGoToOpen(false);
      void scroll.scrollToDate(iso);
    },
    [scroll],
  );

  const hasAnyFeatures = layout.lanes.length + layout.unscheduled.length > 0;

  // Cushion widths flank the loaded range so the user can pan past the last
  // chunk and still see "earliest plan" / "end of plan" rather than empty space.
  const cushionWidthPx = CUSHION_DAYS * dayPx;
  const showLeadingStripe = scroll.isFetchingLeading || scroll.loadError?.direction === 'leading';
  const showTrailingStripe =
    scroll.isFetchingTrailing || scroll.loadError?.direction === 'trailing';

  // Total content width: leading flank (cushion or stripe) + loaded range + trailing flank.
  const contentWidthPx = cushionWidthPx + scroll.totalWidthPx + cushionWidthPx;
  const todayPxInScroller = cushionWidthPx + scroll.todayPx;

  const pageStyle = {
    ['--day-px']: `${dayPx}px`,
    ['--gantt-cushion-width']: `${cushionWidthPx}px`,
    ['--gantt-loaded-width']: `${scroll.totalWidthPx}px`,
    ['--gantt-today-px']: `${todayPxInScroller}px`,
  } as CSSProperties;

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
          <GanttTimelineScroller
            ref={scroll.scrollerRef}
            contentWidthPx={contentWidthPx}
            todayPx={todayPxInScroller}
            onJumpToToday={scroll.scrollToToday}
          >
            {/* Sticky 3-band date header sits at the top of the inner scroller. */}
            <div
              className="gantt-page__header-row"
              style={{ inlineSize: `${contentWidthPx}px` }}
            >
              <div
                className="gantt-page__header-flank"
                style={{ inlineSize: `${cushionWidthPx}px` }}
                aria-hidden="true"
              />
              <GanttDateHeader
                loadedRange={scroll.loadedRange}
                today={state.today}
                dayPx={dayPx}
                className="gantt-page__date-header"
              />
              <div
                className="gantt-page__header-flank"
                style={{ inlineSize: `${cushionWidthPx}px` }}
                aria-hidden="true"
              />
            </div>

            {/* Today hairline runs full-height through the lanes. */}
            <div
              className="gantt-page__today-hairline"
              role="separator"
              aria-label={t('legend.todayAt', {
                defaultValue: 'Today {{date}}',
                date: state.today,
              })}
              style={{ insetInlineStart: `${todayPxInScroller}px` }}
            />

            <div className="gantt-page__lanes-row">
              {showLeadingStripe ? (
                <GanttChunkStripe
                  side="leading"
                  mode={scroll.isFetchingLeading ? 'loading' : 'failed'}
                  widthPx={cushionWidthPx}
                  onRetry={
                    scroll.loadError?.direction === 'leading'
                      ? scroll.retryFailedChunk
                      : undefined
                  }
                />
              ) : (
                <GanttHardBoundCushion
                  side="leading"
                  boundIso={bounds?.earliestPlannedStart ?? null}
                  widthPx={cushionWidthPx}
                />
              )}

              <div
                className="gantt-page__lanes"
                role="list"
                style={{ inlineSize: `${scroll.totalWidthPx}px` }}
              >
                {layout.lanes.map((lane: GanttLane) => {
                  const lead = resolveMember(lane.feature.leadUserId);
                  const expanded = state.expandedFeatureIds.has(lane.feature.id);
                  return (
                    <GanttFeatureRow
                      key={lane.feature.id}
                      feature={lane.feature}
                      stageBars={lane.stageBars}
                      today={state.today}
                      lead={lead}
                      variant={lane.variant}
                      expanded={expanded}
                      onToggleExpand={state.toggleFeatureExpanded}
                      onOpenStage={handleOpenStage}
                      resolvePerformer={resolvePerformer}
                      canEdit={isManager}
                      mutations={isManager ? mutations : undefined}
                      roster={isManager ? rawRoster : undefined}
                    />
                  );
                })}
              </div>

              {showTrailingStripe ? (
                <GanttChunkStripe
                  side="trailing"
                  mode={scroll.isFetchingTrailing ? 'loading' : 'failed'}
                  widthPx={cushionWidthPx}
                  onRetry={
                    scroll.loadError?.direction === 'trailing'
                      ? scroll.retryFailedChunk
                      : undefined
                  }
                />
              ) : (
                <GanttHardBoundCushion
                  side="trailing"
                  boundIso={bounds?.latestPlannedEnd ?? null}
                  widthPx={cushionWidthPx}
                />
              )}
            </div>
          </GanttTimelineScroller>

          <UnscheduledSection
            features={layout.unscheduled}
            onOpen={state.toggleFeatureExpanded}
          />
        </section>
      )}

      <GanttGoToDate
        open={goToOpen}
        onSubmit={handleGoToSubmit}
        onClose={() => setGoToOpen(false)}
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
  const boundsResult = useFeatureBounds();
  const roster = useTeamRoster();

  const rosterMembers = useMemo<MiniTeamMember[]>(
    () => (roster.data ?? []).map(toMiniMember),
    [roster.data],
  );

  // Adapt usePlanFeatures.loadChunk to the scroll-hook signature, which
  // requires an AbortSignal and ignores the returned rows.
  const loadChunk = useCallback(
    async (req: ScrollChunkRequest) => {
      await features.loadChunk({
        windowStart: req.windowStart,
        windowEnd: req.windowEnd,
        signal: req.signal,
      });
    },
    [features],
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
      loadChunk={loadChunk}
      bounds={boundsResult.bounds}
    />
  );
}
