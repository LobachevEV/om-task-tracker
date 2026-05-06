import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureGate, GateKey, GateStatus } from '../../../../common/types/feature';
import type { TeamRosterMember } from '../../../../common/api/teamApi';
import { GanttGateChipActions } from './GanttGateChipActions';
import { GanttGateChipRejectEditor } from './GanttGateChipRejectEditor';
import { useGateRejectionEditor } from './useGateRejectionEditor';
import './GanttGateChip.css';

export interface GanttGateChipProps {
  gate: FeatureGate;
  leftPx: number | null;
  canEdit: boolean;
  /** Zero-based index used to stagger chips that share the same anchor position. */
  chipIndex?: number;
  /** Optional namespace appended to data-testid so multiple chips for the same
   * gate (e.g. collapsed vs track row) remain queryable independently. */
  testIdScope?: string;
  /** Roster used to resolve approver display name in aria-label / tooltip. */
  roster?: readonly TeamRosterMember[];
  onChangeStatus?: (
    gateKey: GateKey,
    next: GateStatus,
    rejectionReason: string | null,
    gateVersion: number,
  ) => Promise<void> | void;
}

const CHIP_STACK_OFFSET_PX = 24;

export function GanttGateChip({
  gate,
  leftPx,
  canEdit,
  chipIndex = 0,
  testIdScope,
  roster,
  onChangeStatus,
}: GanttGateChipProps) {
  const { t } = useTranslation('gantt');
  const testIdBase = gate?.gateKey == null
    ? null
    : testIdScope != null
      ? `gate-chip-${testIdScope}-${gate.gateKey}`
      : `gate-chip-${gate.gateKey}`;
  const editor = useGateRejectionEditor({ gate, canEdit, onChangeStatus });

  const labelKey = useMemo<`gates.${GateKey}`>(() => `gates.${gate.gateKey}`, [gate.gateKey]);
  const statusLabel = t(`gateStatus.${gate.status}`);
  const gateLabel = t(labelKey);

  const approverName = useMemo(() => {
    if (gate.approverUserId == null || roster == null) return null;
    return roster.find((m) => m.userId === gate.approverUserId)?.displayName ?? null;
  }, [gate.approverUserId, roster]);

  const approvedDate = useMemo(() => {
    if (gate.approvedAtUtc == null) return null;
    try {
      return new Date(gate.approvedAtUtc).toLocaleDateString();
    } catch {
      return gate.approvedAtUtc;
    }
  }, [gate.approvedAtUtc]);

  const ariaLabel = useMemo(() => {
    if (approverName != null && approvedDate != null) {
      return t('gates.approvedAria', {
        defaultValue: '{{name}} gate, {{status}}, approved by {{approver}} on {{date}}',
        name: gateLabel,
        status: statusLabel,
        approver: approverName,
        date: approvedDate,
      });
    }
    return t('gates.aria', {
      defaultValue: '{{name}} gate, {{status}}',
      name: gateLabel,
      status: statusLabel,
    });
  }, [approvedDate, approverName, gateLabel, statusLabel, t]);

  const titleText = useMemo(() => {
    if (approverName != null && approvedDate != null) {
      return t('gates.approvedTooltip', {
        defaultValue: '{{gate}} · {{status}} · {{approver}} · {{date}}',
        gate: gateLabel,
        status: statusLabel,
        approver: approverName,
        date: approvedDate,
      });
    }
    return `${gateLabel} · ${statusLabel}`;
  }, [approvedDate, approverName, gateLabel, statusLabel, t]);

  const chipStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {};
    if (leftPx != null) {
      style['--gate-left'] = `${leftPx + chipIndex * CHIP_STACK_OFFSET_PX}px`;
    }
    return style as CSSProperties;
  }, [leftPx, chipIndex]);

  if (leftPx == null || gate == null || testIdBase == null) {
    return null;
  }

  const showReadonly = !canEdit;

  return (
    <span
      className="gantt-gate-chip"
      data-testid={`${testIdBase}`}
      data-status={gate.status}
      data-gate-key={gate.gateKey}
      data-readonly={showReadonly ? 'true' : 'false'}
      data-rejecting={editor.rejecting ? 'true' : 'false'}
      data-pending={editor.pending ? 'true' : 'false'}
      style={chipStyle}
      aria-label={ariaLabel}
      title={titleText}
      role="group"
    >
      <span className="gantt-gate-chip__dot" aria-hidden="true" />
      <span className="gantt-gate-chip__label">{gateLabel}</span>
      {showReadonly ? null : (
        <GanttGateChipActions
          testIdBase={testIdBase}
          gateLabel={gateLabel}
          status={gate.status}
          pending={editor.pending}
          onSelectStatus={(next) => {
            if (next === 'rejected') {
              editor.beginReject();
            } else {
              void editor.handleStatusSelect(next);
            }
          }}
        />
      )}
      {editor.rejecting ? (
        <GanttGateChipRejectEditor
          testIdBase={testIdBase}
          gateLabel={gateLabel}
          reasonInputRef={editor.reasonInputRef}
          reasonDraft={editor.reasonDraft}
          reasonError={editor.reasonError}
          pending={editor.pending}
          onChange={(next) => {
            editor.setReasonDraft(next);
            if (editor.reasonError != null) editor.setReasonError(null);
          }}
          onSubmit={() => void editor.submitReject()}
          onCancel={editor.closeRejectEditor}
        />
      ) : null}
      {gate.status === 'rejected' && !editor.rejecting && gate.rejectionReason != null ? (
        <span
          className="gantt-gate-chip__rejection-reason"
          data-testid={`${testIdBase}-rejection-reason`}
          role="status"
        >
          {gate.rejectionReason}
        </span>
      ) : null}
    </span>
  );
}
