import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import './Badge.css';

/**
 * Tone encodes meaning. `role-*` tones tint for team member kinds; `state-*`
 * tones tint for pipeline stages — matching `tokens.css --state-*` variables.
 */
export type BadgeTone =
  | 'role-manager'
  | 'role-frontend'
  | 'role-backend'
  | 'role-qa'
  | 'state-not-started'
  | 'state-in-dev'
  | 'state-mr-release'
  | 'state-in-test'
  | 'state-mr-master'
  | 'state-completed'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Renders a leading dot (matches inline state conventions). */
  dot?: boolean;
  children: ReactNode;
}

/* Role tones map to the legacy `.role-badge--*` classes so visual regressions
 * are impossible for existing role pills. New state tones use our own
 * `.ds-badge--state-*` rules. */
const roleClassMap: Partial<Record<BadgeTone, string>> = {
  'role-manager': 'role-badge role-badge--manager',
  'role-frontend': 'role-badge role-badge--frontend',
  'role-backend': 'role-badge role-badge--backend',
  'role-qa': 'role-badge role-badge--qa',
};

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  const legacy = roleClassMap[tone];
  return (
    <span
      className={cx(legacy ?? `ds-badge ds-badge--${tone}`, className)}
      {...rest}
    >
      {dot ? <span className="ds-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
