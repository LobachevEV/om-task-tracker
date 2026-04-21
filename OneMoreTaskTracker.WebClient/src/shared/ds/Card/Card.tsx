import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Spans the full width of a grid container (adds `.card--full`). */
  full?: boolean;
}

export function Card({ full, className, children, ...rest }: CardProps) {
  return (
    <div className={cx('card', full && 'card--full', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, actions, className, children, ...rest }: CardHeaderProps) {
  return (
    <div className={cx('card__header', className)} {...rest}>
      {title ? <h2>{title}</h2> : null}
      {children}
      {actions ? <div className="card__actions">{actions}</div> : null}
    </div>
  );
}
