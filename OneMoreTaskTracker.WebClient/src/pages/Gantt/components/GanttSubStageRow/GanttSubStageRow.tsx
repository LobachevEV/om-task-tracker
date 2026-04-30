import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FeatureSummary,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import type { SubStageBarGeometry } from '../../ganttStageGeometry';
import {
  InlineDateCell,
  InlineOwnerPicker,
  type FeatureMutationCallbacks,
} from '../InlineEditors';
import './GanttSubStageRow.css';

export interface GanttSubStageRowProps {
  feature: FeatureSummary;
  track: Track;
  phase: PhaseKind;
  geom: SubStageBarGeometry;
  index: number;
  total: number;
  resolvePerformer: (userId: number | null | undefined) => MiniTeamMember | undefined;
  canEdit: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
  onRemove?: (subStageId: number, version: number) => void;
}

const PHASE_COLOR_BY_KIND: Readonly<Record<PhaseKind, string>> = {
  development: '--state-in-dev',
  'stand-testing': '--state-in-test',
  'ethalon-testing': '--state-mr-master',
  'live-release': '--state-completed',
};

export function GanttSubStageRow({
  feature,
  track,
  phase,
  geom,
  index,
  total,
  resolvePerformer,
  canEdit,
  mutations,
  roster,
  onAnnounce,
  onRemove,
}: GanttSubStageRowProps) {
  const { t } = useTranslation('gantt');
  const subStage = geom.subStage;
  const performer = resolvePerformer(subStage.ownerUserId ?? null);
  const inlineEnabled = canEdit && mutations != null;
  const subStageVersion = subStage.version;

  const trackLabel = t(`tracks.${track}`);
  const phaseLabel = t(`phases.${phase}`);
  const numeral = t('subStage.indexOf', {
    defaultValue: '{{index}} of {{total}}',
    index: index + 1,
    total,
  });

  const segGeom = geom.bar ?? geom.ghost;
  const segStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {
      '--seg-color': `var(${PHASE_COLOR_BY_KIND[phase]})`,
    };
    if (segGeom) {
      style['--seg-left'] = `${segGeom.leftPx}px`;
      style['--seg-width'] = `${segGeom.widthPx}px`;
    } else {
      style['--seg-left'] = '0px';
      style['--seg-width'] = '0px';
    }
    return style as CSSProperties;
  }, [phase, segGeom]);

  const announceOwner = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.subStageOwnerSaved', {
          defaultValue: '{{phase}} sub-stage owner saved.',
          phase: phaseLabel,
        })
      : t('inlineEdit.announce.subStageOwnerError', {
          defaultValue: '{{phase}} sub-stage owner change was rejected.',
          phase: phaseLabel,
        });
  const announceStart = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.subStageStartSaved', {
          defaultValue: '{{phase}} sub-stage start saved.',
          phase: phaseLabel,
        })
      : t('inlineEdit.announce.subStageStartError', {
          defaultValue: '{{phase}} sub-stage start change was rejected.',
          phase: phaseLabel,
        });
  const announceEnd = (outcome: 'saved' | 'error') =>
    outcome === 'saved'
      ? t('inlineEdit.announce.subStageEndSaved', {
          defaultValue: '{{phase}} sub-stage end saved.',
          phase: phaseLabel,
        })
      : t('inlineEdit.announce.subStageEndError', {
          defaultValue: '{{phase}} sub-stage end change was rejected.',
          phase: phaseLabel,
        });

  return (
    <div
      className="gantt-substage-row"
      data-testid={`substage-row-${feature.id}-${track}-${phase}-${subStage.id}`}
      data-track={track}
      data-phase={phase}
      data-overdue={geom.isOverdue ? 'true' : 'false'}
    >
      <div className="gantt-substage-row__gutter">
        <span className="gantt-substage-row__numeral" aria-hidden="true">
          {numeral}
        </span>
        <span className="gantt-substage-row__label">
          {t('subStage.label', {
            defaultValue: '{{track}} · {{phase}}',
            track: trackLabel,
            phase: phaseLabel,
          })}
        </span>
        <span className="gantt-substage-row__owner">
          {inlineEnabled && mutations != null && roster ? (
            <InlineOwnerPicker
              value={subStage.ownerUserId ?? null}
              displayName={performer?.displayName ?? null}
              roster={roster}
              ariaLabel={t('inlineEdit.subStageOwnerAria', {
                defaultValue: 'Owner for {{phase}} sub-stage of "{{title}}"',
                phase: phaseLabel,
                title: feature.title,
              })}
              testId={`substage-owner-editor-${feature.id}-${subStage.id}`}
              onSave={async (next) => {
                await mutations.saveSubStageOwner(
                  feature.id,
                  subStage.id,
                  next,
                  subStageVersion,
                );
              }}
              onAnnounce={onAnnounce}
              buildAnnouncement={announceOwner}
            />
          ) : (
            <span className="gantt-substage-row__owner-text">
              {performer?.displayName ?? t('row.unassigned')}
            </span>
          )}
        </span>
        <span className="gantt-substage-row__dates">
          {inlineEnabled && mutations != null ? (
            <>
              <InlineDateCell
                value={subStage.plannedStart ?? null}
                ariaLabel={t('inlineEdit.subStagePlannedStartAria', {
                  defaultValue: 'Planned start for {{phase}} sub-stage of "{{title}}"',
                  phase: phaseLabel,
                  title: feature.title,
                })}
                testId={`substage-planned-start-${feature.id}-${subStage.id}`}
                onSave={async (next) => {
                  await mutations.saveSubStagePlannedStart(
                    feature.id,
                    subStage.id,
                    next,
                    subStageVersion,
                  );
                }}
                onAnnounce={onAnnounce}
                buildAnnouncement={announceStart}
              />
              <span className="gantt-substage-row__sep" aria-hidden="true">
                {' – '}
              </span>
              <InlineDateCell
                value={subStage.plannedEnd ?? null}
                ariaLabel={t('inlineEdit.subStagePlannedEndAria', {
                  defaultValue: 'Planned end for {{phase}} sub-stage of "{{title}}"',
                  phase: phaseLabel,
                  title: feature.title,
                })}
                testId={`substage-planned-end-${feature.id}-${subStage.id}`}
                onSave={async (next) => {
                  await mutations.saveSubStagePlannedEnd(
                    feature.id,
                    subStage.id,
                    next,
                    subStageVersion,
                  );
                }}
                onAnnounce={onAnnounce}
                buildAnnouncement={announceEnd}
              />
            </>
          ) : (
            <>
              <span className="gantt-substage-row__date">
                {subStage.plannedStart ?? '—'}
              </span>
              <span className="gantt-substage-row__sep" aria-hidden="true">
                {' – '}
              </span>
              <span className="gantt-substage-row__date">
                {subStage.plannedEnd ?? '—'}
              </span>
            </>
          )}
        </span>
        {inlineEnabled && onRemove != null && total > 1 ? (
          <button
            type="button"
            className="gantt-substage-row__remove"
            data-testid={`substage-remove-${feature.id}-${subStage.id}`}
            onClick={() => onRemove(subStage.id, subStageVersion)}
            aria-label={t('actions.removeSubStage', {
              defaultValue: 'Remove sub-stage',
            })}
          >
            {t('actions.removeSubStage', { defaultValue: 'Remove' })}
          </button>
        ) : null}
      </div>
      <div className="gantt-substage-row__lane">
        {segGeom ? (
          <span
            className="gantt-substage-row__segment"
            data-variant={geom.bar ? 'solid' : 'ghost'}
            style={segStyle}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
