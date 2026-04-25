import { useCallback, useMemo, useState } from 'react';
import type { UserRole } from '../../shared/auth/auth';
import type { FeatureScope, FeatureState } from '../../shared/types/feature';
import { ZOOM_DAYS, type ZoomLevel } from './ganttMath';
import { toIsoDate } from './ganttMath';

const ZOOM_STORAGE_KEY = 'mrhelper_gantt_zoom';
const DEFAULT_ZOOM: ZoomLevel = 'twoWeeks';

function isZoomLevel(value: unknown): value is ZoomLevel {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ZOOM_DAYS, value);
}

function readPersistedZoom(): ZoomLevel {
  try {
    const raw = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (!raw) return DEFAULT_ZOOM;
    // Persisted either as JSON string ("week") or plain string (week). Accept both.
    let candidate: unknown = raw;
    if (raw.startsWith('"')) {
      try {
        candidate = JSON.parse(raw);
      } catch {
        return DEFAULT_ZOOM;
      }
    }
    return isZoomLevel(candidate) ? candidate : DEFAULT_ZOOM;
  } catch {
    return DEFAULT_ZOOM;
  }
}

function persistZoom(zoom: ZoomLevel): void {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, JSON.stringify(zoom));
  } catch {
    // Storage can be unavailable (SSR, privacy mode). Silently ignore.
  }
}

function initialTodayIso(): string {
  return toIsoDate(new Date());
}

export interface GanttPageState {
  zoom: ZoomLevel;
  scope: FeatureScope;
  stateFilter: FeatureState | 'all';
  revealedFeatureId: number | null;
  /** Session-scoped: ids of features whose stage timeline is expanded inline. */
  expandedFeatureIds: ReadonlySet<number>;
  today: string;
  setZoom: (z: ZoomLevel) => void;
  setScope: (s: FeatureScope) => void;
  setStateFilter: (s: FeatureState | 'all') => void;
  revealTasks: (id: number | null) => void;
  /** Flip the expansion state for one feature id. */
  toggleFeatureExpanded: (id: number) => void;
}

export function useGanttPageState(role: UserRole): GanttPageState {
  const [zoom, setZoomState] = useState<ZoomLevel>(() => readPersistedZoom());
  const [scope, setScope] = useState<FeatureScope>(() =>
    role === 'Manager' ? 'all' : 'mine',
  );
  const [stateFilter, setStateFilter] = useState<FeatureState | 'all'>('all');
  const [revealedFeatureId, setRevealedFeatureId] = useState<number | null>(null);
  const [expandedFeatureIds, setExpandedFeatureIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );

  // `today` is snapshotted on mount; reload to advance. useState with a
  // lazy initializer gives us a stable, render-safe value (refs can't be
  // read during render under the strict React Compiler lint).
  const [today] = useState<string>(() => initialTodayIso());

  const setZoom = useCallback((z: ZoomLevel) => {
    setZoomState(z);
    persistZoom(z);
  }, []);

  const revealTasks = useCallback((id: number | null) => setRevealedFeatureId(id), []);
  const toggleFeatureExpanded = useCallback((id: number) => {
    setExpandedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      zoom,
      scope,
      stateFilter,
      revealedFeatureId,
      expandedFeatureIds,
      today,
      setZoom,
      setScope,
      setStateFilter,
      revealTasks,
      toggleFeatureExpanded,
    }),
    [
      zoom,
      scope,
      stateFilter,
      revealedFeatureId,
      expandedFeatureIds,
      today,
      setZoom,
      revealTasks,
      toggleFeatureExpanded,
    ],
  );
}

export { ZOOM_STORAGE_KEY };
