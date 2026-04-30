import type {
  FeatureGate,
  FeaturePhaseTaxonomy,
  FeatureSubStage,
  FeatureSummary,
  FeatureTrackTaxonomy,
  GateKey,
  PhaseKind,
  Track,
} from '../../common/types/feature';
import { TRACKS, PHASE_KINDS } from '../../common/types/feature';
import {
  addDays,
  barGeometryPx,
  daysBetween,
  type BarGeometryPx,
  type DateWindow,
} from './ganttMath';

export type PhaseStatus = 'completed' | 'current' | 'upcoming' | 'ghost';

export interface SubStageBarGeometry {
  subStage: FeatureSubStage;
  bar: BarGeometryPx | null;
  ghost: BarGeometryPx | null;
  isOverdue: boolean;
}

export interface PhaseBarGeometry {
  phase: PhaseKind;
  multiOwner: boolean;
  cap: number;
  derivedPlannedStart: string | null;
  derivedPlannedEnd: string | null;
  bar: BarGeometryPx | null;
  ghost: BarGeometryPx | null;
  status: PhaseStatus;
  isOverdue: boolean;
  subStages: SubStageBarGeometry[];
}

export interface GateMarkerGeometry {
  gate: FeatureGate;
  /** Pixel anchor relative to loadedRange.start; null when off-range. */
  leftPx: number | null;
  /** True when gate.status === 'rejected' or 'waiting' AND downstream phases must be dimmed. */
  blocksDownstream: boolean;
}

export interface TrackBarGeometry {
  track: Track;
  prepGate: GateMarkerGeometry;
  phases: PhaseBarGeometry[];
  /** Combined plan span across all sub-stages of this track (for the collapsed stripe). */
  trackBar: BarGeometryPx | null;
  /** True when prepGate is not approved — chrome should dim downstream phases. */
  dimmed: boolean;
}

export interface FeatureBarGeometry {
  feature: FeatureSummary;
  specGate: GateMarkerGeometry;
  tracks: TrackBarGeometry[];
  /** Feature-level summary span — min/max across both tracks. Null when nothing planned. */
  summaryBar: BarGeometryPx | null;
  /** True when specGate is not approved. */
  specBlocked: boolean;
}

const GHOST_DEFAULT_SPAN_DAYS = 3;

export function findGate(feature: FeatureSummary, key: GateKey): FeatureGate | undefined {
  return feature.taxonomy.gates.find((g) => g.gateKey === key);
}

export function findTrack(
  feature: FeatureSummary,
  track: Track,
): FeatureTrackTaxonomy | undefined {
  return feature.taxonomy.tracks.find((t) => t.track === track);
}

export function findPhase(
  trackTaxonomy: FeatureTrackTaxonomy,
  phase: PhaseKind,
): FeaturePhaseTaxonomy | undefined {
  return trackTaxonomy.phases.find((p) => p.phase === phase);
}

function minDate(values: ReadonlyArray<string | null>): string | null {
  let min: string | null = null;
  for (const v of values) {
    if (v == null) continue;
    if (min == null || v < min) min = v;
  }
  return min;
}

function maxDate(values: ReadonlyArray<string | null>): string | null {
  let max: string | null = null;
  for (const v of values) {
    if (v == null) continue;
    if (max == null || v > max) max = v;
  }
  return max;
}

function derivePhaseRange(
  phase: FeaturePhaseTaxonomy,
): { start: string | null; end: string | null } {
  const start = minDate(phase.subStages.map((s) => s.plannedStart));
  const end = maxDate(phase.subStages.map((s) => s.plannedEnd));
  return { start, end };
}

function deriveTrackRange(
  track: FeatureTrackTaxonomy,
): { start: string | null; end: string | null } {
  const starts: (string | null)[] = [];
  const ends: (string | null)[] = [];
  for (const phase of track.phases) {
    for (const ss of phase.subStages) {
      starts.push(ss.plannedStart);
      ends.push(ss.plannedEnd);
    }
  }
  return { start: minDate(starts), end: maxDate(ends) };
}

function deriveFeatureRange(
  feature: FeatureSummary,
): { start: string | null; end: string | null } {
  const starts: (string | null)[] = [];
  const ends: (string | null)[] = [];
  for (const t of feature.taxonomy.tracks) {
    for (const phase of t.phases) {
      for (const ss of phase.subStages) {
        starts.push(ss.plannedStart);
        ends.push(ss.plannedEnd);
      }
    }
  }
  return { start: minDate(starts), end: maxDate(ends) };
}

function statusFor(opts: {
  derivedStart: string | null;
  derivedEnd: string | null;
  today: string;
  ghosted: boolean;
}): PhaseStatus {
  if (opts.ghosted) return 'ghost';
  const { derivedStart, derivedEnd, today } = opts;
  if (derivedEnd != null && daysBetween(derivedEnd, today) > 0) return 'completed';
  if (derivedStart != null && daysBetween(derivedStart, today) >= 0) return 'current';
  return 'upcoming';
}

function subStageGeometry(
  loadedRange: DateWindow,
  phaseAnchor: string,
  subStage: FeatureSubStage,
  today: string,
  dayPx: number,
): SubStageBarGeometry {
  const hasAny = subStage.plannedStart != null || subStage.plannedEnd != null;
  const bar = hasAny
    ? barGeometryPx(
        loadedRange,
        { start: subStage.plannedStart, end: subStage.plannedEnd },
        dayPx,
      )
    : null;
  const ghost = hasAny
    ? null
    : barGeometryPx(
        loadedRange,
        { start: phaseAnchor, end: addDays(phaseAnchor, GHOST_DEFAULT_SPAN_DAYS) },
        dayPx,
      );
  const isOverdue =
    subStage.plannedEnd != null && daysBetween(subStage.plannedEnd, today) > 0;
  return { subStage, bar, ghost, isOverdue };
}

function phaseGeometry(
  loadedRange: DateWindow,
  phase: FeaturePhaseTaxonomy,
  ghostAnchor: string,
  today: string,
  dayPx: number,
): { phaseGeom: PhaseBarGeometry; nextAnchor: string } {
  const range = derivePhaseRange(phase);
  const ghosted = range.start == null && range.end == null;
  const anchor = ghosted ? ghostAnchor : range.start ?? ghostAnchor;
  const subStages = phase.subStages.map((ss) =>
    subStageGeometry(loadedRange, anchor, ss, today, dayPx),
  );
  const bar = ghosted
    ? null
    : barGeometryPx(loadedRange, { start: range.start, end: range.end }, dayPx);
  const ghost = ghosted
    ? barGeometryPx(
        loadedRange,
        { start: ghostAnchor, end: addDays(ghostAnchor, GHOST_DEFAULT_SPAN_DAYS) },
        dayPx,
      )
    : null;
  const nextAnchor = ghosted
    ? addDays(ghostAnchor, GHOST_DEFAULT_SPAN_DAYS)
    : range.end ?? ghostAnchor;
  const isOverdue =
    range.end != null && daysBetween(range.end, today) > 0;
  const status = statusFor({
    derivedStart: range.start,
    derivedEnd: range.end,
    today,
    ghosted,
  });
  return {
    phaseGeom: {
      phase: phase.phase,
      multiOwner: phase.multiOwner,
      cap: phase.cap,
      derivedPlannedStart: range.start,
      derivedPlannedEnd: range.end,
      bar,
      ghost,
      status,
      isOverdue,
      subStages,
    },
    nextAnchor,
  };
}

function gateMarker(
  loadedRange: DateWindow,
  gate: FeatureGate | undefined,
  anchorIso: string,
  dayPx: number,
): GateMarkerGeometry {
  const empty: GateMarkerGeometry = {
    gate: gate as FeatureGate,
    leftPx: null,
    blocksDownstream: false,
  };
  if (gate == null) return empty;
  const days = daysBetween(loadedRange.start, anchorIso);
  const totalDays = daysBetween(loadedRange.start, loadedRange.end);
  const leftPx = days < 0 || days > totalDays ? null : days * dayPx;
  const blocksDownstream = gate.status !== 'approved';
  return { gate, leftPx, blocksDownstream };
}

export function computeFeatureGeometry(
  loadedRange: DateWindow,
  feature: FeatureSummary,
  today: string,
  dayPx: number,
): FeatureBarGeometry {
  const featureRange = deriveFeatureRange(feature);
  const featureLeftAnchor = featureRange.start ?? loadedRange.start;
  const summaryBar =
    featureRange.start != null || featureRange.end != null
      ? barGeometryPx(
          loadedRange,
          { start: featureRange.start, end: featureRange.end },
          dayPx,
        )
      : null;

  const specGate = gateMarker(
    loadedRange,
    findGate(feature, 'spec'),
    featureLeftAnchor,
    dayPx,
  );

  const tracks: TrackBarGeometry[] = TRACKS.map<TrackBarGeometry>((trackId) => {
    const trackTaxonomy = findTrack(feature, trackId);
    const fallbackPhases: PhaseBarGeometry[] = PHASE_KINDS.map((p) => ({
      phase: p,
      multiOwner: p === 'development' || p === 'stand-testing',
      cap: p === 'development' || p === 'stand-testing' ? 6 : 1,
      derivedPlannedStart: null,
      derivedPlannedEnd: null,
      bar: null,
      ghost: null,
      status: 'ghost',
      isOverdue: false,
      subStages: [],
    }));
    if (trackTaxonomy == null) {
      return {
        track: trackId,
        prepGate: gateMarker(loadedRange, undefined, featureLeftAnchor, dayPx),
        phases: fallbackPhases,
        trackBar: null,
        dimmed: true,
      };
    }
    const trackRange = deriveTrackRange(trackTaxonomy);
    const trackAnchor = trackRange.start ?? featureLeftAnchor;
    const prepKey: GateKey =
      trackId === 'backend' ? 'backend.prep-gate' : 'frontend.prep-gate';
    const prepGate = gateMarker(loadedRange, findGate(feature, prepKey), trackAnchor, dayPx);

    let anchor = trackAnchor;
    const phases: PhaseBarGeometry[] = [];
    for (const phaseKind of PHASE_KINDS) {
      const phase = findPhase(trackTaxonomy, phaseKind);
      if (phase == null) {
        phases.push({
          phase: phaseKind,
          multiOwner: phaseKind === 'development' || phaseKind === 'stand-testing',
          cap: phaseKind === 'development' || phaseKind === 'stand-testing' ? 6 : 1,
          derivedPlannedStart: null,
          derivedPlannedEnd: null,
          bar: null,
          ghost: null,
          status: 'ghost',
          isOverdue: false,
          subStages: [],
        });
        continue;
      }
      const computed = phaseGeometry(loadedRange, phase, anchor, today, dayPx);
      phases.push(computed.phaseGeom);
      anchor = computed.nextAnchor;
    }

    const trackBar =
      trackRange.start != null || trackRange.end != null
        ? barGeometryPx(
            loadedRange,
            { start: trackRange.start, end: trackRange.end },
            dayPx,
          )
        : null;

    return {
      track: trackId,
      prepGate,
      phases,
      trackBar,
      dimmed: prepGate.gate != null && prepGate.gate.status !== 'approved',
    };
  });

  return {
    feature,
    specGate,
    tracks,
    summaryBar,
    specBlocked: specGate.gate != null && specGate.gate.status !== 'approved',
  };
}

export function featureHasAnyPlannedDate(feature: FeatureSummary): boolean {
  if (feature.plannedStart != null || feature.plannedEnd != null) return true;
  for (const t of feature.taxonomy.tracks) {
    for (const phase of t.phases) {
      for (const ss of phase.subStages) {
        if (ss.plannedStart != null || ss.plannedEnd != null) return true;
      }
    }
  }
  return false;
}

export function plannedSubStageCount(feature: FeatureSummary): {
  planned: number;
  total: number;
} {
  let planned = 0;
  let total = 0;
  for (const t of feature.taxonomy.tracks) {
    for (const phase of t.phases) {
      for (const ss of phase.subStages) {
        total += 1;
        if (ss.plannedStart != null || ss.plannedEnd != null) planned += 1;
      }
    }
  }
  return { planned, total };
}

export function featureIsOverdue(feature: FeatureSummary, today: string): boolean {
  if (feature.state === 'LiveRelease') return false;
  const range = deriveFeatureRange(feature);
  if (range.end == null) return false;
  return daysBetween(range.end, today) > 0;
}
