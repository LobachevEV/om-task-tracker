import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureState,
  FeatureSummary,
  MiniTeamMember,
} from '../../../shared/types/feature';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
import { GanttAssigneeStack } from '../GanttAssigneeStack';
import type { BarGeometry, DateWindow } from '../ganttMath';
import { daysBetween } from '../ganttMath';
import type { StageBarGeometry } from '../ganttStageGeometry';
import { featureIsOverdue, plannedStageCount } from '../ganttStageGeometry';
import { GanttSegmentedBar } from '../GanttSegmentedBar';
import { GanttStageSubRow } from '../GanttStageSubRow';
import type { GanttLaneVariant } from '../useGanttLayout';
import {
  InlineDescriptionEditor,
  InlineLiveRegion,
  InlineTextCell,
  type OptimisticFeatureMutations,
} from '../InlineEditors';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  bar: BarGeometry | null;
  stageBars: StageBarGeometry[];
  window: DateWindow;
  today: string;
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
  /**
   * Why this lane renders the way it does. `planned` is the normal case;
   * `noPlan` and `outOfWindow` render a ghost lane so the manager still sees
   * the row and can triage from the info panel.
   */
  variant?: GanttLaneVariant;
  /** Inline expansion of the stage sub-rows (session-scoped). */
  expanded: boolean;
  onToggleExpand: () => void;
  /** Open the drawer for this feature, optionally pre-selecting a stage. */
  onOpen: (featureId: number) => void;
  onOpenStage: (stage: FeatureState) => void;
  /** Resolve a performer id against the cached roster for sub-row owner rendering. */
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  /**
   * Known previous displayName for a stale performer id (e.g. `{ 9999: 'Ex Dev' }`).
   * Supplied by the page-level roster cache; when absent the sub-row renders
   * the bare "removed" microcopy — never `#<id>`.
   */
  removedPerformerNames?: ReadonlyMap<number, string>;
  /**
   * True when the signed-in user may edit this feature (manager + owner).
   * Gates the inline editors; non-managers see the existing read-only row.
   */
  canEdit?: boolean;
  /** Wired by GanttPage — the five per-field PATCH callers. */
  mutations?: OptimisticFeatureMutations;
  /** Roster used by the stage-owner picker inside expanded sub-rows. */
  roster?: readonly TeamRosterMember[];
}

function computeFeatureDtr(feature: FeatureSummary, today: string): string {
  if (feature.state === 'LiveRelease') return '✓';
  const active = feature.stagePlans.find((p) => p.stage === feature.state);
  const plannedEnd = active?.plannedEnd ?? feature.plannedEnd;
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  if (delta < 0) return `-${Math.abs(delta)}d`;
  return `${delta}d`;
}

export function GanttFeatureRow({
  feature,
  stageBars,
  today,
  lead,
  miniTeam,
  variant = 'planned',
  expanded,
  onToggleExpand,
  onOpen,
  onOpenStage,
  resolvePerformer,
  removedPerformerNames,
  canEdit = false,
  mutations,
  roster,
}: GanttFeatureRowProps) {
  const { t } = useTranslation('gantt');

  const isOverdue = useMemo(() => featureIsOverdue(feature, today), [feature, today]);
  const planned = useMemo(() => plannedStageCount(feature), [feature]);
  const dtr = useMemo(() => computeFeatureDtr(feature, today), [feature, today]);
  const totalStages = feature.stagePlans.length;

  const ariaLabel = t('row.rowAria', {
    title: feature.title,
    lead: lead.displayName,
    state: t(`state.${feature.state}`),
    variant,
  });

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  };

  const inlineEnabled = canEdit && mutations != null;

  // Per-row aria-live region for inline-edit outcome announcements. Stored
  // here (not at page level) so each row reads the same pattern and the
  // screen reader hears feature-scoped context.
  const [announcement, setAnnouncement] = useState<string>('');
  const handleAnnounce = useCallback((message: string) => setAnnouncement(message), []);
  const buildTitleAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.titleSaved', {
            defaultValue: 'Feature title saved.',
          })
        : t('inlineEdit.announce.titleError', {
            defaultValue: 'Feature title change was rejected.',
          }),
    [t],
  );
  const buildDescriptionAnnouncement = useCallback(
    (outcome: 'saved' | 'error') =>
      outcome === 'saved'
        ? t('inlineEdit.announce.descriptionSaved', {
            defaultValue: 'Feature description saved.',
          })
        : t('inlineEdit.announce.descriptionError', {
            defaultValue: 'Feature description change was rejected.',
          }),
    [t],
  );

  return (
    <>
      <div
        className="gantt-row"
        data-feature-id={feature.id}
        data-testid={`feature-row-${feature.id}`}
        data-variant={variant}
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
              onClick={onToggleExpand}
            >
              {expanded ? '▾' : '▸'}
            </button>
            {inlineEnabled ? (
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
                  await mutations!.saveTitle(feature.id, next.trim(), feature.version ?? 0);
                }}
                onAnnounce={handleAnnounce}
                buildAnnouncement={buildTitleAnnouncement}
              />
            ) : (
              <button
                type="button"
                className="gantt-row__title"
                aria-label={ariaLabel}
                onClick={() => onOpen(feature.id)}
                onKeyDown={handleTitleKeyDown}
              >
                <span>{feature.title}</span>
              </button>
            )}
          </div>
          <div className="gantt-row__lead">
            {t('row.lead')}: {lead.displayName}
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
              data-partial={planned < totalStages ? 'true' : 'false'}
            >
              {t('row.plannedCounter', { planned, total: totalStages })}
            </span>
            {isOverdue ? (
              <span
                className="gantt-row__overdue-badge"
                data-testid="feature-overdue-badge"
              >
                {t('row.overdue')}
              </span>
            ) : null}
          </div>
          <GanttAssigneeStack members={miniTeam} aria-label={t('row.team')} />
        </div>

        <div className="gantt-row__lane" data-variant={variant}>
          <GanttSegmentedBar
            feature={feature}
            stageBars={stageBars}
            today={today}
            resolvePerformer={resolvePerformer}
            onOpenStage={onOpenStage}
            laneVariant={variant}
          />
        </div>
      </div>

      {expanded ? (
        <>
          <InlineDescriptionEditor
            value={feature.description}
            readOnly={!inlineEnabled}
            testId={`feature-description-${feature.id}`}
            ariaLabel={t('inlineEdit.descriptionAria', {
              defaultValue: 'Description for feature "{{title}}"',
              title: feature.title,
            })}
            onSave={async (next) => {
              if (!inlineEnabled) return;
              await mutations!.saveDescription(feature.id, next, feature.version ?? 0);
            }}
            onAnnounce={handleAnnounce}
            buildAnnouncement={buildDescriptionAnnouncement}
          />
          {stageBars.map((seg, index) => (
            <GanttStageSubRow
              key={seg.stage}
              feature={feature}
              seg={seg}
              today={today}
              resolvePerformer={resolvePerformer}
              removedPerformerName={
                (() => {
                  const plan = feature.stagePlans.find((p) => p.stage === seg.stage);
                  const id = plan?.performerUserId ?? null;
                  if (id == null) return null;
                  return removedPerformerNames?.get(id) ?? null;
                })()
              }
              index={index}
              onOpenStage={onOpenStage}
              canEdit={inlineEnabled}
              mutations={mutations}
              roster={roster}
              onAnnounce={handleAnnounce}
            />
          ))}
        </>
      ) : null}
      {inlineEnabled ? <InlineLiveRegion message={announcement} /> : null}
    </>
  );
}
