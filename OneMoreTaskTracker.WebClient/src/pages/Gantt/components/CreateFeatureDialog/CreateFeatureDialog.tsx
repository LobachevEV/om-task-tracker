import { useCallback, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Callout, Dialog, TextField } from '../../../../common/ds';
import * as planApi from '../../../../common/api/planApi';
import type { CreateFeaturePayload, FeatureSummary } from '../../../../common/types/feature';

export interface CreateFeatureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (feature: FeatureSummary) => void;
  /** Injection seam for tests / stories. */
  api?: Pick<typeof planApi, 'createFeature'>;
}

interface DraftState {
  title: string;
  description: string;
}

const EMPTY_DRAFT: DraftState = {
  title: '',
  description: '',
};

function buildPayload(draft: DraftState): CreateFeaturePayload {
  const payload: CreateFeaturePayload = { title: draft.title.trim() };
  if (draft.description.trim() !== '') payload.description = draft.description;
  return payload;
}

function validate(draft: DraftState): { ok: boolean; titleError?: string } {
  const trimmed = draft.title.trim();
  if (trimmed.length === 0) return { ok: false, titleError: 'empty' };
  if (trimmed.length > 200) return { ok: false, titleError: 'tooLong' };
  if (draft.description.length > 4000) return { ok: false };
  return { ok: true };
}

export function CreateFeatureDialog({
  open,
  onClose,
  onCreated,
  api = planApi,
}: CreateFeatureDialogProps) {
  const { t } = useTranslation('gantt');
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setError(null);
    setSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validation = validate(draft);
  const canSubmit = validation.ok && !submitting;
  const titleError =
    validation.titleError === 'empty'
      ? t('drawer.validation.titleRequired', { defaultValue: 'Title is required' })
      : null;

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      setError(null);
      try {
        const created = await api.createFeature(buildPayload(draft));
        reset();
        onCreated(created);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setSubmitting(false);
      }
    },
    [api, draft, canSubmit, onCreated, reset],
  );

  return (
    <Dialog
      open={open}
      title={t('create.title')}
      onClose={handleCancel}
      className="create-feature-dialog"
    >
      <form onSubmit={handleSubmit} noValidate className="feature-drawer__form">
        <TextField
          label={t('drawer.fields.title')}
          value={draft.title}
          onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
          error={titleError ?? undefined}
          placeholder={t('create.titlePlaceholder')}
          required
          autoFocus
        />

        <div className="feature-drawer__field">
          <label className="field__label" htmlFor="create-feature-description">
            {t('drawer.fields.description')}
          </label>
          <textarea
            id="create-feature-description"
            className="field__input feature-drawer__textarea"
            rows={4}
            value={draft.description}
            onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
          />
        </div>

        {error ? <Callout tone="danger">{error}</Callout> : null}

        <div className="feature-drawer__actions">
          <Button variant="secondary" type="button" onClick={handleCancel} disabled={submitting}>
            {t('create.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={!canSubmit} loading={submitting}>
            {t('create.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
