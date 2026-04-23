import { useTranslation } from 'react-i18next';
import type { FeatureState } from '../../shared/types/feature';
import { FEATURE_STATE_CSS } from './stateConfig';
import { StagePerformerCombobox } from './StagePerformerCombobox';
import type { StageRowDraft, StageRowValidation } from './useStagePlanForm';
import type { TeamRosterMember } from '../../shared/api/teamApi';

export interface StagePlanRowProps {
  /** Zero-based position — used for the `01…05` Geist Mono numeric prefix. */
  index: number;
  row: StageRowDraft;
  validation: StageRowValidation;
  roster: readonly TeamRosterMember[];
  /** The feature's current state — used to mark the active row. */
  activeState: FeatureState;
  disabled: boolean;
  readOnly: boolean;
  onChangeDate: (which: 'plannedStart' | 'plannedEnd', value: string) => void;
  onChangePerformer: (userId: number | null) => void;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function StagePlanRow({
  index,
  row,
  validation,
  roster,
  activeState,
  disabled,
  readOnly,
  onChangeDate,
  onChangePerformer,
}: StagePlanRowProps) {
  const { t } = useTranslation('gantt');
  const isActive = row.stage === activeState;

  const stageLabel = t(`state.${row.stage}`);
  const startLabel = t('drawer.fields.plannedStart');
  const endLabel = t('drawer.fields.plannedEnd');

  const startAriaLabel = `${startLabel} — ${stageLabel}`;
  const endAriaLabel = `${endLabel} — ${stageLabel}`;
  const performerAriaLabel = `${t('stagePlan.performerLabel', { defaultValue: 'Performer' })} — ${stageLabel}`;

  const rowErrorId = validation.dateRangeInvalid ? `stage-row-${row.stage}-error` : undefined;

  return (
    <div
      className="stage-plan__row"
      data-active={isActive ? 'true' : 'false'}
      data-invalid={validation.dateRangeInvalid ? 'true' : 'false'}
      role="row"
    >
      <div className="stage-plan__cell stage-plan__cell--stage" role="cell">
        <span
          className="stage-plan__dot"
          aria-hidden="true"
          style={{ background: `var(${FEATURE_STATE_CSS[row.stage]})` }}
        />
        <span className="stage-plan__index">{pad2(index + 1)}</span>
        <span className="stage-plan__stage-name">{stageLabel}</span>
      </div>

      <div className="stage-plan__cell stage-plan__cell--date" role="cell">
        {readOnly ? (
          <span className="stage-plan__date-read-only">
            {row.plannedStart === '' ? '—' : row.plannedStart}
          </span>
        ) : (
          <input
            type="date"
            className="stage-plan__date-input"
            aria-label={startAriaLabel}
            aria-invalid={validation.dateRangeInvalid || undefined}
            aria-describedby={rowErrorId}
            data-invalid={validation.dateRangeInvalid ? 'true' : 'false'}
            disabled={disabled}
            value={row.plannedStart}
            onChange={(e) => onChangeDate('plannedStart', e.target.value)}
          />
        )}
      </div>

      <div className="stage-plan__cell stage-plan__cell--date" role="cell">
        {readOnly ? (
          <span className="stage-plan__date-read-only">
            {row.plannedEnd === '' ? '—' : row.plannedEnd}
          </span>
        ) : (
          <input
            type="date"
            className="stage-plan__date-input"
            aria-label={endAriaLabel}
            aria-invalid={validation.dateRangeInvalid || undefined}
            aria-describedby={rowErrorId}
            data-invalid={validation.dateRangeInvalid ? 'true' : 'false'}
            disabled={disabled}
            value={row.plannedEnd}
            onChange={(e) => onChangeDate('plannedEnd', e.target.value)}
          />
        )}
      </div>

      <div className="stage-plan__cell stage-plan__cell--performer" role="cell">
        <StagePerformerCombobox
          value={row.performerUserId}
          roster={roster}
          onChange={onChangePerformer}
          disabled={disabled}
          readOnly={readOnly}
          ariaLabel={performerAriaLabel}
        />
      </div>

      {validation.dateRangeInvalid ? (
        <div
          id={rowErrorId}
          role="alert"
          className="stage-plan__row-error"
        >
          {t('stagePlan.validation.endBeforeStart', {
            defaultValue: 'End date must be on or after start date.',
          })}
        </div>
      ) : null}
    </div>
  );
}
