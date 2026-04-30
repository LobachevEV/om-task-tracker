import { useMemo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { PhaseKind, Track } from '../../../../common/types/feature';
import type { PhaseBarGeometry } from '../../ganttStageGeometry';
import './GanttPhaseSegment.css';

export interface GanttPhaseSegmentProps {
  track: Track;
  phaseGeom: PhaseBarGeometry;
  /** True when the prep gate (or spec) is not approved — chrome dims. */
  dimmed: boolean;
  expanded: boolean;
  onToggleExpand: (track: Track, phase: PhaseKind) => void;
}

const PHASE_COLOR_BY_KIND: Readonly<Record<PhaseKind, string>> = {
  development: '--state-in-dev',
  'stand-testing': '--state-in-test',
  'ethalon-testing': '--state-mr-master',
  'live-release': '--state-completed',
};

export function GanttPhaseSegment({
  track,
  phaseGeom,
  dimmed,
  expanded,
  onToggleExpand,
}: GanttPhaseSegmentProps) {
  const { t } = useTranslation('gantt');
  const { phase, multiOwner, subStages, bar, ghost, status, isOverdue } = phaseGeom;

  const geometry = bar ?? ghost;
  const phaseLabel = t(`phases.${phase}`);
  const ariaLabel = t('phaseSegment.aria', {
    defaultValue: '{{track}} {{phase}}, {{count}} sub-stage(s).',
    track: t(`tracks.${track}`),
    phase: phaseLabel,
    count: subStages.length,
  });

  const style = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {
      '--seg-color': `var(${PHASE_COLOR_BY_KIND[phase]})`,
    };
    if (geometry) {
      style['--seg-left'] = `${geometry.leftPx}px`;
      style['--seg-width'] = `${geometry.widthPx}px`;
    } else {
      style['--seg-left'] = '0px';
      style['--seg-width'] = '0px';
    }
    return style as CSSProperties;
  }, [phase, geometry]);

  const hairlines = useMemo(() => {
    if (!multiOwner || subStages.length < 2 || bar == null) return [];
    const left = bar.leftPx;
    const width = bar.widthPx;
    if (width <= 0) return [];
    const hairs: number[] = [];
    for (let i = 1; i < subStages.length; i += 1) {
      const offset = (i / subStages.length) * width;
      hairs.push(left + offset);
    }
    return hairs;
  }, [multiOwner, subStages, bar]);

  const handleClick = () => {
    if (!multiOwner) return;
    onToggleExpand(track, phase);
  };

  const commonProps = {
    className: 'gantt-phase-segment',
    'data-testid': `phase-segment-${track}-${phase}`,
    'data-track': track,
    'data-phase': phase,
    'data-status': status,
    'data-overdue': isOverdue ? 'true' : 'false',
    'data-dimmed': dimmed ? 'true' : 'false',
    'data-multi-owner': multiOwner ? 'true' : 'false',
    'data-expanded': expanded ? 'true' : 'false',
    'data-variant': bar ? 'planned' : 'ghost',
    style,
    'aria-label': ariaLabel,
  };

  const inner = (
    <>
      <span className="gantt-phase-segment__fill" aria-hidden="true" />
      {hairlines.map((leftPx, idx) => (
        <span
          key={`${phase}-hair-${idx}`}
          className="gantt-phase-segment__hairline"
          style={{ ['--hair-left' as string]: `${leftPx}px` } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </>
  );

  if (!multiOwner) {
    return (
      <span {...commonProps} role="img">
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      {...commonProps}
      aria-expanded={expanded}
      onClick={handleClick}
    >
      {inner}
    </button>
  );
}
