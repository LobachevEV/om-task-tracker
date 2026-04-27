import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';
import './Kbd.css';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Visually pair multiple keys with a plus separator (e.g. ['⌘','K']). */
  keys?: string[];
  size?: 'sm' | 'md';
}

export function Kbd({ children, keys, size = 'md', className, ...rest }: KbdProps) {
  if (keys && keys.length > 0) {
    return (
      <span className={cx('ds-kbd-group', `ds-kbd-group--${size}`, className)} {...rest}>
        {keys.map((k, i) => (
          <span key={`${k}-${i}`} className="ds-kbd-group__item">
            <kbd className={cx('ds-kbd', `ds-kbd--${size}`)}>{k}</kbd>
          </span>
        ))}
      </span>
    );
  }

  return (
    <kbd className={cx('ds-kbd', `ds-kbd--${size}`, className)} {...rest}>
      {children}
    </kbd>
  );
}
