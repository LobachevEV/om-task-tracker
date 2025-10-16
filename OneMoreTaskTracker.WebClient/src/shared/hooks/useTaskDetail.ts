import { useEffect, useState } from 'react';
import { fetchTaskDetail } from '../api/tasksApi';
import type { TaskDetail } from '../types/task';

interface UseTaskDetailResult {
  task: TaskDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTaskDetail(jiraId: string): UseTaskDetailResult {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTaskDetail(jiraId);
        if (!cancelled) setTask(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jiraId, tick]);

  const refetch = () => setTick((n) => n + 1);

  return { task, loading, error, refetch };
}
