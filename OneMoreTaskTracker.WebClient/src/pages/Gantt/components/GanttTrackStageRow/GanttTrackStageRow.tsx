import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type {
  FeatureTrack,
  FeatureTrackKind,
  FeatureTrackStage,
} from '../../../../common/types/featureTrack';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { Avatar } from '../../../../common/ds';
import { parseIsoDate, daysBetween, type DateWindow } from '../../ganttMath';
import { getTrackStageMeta } from '../../trackStageMeta';
import { computeTrackStageBars } from '../../trackStageGeometry';
import { GanttStageBar } from '../GanttStageBar';
import { InlineDateCell, InlineOwnerPicker } from '../InlineEditors';
import type { TrackMutationCallbacks } from '../InlineEditors/useTrackMutationCallbacks';
import './GanttTrackStageRow.css';

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

function avatarTone(
  role: MiniTeamMember['role'],
): 'manager' | 'frontend' | 'backend' | 'qa' {
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

export interface GanttTrackStageRowProps {
  track: FeatureTrack;
  stage: FeatureTrackStage;
  kind: FeatureTrackKind;
  featureTitle: string;
  today: string;
  loadedRange: DateWindow;
  dayPx: number;
  index: number;
  resolveOwner: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit?: boolean;
  mutations?: TrackMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
}

export function GanttTrackStageRow({
  track,
  stage,
  kind,
  featureTitle,
  today,
  loadedRange,
  dayPx,
  index,
  resolveOwner,
  canEdit = false,
  mutations,
  roster,
  onAnnounce,
}: GanttTrackStageRowProps) {
  const { t, i18n } = useTranslation('gantt');
  const meta = getTrackStageMeta(kind, stage.stageKey);
  const locale = i18n.language || 'en';

  const stageName = t(meta.ariaKey, { defaultValue: stage.stageKey });
  const owner = resolveOwner(stage.stageOwnerUserId);
  const hasOwnerId = stage.stageOwnerUserId != null;
  const isStale = hasOwnerId && owner == null;
  const inheritedOwner = !hasOwnerId ? resolveOwner(track.trackOwnerUserId) : undefined;

  const bars = computeTrackStageBars(loadedRange, track, today, dayPx);
  const barEntry = bars[index] ?? null;

  const shortStart = stage.plannedStart
    ? formatShortDate(stage.plannedStart, locale)
    : '—';
  const shortEnd = stage.plannedEnd
    ? formatShortDate(stage.plannedEnd, locale)
    : '—';

  const dtr = (() => {
    if (!stage.plannedEnd) return '—';
    const delta = daysBetween(today, stage.plannedEnd);
    if (delta < 0) return `-${Math.abs(delta)}d`;
    return `${delta}d`;
  })();

  const inlineEnabled = canEdit && mutations != null;
  const stageVersion = stage.stageVersion;

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

  const noSignal =
    !hasOwnerId &&
    inheritedOwner == null &&
    !stage.plannedStart &&
    !stage.plannedEnd;

  let ownerNode;
  if (noSignal) {
    ownerNode = (
      <span className="gantt-track-stage-row__empty-signal" aria-hidden="true">
        —
      </span>
    );
  } else if (inlineEnabled && mutations != null && roster && !isStale) {
    ownerNode = (
      <InlineOwnerPicker
        value={stage.stageOwnerUserId}
        displayName={owner?.displayName ?? null}
        roster={roster}
        ariaLabel={t('inlineEdit.ownerAria', {
          defaultValue: 'Owner for {{stage}} stage of "{{title}}"',
          stage: stageName,
          title: featureTitle,
        })}
        testId={`track-stage-owner-${track.featureId}-${kind}-${stage.stageKey}`}
        onSave={async (next) => {
          await mutations.saveTrackStageOwner(
            track.featureId,
            kind,
            stage.stageKey,
            next,
            stageVersion,
          );
        }}
        onAnnounce={onAnnounce}
        buildAnnouncement={announceOwner}
      />
    );
  } else if (!hasOwnerId && inheritedOwner != null) {
    ownerNode = (
      <span
        className="gantt-track-stage-row__inherited"
        aria-label={t('tracks.row.ariaInheritedOwner', {
          defaultValue: 'Owner inherited from track: {{name}}',
          name: inheritedOwner.displayName,
        })}
      >
        <Avatar name={inheritedOwner.displayName} size="sm" tone={avatarTone(inheritedOwner.role)} />
        <span className="gantt-track-stage-row__owner-text gantt-track-stage-row__owner-text--inherited">
          {inheritedOwner.displayName}
          {' '}
          <span className="gantt-track-stage-row__inherit-suffix" aria-hidden="true">
            {t('tracks.row.inheritedOwnerSuffix', { defaultValue: '· via track' })}
          </span>
        </span>
        <span className="gantt-track-stage-row__inherit-glyph" aria-hidden="true">↘</span>
      </span>
    );
  } else if (!hasOwnerId) {
    ownerNode = (
      <span className="gantt-track-stage-row__unassigned">{t('row.unassigned')}</span>
    );
  } else if (isStale) {
    ownerNode = (
      <>
        <span className="gantt-track-stage-row__avatar-placeholder" aria-hidden="true" />
        <span className="gantt-track-stage-row__owner-text">
          {t('row.removed')}
        </span>
      </>
    );
  } else if (owner) {
    ownerNode = (
      <>
        <Avatar name={owner.displayName} size="sm" tone={avatarTone(owner.role)} />
        <span className="gantt-track-stage-row__owner-text">{owner.displayName}</span>
      </>
    );
  }

  const barNode =
    barEntry && (barEntry.bar || barEntry.ghost) ? (
      <GanttStageBar
        bar={(barEntry.bar ?? barEntry.ghost)!}
        status={barEntry.status}
        tokenVar={meta.tokenVar}
        stripeAxis={meta.stripeAxis}
        ariaLabel={`${stageName}: ${shortStart} – ${shortEnd}`}
      />
    ) : null;

  return (
    <div
      className="gantt-track-stage-row"
      data-testid={`track-stage-row-${track.featureId}-${kind}-${stage.stageKey}`}
      data-kind={kind.toLowerCase()}
    >
      <div className="gantt-track-stage-row__gutter">
        <span
          className="gantt-track-stage-row__code"
          aria-hidden="true"
          style={{ color: `var(${meta.tokenVar})` }}
        >
          {meta.code3}
        </span>
        <span className="gantt-track-stage-row__name">{stageName}</span>
        <span className="gantt-track-stage-row__owner" data-testid="track-stage-owner">
          {ownerNode}
        </span>
        {!noSignal && inlineEnabled && mutations != null ? (
          <span className="gantt-track-stage-row__dates">
            <InlineDateCell
              value={stage.plannedStart}
              ariaLabel={t('inlineEdit.plannedStartAria', {
                defaultValue: 'Planned start for {{stage}} stage of "{{title}}"',
                stage: stageName,
                title: featureTitle,
              })}
              testId={`track-stage-start-${track.featureId}-${kind}-${stage.stageKey}`}
              onSave={async (next) => {
                await mutations.saveTrackStagePlannedStart(
                  track.featureId,
                  kind,
                  stage.stageKey,
                  next,
                  stageVersion,
                );
              }}
              onAnnounce={onAnnounce}
              buildAnnouncement={announceStart}
            />
            <span className="gantt-track-stage-row__sep gantt-track-stage-row__sep--range" aria-hidden="true">
              {' – '}
            </span>
            <InlineDateCell
              value={stage.plannedEnd}
              ariaLabel={t('inlineEdit.plannedEndAria', {
                defaultValue: 'Planned end for {{stage}} stage of "{{title}}"',
                stage: stageName,
                title: featureTitle,
              })}
              testId={`track-stage-end-${track.featureId}-${kind}-${stage.stageKey}`}
              onSave={async (next) => {
                await mutations.saveTrackStagePlannedEnd(
                  track.featureId,
                  kind,
                  stage.stageKey,
                  next,
                  stageVersion,
                );
              }}
              onAnnounce={onAnnounce}
              buildAnnouncement={announceEnd}
            />
            <span className="gantt-track-stage-row__sep" aria-hidden="true">
              {' · '}
            </span>
            <span
              className="gantt-track-stage-row__dtr"
              data-overdue={
                stage.plannedEnd && daysBetween(stage.plannedEnd, today) > 0
                  ? 'true'
                  : 'false'
              }
            >
              {dtr}
            </span>
          </span>
        ) : !noSignal ? (
          <span className="gantt-track-stage-row__dates">
            <span className="gantt-track-stage-row__date">{shortStart}</span>
            <span className="gantt-track-stage-row__sep gantt-track-stage-row__sep--range" aria-hidden="true">
              {' – '}
            </span>
            <span className="gantt-track-stage-row__date">{shortEnd}</span>
            <span className="gantt-track-stage-row__sep" aria-hidden="true">
              {' · '}
            </span>
            <span
              className="gantt-track-stage-row__dtr"
              data-overdue={
                stage.plannedEnd && daysBetween(stage.plannedEnd, today) > 0
                  ? 'true'
                  : 'false'
              }
            >
              {dtr}
            </span>
          </span>
        ) : null}
      </div>
      <div className="gantt-track-stage-row__lane" aria-hidden="true">
        {barNode}
      </div>
    </div>
  );
}
