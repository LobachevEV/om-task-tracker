import { useCallback, useMemo, type CSSProperties } from 'react';
import { useAuth } from '../../common/auth/AuthContext';
import type { UserRole } from '../../common/auth/roles';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../common/types/feature';
import type { TeamRosterMember } from '../../common/api/teamApi';
import { GanttEmpty } from './components/GanttEmpty';
import { GanttGoToDate } from './components/GanttGoToDate';
import { GanttPageHeader } from './components/GanttPageHeader';
import { GanttPageStateBanners } from './components/GanttPageStateBanners';
import { GanttTimelineSection } from './components/GanttTimelineSection';
import { usePlanFeatures } from './usePlanFeatures';
import { useTeamRoster } from './useTeamRoster';
import { useGanttLayout } from './useGanttLayout';
import { useGanttPageState, type GanttPageState } from './useGanttPageState';
import { useGoToDateShortcut } from './useGoToDateShortcut';
import {
  useGanttTimelineScroll,
  type ScrollChunkRequest,
} from './useGanttTimelineScroll';
import type { ZoomLevel } from './ganttMath';
import { useFeatureMutationCallbacks } from './components/InlineEditors';
import { placeholderMember, toMiniMember } from './utils/miniTeamMembers';
import './GanttPage.css';

const DAY_PX_BY_ZOOM: Readonly<Record<ZoomLevel, number>> = {
  week: 48,
  twoWeeks: 32,
  month: 24,
};

const INITIAL_VIEWPORT_DAYS = 60;
const INITIAL_HALF_WINDOW_DAYS = 30;
const CHUNK_DAYS = 14;
/**
 * Width of the sticky leading column on every row (lead/team/title gutter).
 * Date columns and segment bars start at scroller-x = GUTTER_WIDTH_PX so they
 * share the same coordinate space; must match `--gantt-gutter-width` in CSS.
 */
const GUTTER_WIDTH_PX = 280;

const EMPTY_PHASE_EXPANSION: ReadonlyMap<Track, ReadonlySet<PhaseKind>> = new Map();

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
  /** Read-through used by mutation callbacks that receive taxonomy-only responses. */
  resolveFeature: (id: number) => FeatureSummary | undefined;
  /** Chunk-fetch callback wired into the scrollable timeline. */
  loadChunk: (req: ScrollChunkRequest) => Promise<unknown>;
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
  resolveFeature,
  loadChunk,
}: GanttPageInternalProps) {
  const goTo = useGoToDateShortcut();

  const dayPx = DAY_PX_BY_ZOOM[state.zoom];
  const isManager = role === 'Manager';
  const mutations = useFeatureMutationCallbacks({
    onApplied: onFeatureUpdated,
    resolveFeature,
  });

  const trailingStripeWidthPx = CHUNK_DAYS * dayPx;

  const scroll = useGanttTimelineScroll({
    today: state.today,
    dayPx,
    gutterPx: GUTTER_WIDTH_PX,
    initialViewportDays: INITIAL_VIEWPORT_DAYS,
    initialHalfWindowDays: INITIAL_HALF_WINDOW_DAYS,
    chunkDays: CHUNK_DAYS,
    loadChunk,
  });
  const {
    attachScroller,
    loadedRange,
    isFetchingTrailing,
    loadError,
    scrollToToday,
    scrollToDate,
    retryFailedChunk,
    todayPx: todayPxInner,
    totalWidthPx,
  } = scroll;

  const layout = useGanttLayout({
    features,
    today: state.today,
    loadedRange,
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

  const handleCreated = useCallback(
    (feature: FeatureSummary) => {
      state.toggleFeatureExpanded(feature.id);
      onRetry();
    },
    [state, onRetry],
  );

  const handleGoToSubmit = useCallback(
    (iso: string) => {
      goTo.close();
      void scrollToDate(iso);
    },
    [goTo, scrollToDate],
  );

  const hasAnyFeatures = layout.lanes.length + layout.unscheduled.length > 0;

  const showTrailingStripe = isFetchingTrailing || loadError?.direction === 'trailing';
  const effectiveTrailingPx = showTrailingStripe ? trailingStripeWidthPx : 0;
  const lanesInlinePx = GUTTER_WIDTH_PX + totalWidthPx;
  const contentWidthPx = lanesInlinePx + effectiveTrailingPx;
  const todayPxAbs = todayPxInner + GUTTER_WIDTH_PX;

  const pageStyle = useMemo<CSSProperties>(
    () => ({
      ['--day-px']: `${dayPx}px`,
      ['--gantt-cushion-width']: `${effectiveTrailingPx}px`,
      ['--gantt-loaded-width']: `${totalWidthPx}px`,
      ['--gantt-lanes-width']: `${lanesInlinePx}px`,
      ['--gantt-content-width']: `${contentWidthPx}px`,
      ['--gantt-today-px']: `${todayPxAbs}px`,
    }) as CSSProperties,
    [dayPx, effectiveTrailingPx, totalWidthPx, lanesInlinePx, contentWidthPx, todayPxAbs],
  );

  return (
    <main className="gantt-page" style={pageStyle} data-testid="gantt-page">
      <GanttPageHeader
        state={state}
        rosterError={rosterError}
        rosterLoading={rosterLoading}
        onRosterRetry={onRosterRetry}
      />

      {loading || error ? (
        <GanttPageStateBanners loading={loading} error={error} onRetry={onRetry} />
      ) : !hasAnyFeatures ? (
        <GanttEmpty isManager={isManager} onCreated={handleCreated} />
      ) : (
        <GanttTimelineSection
          state={state}
          isManager={isManager}
          lanes={layout.lanes}
          unscheduled={layout.unscheduled}
          loadedRange={loadedRange}
          dayPx={dayPx}
          contentWidthPx={contentWidthPx}
          todayPxAbs={todayPxAbs}
          showTrailingStripe={showTrailingStripe}
          isFetchingTrailing={isFetchingTrailing}
          trailingStripeWidthPx={trailingStripeWidthPx}
          attachScroller={attachScroller}
          scrollToToday={scrollToToday}
          retryFailedChunk={retryFailedChunk}
          loadErrorIsTrailing={loadError?.direction === 'trailing'}
          resolveMember={resolveMember}
          resolvePerformer={resolvePerformer}
          emptyPhaseExpansion={EMPTY_PHASE_EXPANSION}
          mutations={mutations}
          rawRoster={rawRoster}
          onCreated={handleCreated}
        />
      )}

      <GanttGoToDate
        open={goTo.open}
        onSubmit={handleGoToSubmit}
        onClose={goTo.close}
      />
    </main>
  );
}

const ANONYMOUS_ROLE: UserRole = 'FrontendDeveloper';

export function GanttPage() {
  const { user } = useAuth();
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
      resolveFeature={features.getFeatureById}
      loadChunk={loadChunk}
    />
  );
}
