import { forwardRef, type ElementType, type HTMLAttributes, type Ref } from 'react';
import type { SpaceTokenKey } from '../spaceToken';
import { cx } from '../../cx';
import './Cluster.css';

export interface ClusterProps extends HTMLAttributes<HTMLElement> {
  gap?: SpaceTokenKey;
  pad?: SpaceTokenKey;
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'space-between';
  as?: ElementType;
}

export const Cluster = forwardRef<HTMLElement, ClusterProps>(function Cluster(
  { gap, pad, align, justify, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  const El = Tag as 'div';
  return (
    <El
      ref={ref as Ref<HTMLDivElement>}
      className={cx('ds-cluster', className)}
      data-gap={gap}
      data-pad={pad}
      data-align={align}
      data-justify={justify}
      {...rest}
    >
      {children}
    </El>
  );
});
