import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import * as planApi from '../../../../common/api/planApi';
import type { FeatureSummary } from '../../../../common/types/feature';
import './AddFeatureRow.css';

const TITLE_MAX = 200;
const PULSE_MS = 280;

export type AddFeatureRowVariant = 'row' | 'standalone';

export interface AddFeatureRowProps {
  onCreated: (feature: FeatureSummary) => void;
  variant?: AddFeatureRowVariant;
  api?: Pick<typeof planApi, 'createFeature'>;
}

type Status = 'idle' | 'editing' | 'submitting' | 'error';

export function AddFeatureRow({
  onCreated,
  variant = 'row',
  api = planApi,
}: AddFeatureRowProps) {
  const { t } = useTranslation('gantt');
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (pulseTimer.current != null) globalThis.clearTimeout(pulseTimer.current);
    },
    [],
  );

  const trimmed = draft.trim();
  const tooLong = trimmed.length > TITLE_MAX;
  const isEmpty = trimmed.length === 0;

  const validationMsg = tooLong ? t('inlineEdit.errors.titleTooLong') : null;
  const message = errorMsg ?? validationMsg;

  const submittable = !isEmpty && !tooLong && status !== 'submitting';

  const collapse = useCallback(() => {
    setStatus('idle');
    setDraft('');
    setErrorMsg(null);
  }, []);

  const handleSubmit = useCallback(
    async (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault();
      if (!submittable) return;
      setStatus('submitting');
      setErrorMsg(null);
      try {
        const created = await api.createFeature({ title: trimmed });
        setDraft('');
        setStatus('editing');
        setPulse(true);
        if (pulseTimer.current != null) globalThis.clearTimeout(pulseTimer.current);
        pulseTimer.current = globalThis.setTimeout(() => setPulse(false), PULSE_MS);
        inputRef.current?.focus();
        onCreated(created);
      } catch (err: unknown) {
        const apiMsg = err instanceof Error ? err.message : null;
        setErrorMsg(apiMsg && apiMsg.length > 0 ? apiMsg : t('create.failed'));
        setStatus('error');
        inputRef.current?.focus();
      }
    },
    [api, onCreated, submittable, trimmed, t],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (draft !== '') {
          setDraft('');
          setErrorMsg(null);
          if (status === 'error') setStatus('editing');
          return;
        }
        collapse();
      }
    },
    [collapse, draft, status],
  );

  const handleBlur = useCallback(() => {
    if (status === 'submitting') return;
    if (draft === '') collapse();
  }, [collapse, draft, status]);

  const rootClass = [
    'add-feature-row',
    `add-feature-row--${variant}`,
    status !== 'idle' && 'add-feature-row--editing',
    pulse && 'add-feature-row--pulse',
  ]
    .filter(Boolean)
    .join(' ');

  if (status === 'idle') {
    return (
      <div className={rootClass} role={variant === 'row' ? 'listitem' : undefined}>
        <button
          type="button"
          className="add-feature-row__ghost"
          onClick={() => setStatus('editing')}
          aria-label={t('toolbar.newFeature')}
        >
          <span className="add-feature-row__plus" aria-hidden="true">
            +
          </span>
          <span className="add-feature-row__ghost-label">{t('toolbar.newFeature')}</span>
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';
  const messageId = 'add-feature-row-message';

  return (
    <div className={rootClass} role={variant === 'row' ? 'listitem' : undefined}>
      <form className="add-feature-row__form" onSubmit={handleSubmit} noValidate>
        <div className="add-feature-row__field" data-submitting={submitting || undefined}>
          <span className="add-feature-row__plus" aria-hidden="true">
            +
          </span>
          <input
            ref={inputRef}
            type="text"
            className="add-feature-row__input"
            value={draft}
            autoFocus
            readOnly={submitting}
            onChange={(e) => {
              setDraft(e.target.value);
              if (errorMsg) setErrorMsg(null);
              if (status === 'error') setStatus('editing');
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={t('drawer.fields.title')}
            aria-label={t('drawer.fields.title')}
            aria-describedby={messageId}
            aria-invalid={message ? true : undefined}
            maxLength={TITLE_MAX + 50}
          />
          {submitting ? <span className="add-feature-row__spinner" aria-hidden="true" /> : null}
        </div>
        <div
          id={messageId}
          className={`add-feature-row__message${
            message ? ' add-feature-row__message--error' : ''
          }`}
          role={message ? 'alert' : 'status'}
          aria-live={message ? 'assertive' : 'polite'}
        >
          {message ?? t('create.inlineHint')}
        </div>
        <button
          type="submit"
          tabIndex={-1}
          aria-hidden="true"
          className="add-feature-row__submit-sr"
          disabled={!submittable}
        >
          {t('drawer.save')}
        </button>
      </form>
    </div>
  );
}
