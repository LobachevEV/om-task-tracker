import type { ForwardedRef } from 'react';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { AddFeatureRow } from '../AddFeatureRow';
import { GanttChunkStripe } from '../GanttChunkStripe';
import { GanttDateHeader } from '../GanttDateHeader';
import { GanttFeatureRow } from '../GanttFeatureRow';
import { GanttTimelineScroller } from '../GanttTimelineScroller';
import { GanttUnscheduledSection } from '../GanttUnscheduledSection';
import type { GanttLane } from '../../useGanttLayout';
import type { GanttPageState } from '../../useGanttPageState';
import type { FeatureMutationCallbacks } from '../InlineEditors';

export interface GanttTimelineSectionProps {
  state: GanttPageState;
  isManager: boolean;
  lanes: GanttLane[];
  unscheduled: FeatureSummary[];
  loadedRange: Parameters<typeof GanttDateHeader>[0]['loadedRange'];
  dayPx: number;
  contentWidthPx: number;
  todayPxAbs: number;
  showTrailingStripe: boolean;
  isFetchingTrailing: boolean;
  trailingStripeWidthPx: number;
  attachScroller: ForwardedRef<HTMLDivElement>;
  scrollToToday: () => void;
  retryFailedChunk?: () => void;
  loadErrorIsTrailing: boolean;
  resolveMember: (userId: number) => MiniTeamMember;
  resolvePerformer: (id: number | null | undefined) => MiniTeamMember | undefined;
  emptyPhaseExpansion: ReadonlyMap<Track, ReadonlySet<PhaseKind>>;
  mutations: FeatureMutationCallbacks;
  rawRoster: readonly TeamRosterMember[];
  onCreated: (feature: FeatureSummary) => void;
}

export function GanttTimelineSection({
  state,
  isManager,
  lanes,
  unscheduled,
  loadedRange,
  dayPx,
  contentWidthPx,
  todayPxAbs,
  showTrailingStripe,
  isFetchingTrailing,
  trailingStripeWidthPx,
  attachScroller,
  scrollToToday,
  retryFailedChunk,
  loadErrorIsTrailing,
  resolveMember,
  resolvePerformer,
  emptyPhaseExpansion,
  mutations,
  rawRoster,
  onCreated,
}: GanttTimelineSectionProps) {
  return (
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

        <div className="gantt-page__today-hairline" aria-hidden="true" />

        <div className="gantt-page__lanes-row">
          <div className="gantt-page__lanes" role="list">
            {isManager ? <AddFeatureRow onCreated={onCreated} /> : null}
            {lanes.map((lane) => {
              const lead = resolveMember(lane.feature.leadUserId);
              const expanded = state.expandedFeatureIds.has(lane.feature.id);
              const phaseExpansion =
                state.expandedPhases.get(lane.feature.id) ?? emptyPhaseExpansion;
              return (
                <GanttFeatureRow
                  key={lane.feature.id}
                  feature={lane.feature}
                  geometry={lane.geometry}
                  today={state.today}
                  lead={lead}
                  variant={lane.variant}
                  expanded={expanded}
                  expandedPhases={phaseExpansion}
                  onToggleExpand={state.toggleFeatureExpanded}
                  onTogglePhase={state.togglePhaseExpanded}
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
              mode={isFetchingTrailing ? 'loading' : 'failed'}
              widthPx={trailingStripeWidthPx}
              onRetry={loadErrorIsTrailing ? retryFailedChunk : undefined}
            />
          ) : null}
        </div>
      </GanttTimelineScroller>

      <GanttUnscheduledSection
        features={unscheduled}
        onOpen={state.toggleFeatureExpanded}
      />
    </section>
  );
}
