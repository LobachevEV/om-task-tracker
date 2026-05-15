import { useTranslation } from 'react-i18next';
import type { MiniTeamMember } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { Avatar, roleToAvatarTone } from '../../../../common/ds';
import { InlineOwnerPicker } from '../InlineEditors';

export interface OwnerCellProps {
  stageOwnerUserId?: number | null;
  inheritedOwnerUserId?: number | null;
  resolveOwner: (userId: number | null | undefined) => MiniTeamMember | undefined;
  noSignal?: boolean;
  canEdit?: boolean;
  mutations?: {
    saveOwner: (next: number | null) => Promise<void>;
  };
  roster?: readonly TeamRosterMember[];
  onAnnounce?: (message: string) => void;
  buildAnnouncement: (outcome: 'saved' | 'error') => string;
  ariaLabel?: string;
  testId?: string;
  unassignedLabel: string;
  removedLabel: string;
  inheritedSuffixLabel: string;
  inheritedFromTrackAriaLabel?: string;
  allowInherit?: boolean;
  cssPrefix?: string;
}

export function OwnerCell({
  stageOwnerUserId,
  inheritedOwnerUserId,
  resolveOwner,
  noSignal = false,
  canEdit = false,
  mutations,
  roster,
  onAnnounce,
  buildAnnouncement,
  ariaLabel,
  testId,
  unassignedLabel,
  removedLabel,
  inheritedSuffixLabel,
  inheritedFromTrackAriaLabel,
  allowInherit,
  cssPrefix = 'gantt-track-stage-row',
}: OwnerCellProps) {
  const { t } = useTranslation('gantt');

  const hasOwnerId = stageOwnerUserId != null;
  const owner = resolveOwner(stageOwnerUserId);
  const isStale = hasOwnerId && owner == null;
  const inheritedOwner = !hasOwnerId ? resolveOwner(inheritedOwnerUserId) : undefined;
  const isInherited = !hasOwnerId && inheritedOwner != null;

  const inlineEnabled = canEdit && mutations != null;

  if (noSignal) {
    return (
      <span className={`${cssPrefix}__empty-signal`} aria-hidden="true">
        {'—'}
      </span>
    );
  }

  if (inlineEnabled && roster && !isStale) {
    const pickerDisplayName = isInherited
      ? inheritedOwner!.displayName
      : (owner?.displayName ?? null);
    return (
      <span
        className={
          isInherited
            ? `${cssPrefix}__owner-inline ${cssPrefix}__owner-inline--inherited`
            : `${cssPrefix}__owner-inline`
        }
        data-inherited={isInherited ? 'true' : undefined}
        aria-label={
          isInherited
            ? (inheritedFromTrackAriaLabel ?? t('tracks.row.ariaInheritedOwner', {
                defaultValue: 'Owner inherited from track: {{name}}',
                name: inheritedOwner!.displayName,
              }))
            : undefined
        }
      >
        {isInherited ? (
          <span className={`${cssPrefix}__inherit-glyph`} aria-hidden="true">&#x2198;</span>
        ) : null}
        <InlineOwnerPicker
          value={stageOwnerUserId ?? null}
          displayName={pickerDisplayName}
          roster={roster}
          ariaLabel={ariaLabel ?? ''}
          testId={testId ?? ''}
          onSave={async (next) => {
            await mutations!.saveOwner(next);
          }}
          onAnnounce={onAnnounce}
          buildAnnouncement={buildAnnouncement}
          allowInherit={allowInherit ?? (isInherited || hasOwnerId)}
        />
      </span>
    );
  }

  if (isInherited) {
    return (
      <span
        className={`${cssPrefix}__inherited`}
        aria-label={
          inheritedFromTrackAriaLabel ??
          t('tracks.row.ariaInheritedOwner', {
            defaultValue: 'Owner inherited from track: {{name}}',
            name: inheritedOwner!.displayName,
          })
        }
      >
        <Avatar
          name={inheritedOwner!.displayName}
          size="sm"
          tone={roleToAvatarTone(inheritedOwner!.role)}
        />
        <span className={`${cssPrefix}__owner-text ${cssPrefix}__owner-text--inherited`}>
          {inheritedOwner!.displayName}
          {' '}
          <span className={`${cssPrefix}__inherit-suffix`} aria-hidden="true">
            {inheritedSuffixLabel}
          </span>
        </span>
        <span className={`${cssPrefix}__inherit-glyph`} aria-hidden="true">&#x2198;</span>
      </span>
    );
  }

  if (!hasOwnerId) {
    return (
      <span className={`${cssPrefix}__unassigned`}>{unassignedLabel}</span>
    );
  }

  if (isStale) {
    return (
      <>
        <span className={`${cssPrefix}__avatar-placeholder`} aria-hidden="true" />
        <span className={`${cssPrefix}__owner-text`}>{removedLabel}</span>
      </>
    );
  }

  if (owner) {
    return (
      <>
        <Avatar name={owner.displayName} size="sm" tone={roleToAvatarTone(owner.role)} />
        <span className={`${cssPrefix}__owner-text`}>{owner.displayName}</span>
      </>
    );
  }

  return null;
}
