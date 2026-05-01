import { useCallback, useMemo, useState } from 'react';
import type { UserRole } from '../../common/auth/auth';
import type { FeatureScope, FeatureState, PhaseKind, Track } from '../../common/types/feature';
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
    // Storage may be unavailable in SSR / private modes.
  }
}

function initialTodayIso(): string {
  return toIsoDate(new Date());
}

export type FeaturePhaseExpansion = ReadonlyMap<Track, ReadonlySet<PhaseKind>>;

export interface GanttPageState {
  zoom: ZoomLevel;
  scope: FeatureScope;
  stateFilter: FeatureState | 'all';
  revealedFeatureId: number | null;
  expandedFeatureIds: ReadonlySet<number>;
  /** Outer key: feature id; inner: track → set of expanded phases. */
  expandedPhases: ReadonlyMap<number, FeaturePhaseExpansion>;
  today: string;
  setZoom: (z: ZoomLevel) => void;
  setScope: (s: FeatureScope) => void;
  setStateFilter: (s: FeatureState | 'all') => void;
  revealTasks: (id: number | null) => void;
  toggleFeatureExpanded: (id: number) => void;
  togglePhaseExpanded: (featureId: number, track: Track, phase: PhaseKind) => void;
}

const EMPTY_FEATURE_PHASES: FeaturePhaseExpansion = new Map();

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
  const [expandedPhases, setExpandedPhases] = useState<
    ReadonlyMap<number, FeaturePhaseExpansion>
  >(() => new Map());

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

  const togglePhaseExpanded = useCallback(
    (featureId: number, track: Track, phase: PhaseKind) => {
      setExpandedPhases((prev) => {
        const nextOuter = new Map(prev);
        const featureMap = new Map(prev.get(featureId) ?? EMPTY_FEATURE_PHASES);
        const trackSet = new Set(featureMap.get(track) ?? []);
        if (trackSet.has(phase)) trackSet.delete(phase);
        else trackSet.add(phase);
        if (trackSet.size === 0) featureMap.delete(track);
        else featureMap.set(track, trackSet);
        if (featureMap.size === 0) nextOuter.delete(featureId);
        else nextOuter.set(featureId, featureMap);
        return nextOuter;
      });
    },
    [],
  );

  return useMemo(
    () => ({
      zoom,
      scope,
      stateFilter,
      revealedFeatureId,
      expandedFeatureIds,
      expandedPhases,
      today,
      setZoom,
      setScope,
      setStateFilter,
      revealTasks,
      toggleFeatureExpanded,
      togglePhaseExpanded,
    }),
    [
      zoom,
      scope,
      stateFilter,
      revealedFeatureId,
      expandedFeatureIds,
      expandedPhases,
      today,
      setZoom,
      revealTasks,
      toggleFeatureExpanded,
      togglePhaseExpanded,
    ],
  );
}

export { ZOOM_STORAGE_KEY };
