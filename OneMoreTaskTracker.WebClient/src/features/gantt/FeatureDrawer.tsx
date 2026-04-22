import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  TextField,
  type AvatarTone,
  type BadgeTone,
} from '../../shared/ds';
import * as planApi from '../../shared/api/planApi';
import type {
  AttachedTask,
  FeatureDetail,
  FeatureState,
  MiniTeamMember,
  UpdateFeaturePayload,
} from '../../shared/types/feature';
import { FeatureEditForm } from './FeatureEditForm';
import { useFeatureDrawerData } from './useFeatureDrawerData';
import './FeatureDrawer.css';

export interface FeatureDrawerProps {
  featureId: number | null;
  onClose: () => void;
  canEdit: boolean;
  /** Injection seam for tests/stories. Falls back to `planApi`. */
  api?: Pick<typeof planApi, 'attachTask' | 'detachTask' | 'updateFeature' | 'getFeature'>;
  /** Preloaded detail (stories / tests). When provided, the drawer skips the hook fetch. */
  preloadedDetail?: FeatureDetail | null;
  /** Force loading/error states for stories. */
  forceLoading?: boolean;
  forceError?: Error | null;
}

const CLOSE_ANIM_MS = 220;

const FEATURE_STATE_BADGE_TONE: Record<FeatureState, BadgeTone> = {
  CsApproving: 'state-not-started',
  Development: 'state-in-dev',
  Testing: 'state-in-test',
  EthalonTesting: 'state-mr-master',
  LiveRelease: 'state-completed',
};

const ROLE_AVATAR_TONE: Record<MiniTeamMember['role'], AvatarTone> = {
  Manager: 'manager',
  FrontendDeveloper: 'frontend',
  BackendDeveloper: 'backend',
  Qa: 'qa',
};

function firstError(err: Error): string {
  const m = err.message;
  if (!m) return 'Error';
  const match = m.match(/:\s*(.+)$/);
  return match ? match[1] : m;
}

export function FeatureDrawer({
  featureId,
  onClose,
  canEdit,
  api = planApi,
  preloadedDetail,
  forceLoading,
  forceError,
}: FeatureDrawerProps) {
  const { t } = useTranslation('gantt');
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusedRef = useRef(false);

  const usePreloaded = preloadedDetail !== undefined || forceLoading || forceError != null;
  const hookResult = useFeatureDrawerData(usePreloaded ? null : featureId);
  const hookData = usePreloaded ? null : hookResult.data;
  const hookLoading = usePreloaded ? false : hookResult.loading;
  const hookError = usePreloaded ? null : hookResult.error;
  const refetch = usePreloaded ? () => {} : hookResult.refetch;

  const data: FeatureDetail | null = usePreloaded ? preloadedDetail ?? null : hookData;
  const loading = forceLoading ?? hookLoading;
  const error = forceError ?? hookError;

  const [mounted, setMounted] = useState(featureId != null);
  const [closing, setClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [attachInput, setAttachInput] = useState('');
  const [attachPending, setAttachPending] = useState(false);
  const [detachingTask, setDetachingTask] = useState<AttachedTask | null>(null);
  const [detachTarget, setDetachTarget] = useState<number | ''>('');
  const [reassignOptions] = useState<{ id: number; title: string }[]>([]);

  useEffect(() => {
    if (featureId != null) {
      setMounted(true);
      setClosing(false);
      setEditing(false);
      setInlineError(null);
      setAttachInput('');
      setDetachingTask(null);
      firstFocusedRef.current = false;
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const h = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_ANIM_MS);
    return () => clearTimeout(h);
  }, [featureId, mounted]);

  useEffect(() => {
    if (!mounted || closing) return;
    if (firstFocusedRef.current) return;
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
      firstFocusedRef.current = true;
    }
  }, [mounted, closing, data]);

  useEffect(() => {
    if (!mounted || closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, closing, onClose]);

  const handleSubmitEdit = useCallback(
    async (patch: UpdateFeaturePayload) => {
      if (featureId == null) return;
      setSubmitting(true);
      setInlineError(null);
      try {
        await api.updateFeature(featureId, patch);
        setEditing(false);
        refetch();
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        setInlineError(firstError(e));
      } finally {
        setSubmitting(false);
      }
    },
    [featureId, api, refetch],
  );

  const handleAttach = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (featureId == null) return;
      const jiraId = attachInput.trim();
      if (!jiraId) return;
      setAttachPending(true);
      setInlineError(null);
      try {
        await api.attachTask(featureId, jiraId);
        setAttachInput('');
        refetch();
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err));
        setInlineError(firstError(e));
      } finally {
        setAttachPending(false);
      }
    },
    [featureId, api, attachInput, refetch],
  );

  const handleConfirmDetach = useCallback(async () => {
    if (featureId == null || !detachingTask || detachTarget === '') return;
    setSubmitting(true);
    setInlineError(null);
    try {
      await api.detachTask(featureId, detachingTask.jiraId);
      setDetachingTask(null);
      setDetachTarget('');
      refetch();
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));
      setInlineError(firstError(e));
    } finally {
      setSubmitting(false);
    }
  }, [featureId, api, detachingTask, detachTarget, refetch]);

  const sortedTasks = useMemo(() => {
    if (!data) return [];
    return [...data.tasks].sort((a, b) => a.jiraId.localeCompare(b.jiraId));
  }, [data]);

  if (!mounted) return null;

  return (
    <>
      <div
        className="feature-drawer__overlay"
        data-closing={closing ? 'true' : 'false'}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="feature-drawer"
        data-closing={closing ? 'true' : 'false'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="feature-drawer__header">
          <h2 className="feature-drawer__title" id={titleId}>
            {data ? data.feature.title : t('drawer.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="feature-drawer__close"
            aria-label={t('drawer.close')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="feature-drawer__body">
          {loading ? (
            <>
              <div className="feature-drawer__skeleton feature-drawer__skeleton--wide" />
              <div className="feature-drawer__skeleton feature-drawer__skeleton--short" />
              <div className="feature-drawer__skeleton feature-drawer__skeleton--wide" />
              <span className="feature-drawer__sr-only">{t('loading')}</span>
            </>
          ) : error ? (
            <Callout
              tone="danger"
              action={
                <Button variant="secondary" size="sm" onClick={refetch}>
                  {t('retry')}
                </Button>
              }
            >
              {t('failed')}
            </Callout>
          ) : data ? (
            <>
              <div className="feature-drawer__meta">
                <Badge
                  tone={FEATURE_STATE_BADGE_TONE[data.feature.state]}
                  dot
                >
                  {t(`state.${data.feature.state}`)}
                </Badge>
                <span>
                  {data.feature.plannedStart && data.feature.plannedEnd
                    ? `${data.feature.plannedStart} → ${data.feature.plannedEnd}`
                    : t('row.unscheduled')}
                </span>
                <span>
                  <Avatar
                    name={data.lead.displayName}
                    size="sm"
                    tone={ROLE_AVATAR_TONE[data.lead.role]}
                  />
                  {t('drawer.fields.lead')}: {data.lead.displayName}
                </span>
              </div>

              {editing ? (
                <FeatureEditForm
                  initial={data.feature}
                  onSubmit={handleSubmitEdit}
                  onCancel={() => {
                    setEditing(false);
                    setInlineError(null);
                  }}
                  submitting={submitting}
                  errorMessage={inlineError}
                />
              ) : (
                <>
                  <section>
                    <h3 className="feature-drawer__section-title">
                      {t('drawer.fields.description')}
                    </h3>
                    <p className="feature-drawer__description">
                      {data.feature.description ?? '—'}
                    </p>
                  </section>

                  <section>
                    <h3 className="feature-drawer__section-title">
                      {t('drawer.tasksHeading')}
                    </h3>
                    <ul className="feature-drawer__task-list">
                      {sortedTasks.map((task) => {
                        const owner = data.miniTeam.find((m) => m.userId === task.userId);
                        return (
                          <li key={task.id} className="feature-drawer__task-item">
                            <span className="feature-drawer__task-id">{task.jiraId}</span>
                            <Badge tone="neutral" dot={false}>
                              {task.state}
                            </Badge>
                            <span className="feature-drawer__task-owner">
                              {owner?.displayName ?? `#${task.userId}`}
                            </span>
                            {canEdit ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDetachingTask(task);
                                  setDetachTarget('');
                                }}
                              >
                                {t('drawer.detach')}
                              </Button>
                            ) : null}
                          </li>
                        );
                      })}
                      {sortedTasks.length === 0 ? (
                        <li
                          className="feature-drawer__task-item"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          —
                        </li>
                      ) : null}
                    </ul>

                    {canEdit ? (
                      <form className="feature-drawer__attach" onSubmit={handleAttach}>
                        <TextField
                          label={t('drawer.attachTaskLabel')}
                          value={attachInput}
                          onChange={(e) => setAttachInput(e.target.value)}
                          placeholder="PROJ-123"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          loading={attachPending}
                          disabled={attachInput.trim() === ''}
                        >
                          {t('drawer.attachTaskSubmit')}
                        </Button>
                      </form>
                    ) : null}

                    {detachingTask && canEdit ? (
                      <div className="feature-drawer__inline-picker">
                        <div>
                          {t('drawer.detachConfirm', { jiraId: detachingTask.jiraId })}
                        </div>
                        <label htmlFor="feature-drawer-detach-target" className="field__label">
                          {t('drawer.detachTarget', {
                            defaultValue: 'Move to which feature?',
                          })}
                        </label>
                        <select
                          id="feature-drawer-detach-target"
                          className="field__input"
                          value={detachTarget === '' ? '' : String(detachTarget)}
                          onChange={(e) =>
                            setDetachTarget(
                              e.target.value === '' ? '' : Number(e.target.value),
                            )
                          }
                        >
                          <option value="">—</option>
                          {reassignOptions
                            .filter((o) => o.id !== featureId)
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.title}
                              </option>
                            ))}
                        </select>
                        {inlineError ? (
                          <Callout tone="danger">{inlineError}</Callout>
                        ) : null}
                        <div className="feature-drawer__actions">
                          <Button
                            variant="secondary"
                            onClick={() => setDetachingTask(null)}
                          >
                            {t('drawer.cancel')}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              void handleConfirmDetach();
                            }}
                            disabled={detachTarget === '' || submitting}
                            loading={submitting}
                          >
                            {t('drawer.detach')}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                </>
              )}
            </>
          ) : null}
        </div>

        {data && canEdit && !editing ? (
          <footer className="feature-drawer__footer">
            <Button variant="primary" onClick={() => setEditing(true)}>
              {t('drawer.edit')}
            </Button>
          </footer>
        ) : null}
      </aside>
    </>
  );
}
