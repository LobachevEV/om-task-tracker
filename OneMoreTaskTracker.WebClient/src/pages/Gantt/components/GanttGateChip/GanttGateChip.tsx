import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureGate, GateKey, GateStatus } from '../../../../common/types/feature';
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

const REJECTION_REASON_MAX = 500;

function approveTarget(current: GateStatus): GateStatus {
  if (current === 'approved') return 'waiting';
  return 'approved';
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
  const [rejecting, setRejecting] = useState(false);
  const [reasonDraft, setReasonDraft] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reasonInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (rejecting) {
      reasonInputRef.current?.focus();
    }
  }, [rejecting]);

  const closeRejectEditor = useCallback(() => {
    setRejecting(false);
    setReasonDraft('');
    setReasonError(null);
  }, []);

  const handleApprove = useCallback(async () => {
    if (!canEdit || onChangeStatus == null || pending) return;
    const next = approveTarget(gate.status);
    setPending(true);
    try {
      await onChangeStatus(gate.gateKey, next, null, gate.version);
    } finally {
      setPending(false);
    }
  }, [canEdit, onChangeStatus, pending, gate.gateKey, gate.status, gate.version]);

  const handleReject = useCallback(() => {
    if (!canEdit || onChangeStatus == null || pending) return;
    if (gate.status === 'rejected') {
      setPending(true);
      void Promise.resolve(onChangeStatus(gate.gateKey, 'waiting', null, gate.version)).finally(
        () => setPending(false),
      );
      return;
    }
    setRejecting(true);
    setReasonDraft(gate.rejectionReason ?? '');
    setReasonError(null);
  }, [canEdit, onChangeStatus, pending, gate.gateKey, gate.status, gate.version, gate.rejectionReason]);

  const submitReject = useCallback(async () => {
    if (onChangeStatus == null) return;
    const trimmed = reasonDraft.trim();
    if (trimmed.length === 0) {
      setReasonError(
        t('gates.rejectReasonRequired', {
          defaultValue: 'A reason is required to reject',
        }),
      );
      return;
    }
    if (trimmed.length > REJECTION_REASON_MAX) {
      setReasonError(
        t('gates.rejectReasonTooLong', {
          defaultValue: 'Max {{max}} characters',
          max: REJECTION_REASON_MAX,
        }),
      );
      return;
    }
    setPending(true);
    try {
      await onChangeStatus(gate.gateKey, 'rejected', trimmed, gate.version);
      closeRejectEditor();
    } catch {
      setReasonError(
        t('gates.rejectFailed', {
          defaultValue: "Couldn't reject. Try again.",
        }),
      );
    } finally {
      setPending(false);
    }
  }, [onChangeStatus, reasonDraft, t, gate.gateKey, gate.version, closeRejectEditor]);

  const handleReasonKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submitReject();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeRejectEditor();
    }
  };

  if (leftPx == null || gate == null || testIdBase == null) {
    return null;
  }

  const showReadonly = !canEdit;
  const approveLabel =
    gate.status === 'approved'
      ? t('gates.unapproveAria', { defaultValue: 'Unapprove {{name}} gate', name: gateLabel })
      : t('gates.approveAria', { defaultValue: 'Approve {{name}} gate', name: gateLabel });
  const rejectLabel =
    gate.status === 'rejected'
      ? t('gates.unrejectAria', { defaultValue: 'Reopen {{name}} gate', name: gateLabel })
      : t('gates.rejectAria', { defaultValue: 'Reject {{name}} gate', name: gateLabel });

  return (
    <span
      className="gantt-gate-chip"
      data-testid={`${testIdBase}`}
      data-status={gate.status}
      data-gate-key={gate.gateKey}
      data-readonly={showReadonly ? 'true' : 'false'}
      data-rejecting={rejecting ? 'true' : 'false'}
      data-pending={pending ? 'true' : 'false'}
      style={chipStyle}
      aria-label={ariaLabel}
      title={`${gateLabel} · ${statusLabel}`}
      role="group"
    >
      <span className="gantt-gate-chip__dot" aria-hidden="true" />
      <span className="gantt-gate-chip__label">{gateLabel}</span>
      {showReadonly ? null : (
        <span className="gantt-gate-chip__actions">
          <button
            type="button"
            className="gantt-gate-chip__action gantt-gate-chip__action--approve"
            data-testid={`${testIdBase}-approve`}
            aria-label={approveLabel}
            title={approveLabel}
            disabled={pending}
            onClick={() => void handleApprove()}
          >
            {gate.status === 'approved' ? '↺' : '✓'}
          </button>
          <button
            type="button"
            className="gantt-gate-chip__action gantt-gate-chip__action--reject"
            data-testid={`${testIdBase}-reject`}
            aria-label={rejectLabel}
            title={rejectLabel}
            disabled={pending}
            onClick={handleReject}
          >
            {gate.status === 'rejected' ? '↺' : '✕'}
          </button>
        </span>
      )}
      {rejecting ? (
        <span
          className="gantt-gate-chip__reason"
          data-testid={`${testIdBase}-reason`}
        >
          <input
            ref={reasonInputRef}
            type="text"
            className="gantt-gate-chip__reason-input"
            data-testid={`${testIdBase}-reason-input`}
            aria-label={t('gates.reasonAria', {
              defaultValue: 'Rejection reason for {{name}}',
              name: gateLabel,
            })}
            value={reasonDraft}
            maxLength={REJECTION_REASON_MAX}
            placeholder={t('gates.reasonPlaceholder', {
              defaultValue: 'Reason (required)',
            })}
            onChange={(e) => {
              setReasonDraft(e.currentTarget.value);
              if (reasonError != null) setReasonError(null);
            }}
            onKeyDown={handleReasonKeyDown}
            aria-invalid={reasonError != null || undefined}
            disabled={pending}
          />
          <button
            type="button"
            className="gantt-gate-chip__reason-submit"
            data-testid={`${testIdBase}-reason-submit`}
            disabled={pending}
            onClick={() => void submitReject()}
          >
            {t('gates.reasonSubmit', { defaultValue: 'Reject' })}
          </button>
          <button
            type="button"
            className="gantt-gate-chip__reason-cancel"
            data-testid={`${testIdBase}-reason-cancel`}
            onClick={closeRejectEditor}
          >
            {t('gates.reasonCancel', { defaultValue: 'Cancel' })}
          </button>
          {reasonError != null ? (
            <span
              className="gantt-gate-chip__reason-error"
              data-testid={`${testIdBase}-reason-error`}
              role="alert"
            >
              {reasonError}
            </span>
          ) : null}
        </span>
      ) : null}
      {gate.status === 'rejected' && !rejecting && gate.rejectionReason != null ? (
        <span
          className="gantt-gate-chip__rejection-reason"
          data-testid={`${testIdBase}-rejection-reason`}
        >
          {gate.rejectionReason}
        </span>
      ) : null}
    </span>
  );
}
