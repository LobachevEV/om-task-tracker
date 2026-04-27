import type { HTMLAttributes } from 'react';
import { cx } from '../cx';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarTone = 'default' | 'manager' | 'frontend' | 'backend' | 'qa';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Full name or label used to compute initials and the aria-label. */
  name: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  /** Override computed initials (e.g. when a preferred abbreviation differs). */
  initials?: string;
}

// The CSS primitive was written with a short `--mgr` suffix; the DS exposes
// the canonical role vocabulary (`manager`) and maps here.
const toneClass: Partial<Record<AvatarTone, string>> = {
  manager: 'avatar--mgr',
  frontend: 'avatar--frontend',
  backend: 'avatar--backend',
  qa: 'avatar--qa',
};

const sizeClass: Partial<Record<AvatarSize, string>> = {
  sm: 'avatar--sm',
  lg: 'avatar--lg',
};

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 'md',
  tone = 'default',
  initials,
  className,
  ...rest
}: AvatarProps) {
  return (
    <span
      className={cx('avatar', sizeClass[size], toneClass[tone], className)}
      role="img"
      aria-label={name}
      {...rest}
    >
      {initials ?? computeInitials(name)}
    </span>
  );
}
