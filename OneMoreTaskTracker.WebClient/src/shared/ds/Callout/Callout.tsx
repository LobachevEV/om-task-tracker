import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import './Callout.css';

/**
 * Visual/semantic tones. Colors come from token `--warning` / `--danger` /
 * `--success` / `--text-muted`, mirroring the Badge tone palette so a
 * Callout and a Badge of the same tone read as the same state.
 */
export type CalloutTone = 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Layout presets. `banner` is full-width with inline action (roster-banner
 * style); `block` is a rounded card with a stacked action row
 * (feature-drawer error style).
 */
export type CalloutLayout = 'banner' | 'block';

export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'title'> {
  tone?: CalloutTone;
  layout?: CalloutLayout;
  /**
   * Optional action slot — typically a `<Button/>`. When present, the layout
   * places it inline (banner) or below the message (block).
   */
  action?: ReactNode;
  /**
   * `role` defaults to `alert` for danger/warning, `status` for info/neutral.
   * Override for specific a11y semantics (e.g. `role="status"` on a warning
   * that is not time-critical).
   */
  role?: HTMLAttributes<HTMLDivElement>['role'];
  children: ReactNode;
}

const defaultRoleFor: Record<CalloutTone, HTMLAttributes<HTMLDivElement>['role']> = {
  warning: 'alert',
  danger: 'alert',
  info: 'status',
  neutral: 'status',
};

export function Callout({
  tone = 'neutral',
  layout = 'block',
  action,
  role,
  className,
  children,
  ...rest
}: CalloutProps) {
  return (
    <div
      role={role ?? defaultRoleFor[tone]}
      className={cx(
        'ds-callout',
        `ds-callout--${tone}`,
        `ds-callout--${layout}`,
        className,
      )}
      {...rest}
    >
      <span className="ds-callout__message">{children}</span>
      {action ? <span className="ds-callout__action">{action}</span> : null}
    </div>
  );
}
