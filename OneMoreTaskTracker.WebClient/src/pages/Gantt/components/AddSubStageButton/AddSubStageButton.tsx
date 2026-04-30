import { useTranslation } from 'react-i18next';
import './AddSubStageButton.css';

export interface AddSubStageButtonProps {
  /** True when the phase is at the hard cap; button shows muted + disabled. */
  atCap: boolean;
  /** Hard cap value, surfaced in the disabled label tooltip. */
  cap: number;
  onAppend: () => void;
  testId?: string;
}

export function AddSubStageButton({
  atCap,
  cap,
  onAppend,
  testId,
}: AddSubStageButtonProps) {
  const { t } = useTranslation('gantt');

  const label = t('actions.addSubStage', { defaultValue: '+ Add sub-stage' });
  const capLabel = t('validation.subStageCap', {
    defaultValue: 'Phase is at the {{cap}} sub-stage cap',
    cap,
  });

  return (
    <button
      type="button"
      className="add-substage-button"
      data-testid={testId}
      onClick={onAppend}
      disabled={atCap}
      title={atCap ? capLabel : label}
    >
      {label}
    </button>
  );
}
