import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Callout, TextField } from '../../shared/ds';
import type {
  FeatureState,
  FeatureStagePlan,
  FeatureSummary,
  UpdateFeaturePayload,
} from '../../shared/types/feature';
import { FEATURE_STATE_ENTRIES } from './stateConfig';
import { StagePlanTable } from './StagePlanTable';
import { fromDraft, useStagePlanForm } from './useStagePlanForm';

export interface FeatureEditFormProps {
  initial: FeatureSummary;
  onSubmit: (patch: UpdateFeaturePayload) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  errorMessage?: string | null;
  /**
   * FeatureDetail.stagePlans — carries the resolved `performer` mini-member
   * per stage so the combobox can distinguish "unassigned" from "stale".
   * When omitted, the edit form falls back to `initial.stagePlans`.
   */
  detailStagePlans?: readonly FeatureStagePlan[];
}

interface EditableState {
  title: string;
  description: string;
  state: FeatureState;
}

function toEditable(feature: FeatureSummary): EditableState {
  return {
    title: feature.title,
    description: feature.description ?? '',
    state: feature.state,
  };
}

function stagePlansEqual(a: readonly FeatureStagePlan[], b: readonly FeatureStagePlan[]): boolean {
  if (a.length !== b.length) return false;
  // Compare by stage key to avoid order sensitivity.
  const byStage = new Map(b.map((p) => [p.stage, p]));
  for (const row of a) {
    const other = byStage.get(row.stage);
    if (!other) return false;
    if (row.plannedStart !== other.plannedStart) return false;
    if (row.plannedEnd !== other.plannedEnd) return false;
    if (row.performerUserId !== other.performerUserId) return false;
  }
  return true;
}

function buildScalarPatch(initial: FeatureSummary, current: EditableState): UpdateFeaturePayload {
  const patch: UpdateFeaturePayload = {};
  if (current.title !== initial.title) patch.title = current.title;
  if ((current.description || '') !== (initial.description ?? '')) {
    patch.description = current.description === '' ? null : current.description;
  }
  if (current.state !== initial.state) patch.state = current.state;
  return patch;
}

function validate(current: EditableState): { ok: boolean; titleError?: string } {
  const trimmed = current.title.trim();
  if (trimmed.length === 0) return { ok: false, titleError: 'empty' };
  if (trimmed.length > 200) return { ok: false, titleError: 'tooLong' };
  if (current.description.length > 4000) return { ok: false };
  return { ok: true };
}

/** Duration (ms) the button stays in the "Saved ✓" confirmation state. */
const SAVED_LATCH_MS = 800;

export function FeatureEditForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  detailStagePlans,
}: FeatureEditFormProps) {
  const { t } = useTranslation('gantt');
  const [current, setCurrent] = useState<EditableState>(() => toEditable(initial));

  // The stage-plan draft lives inside the form so Save is one atomic op.
  const stageForm = useStagePlanForm(initial.stagePlans);

  // Local "Saved ✓" latch shown for ~800ms after a successful round-trip.
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const scalarPatch = useMemo(
    () => buildScalarPatch(initial, current),
    [initial, current],
  );

  const stagePlansPatch: FeatureStagePlan[] | undefined = useMemo(() => {
    const candidate = fromDraft(stageForm.draft);
    if (stagePlansEqual(candidate, initial.stagePlans)) return undefined;
    return candidate;
  }, [stageForm.draft, initial.stagePlans]);

  const patch: UpdateFeaturePayload = useMemo(() => {
    if (stagePlansPatch) return { ...scalarPatch, stagePlans: stagePlansPatch };
    return scalarPatch;
  }, [scalarPatch, stagePlansPatch]);

  const dirty = Object.keys(patch).length > 0;
  const validation = useMemo(() => validate(current), [current]);
  const canSubmit =
    dirty && validation.ok && !stageForm.hasHardError && !submitting && !saved;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await onSubmit(patch);
      // Only latch the Saved ✓ confirmation on success. On failure the
      // parent surfaces errorMessage and the button stays in idle "Save".
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), SAVED_LATCH_MS);
    } catch {
      // Parent owns error surfacing; nothing to do locally.
    }
  };

  const titleErrorText =
    validation.titleError === 'empty'
      ? t('drawer.validation.titleRequired', { defaultValue: 'Title is required' })
      : null;

  const saveLabel = saved
    ? t('drawer.saved', { defaultValue: 'Saved ✓' })
    : submitting
      ? t('drawer.saving', { defaultValue: 'Saving…' })
      : t('drawer.save');

  return (
    <form
      className="feature-drawer__form"
      onSubmit={handleSubmit}
      noValidate
      data-saving={submitting ? 'true' : 'false'}
    >
      <TextField
        label={t('drawer.fields.title')}
        value={current.title}
        onChange={(e) => setCurrent((s) => ({ ...s, title: e.target.value }))}
        error={titleErrorText ?? undefined}
        required
        disabled={submitting}
      />

      <div className="feature-drawer__field">
        <label className="field__label" htmlFor="feature-drawer-description">
          {t('drawer.fields.description')}
        </label>
        <textarea
          id="feature-drawer-description"
          className="field__input feature-drawer__textarea"
          value={current.description}
          rows={4}
          disabled={submitting}
          onChange={(e) => setCurrent((s) => ({ ...s, description: e.target.value }))}
        />
      </div>

      <div className="feature-drawer__field">
        <label className="field__label" htmlFor="feature-drawer-state">
          {t('drawer.fields.state')}
        </label>
        <select
          id="feature-drawer-state"
          className="field__input"
          value={current.state}
          disabled={submitting}
          onChange={(e) =>
            setCurrent((s) => ({ ...s, state: e.target.value as FeatureState }))
          }
        >
          {FEATURE_STATE_ENTRIES.map((entry) => (
            <option key={entry.state} value={entry.state}>
              {t(entry.i18nKey)}
            </option>
          ))}
        </select>
      </div>

      <StagePlanTable
        initial={initial.stagePlans}
        detailStagePlans={detailStagePlans}
        activeState={initial.state}
        submitting={submitting}
        readOnly={false}
        form={stageForm}
      />

      {errorMessage ? <Callout tone="danger">{errorMessage}</Callout> : null}

      <div className="feature-drawer__actions">
        <Button
          variant="secondary"
          onClick={onCancel}
          type="button"
          disabled={submitting}
        >
          {t('drawer.cancel')}
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!canSubmit}
          loading={submitting}
          data-saved={saved ? 'true' : 'false'}
        >
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
