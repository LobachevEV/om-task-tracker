import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextField } from '../../shared/ds';
import type {
  FeatureState,
  FeatureSummary,
  UpdateFeaturePayload,
} from '../../shared/types/feature';
import { FEATURE_STATE_ENTRIES } from './stateConfig';

export interface FeatureEditFormProps {
  initial: FeatureSummary;
  onSubmit: (patch: UpdateFeaturePayload) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  errorMessage?: string | null;
}

interface EditableState {
  title: string;
  description: string;
  state: FeatureState;
  plannedStart: string;
  plannedEnd: string;
}

function toEditable(feature: FeatureSummary): EditableState {
  return {
    title: feature.title,
    description: feature.description ?? '',
    state: feature.state,
    plannedStart: feature.plannedStart ?? '',
    plannedEnd: feature.plannedEnd ?? '',
  };
}

function normalizeDate(s: string): string | null {
  return s.trim() === '' ? null : s;
}

function buildPatch(initial: FeatureSummary, current: EditableState): UpdateFeaturePayload {
  const patch: UpdateFeaturePayload = {};
  if (current.title !== initial.title) patch.title = current.title;
  if ((current.description || '') !== (initial.description ?? '')) {
    patch.description = current.description === '' ? null : current.description;
  }
  if (current.state !== initial.state) patch.state = current.state;
  const plannedStart = normalizeDate(current.plannedStart);
  const initialStart = initial.plannedStart ?? null;
  if (plannedStart !== initialStart) patch.plannedStart = plannedStart;
  const plannedEnd = normalizeDate(current.plannedEnd);
  const initialEnd = initial.plannedEnd ?? null;
  if (plannedEnd !== initialEnd) patch.plannedEnd = plannedEnd;
  return patch;
}

function validate(current: EditableState): { ok: boolean; titleError?: string } {
  const trimmed = current.title.trim();
  if (trimmed.length === 0) return { ok: false, titleError: 'empty' };
  if (trimmed.length > 200) return { ok: false, titleError: 'tooLong' };
  if (current.description.length > 4000) return { ok: false };
  const start = normalizeDate(current.plannedStart);
  const end = normalizeDate(current.plannedEnd);
  if (start && end && end < start) return { ok: false };
  return { ok: true };
}

export function FeatureEditForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
}: FeatureEditFormProps) {
  const { t } = useTranslation('gantt');
  const [current, setCurrent] = useState<EditableState>(() => toEditable(initial));

  const patch = useMemo(() => buildPatch(initial, current), [initial, current]);
  const dirty = Object.keys(patch).length > 0;
  const validation = useMemo(() => validate(current), [current]);
  const canSubmit = dirty && validation.ok && !submitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit(patch);
  };

  const titleErrorText =
    validation.titleError === 'empty'
      ? t('drawer.validation.titleRequired', { defaultValue: 'Title is required' })
      : null;

  return (
    <form className="feature-drawer__form" onSubmit={handleSubmit} noValidate>
      <TextField
        label={t('drawer.fields.title')}
        value={current.title}
        onChange={(e) => setCurrent((s) => ({ ...s, title: e.target.value }))}
        error={titleErrorText ?? undefined}
        required
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

      <div className="feature-drawer__grid">
        <TextField
          label={t('drawer.fields.plannedStart')}
          type="date"
          value={current.plannedStart}
          onChange={(e) => setCurrent((s) => ({ ...s, plannedStart: e.target.value }))}
        />
        <TextField
          label={t('drawer.fields.plannedEnd')}
          type="date"
          value={current.plannedEnd}
          onChange={(e) => setCurrent((s) => ({ ...s, plannedEnd: e.target.value }))}
        />
      </div>

      {errorMessage ? (
        <div role="alert" className="feature-drawer__error-banner">
          {errorMessage}
        </div>
      ) : null}

      <div className="feature-drawer__actions">
        <Button variant="secondary" onClick={onCancel} type="button">
          {t('drawer.cancel')}
        </Button>
        <Button variant="primary" type="submit" disabled={!canSubmit} loading={submitting}>
          {t('drawer.save')}
        </Button>
      </div>
    </form>
  );
}
