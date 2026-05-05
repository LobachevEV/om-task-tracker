import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureSummary, MiniTeamMember } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { GanttLaneVariant } from '../../useGanttLayout';
import {
  InlineOwnerPicker,
  InlineTextCell,
  type FeatureMutationCallbacks,
} from '../InlineEditors';

export interface GanttFeatureRowGutterProps {
  feature: FeatureSummary;
  lead: MiniTeamMember;
  variant: GanttLaneVariant;
  expanded: boolean;
  isOverdue: boolean;
  planned: { planned: number; total: number };
  dtr: string;
  ariaLabel: string;
  inlineEnabled: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onToggleExpand: () => void;
  onAnnounce: (message: string) => void;
  buildTitleAnnouncement: (outcome: 'saved' | 'error') => string;
  buildLeadAnnouncement: (outcome: 'saved' | 'error') => string;
}

export function GanttFeatureRowGutter({
  feature,
  lead,
  variant,
  expanded,
  isOverdue,
  planned,
  dtr,
  ariaLabel,
  inlineEnabled,
  mutations,
  roster,
  onToggleExpand,
  onAnnounce,
  buildTitleAnnouncement,
  buildLeadAnnouncement,
}: GanttFeatureRowGutterProps) {
  const { t } = useTranslation('gantt');

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
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
            onAnnounce={onAnnounce}
            buildAnnouncement={buildTitleAnnouncement}
          />
        ) : (
          <button
            type="button"
            className="gantt-row__title"
            aria-label={ariaLabel}
            onClick={onToggleExpand}
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
            onAnnounce={onAnnounce}
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
  );
}
