import { useCallback, useMemo, useRef, useState } from 'react';
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
  selectedFeatureId: number | null;
  revealedFeatureId: number | null;
  today: string;
  setZoom: (z: ZoomLevel) => void;
  setScope: (s: FeatureScope) => void;
  setStateFilter: (s: FeatureState | 'all') => void;
  openFeature: (id: number) => void;
  closeFeature: () => void;
  revealTasks: (id: number | null) => void;
}

export function useGanttPageState(role: UserRole): GanttPageState {
  const [zoom, setZoomState] = useState<ZoomLevel>(() => readPersistedZoom());
  const [scope, setScope] = useState<FeatureScope>(() =>
    role === 'Manager' ? 'all' : 'mine',
  );
  const [stateFilter, setStateFilter] = useState<FeatureState | 'all'>('all');
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [revealedFeatureId, setRevealedFeatureId] = useState<number | null>(null);

  // `today` is snapshotted on mount; reload to advance.
  const todayRef = useRef<string>(initialTodayIso());
  const today = todayRef.current;

  const setZoom = useCallback((z: ZoomLevel) => {
    setZoomState(z);
    persistZoom(z);
  }, []);

  const openFeature = useCallback((id: number) => setSelectedFeatureId(id), []);
  const closeFeature = useCallback(() => setSelectedFeatureId(null), []);
  const revealTasks = useCallback((id: number | null) => setRevealedFeatureId(id), []);

  return useMemo(
    () => ({
      zoom,
      scope,
      stateFilter,
      selectedFeatureId,
      revealedFeatureId,
      today,
      setZoom,
      setScope,
      setStateFilter,
      openFeature,
      closeFeature,
      revealTasks,
    }),
    [
      zoom,
      scope,
      stateFilter,
      selectedFeatureId,
      revealedFeatureId,
      today,
      setZoom,
      openFeature,
      closeFeature,
      revealTasks,
    ],
  );
}

export { ZOOM_STORAGE_KEY };
