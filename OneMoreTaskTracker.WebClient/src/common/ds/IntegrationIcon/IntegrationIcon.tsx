import { StatusDot, type StatusTone } from '../StatusDot/StatusDot';
import { cx } from '../cx';
import { SVG_PATHS } from './svgPaths';
import './IntegrationIcon.css';

export type IntegrationKind = 'gitlab' | 'github' | 'jira' | 'confluence' | 'slack';

export interface IntegrationIconProps {
  kind: IntegrationKind;
  /** Status tone for the indicator dot. Pass `null` to suppress the dot. */
  tone?: StatusTone | null;
  /** Required tooltip explaining the specific blocker/state. */
  title: string;
  /** Optional link that triggers on click (e.g. jump to Slack channel). */
  onActivate?: () => void;
  className?: string;
  size?: number;
}

const labels: Record<IntegrationKind, string> = {
  gitlab: 'GitLab',
  github: 'GitHub',
  jira: 'Jira',
  confluence: 'Confluence',
  slack: 'Slack',
};

export function IntegrationIcon({
  kind,
  tone,
  title,
  onActivate,
  className,
  size = 16,
}: IntegrationIconProps) {
  const accessibleLabel = `${labels[kind]} — ${title}`;
  const Tag = onActivate ? 'button' : 'span';

  const tagProps = onActivate
    ? { type: 'button' as const, onClick: onActivate, 'aria-label': accessibleLabel }
    : { role: 'img', 'aria-label': accessibleLabel };

  return (
    <Tag
      title={title}
      className={cx(
        'ds-integration-icon',
        onActivate && 'ds-integration-icon--button',
        className,
      )}
      style={{ width: size, height: size }}
      {...tagProps}
    >
      <svg
        viewBox="0 0 14 14"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        aria-hidden="true"
        className={cx('ds-integration-icon__svg', `ds-integration-icon__svg--${kind}`)}
        width={size}
        height={size}
      >
        <path d={SVG_PATHS[kind]} />
      </svg>
      {tone != null && (
        <StatusDot tone={tone} size={Math.round(size * 0.4)} className="ds-integration-icon__dot" />
      )}
    </Tag>
  );
}
