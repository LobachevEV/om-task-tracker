import { StatusDot, type StatusTone } from '../StatusDot/StatusDot';
import { cx } from '../cx';
import './IntegrationIcon.css';

export type IntegrationKind = 'gitlab' | 'github' | 'jira' | 'confluence' | 'slack';

export interface IntegrationIconProps {
  kind: IntegrationKind;
  /** Status of the integration signal this icon represents. */
  tone: StatusTone;
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

// Brand letter on a warm graphite chip — readable at 16px, replaceable with
// real SVG marks later. GitLab and GitHub both start with G; disambiguated by
// chip colour via `--${kind}`.
const glyphLetter: Record<IntegrationKind, string> = {
  gitlab: 'G',
  github: 'G',
  jira: 'J',
  confluence: 'C',
  slack: 'S',
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
      <span className={cx('ds-integration-icon__glyph', `ds-integration-icon__glyph--${kind}`)}>
        {glyphLetter[kind]}
      </span>
      <StatusDot tone={tone} size={Math.round(size * 0.4)} className="ds-integration-icon__dot" />
    </Tag>
  );
}
