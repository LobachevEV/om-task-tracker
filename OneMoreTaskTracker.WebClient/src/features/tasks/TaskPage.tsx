import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createTask, fetchTasks } from '../../shared/api/tasksApi';
import { AppHeader } from '../../shared/components/AppHeader';
import { Spinner } from '../../shared/components/Spinner';
import { STATE_CLASS } from '../../shared/constants/taskConstants';
import { useAuth } from '../auth/AuthContext';
import type { Task, TaskState } from '../../shared/types/task';
import { IntegrationIcon, SVG_PATHS } from './IntegrationIcon';
import { deriveIntegrations } from './integrationStatus';

type FilterState = TaskState | 'All';

export function TaskPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'Manager';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newJiraId, setNewJiraId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterState>('All');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await fetchTasks();
        if (!cancelled) setTasks(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
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
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-main">
        <section className="card">
          <h2>Новая задача</h2>
          <form className="task-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Jira Task ID</span>
              <input
                className="field__input"
                value={newJiraId}
                onChange={(e) => setNewJiraId(e.target.value)}
                placeholder="PROJ-1234"
                maxLength={50}
              />
            </label>
            <button className="primary-button" type="submit" disabled={!newJiraId.trim() || submitting}>
              Добавить
            </button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Список задач</h2>
            <select
              aria-label="Filter by status"
              className="field__input field__input--compact"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterState)}
            >
              <option value="All">Все статусы</option>
              <option value="NotStarted">Not started</option>
              <option value="InDev">In dev</option>
              <option value="MrToRelease">MR to release</option>
              <option value="InTest">In test</option>
              <option value="MrToMaster">MR to master</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          {loading ? (
            <Spinner />
          ) : filteredTasks.length === 0 ? (
            <p>Задач пока нет.</p>
          ) : (
            <ul className="task-list">
              {filteredTasks.map((task) => (
                <li key={task.id} className="task-list__item">
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
                    aria-label="Открыть задачу в Slack"
                    title="Открыть в Slack"
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
          )}
        </section>
      </main>
    </div>
  );
}
