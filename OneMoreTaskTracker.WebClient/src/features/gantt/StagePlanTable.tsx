import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureState, FeatureStagePlan } from '../../shared/types/feature';
import { StagePlanRow } from './StagePlanRow';
import type { ContinuityHint, UseStagePlanFormResult } from './useStagePlanForm';
import { useTeamRoster } from './useTeamRoster';
import type { TeamRosterMember } from '../../shared/api/teamApi';
import './StagePlanTable.css';

export interface StagePlanTableProps {
  /** Initial stage plan (always length 5 from the server). */
  initial: readonly FeatureStagePlan[];
  /** Feature.state — used to highlight the active row. */
  activeState: FeatureState;
  /** True during the save round-trip. Rows remain editable but dim slightly. */
  submitting: boolean;
  /** True when the viewer cannot edit (non-manager role). */
  readOnly: boolean;
  /**
   * Parent hands us the form instance so it can diff draft vs. initial and
   * merge `stagePlans` into the atomic feature patch. This keeps
   * `FeatureEditForm` the single source of truth for the Save click.
   */
  form: UseStagePlanFormResult;
  /**
   * Optional injected roster — tests / stories pass one so they can exercise
   * the table without mounting the module-singleton cache.
   */
  roster?: readonly TeamRosterMember[];
}

/**
 * Renders the 5-row planning table. Continuity hints are derived from the
 * draft on every render and rendered below the table, one line per
 * adjacent pair whose dates are both filled in.
 */
export function StagePlanTable({
  activeState,
  submitting,
  readOnly,
  form,
  roster: injectedRoster,
}: StagePlanTableProps) {
  const { t } = useTranslation('gantt');
  const rosterHook = useTeamRoster();
  const roster = injectedRoster ?? rosterHook.data ?? [];

  const disabled = submitting;

  return (
    <section className="stage-plan" aria-labelledby="stage-plan-heading">
      <header className="stage-plan__header">
        <h3 className="stage-plan__heading" id="stage-plan-heading">
          {t('stagePlan.title', { defaultValue: 'Stage plan' })}
        </h3>
        <p className="stage-plan__subtitle">
          {t('stagePlan.subtitle', {
            defaultValue: 'Schedule each stage and assign its owner.',
          })}
        </p>
      </header>

      <div
        className="stage-plan__table"
        role="table"
        aria-label={t('stagePlan.tableAriaLabel', { defaultValue: 'Stage plan table' })}
      >
        <div className="stage-plan__row stage-plan__row--head" role="row">
          <div className="stage-plan__cell stage-plan__cell--stage" role="columnheader">
            {t('stagePlan.columns.stage', { defaultValue: 'Stage' })}
          </div>
          <div className="stage-plan__cell stage-plan__cell--date" role="columnheader">
            {t('stagePlan.columns.plannedStart', { defaultValue: 'Planned start' })}
          </div>
          <div className="stage-plan__cell stage-plan__cell--date" role="columnheader">
            {t('stagePlan.columns.plannedEnd', { defaultValue: 'Planned end' })}
          </div>
          <div className="stage-plan__cell stage-plan__cell--performer" role="columnheader">
            {t('stagePlan.columns.performer', { defaultValue: 'Performer' })}
          </div>
        </div>

        {form.draft.map((row, idx) => (
          <StagePlanRow
            key={row.stage}
            index={idx}
            row={row}
            validation={form.validations[row.stage]}
            roster={roster}
            activeState={activeState}
            disabled={disabled}
            readOnly={readOnly}
            onChangeDate={(which, value) => form.setDate(row.stage, which, value)}
            onChangePerformer={(userId) => form.setPerformer(row.stage, userId)}
          />
        ))}
      </div>

      <ContinuityHintLine hints={form.continuityHints} />
    </section>
  );
}

interface ContinuityHintLineProps {
  hints: readonly ContinuityHint[];
}

function ContinuityHintLine({ hints }: ContinuityHintLineProps) {
  const { t } = useTranslation('gantt');

  const lines = useMemo(() => {
    return hints.map((hint) => {
      const fromStageLabel = t(`state.${hint.fromStage}`);
      const toStageLabel = t(`state.${hint.toStage}`);
      const base = {
        fromStage: fromStageLabel,
        toStage: toStageLabel,
        fromDate: hint.fromDate,
        toDate: hint.toDate,
        days: Math.abs(hint.days),
      };
      if (hint.kind === 'aligned') {
        return {
          key: `${hint.fromStage}-${hint.toStage}`,
          kind: 'aligned' as const,
          text: t('stagePlan.continuity.aligned', {
            defaultValue: '{{fromStage}} ends {{fromDate}} · {{toStage}} starts {{toDate}} — aligned.',
            ...base,
          }),
        };
      }
      if (hint.kind === 'gap') {
        return {
          key: `${hint.fromStage}-${hint.toStage}`,
          kind: 'gap' as const,
          text: t('stagePlan.continuity.gap', {
            defaultValue:
              '{{fromStage}} ends {{fromDate}} · {{toStage}} starts {{toDate}} — {{days}}-day gap.',
            ...base,
          }),
        };
      }
      return {
        key: `${hint.fromStage}-${hint.toStage}`,
        kind: 'overlap' as const,
        text: t('stagePlan.continuity.overlap', {
          defaultValue:
            '{{fromStage}} ends {{fromDate}} · {{toStage}} starts {{toDate}} — {{days}}-day overlap.',
          ...base,
        }),
      };
    });
  }, [hints, t]);

  if (lines.length === 0) return null;
  return (
    <ul className="stage-plan__continuity" aria-live="polite">
      {lines.map((line) => (
        <li
          key={line.key}
          className="stage-plan__continuity-item"
          data-kind={line.kind}
        >
          {line.text}
        </li>
      ))}
    </ul>
  );
}
