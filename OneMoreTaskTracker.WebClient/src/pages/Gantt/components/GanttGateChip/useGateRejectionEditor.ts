import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureGate, GateKey, GateStatus } from '../../../../common/types/feature';

export const REJECTION_REASON_MAX = 500;

export interface UseGateRejectionEditorArgs {
  gate: FeatureGate;
  canEdit: boolean;
  onChangeStatus?: (
    gateKey: GateKey,
    next: GateStatus,
    rejectionReason: string | null,
    gateVersion: number,
  ) => Promise<void> | void;
}

export function useGateRejectionEditor({
  gate,
  canEdit,
  onChangeStatus,
}: UseGateRejectionEditorArgs) {
  const { t } = useTranslation('gantt');
  const [rejecting, setRejecting] = useState(false);
  const [reasonDraft, setReasonDraft] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reasonInputRef = useRef<HTMLInputElement>(null);

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

  const beginReject = useCallback(() => {
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

  const handleApprove = useCallback(async () => {
    if (!canEdit || onChangeStatus == null || pending) return;
    const next: GateStatus = gate.status === 'approved' ? 'waiting' : 'approved';
    setPending(true);
    try {
      await onChangeStatus(gate.gateKey, next, null, gate.version);
    } finally {
      setPending(false);
    }
  }, [canEdit, onChangeStatus, pending, gate.gateKey, gate.status, gate.version]);

  return {
    rejecting,
    reasonDraft,
    reasonError,
    pending,
    reasonInputRef,
    setReasonDraft,
    setReasonError,
    closeRejectEditor,
    beginReject,
    submitReject,
    handleApprove,
  };
}
