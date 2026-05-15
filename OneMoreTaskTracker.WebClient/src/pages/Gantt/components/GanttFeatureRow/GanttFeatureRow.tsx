import { memo, useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureState, FeatureSummary, MiniTeamMember } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { daysBetween, formatShortDate, type BarGeometryPx, type DateWindow } from '../../ganttMath';
import type { StageBarGeometry } from '../../ganttStageGeometry';
import { computeLifecycleStageWindow, featureIsOverdue, plannedStageCount } from '../../ganttStageGeometry';
import { GanttSegmentedBar } from '../GanttSegmentedBar';
import { GanttFeatureTrackBand } from '../GanttFeatureTrackBand';
import type { GanttLaneVariant } from '../../useGanttLayout';
import {
  InlineLiveRegion, InlineOwnerPicker, InlineTextCell,
  type FeatureMutationCallbacks, type TrackMutationCallbacks,
} from '../InlineEditors';
import { GanttRow } from '../GanttRow';
import './GanttFeatureRow.css';

export interface GanttFeatureRowProps {
  feature: FeatureSummary;
  stageBars: StageBarGeometry[];
  bar?: BarGeometryPx | null;
  today: string;
  lead: MiniTeamMember;
  variant?: GanttLaneVariant;
  canEdit?: boolean;
  mutations?: FeatureMutationCallbacks;
  trackMutations?: TrackMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  loadedRange?: DateWindow;
  dayPx?: number;
}

function computeFeatureDtr(feature: FeatureSummary, today: string, doneLabel: string): string {
  if (feature.state === 'LiveRelease') return doneLabel;
  const active = computeLifecycleStageWindow(feature, feature.state as FeatureState);
  const plannedEnd = active.plannedEnd ?? feature.plannedEnd;
  if (plannedEnd == null) return '—';
  const delta = daysBetween(today, plannedEnd);
  return delta < 0 ? `-${Math.abs(delta)}d` : `${delta}d`;
}

function GanttFeatureRowInner({
  feature, stageBars, bar, today, lead,
  variant = 'planned', canEdit = false,
  mutations, trackMutations, roster, loadedRange, dayPx = 24,
}: GanttFeatureRowProps) {
  const { t, i18n } = useTranslation('gantt');
  const locale = i18n.language || 'en';
  const inlineEnabled = canEdit && mutations != null;
  const [announcement, setAnnouncement] = useState<string>('');
  const handleAnnounce = useCallback((msg: string) => setAnnouncement(msg), []);

  const buildTitleAnnouncement = useCallback(
    (outcome: 'saved' | 'error') => outcome === 'saved'
      ? t('inlineEdit.announce.titleSaved', { defaultValue: 'Feature title saved.' })
      : t('inlineEdit.announce.titleError', { defaultValue: 'Feature title change was rejected.' }),
    [t],
  );
  const buildLeadAnnouncement = useCallback(
    (outcome: 'saved' | 'error') => outcome === 'saved'
      ? t('inlineEdit.announce.leadSaved', { defaultValue: 'Feature lead saved.' })
      : t('inlineEdit.announce.leadError', { defaultValue: 'Feature lead change was rejected.' }),
    [t],
  );

  const isOverdue = useMemo(() => featureIsOverdue(feature, today), [feature, today]);
  const planned = useMemo(() => plannedStageCount(feature), [feature]);
  const doneLabel = t('row.done', { defaultValue: 'Done' });
  const dtr = useMemo(() => computeFeatureDtr(feature, today, doneLabel), [feature, today, doneLabel]);
  const totalStages = 5;

  const ariaLabel = t('row.rowAria', { title: feature.title, lead: lead.displayName, state: t(`state.${feature.state}`), variant });
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); };

  const resolveOwner = useMemo(
    () => (userId: number | null | undefined) => {
      const member = (feature.tracks ?? [])
        .flatMap((tr) => [tr.trackOwner, ...tr.stages.map((s) => s.stageOwner)])
        .find((m) => m?.userId === userId);
      return member ?? undefined;
    },
    [feature.tracks],
  );

  const gutter = (
    <>
      <div className="gantt-row__title-line" data-testid="feature-info-panel">
        {inlineEnabled && mutations != null ? (
          <InlineTextCell
            value={feature.title}
            ariaLabel={t('inlineEdit.titleAria', { defaultValue: 'Feature title: {{title}}', title: feature.title })}
            className="gantt-row__title-editor"
            testId={`feature-title-editor-${feature.id}`}
            validate={(next) => {
              const trimmed = next.trim();
              if (trimmed.length === 0) return t('inlineEdit.errors.titleEmpty', { defaultValue: "Title can't be empty" });
              if (trimmed.length > 200) return t('inlineEdit.errors.titleTooLong', { defaultValue: 'Title is too long (max 200 chars)' });
              return null;
            }}
            onSave={async (next) => { await mutations.saveTitle(feature.id, next.trim(), feature.version ?? 0); }}
            onAnnounce={handleAnnounce}
            buildAnnouncement={buildTitleAnnouncement}
          />
        ) : (
          <button type="button" className="gantt-row__title" aria-label={ariaLabel} onKeyDown={handleTitleKeyDown}>
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
            ariaLabel={t('inlineEdit.leadAria', { defaultValue: 'Lead for "{{title}}"', title: feature.title })}
            testId={`feature-lead-editor-${feature.id}`}
            onSave={async (next) => { if (next == null) return; await mutations.saveLead(feature.id, next, feature.version ?? 0); }}
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
            {formatShortDate(feature.plannedStart, locale)}
            <span className="gantt-row__meta-sep">{' · '}</span>
            {formatShortDate(feature.plannedEnd, locale)}
          </span>
        )}
        <span className="gantt-row__meta-sep">{'·'}</span>
        <span className="gantt-row__dtr" data-testid="feature-dtr" data-overdue={isOverdue ? 'true' : 'false'}>{dtr}</span>
        <span className="gantt-row__meta-sep">{'·'}</span>
        <span className="gantt-row__planned-counter" data-testid="feature-planned-counter" data-partial={planned < totalStages ? 'true' : 'false'}>
          {t('row.plannedCounter', { planned, total: totalStages })}
        </span>
      </div>
    </>
  );

  return (
    <>
      <GanttRow
        className="gantt-row" gutterClassName="gantt-row__gutter" laneClassName="gantt-row__lane"
        borderVariant="strong"
        data-feature-id={String(feature.id)} data-feature-row={String(feature.id)}
        data-testid={`feature-row-${feature.id}`} data-variant={variant}
        gutter={gutter}
        lane={<GanttSegmentedBar feature={feature} stageBars={stageBars} today={today} laneVariant={variant} summaryBar={bar} />}
      />
      {feature.tracks && feature.tracks.length > 0 && loadedRange != null
        ? feature.tracks.map((track) => (
            <GanttFeatureTrackBand
              key={`${track.featureId}-${track.kind}`}
              track={track} kind={track.kind} featureTitle={feature.title}
              today={today} loadedRange={loadedRange} dayPx={dayPx}
              resolveOwner={resolveOwner} canEdit={inlineEnabled}
              mutations={trackMutations} roster={roster} onAnnounce={handleAnnounce}
            />
          ))
        : null}
      {inlineEnabled ? <InlineLiveRegion message={announcement} /> : null}
    </>
  );
}

export const GanttFeatureRow = memo(GanttFeatureRowInner);
