import type {FormEvent} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {Trans, useTranslation} from 'react-i18next';
import {createTask, fetchTasks} from '../../../shared/api/tasksApi';
import {ShortcutLegend} from '../../../shared/components/ShortcutLegend';
import {Spinner} from '../../../shared/components/Spinner';
import {STATE_CLASS} from '../../../shared/constants/taskConstants';
import {useKeyboardShortcut} from '../../../shared/hooks/useKeyboardShortcut';
import {useAuth} from '../../auth/AuthContext';
import type {Task, TaskState} from '../../../shared/types/task';
import {IntegrationIcon, SVG_PATHS} from '../IntegrationIcon';
import {deriveIntegrations} from '../integrationStatus';
import './TaskPage.css';

type FilterState = TaskState | 'All';

export function TaskPage() {
  const { t } = useTranslation('tasks');
  const { user } = useAuth();
  const isManager = user?.role === 'Manager';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newJiraId, setNewJiraId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterState>('All');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showShortcutLegend, setShowShortcutLegend] = useState(false);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const filterSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await fetchTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t('failed.unknown'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredTasks = useMemo(
    () => (filter === 'All' ? tasks : tasks.filter((t) => t.state === filter)),
    [tasks, filter],
  );

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [filter]);

  // Handle all keyboard shortcuts
  useKeyboardShortcut([
    {
      key: 'ArrowDown',
      handler: () => {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredTasks.length - 1));
      },
      preventDefault: true,
    },
    {
      key: 'ArrowUp',
      handler: () => {
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      },
      preventDefault: true,
    },
    {
      key: 'Enter',
      handler: () => {
        if (selectedIndex >= 0 && selectedIndex < filteredTasks.length) {
          window.location.href = `/tasks/${encodeURIComponent(filteredTasks[selectedIndex].jiraId)}`;
        }
      },
      enabled: selectedIndex >= 0,
    },
    {
      key: '/',
      handler: () => {
        newTaskInputRef.current?.focus();
      },
    },
    {
      key: 'f',
      handler: () => {
        filterSelectRef.current?.focus();
      },
    },
    {
      key: '?',
      shift: true,
      handler: () => {
        setShowShortcutLegend(true);
      },
    },
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const jiraId = newJiraId.trim();
    if (!jiraId) return;

    try {
      setError(null);
      setSubmitting(true);
      const created = await createTask({ jiraId });
      setTasks((prev) => [created, ...prev]);
      setNewJiraId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed.createTask'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="app-main">
        <section className="card">
          <h2>{t('newTitle')}</h2>
          <form className="task-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">{t('new.jiraLabel')}</span>
              <input
                className="field__input"
                value={newJiraId}
                onChange={(e) => setNewJiraId(e.target.value)}
                placeholder="PROJ-1234"
                maxLength={50}
                ref={newTaskInputRef}
              />
            </label>
            <button className="primary-button" type="submit" disabled={!newJiraId.trim() || submitting}>
              {t('new.submit')}
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </section>

        <section className="card">
          <div className="card__header">
            <h2>{t('listTitle')}</h2>
            <select
              aria-label={t('filter.ariaLabel')}
              className="field__input field__input--compact"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterState)}
              ref={filterSelectRef}
            >
              <option value="All">{t('filter.all')}</option>
              <option value="NotStarted">{t('state.NotStarted')}</option>
              <option value="InDev">{t('state.InDev')}</option>
              <option value="MrToRelease">{t('state.MrToRelease')}</option>
              <option value="InTest">{t('state.InTest')}</option>
              <option value="MrToMaster">{t('state.MrToMaster')}</option>
              <option value="Completed">{t('state.Completed')}</option>
            </select>
          </div>
          {loading ? (
            <Spinner />
          ) : filteredTasks.length === 0 ? (
            <p>{t('empty')}</p>
          ) : (
            <>
              <ul className="task-list">
                {filteredTasks.map((task, index) => (
                  <li
                    key={task.id}
                    className={`task-list__item${index === selectedIndex ? ' task-list__item--selected' : ''}`}
                  >
                    <Link to={`/tasks/${encodeURIComponent(task.jiraId)}`} className="task-list__link">
                      <div className="task-list__main">
                        <span className="task-list__jira">{task.jiraId}</span>
                        <span className={`task-list__badge task-list__badge--${STATE_CLASS[task.state] ?? 'unknown'}`}>
                          {task.state}
                        </span>
                        <span className="task-list__integrations">
                          {deriveIntegrations(task).map((ind) => (
                            <IntegrationIcon key={ind.kind} {...ind} />
                          ))}
                        </span>
                        {isManager && task.userId !== user!.userId && (
                          <span className="task-list__owner">uid:{task.userId}</span>
                        )}
                      </div>
                    </Link>
                    <a
                      href={`https://slack.com/search?q=${encodeURIComponent(task.jiraId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-list__slack-jump"
                      aria-label={t('slack.ariaLabel')}
                      title={t('slack.title')}
                    >
                      <svg
                        viewBox="0 0 14 14"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d={SVG_PATHS.slack} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="shortcut-hint"><Trans t={t} i18nKey="shortcutHint"><kbd>?</kbd></Trans></div>
            </>

          )}
        </section>
      </main>

      <ShortcutLegend isOpen={showShortcutLegend} onClose={() => setShowShortcutLegend(false)} />
    </div>
  );
}
