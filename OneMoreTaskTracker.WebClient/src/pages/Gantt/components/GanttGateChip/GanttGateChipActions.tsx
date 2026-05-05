import { useTranslation } from 'react-i18next';
import type { GateStatus } from '../../../../common/types/feature';

export interface GanttGateChipActionsProps {
  testIdBase: string;
  gateLabel: string;
  status: GateStatus;
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function GanttGateChipActions({
  testIdBase,
  gateLabel,
  status,
  pending,
  onApprove,
  onReject,
}: GanttGateChipActionsProps) {
  const { t } = useTranslation('gantt');
  const approveLabel =
    status === 'approved'
      ? t('gates.unapproveAria', { defaultValue: 'Unapprove {{name}} gate', name: gateLabel })
      : t('gates.approveAria', { defaultValue: 'Approve {{name}} gate', name: gateLabel });
  const rejectLabel =
    status === 'rejected'
      ? t('gates.unrejectAria', { defaultValue: 'Reopen {{name}} gate', name: gateLabel })
      : t('gates.rejectAria', { defaultValue: 'Reject {{name}} gate', name: gateLabel });

  return (
    <span className="gantt-gate-chip__actions">
      <button
        type="button"
        className="gantt-gate-chip__action gantt-gate-chip__action--approve"
        data-testid={`${testIdBase}-approve`}
        aria-label={approveLabel}
        title={approveLabel}
        disabled={pending}
        onClick={onApprove}
      >
        {status === 'approved' ? '↺' : '✓'}
      </button>
      <button
        type="button"
        className="gantt-gate-chip__action gantt-gate-chip__action--reject"
        data-testid={`${testIdBase}-reject`}
        aria-label={rejectLabel}
        title={rejectLabel}
        disabled={pending}
        onClick={onReject}
      >
        {status === 'rejected' ? '↺' : '✕'}
      </button>
    </span>
  );
}
