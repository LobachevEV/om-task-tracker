import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type CSSProperties,
} from 'react';
import { ZodError } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../common/auth/AuthContext';
import { Spinner, Button, Callout } from '../../common/ds';
import { isUserRole, type UserRole } from '../../common/auth/roles';
import type {
  FeatureSummary,
  MiniTeamMember,
} from '../../common/types/feature';
import type { FeatureTrack } from '../../common/types/featureTrack';
import type { TeamRosterMember } from '../../common/api/teamApi';
import { AddFeatureRow } from './components/AddFeatureRow';
import { GanttChunkStripe } from './components/GanttChunkStripe';
import { GanttDateHeader } from './components/GanttDateHeader';
import { GanttEmpty } from './components/GanttEmpty';
import { GanttFeatureRow } from './components/GanttFeatureRow';
import { GanttGoToDate } from './components/GanttGoToDate';
import { GanttTimelineScroller } from './components/GanttTimelineScroller';
import { GanttToolbar } from './components/GanttToolbar';
import { usePlanFeatures } from './usePlanFeatures';
import { useTeamRoster } from './useTeamRoster';
import { useGanttLayout, type GanttLane } from './useGanttLayout';
import { useGanttPageState, type GanttPageState } from './useGanttPageState';
import {
  useGanttTimelineScroll,
  type ScrollChunkRequest,
} from './useGanttTimelineScroll';
import type { ZoomLevel } from './ganttMath';
import {
  useFeatureMutationCallbacks,
  useTrackMutationCallbacks,
} from './components/InlineEditors';
import './GanttPage.css';

const PLACEHOLDER_ROLE: MiniTeamMember['role'] = 'FrontendDeveloper';

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
const GUTTER_WIDTH_PX = 320;

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
  /** Number of consecutive load failures so far (0 = first error). */
  failCount: number;
  /** True when the latest error is a deterministic schema-mismatch (Zod). */
  schemaMismatch?: boolean;
  onRetry: () => void;
  state: GanttPageState;
  /**
   * Patch a single feature row in place after an inline-edit PATCH.
   * Supplied by `usePlanFeatures.applyFeatureUpdate`.
   */
  onFeatureUpdated: (next: FeatureSummary) => void;
  /**
   * Merge an updated track back into the feature row.
   * Supplied by `usePlanFeatures.applyTrackUpdate`.
   */
  onTrackUpdated: (featureId: number, next: FeatureTrack) => void;
  /** Chunk-fetch callback wired into the scrollable timeline. */
  loadChunk: (req: ScrollChunkRequest) => Promise<unknown>;
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
  failCount,
  schemaMismatch = false,
  onRetry,
  state,
  onFeatureUpdated,
  onTrackUpdated,
  loadChunk,
}: GanttPageInternalProps) {
  const { t } = useTranslation('gantt');
  const [goToOpen, setGoToOpen] = useState(false);

  const dayPx = DAY_PX_BY_ZOOM[state.zoom];
  const isManager = role === 'Manager';
  const mutations = useFeatureMutationCallbacks({ onApplied: onFeatureUpdated });
  const trackMutations = useTrackMutationCallbacks({ onTrackApplied: onTrackUpdated });

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

  const handleOpenStage = useCallback(
    (featureId: number) => state.toggleFeatureExpanded(featureId),
    [state],
  );

  const handleCreated = useCallback(
    (feature: FeatureSummary) => {
      state.toggleFeatureExpanded(feature.id);
      onRetry();
    },
    [state, onRetry],
  );

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
      void scrollToDate(iso);
    },
    [scrollToDate],
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
      <GanttToolbar
        zoom={state.zoom}
        scope={state.scope}
        stateFilter={state.stateFilter}
        onZoomChange={state.setZoom}
        onScopeChange={state.setScope}
        onStateFilterChange={state.setStateFilter}
      />

      <div className="gantt-page__narrow-notice" role="note">
        {t('narrowViewport.notice')}
      </div>

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
        <div className="gantt-page__centered" role="alert" aria-live="assertive" aria-atomic="true">
          <Callout
            tone="danger"
            action={
              schemaMismatch ? (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  {t('reloadPage', { defaultValue: 'Обновить страницу' })}
                </Button>
              ) : failCount < 2 ? (
                <Button type="button" variant="primary" onClick={onRetry}>
                  {t('retry')}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  {t('reloadPage', { defaultValue: 'Обновить страницу' })}
                </Button>
              )
            }
          >
            {schemaMismatch
              ? t('schemaMismatch', { defaultValue: 'Формат данных изменился. Обновите страницу.' })
              : failCount < 2
                ? t('failed')
                : t('failedPersistent', { defaultValue: 'Не удалось загрузить план. Попробуйте обновить страницу.' })}
          </Callout>
        </div>
      ) : !hasAnyFeatures ? (
        <GanttEmpty isManager={isManager} onCreated={handleCreated} />
      ) : (
        <section className="gantt-page__timeline-wrap">
          <GanttTimelineScroller
            ref={attachScroller}
            contentWidthPx={contentWidthPx}
            todayPx={todayPxAbs}
            onJumpToToday={scrollToToday}
          >
            <div className="gantt-page__header-row">
              <div
                className="gantt-page__header-flank gantt-page__header-flank--leading"
                aria-hidden="true"
              />
              <GanttDateHeader
                loadedRange={loadedRange}
                today={state.today}
                dayPx={dayPx}
                className="gantt-page__date-header"
              />
              {showTrailingStripe ? (
                <div
                  className="gantt-page__header-flank gantt-page__header-flank--trailing"
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <div
              className="gantt-page__today-hairline"
              aria-hidden="true"
            />

            <div className="gantt-page__lanes-row">
              <div
                className="gantt-page__lanes"
                role="list"
              >
                {isManager ? <AddFeatureRow onCreated={handleCreated} /> : null}
                {layout.lanes.map((lane: GanttLane) => {
                  const lead = resolveMember(lane.feature.leadUserId);
                  const expanded = state.expandedFeatureIds.has(lane.feature.id);
                  return (
                    <GanttFeatureRow
                      key={lane.feature.id}
                      feature={lane.feature}
                      stageBars={lane.stageBars}
                      bar={lane.bar}
                      today={state.today}
                      lead={lead}
                      variant={lane.variant}
                      expanded={expanded}
                      onToggleExpand={state.toggleFeatureExpanded}
                      onOpenStage={handleOpenStage}
                      resolvePerformer={resolvePerformer}
                      canEdit={isManager}
                      mutations={isManager ? mutations : undefined}
                      trackMutations={isManager ? trackMutations : undefined}
                      roster={isManager ? rawRoster : undefined}
                      loadedRange={loadedRange}
                      dayPx={dayPx}
                    />
                  );
                })}
              </div>

              {showTrailingStripe ? (
                <GanttChunkStripe
                  side="trailing"
                  mode={isFetchingTrailing ? 'loading' : 'failed'}
                  widthPx={trailingStripeWidthPx}
                  onRetry={
                    loadError?.direction === 'trailing' ? retryFailedChunk : undefined
                  }
                />
              ) : null}
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
    </main>
  );
}

type FailCountState = { count: number; prevError: Error | null };
type FailCountAction = { type: 'error'; error: Error } | { type: 'clear' };

function failCountReducer(state: FailCountState, action: FailCountAction): FailCountState {
  if (action.type === 'error') return { count: state.count + 1, prevError: action.error };
  return { count: 0, prevError: null };
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
  const [failState, dispatchFail] = useReducer(failCountReducer, { count: 0, prevError: null as Error | null });
  if (features.error !== failState.prevError) {
    dispatchFail(features.error != null ? { type: 'error', error: features.error } : { type: 'clear' });
  }
  const failCount = failState.count;
  const schemaMismatch = features.error instanceof ZodError;

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
      failCount={failCount}
      schemaMismatch={schemaMismatch}
      onRetry={features.refetch}
      state={state}
      onFeatureUpdated={features.applyFeatureUpdate}
      onTrackUpdated={features.applyTrackUpdate}
      loadChunk={loadChunk}
    />
  );
}
