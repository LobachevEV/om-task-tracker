import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { daysBetween } from '../../ganttMath';
import {
  featureIsOverdue,
  plannedSubStageCount,
  type FeatureBarGeometry,
} from '../../ganttStageGeometry';
import { GanttGateChip } from '../GanttGateChip';
import { GanttTrackRow } from '../GanttTrackRow';
import type { GanttLaneVariant } from '../../useGanttLayout';
import {
  InlineLiveRegion,
  InlineOwnerPicker,
  InlineTextCell,
  type FeatureMutationCallbacks,
} from '../InlineEditors';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  geometry: FeatureBarGeometry;
  today: string;
  lead: MiniTeamMember;
  variant?: GanttLaneVariant;
  expanded: boolean;
  expandedPhases: ReadonlyMap<Track, ReadonlySet<PhaseKind>>;
  onToggleExpand: (featureId: number) => void;
  onTogglePhase: (featureId: number, track: Track, phase: PhaseKind) => void;
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit?: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
}

function computeFeatureDtr(
  geometry: FeatureBarGeometry,
  feature: FeatureSummary,
  today: string,
  doneLabel: string,
): string {
  if (feature.state === 'LiveRelease') return doneLabel;
  let plannedEnd: string | null = null;
  for (const t of geometry.tracks) {
    for (const phase of t.phases) {
      if (phase.derivedPlannedEnd != null) {
        if (plannedEnd == null || phase.derivedPlannedEnd > plannedEnd) {
          plannedEnd = phase.derivedPlannedEnd;
        }
      }
    }
  }
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  if (delta < 0) return `-${Math.abs(delta)}d`;
  return `${delta}d`;
}

const EMPTY_PHASE_SET: ReadonlySet<PhaseKind> = new Set();

function GanttFeatureRowInner({
  feature,
  geometry,
  today,
  lead,
  variant = 'planned',
  expanded,
  expandedPhases,
  onToggleExpand,
  onTogglePhase,
  resolvePerformer,
  canEdit = false,
  mutations,
  roster,
}: GanttFeatureRowProps) {
  const { t } = useTranslation('gantt');

  const isOverdue = useMemo(() => featureIsOverdue(feature, today), [feature, today]);
  const planned = useMemo(() => plannedSubStageCount(feature), [feature]);
  const doneLabel = t('row.done', { defaultValue: 'Done' });
  const dtr = useMemo(
    () => computeFeatureDtr(geometry, feature, today, doneLabel),
    [geometry, feature, today, doneLabel],
  );

  const ariaLabel = t('row.rowAria', {
    title: feature.title,
    lead: lead.displayName,
    state: t(`state.${feature.state}`),
    variant,
  });

  const handleToggleExpand = useCallback(
    () => onToggleExpand(feature.id),
    [onToggleExpand, feature.id],
  );

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleExpand();
    }
  };

  const inlineEnabled = canEdit && mutations != null;

  const [announcement, setAnnouncement] = useState<string>('');
  const handleAnnounce = useCallback((message: string) => setAnnouncement(message), []);
  const buildTitleAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.titleSaved', { defaultValue: 'Feature title saved.' })
        : t('inlineEdit.announce.titleError', {
            defaultValue: 'Feature title change was rejected.',
          }),
    [t],
  );
  const buildLeadAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.leadSaved', { defaultValue: 'Feature lead saved.' })
        : t('inlineEdit.announce.leadError', {
            defaultValue: 'Feature lead change was rejected.',
          }),
    [t],
  );

  const handleSpecGate = useMemo(() => {
    if (!inlineEnabled || mutations == null) return undefined;
    return async (
      gateKey: Parameters<FeatureMutationCallbacks['saveGateStatus']>[1],
      next: Parameters<FeatureMutationCallbacks['saveGateStatus']>[2],
      rejectionReason: Parameters<FeatureMutationCallbacks['saveGateStatus']>[3],
      gateVersion: Parameters<FeatureMutationCallbacks['saveGateStatus']>[4],
    ) => {
      await mutations.saveGateStatus(
        feature.id,
        gateKey,
        next,
        rejectionReason,
        gateVersion,
      );
    };
  }, [feature.id, inlineEnabled, mutations]);

  const handleTogglePhase = useCallback(
    (track: Track, phase: PhaseKind) => onTogglePhase(feature.id, track, phase),
    [feature.id, onTogglePhase],
  );

  const summaryStyle = useMemo<CSSProperties | undefined>(() => {
    const summary = geometry.summaryBar;
    if (summary == null) return undefined;
    return {
      ['--summary-left' as string]: `${summary.leftPx}px`,
      ['--summary-width' as string]: `${summary.widthPx}px`,
    } as CSSProperties;
  }, [geometry.summaryBar]);

  return (
    <>
      <div
        className="gantt-row"
        data-feature-id={feature.id}
        data-feature-row={feature.id}
        data-testid={`feature-row-${feature.id}`}
        data-variant={variant}
        data-spec-blocked={geometry.specBlocked ? 'true' : 'false'}
      >
        <div className="gantt-row__gutter" data-testid="feature-info-panel">
          <div className="gantt-row__title-line">
            <button
              type="button"
              className="gantt-row__caret"
              data-testid="expand-caret"
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? t('row.collapseAria', { title: feature.title })
                  : t('row.expandAria', { title: feature.title })
              }
              onClick={handleToggleExpand}
            >
              {expanded ? '▾' : '▸'}
            </button>
            {inlineEnabled && mutations != null ? (
              <InlineTextCell
                value={feature.title}
                ariaLabel={t('inlineEdit.titleAria', {
                  defaultValue: 'Feature title: {{title}}',
                  title: feature.title,
                })}
                className="gantt-row__title-editor"
                testId={`feature-title-editor-${feature.id}`}
                validate={(next) => {
                  const trimmed = next.trim();
                  if (trimmed.length === 0) {
                    return t('inlineEdit.errors.titleEmpty', {
                      defaultValue: "Title can't be empty",
                    });
                  }
                  if (trimmed.length > 200) {
                    return t('inlineEdit.errors.titleTooLong', {
                      defaultValue: 'Title is too long (max 200 chars)',
                    });
                  }
                  return null;
                }}
                onSave={async (next) => {
                  await mutations.saveTitle(feature.id, next.trim(), feature.version ?? 0);
                }}
                onAnnounce={handleAnnounce}
                buildAnnouncement={buildTitleAnnouncement}
              />
            ) : (
              <button
                type="button"
                className="gantt-row__title"
                aria-label={ariaLabel}
                onClick={handleToggleExpand}
                onKeyDown={handleTitleKeyDown}
              >
                <span>{feature.title}</span>
              </button>
            )}
          </div>
          <div className="gantt-row__lead">
            <span className="gantt-row__lead-label">{t('row.lead')}:</span>
            {inlineEnabled && mutations != null && roster ? (
              <InlineOwnerPicker
                value={feature.leadUserId}
                displayName={lead.displayName}
                roster={roster}
                clearable={false}
                ariaLabel={t('inlineEdit.leadAria', {
                  defaultValue: 'Lead for "{{title}}"',
                  title: feature.title,
                })}
                testId={`feature-lead-editor-${feature.id}`}
                onSave={async (next) => {
                  if (next == null) return;
                  await mutations.saveLead(feature.id, next, feature.version ?? 0);
                }}
                onAnnounce={handleAnnounce}
                buildAnnouncement={buildLeadAnnouncement}
              />
            ) : (
              <span className="gantt-row__lead-value">{lead.displayName}</span>
            )}
          </div>
          <div className="gantt-row__meta">
            {variant === 'noPlan' ? (
              <span className="gantt-row__no-plan-label">{t('row.notPlannedYet')}</span>
            ) : (
              <span className="gantt-row__dates">
                {feature.plannedStart ?? '—'}
                <span className="gantt-row__meta-sep">{' · '}</span>
                {feature.plannedEnd ?? '—'}
              </span>
            )}
            <span className="gantt-row__meta-sep">{'·'}</span>
            <span
              className="gantt-row__dtr"
              data-testid="feature-dtr"
              data-overdue={isOverdue ? 'true' : 'false'}
            >
              {dtr}
            </span>
            <span className="gantt-row__meta-sep">{'·'}</span>
            <span
              className="gantt-row__planned-counter"
              data-testid="feature-planned-counter"
              data-partial={planned.planned < planned.total ? 'true' : 'false'}
            >
              {t('row.plannedCounter', {
                planned: planned.planned,
                total: planned.total,
              })}
            </span>
          </div>
        </div>

        <div className="gantt-row__lane" data-variant={variant}>
          {geometry.summaryBar != null ? (
            <span
              className="gantt-row__summary"
              data-testid="feature-summary-bar"
              style={summaryStyle}
              aria-hidden="true"
            />
          ) : (
            <span className="gantt-row__empty-label" aria-hidden="true">
              {t('row.notPlannedYet')}
            </span>
          )}
          <GanttGateChip
            gate={geometry.specGate.gate}
            leftPx={geometry.specGate.leftPx}
            canEdit={inlineEnabled}
            onChangeStatus={handleSpecGate}
          />
        </div>
      </div>

      {expanded
        ? geometry.tracks.map((trackGeom) => (
            <GanttTrackRow
              key={`${feature.id}-${trackGeom.track}`}
              feature={feature}
              trackGeom={trackGeom}
              expandedPhases={expandedPhases.get(trackGeom.track) ?? EMPTY_PHASE_SET}
              canEdit={inlineEnabled}
              mutations={mutations}
              roster={roster}
              resolvePerformer={resolvePerformer}
              onTogglePhase={handleTogglePhase}
              onAnnounce={handleAnnounce}
            />
          ))
        : null}
      {inlineEnabled ? <InlineLiveRegion message={announcement} /> : null}
    </>
  );
}

export const GanttFeatureRow = memo(GanttFeatureRowInner);
