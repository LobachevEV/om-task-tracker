import type { HTMLAttributes } from 'react';
import { cx } from '../cx';
import './StatusDot.css';

export type StatusTone = 'blocked' | 'passed' | 'failed' | 'neutral';

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Semantic status of the thing being indicated:
   *  - `blocked`  amber, waiting on something
   *  - `passed`   green, no action needed
   *  - `failed`   red, broken
   *  - `neutral`  muted, unknown or not applicable
   */
  tone: StatusTone;
  size?: number;
  /** Accessible label — required when the dot is used without a visible text twin. */
  label?: string;
}

export function StatusDot({ tone, size = 6, label, className, style, ...rest }: StatusDotProps) {
  const decorative = !label;
  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={label}
      aria-hidden={decorative ? true : undefined}
      className={cx('ds-status-dot', `ds-status-dot--${tone}`, className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
}
