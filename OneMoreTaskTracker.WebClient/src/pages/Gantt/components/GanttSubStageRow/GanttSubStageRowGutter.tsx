import { useEffect, useRef, useState, type RefObject } from 'react';
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
import { makeSubStageAnnouncements } from './announcements';

const CONFIRM_REMOVE_TIMEOUT_MS = 4000;

export interface GanttSubStageRowGutterProps {
  feature: FeatureSummary;
  track: Track;
  phase: PhaseKind;
  geom: SubStageBarGeometry;
  index: number;
  total: number;
  performer: MiniTeamMember | undefined;
  inlineEnabled: boolean;
  mutations?: FeatureMutationCallbacks;
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
  onRemove?: (subStageId: number, version: number) => void;
  appendedSubStageIdRef?: RefObject<number | null>;
}

export function GanttSubStageRowGutter({
  feature,
  track,
  phase,
  geom,
  index,
  total,
  performer,
  inlineEnabled,
  mutations,
  roster,
  onAnnounce,
  onRemove,
  appendedSubStageIdRef,
}: GanttSubStageRowGutterProps) {
  const { t } = useTranslation('gantt');
  const subStage = geom.subStage;
  const subStageVersion = subStage.version;
  const trackLabel = t(`tracks.${track}`);
  const phaseLabel = t(`phases.${phase}`);
  const numeral = t('subStage.indexOf', {
    defaultValue: '{{index}} of {{total}}',
    index: index + 1,
    total,
  });
  const announce = makeSubStageAnnouncements(t, phaseLabel);

  const [pendingRemove, setPendingRemove] = useState(false);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownerCellRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (appendedSubStageIdRef == null) return;
    if (appendedSubStageIdRef.current !== subStage.id) return;
    appendedSubStageIdRef.current = null;
    const btn = ownerCellRef.current?.querySelector<HTMLElement>('button, [tabindex="0"]');
    btn?.focus();
  }, [appendedSubStageIdRef, subStage.id]);

  useEffect(() => {
    return () => {
      if (cancelTimerRef.current != null) {
        clearTimeout(cancelTimerRef.current);
      }
    };
  }, []);

  function handleRemoveClick() {
    if (!pendingRemove) {
      setPendingRemove(true);
      onAnnounce?.(
        t('actions.confirmRemoveAnnounce', {
          defaultValue: 'Press Confirm remove again to delete this sub-stage.',
        }),
      );
      cancelTimerRef.current = setTimeout(() => {
        setPendingRemove(false);
      }, CONFIRM_REMOVE_TIMEOUT_MS);
    } else {
      if (cancelTimerRef.current != null) {
        clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
      setPendingRemove(false);
      onRemove?.(subStage.id, subStageVersion);
    }
  }

  function handleRemoveBlur() {
    if (cancelTimerRef.current != null) {
      clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }
    setPendingRemove(false);
  }

  return (
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
      <span className="gantt-substage-row__owner" ref={ownerCellRef}>
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
            buildAnnouncement={announce.owner}
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
              buildAnnouncement={announce.start}
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
              buildAnnouncement={announce.end}
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
          className={`gantt-substage-row__remove${pendingRemove ? ' gantt-substage-row__remove--pending' : ''}`}
          data-testid={`substage-remove-${feature.id}-${subStage.id}`}
          onClick={handleRemoveClick}
          onBlur={handleRemoveBlur}
          aria-label={
            pendingRemove
              ? t('actions.confirmRemove', { defaultValue: 'Confirm remove' })
              : t('actions.removeSubStage', { defaultValue: 'Remove sub-stage' })
          }
        >
          {pendingRemove
            ? t('actions.confirmRemove', { defaultValue: 'Confirm remove' })
            : t('actions.removeSubStage', { defaultValue: 'Remove' })}
        </button>
      ) : null}
    </div>
  );
}
