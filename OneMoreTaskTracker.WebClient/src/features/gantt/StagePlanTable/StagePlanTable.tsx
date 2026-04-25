import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FeatureState, FeatureStagePlan } from '../../../shared/types/feature';
import { StagePlanRow } from '../StagePlanRow';
import type { ContinuityHint, UseStagePlanFormResult } from '../useStagePlanForm';
import { useTeamRoster } from '../useTeamRoster';
import type { TeamRosterMember } from '../../../shared/api/teamApi';
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
  form: UseStagePlanFormResult;
  /**
   * Optional injected roster — tests / stories pass one so they can exercise
   * the table without mounting the module-singleton cache.
   */
  roster?: readonly TeamRosterMember[];
  /**
   * Detail stage plans carrying the server-resolved `performer` mini-member.
   * When provided, rows can distinguish "unassigned" from "stale performer"
   * (performerUserId set but performer null). Defaults to `initial` if the
   * caller already passed the detail payload.
   */
  detailStagePlans?: readonly FeatureStagePlan[];
}

/**
 * Renders the 5-row planning table. Continuity hints are derived from the
 * draft on every render and rendered below the table, one line per
 * adjacent pair whose dates are both filled in.
 */
function diffInclusiveDays(startIso: string, endIso: string): number {
  // Inclusive — 2026-05-01 → 2026-05-01 is a 1-day plan.
  const ms = Date.parse(`${endIso}T00:00:00Z`) - Date.parse(`${startIso}T00:00:00Z`);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function computeRangeSummary(
  draft: readonly { plannedStart: string; plannedEnd: string }[],
): { start: string; end: string; days: number } | null {
  const starts: string[] = [];
  const ends: string[] = [];
  for (const row of draft) {
    if (row.plannedStart === '' || row.plannedEnd === '') return null; // only when fully planned
    starts.push(row.plannedStart);
    ends.push(row.plannedEnd);
  }
  if (starts.length === 0) return null;
  const start = starts.reduce((a, b) => (a < b ? a : b));
  const end = ends.reduce((a, b) => (a > b ? a : b));
  return { start, end, days: diffInclusiveDays(start, end) };
}

export function StagePlanTable({
  activeState,
  submitting,
  readOnly,
  form,
  roster: injectedRoster,
  detailStagePlans,
  initial,
}: StagePlanTableProps) {
  const { t } = useTranslation('gantt');
  const rosterHook = useTeamRoster();
  const roster = injectedRoster ?? rosterHook.data ?? [];

  const disabled = submitting;

  // Index resolved performers by stage — priority: explicit detail prop, else initial.
  const performerByStage = useMemo(() => {
    const source = detailStagePlans ?? initial;
    const map = new Map<FeatureState, FeatureStagePlan['performer']>();
    for (const row of source) {
      map.set(row.stage, row.performer ?? null);
    }
    return map;
  }, [detailStagePlans, initial]);

  const rangeSummary = useMemo(() => computeRangeSummary(form.draft), [form.draft]);

  return (
    <section className="stage-plan" aria-labelledby="stage-plan-heading">
      <header className="stage-plan__header">
        <div className="stage-plan__header-text">
          <h3 className="stage-plan__heading" id="stage-plan-heading">
            {t('stagePlan.title', { defaultValue: 'Stage plan' })}
          </h3>
          <p className="stage-plan__subtitle">
            {t('stagePlan.subtitle', {
              defaultValue: 'Schedule each stage and assign its owner.',
            })}
          </p>
        </div>
        {rangeSummary ? (
          <span
            className="stage-plan__range-summary"
            data-testid="stage-plan-range-summary"
          >
            {t('stagePlan.rangeSummary', {
              defaultValue: '{{start}} — {{end}} · {{count}} days',
              start: rangeSummary.start,
              end: rangeSummary.end,
              count: rangeSummary.days,
            })}
          </span>
        ) : null}
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
            performer={performerByStage.get(row.stage) ?? null}
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
  // aria-atomic='false' + 'additions text' means screen readers announce just
  // the newly-added/changed line, not the full 4-line block every edit.
  return (
    <ul
      className="stage-plan__continuity"
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
    >
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
