import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { moveTask } from '../../common/api/tasksApi';
import { ConfirmDialog } from '../../common/components/ConfirmDialog';
import { Spinner } from '../../common/components/Spinner';
import { STATE_CLASS, STATE_STEPS } from '../../common/constants/taskConstants';
import { useKeyboardShortcut } from '../../common/hooks/useKeyboardShortcut';
import { useTaskDetail } from '../../common/hooks/useTaskDetail';
import './TaskDetailPage.css';

export function TaskDetailPage() {
  const { t } = useTranslation('tasks');
  const { jiraId = '' } = useParams<{ jiraId: string }>();
  const navigate = useNavigate();
  const { task, loading, error, refetch } = useTaskDetail(jiraId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const isCompleted = task?.state === 'Completed';

  // Handle Escape or Alt+Backspace to navigate back
  useKeyboardShortcut([
    {
      key: 'Escape',
      handler: () => navigate('/'),
    },
    {
      key: 'Backspace',
      alt: true,
      handler: () => navigate('/'),
    },
  ]);

  const handleMoveConfirm = async () => {
    setShowConfirm(false);
    try {
      setMoving(true);
      setMoveError(null);
      await moveTask(jiraId);
      refetch();
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : t('detail.moveFailed'));
    } finally {
      setMoving(false);
    }
  };

  const currentStateIdx = task ? STATE_STEPS.indexOf(task.state) : -1;

  return (
    <div className="app-shell">
      {showConfirm && (
        <ConfirmDialog
          title={t('confirm.title')}
          message={t('confirm.message', { jiraId })}
          confirmLabel={t('confirm.submit')}
          onConfirm={handleMoveConfirm}
          onCancel={() => setShowConfirm(false)}
          isOpen={showConfirm}
        />
      )}

      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__title">
            <Link to="/" className="back-link">{t('detail.back')}</Link>
            {task && <h1 className="task-detail__heading">{task.jiraId}</h1>}
          </div>
          {task && !isCompleted && (
            <div className="app-header__user">
              <button
                className="primary-button"
                type="button"
                disabled={moving}
                onClick={() => setShowConfirm(true)}
              >
                {moving ? t('detail.processing') : t('detail.nextStage')}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {(loading || moving) && <Spinner />}
        {error && <p className="error-text">{error}</p>}
        {moveError && <p className="error-text">{moveError}</p>}
        {task && (
          <>
            <section className="card card--full">
              <h2>{t('detail.state')}</h2>
              <div className="state-stepper">
                {STATE_STEPS.map((step, stepIdx) => {
                  const status =
                    stepIdx < currentStateIdx
                      ? 'done'
                      : stepIdx === currentStateIdx
                        ? 'active'
                        : 'pending';
                  return (
                    <div
                      key={step}
                      className={`state-stepper__step state-stepper__step--${status}`}
                    >
                      <div className="state-stepper__dot" />
                      <span className={`task-list__badge task-list__badge--${STATE_CLASS[step]}`}>
                        {t(`state.${step}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {task.projects.length > 0 && (
              <section className="card">
                <h2>{t('detail.repositories')}</h2>
                <ul className="detail-list">
                  {task.projects.map((p) => (
                    <li key={p.id} className="detail-list__item">
                      {p.name}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {task.mergeRequests.length > 0 && (
              <section className="card">
                <h2>{t('detail.mergeRequests')}</h2>
                <ul className="detail-list">
                  {task.mergeRequests.map((mr) => (
                    <li key={mr.id} className="detail-list__item detail-list__item--mr">
                      <span className="detail-list__mr-title">{mr.title}</span>
                      <span className="detail-list__mr-branches">
                        {mr.sourceBranch} → {mr.targetBranch}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
