import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureGate, GateKey, GateStatus } from '../../../../common/types/feature';
import { GanttGateChipActions } from './GanttGateChipActions';
import { GanttGateChipRejectEditor } from './GanttGateChipRejectEditor';
import { useGateRejectionEditor } from './useGateRejectionEditor';
import './GanttGateChip.css';

export interface GanttGateChipProps {
  gate: FeatureGate;
  leftPx: number | null;
  canEdit: boolean;
  /** Optional namespace appended to data-testid so multiple chips for the same
   * gate (e.g. collapsed vs track row) remain queryable independently. */
  testIdScope?: string;
  onChangeStatus?: (
    gateKey: GateKey,
    next: GateStatus,
    rejectionReason: string | null,
    gateVersion: number,
  ) => Promise<void> | void;
}

export function GanttGateChip({
  gate,
  leftPx,
  canEdit,
  testIdScope,
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

  const ariaLabel = t('gates.aria', {
    defaultValue: '{{name}} gate, {{status}}',
    name: gateLabel,
    status: statusLabel,
  });

  const chipStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {};
    if (leftPx != null) {
      (style as Record<string, string>)['--gate-left'] = `${leftPx}px`;
    }
    return style;
  }, [leftPx]);

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
      title={`${gateLabel} · ${statusLabel}`}
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
          onApprove={() => void editor.handleApprove()}
          onReject={editor.beginReject}
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
