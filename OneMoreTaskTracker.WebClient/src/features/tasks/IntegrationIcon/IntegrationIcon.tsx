import type { IntegrationKind, IntegrationSignal } from '../integrationStatus';
import { SVG_PATHS } from './svgPaths';
import './IntegrationIcon.css';

interface IntegrationIconProps {
  kind: IntegrationKind;
  signal: IntegrationSignal;
  tooltip: string;
}

function getSignalColor(signal: IntegrationSignal): string {
  switch (signal) {
    case 'waiting':
      return 'oklch(0.75 0.14 85)'; // amber
    case 'passed':
      return 'oklch(0.65 0.10 145)'; // green
    case 'failed':
      return 'oklch(0.65 0.14 25)'; // red
    case 'none':
      return 'transparent';
  }
}

export function IntegrationIcon({ kind, signal, tooltip }: IntegrationIconProps) {
  const dotColor = getSignalColor(signal);
  const shouldRenderDot = signal !== 'none';

  return (
    <span
      className="integration-icon"
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      <svg
        viewBox="0 0 14 14"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={SVG_PATHS[kind]} />
      </svg>

      {shouldRenderDot && (
        <span
          className="integration-icon__dot"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
