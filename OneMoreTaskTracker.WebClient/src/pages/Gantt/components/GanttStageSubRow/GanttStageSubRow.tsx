import { useTranslation } from 'react-i18next';
import type { FeatureState, FeatureSummary, MiniTeamMember } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { Avatar, Badge } from '../../../../common/ds';
import { FEATURE_STATE_CSS } from '../../stateConfig';
import type { StageBarGeometry } from '../../ganttStageGeometry';
import { daysBetween, parseIsoDate } from '../../ganttMath';
import { roleToSide } from '../../roleToSide';
import {
  InlineDateCell,
  InlineOwnerPicker,
  type FeatureMutationCallbacks,
} from '../InlineEditors';
import './GanttStageSubRow.css';

/**
 * Format an ISO yyyy-mm-dd as a short "Apr 17" label using the active i18n
 * language. Returns the raw ISO on parse failure.
 */
function formatShortDate(iso: string, locale: string): string {
  try {
    const date = parseIsoDate(iso);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return iso;
  }
}

export interface GanttStageSubRowProps {
  feature: FeatureSummary;
  seg: StageBarGeometry;
  today: string;
  /** Previous-performer name when the user has been removed from the team. */
  removedPerformerName?: string | null;
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  /** Index (0..4) in canonical order, for the `01…05` numeral. */
  index: number;
  onOpenStage: (stage: FeatureState) => void;
  /**
   * When true, render the inline owner picker and date editors. When false,
   * the sub-row renders exactly as the read-only `gantt-feature-info`
   * layout — no tab stops, no editor affordances. Fail-closed.
   */
  canEdit?: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  /** Relay inline-edit commit outcomes into the parent aria-live region. */
  onAnnounce?: (message: string) => void;
}

function avatarTone(role: MiniTeamMember['role']): 'manager' | 'frontend' | 'backend' | 'qa' {
  switch (role) {
    case 'Manager':
      return 'manager';
    case 'FrontendDeveloper':
      return 'frontend';
    case 'BackendDeveloper':
      return 'backend';
    case 'Qa':
      return 'qa';
  }
}

function sideBadgeTone(side: 'Back' | 'Front' | 'Common') {
  switch (side) {
    case 'Back':
      return 'role-backend' as const;
    case 'Front':
      return 'role-frontend' as const;
    default:
      return 'neutral' as const;
  }
}

function computeDtr(opts: {
  plannedEnd: string | null;
  today: string;
  isOverdue: boolean;
  isCompleted: boolean;
  isLiveReleaseDone: boolean;
}): string {
  const { plannedEnd, today, isOverdue, isCompleted, isLiveReleaseDone } = opts;
  if (isLiveReleaseDone) return '✓';
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  // delta > 0: today < plannedEnd → N days remaining
  // delta === 0: today === plannedEnd → 0d
  // delta < 0: today > plannedEnd → overdue, show -Nd
  if (isOverdue) return `-${Math.abs(delta)}d`;
  if (isCompleted) return '✓';
  return `${delta}d`;
}

export function GanttStageSubRow({
  feature,
  seg,
  today,
  removedPerformerName,
  resolvePerformer,
  index,
  onOpenStage,
  canEdit = false,
  mutations,
  roster,
  onAnnounce,
}: GanttStageSubRowProps) {
  const { t, i18n } = useTranslation('gantt');
  const plan = feature.stagePlans.find((p) => p.stage === seg.stage) ?? null;
  const performer = resolvePerformer(plan?.performerUserId ?? null);
  const hasPerformerId = plan?.performerUserId != null;
  const stale = hasPerformerId && performer == null;

  const side = performer ? roleToSide(performer.role) : null;
  const dtr = computeDtr({
    plannedEnd: plan?.plannedEnd ?? null,
    today,
    isOverdue: seg.isOverdue,
    isCompleted: seg.isCompleted,
    isLiveReleaseDone: seg.stage === 'LiveRelease' && seg.isCompleted,
  });

  const numeral = String(index + 1).padStart(2, '0');
  const stageName = t(`state.${seg.stage}`);
  const locale = i18n.language || 'en';
  const shortStart = plan?.plannedStart ? formatShortDate(plan.plannedStart, locale) : '—';
  const shortEnd = plan?.plannedEnd ? formatShortDate(plan.plannedEnd, locale) : '—';

  const inlineEnabled = canEdit && mutations != null;
  const stageVersion = plan?.stageVersion ?? 0;

  const announceOwner = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.ownerSaved', {
          defaultValue: '{{stage}} stage owner saved.',
          stage: stageName,
        })
      : t('inlineEdit.announce.ownerError', {
          defaultValue: '{{stage}} stage owner change was rejected.',
          stage: stageName,
        });
  const announceStart = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.startSaved', {
          defaultValue: '{{stage}} planned start saved.',
          stage: stageName,
        })
      : t('inlineEdit.announce.startError', {
          defaultValue: '{{stage}} planned start change was rejected.',
          stage: stageName,
        });
  const announceEnd = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.endSaved', {
          defaultValue: '{{stage}} planned end saved.',
          stage: stageName,
        })
      : t('inlineEdit.announce.endError', {
          defaultValue: '{{stage}} planned end change was rejected.',
          stage: stageName,
        });

  // Stale performer: fall through to the read-only "previous-name · removed"
  // microcopy path even in inline-edit mode. The picker would render the
  // stale name as if it were valid which is misleading.
  let ownerNode;
  if (inlineEnabled && mutations != null && roster && !stale) {
    ownerNode = (
      <InlineOwnerPicker
        value={plan?.performerUserId ?? null}
        displayName={performer?.displayName ?? null}
        roster={roster}
        ariaLabel={t('inlineEdit.ownerAria', {
          defaultValue: 'Owner for {{stage}} stage of "{{title}}"',
          stage: stageName,
          title: feature.title,
        })}
        testId={`stage-owner-editor-${feature.id}-${seg.stage}`}
        onSave={async (next) => {
          await mutations.saveStageOwner(feature.id, seg.stage, next, stageVersion);
        }}
        onAnnounce={onAnnounce}
        buildAnnouncement={announceOwner}
      />
    );
  } else if (!hasPerformerId) {
    ownerNode = <span className="gantt-stage-row__unassigned">{t('row.unassigned')}</span>;
  } else if (stale) {
    // Brief §7 microcopy: `<previous name> · removed` when the name is known,
    // bare `removed` when it isn't. Never render the numeric id `#9999` in the
    // user-facing view — that's a developer placeholder, not a UX string.
    const removedCopy = removedPerformerName
      ? t('stagePlan.performerRemoved', { name: removedPerformerName })
      : t('stagePlan.performerRemovedUnknown', { defaultValue: t('row.removed') });
    ownerNode = (
      <>
        <span className="gantt-stage-row__avatar-placeholder" aria-hidden="true" />
        <span className="gantt-stage-row__owner-text">{removedCopy}</span>
      </>
    );
  } else if (performer) {
    ownerNode = (
      <>
        <Avatar name={performer.displayName} size="sm" tone={avatarTone(performer.role)} />
        <span className="gantt-stage-row__owner-text">{performer.displayName}</span>
      </>
    );
  }

  return (
    <div
      className="gantt-stage-row"
      data-testid={`stage-subrow-${feature.id}-${seg.stage}`}
      data-active={seg.isCurrent ? 'true' : 'false'}
      data-status={seg.status}
      data-overdue={seg.isOverdue ? 'true' : 'false'}
    >
      <div className="gantt-stage-row__gutter">
        {inlineEnabled && mutations != null ? (
          <div
            className="gantt-stage-row__trigger gantt-stage-row__trigger--inline"
            role="group"
            aria-label={t('stageRow.aria', {
              index: index + 1,
              name: stageName,
              owner: performer?.displayName ?? t('row.unassigned'),
            })}
          >
            <button
              type="button"
              className="gantt-stage-row__numeral-btn"
              onClick={() => onOpenStage(seg.stage)}
              aria-label={t('inlineEdit.openStageDrawerAria', {
                defaultValue: 'Open drawer for {{stage}} stage',
                stage: stageName,
              })}
            >
              <span className="gantt-stage-row__numeral" aria-hidden="true">
                {numeral}
              </span>
              <span
                className="gantt-stage-row__dot"
                style={{ background: `var(${FEATURE_STATE_CSS[seg.stage]})` }}
                aria-hidden="true"
              />
              <span className="gantt-stage-row__stage-name">{stageName}</span>
            </button>
            <span className="gantt-stage-row__body">
              <span className="gantt-stage-row__owner" data-testid="stage-owner">
                {ownerNode}
              </span>
              {side != null && performer != null ? (
                <Badge
                  tone={sideBadgeTone(side)}
                  className="gantt-stage-row__side"
                  data-testid="stage-side"
                >
                  {t(`side.${side}`)}
                </Badge>
              ) : null}
              <span className="gantt-stage-row__dates">
                <InlineDateCell
                  value={plan?.plannedStart ?? null}
                  ariaLabel={t('inlineEdit.plannedStartAria', {
                    defaultValue: 'Planned start for {{stage}} stage of "{{title}}"',
                    stage: stageName,
                    title: feature.title,
                  })}
                  testId={`stage-planned-start-${feature.id}-${seg.stage}`}
                  onSave={async (next) => {
                    await mutations.saveStagePlannedStart(
                      feature.id,
                      seg.stage,
                      next,
                      stageVersion,
                    );
                  }}
                  onAnnounce={onAnnounce}
                  buildAnnouncement={announceStart}
                />
                <span className="gantt-stage-row__sep" aria-hidden="true">
                  {' – '}
                </span>
                <InlineDateCell
                  value={plan?.plannedEnd ?? null}
                  ariaLabel={t('inlineEdit.plannedEndAria', {
                    defaultValue: 'Planned end for {{stage}} stage of "{{title}}"',
                    stage: stageName,
                    title: feature.title,
                  })}
                  testId={`stage-planned-end-${feature.id}-${seg.stage}`}
                  onSave={async (next) => {
                    await mutations.saveStagePlannedEnd(
                      feature.id,
                      seg.stage,
                      next,
                      stageVersion,
                    );
                  }}
                  onAnnounce={onAnnounce}
                  buildAnnouncement={announceEnd}
                />
                <span className="gantt-stage-row__sep" aria-hidden="true">
                  {' · '}
                </span>
                <span
                  className="gantt-stage-row__dtr"
                  data-testid="stage-dtr"
                  data-overdue={seg.isOverdue ? 'true' : 'false'}
                >
                  {dtr}
                </span>
              </span>
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="gantt-stage-row__trigger"
            onClick={() => onOpenStage(seg.stage)}
            aria-label={t('stageRow.aria', {
              index: index + 1,
              name: stageName,
              owner: performer?.displayName ?? t('row.unassigned'),
            })}
          >
            <span className="gantt-stage-row__numeral" aria-hidden="true">
              {numeral}
            </span>
            <span
              className="gantt-stage-row__dot"
              style={{ background: `var(${FEATURE_STATE_CSS[seg.stage]})` }}
              aria-hidden="true"
            />
            <span className="gantt-stage-row__stage-name">{stageName}</span>
            <span className="gantt-stage-row__body">
              <span className="gantt-stage-row__owner" data-testid="stage-owner">
                {ownerNode}
              </span>
              {side != null && performer != null ? (
                <Badge
                  tone={sideBadgeTone(side)}
                  className="gantt-stage-row__side"
                  data-testid="stage-side"
                >
                  {t(`side.${side}`)}
                </Badge>
              ) : null}
              <span className="gantt-stage-row__dates">
                <span className="gantt-stage-row__date">{shortStart}</span>
                <span className="gantt-stage-row__sep" aria-hidden="true">
                  {' – '}
                </span>
                <span className="gantt-stage-row__date">{shortEnd}</span>
                <span className="gantt-stage-row__sep" aria-hidden="true">
                  {' · '}
                </span>
                <span
                  className="gantt-stage-row__dtr"
                  data-testid="stage-dtr"
                  data-overdue={seg.isOverdue ? 'true' : 'false'}
                >
                  {dtr}
                </span>
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="gantt-stage-row__lane">
        {seg.bar || seg.ghost ? (
          <span
            className="gantt-stage-row__segment"
            data-variant={seg.bar ? 'solid' : 'ghost'}
            style={{
              ['--seg-left' as string]: `${(seg.bar ?? seg.ghost)!.leftPx}px`,
              ['--seg-width' as string]: `${(seg.bar ?? seg.ghost)!.widthPx}px`,
              ['--seg-color' as string]: `var(${FEATURE_STATE_CSS[seg.stage]})`,
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
