import type { KeyboardEvent, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { REJECTION_REASON_MAX } from './useGateRejectionEditor';

export interface GanttGateChipRejectEditorProps {
  testIdBase: string;
  gateLabel: string;
  reasonInputRef: RefObject<HTMLInputElement | null>;
  reasonDraft: string;
  reasonError: string | null;
  pending: boolean;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function GanttGateChipRejectEditor({
  testIdBase,
  gateLabel,
  reasonInputRef,
  reasonDraft,
  reasonError,
  pending,
  onChange,
  onSubmit,
  onCancel,
}: GanttGateChipRejectEditorProps) {
  const { t } = useTranslation('gantt');

  const handleReasonKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
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
        aria-describedby={`${testIdBase}-reason-hint ${testIdBase}-reason-counter`}
        value={reasonDraft}
        maxLength={REJECTION_REASON_MAX}
        placeholder={t('gates.reasonPlaceholder', {
          defaultValue: 'Reason (required)',
        })}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={handleReasonKeyDown}
        aria-invalid={reasonError != null || undefined}
        disabled={pending}
      />
      <span
        id={`${testIdBase}-reason-hint`}
        className="gantt-gate-chip__reason-hint"
        data-testid={`${testIdBase}-reason-hint`}
      >
        {t('gates.reasonHint', {
          defaultValue: 'Up to {{max}} characters',
          max: REJECTION_REASON_MAX,
        })}
      </span>
      <span
        id={`${testIdBase}-reason-counter`}
        className="gantt-gate-chip__reason-counter"
        data-testid={`${testIdBase}-reason-counter`}
        aria-live="polite"
      >
        {t('gates.reasonCounter', {
          defaultValue: '{{n}} / {{max}}',
          n: reasonDraft.length,
          max: REJECTION_REASON_MAX,
        })}
      </span>
      <button
        type="button"
        className="gantt-gate-chip__reason-submit"
        data-testid={`${testIdBase}-reason-submit`}
        disabled={pending}
        onClick={onSubmit}
      >
        {t('gates.reasonSubmit', { defaultValue: 'Reject' })}
      </button>
      <button
        type="button"
        className="gantt-gate-chip__reason-cancel"
        data-testid={`${testIdBase}-reason-cancel`}
        onClick={onCancel}
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
  );
}
