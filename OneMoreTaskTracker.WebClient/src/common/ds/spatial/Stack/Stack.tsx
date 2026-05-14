import { forwardRef, type ElementType, type HTMLAttributes, type Ref } from 'react';
import type { SpaceTokenKey } from '../spaceToken';
import { cx } from '../../cx';
import './Stack.css';

export interface StackProps extends HTMLAttributes<HTMLElement> {
  gap?: SpaceTokenKey;
  pad?: SpaceTokenKey;
  align?: 'start' | 'center' | 'end' | 'stretch';
  as?: ElementType;
}

export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  { gap, pad, align, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  const El = Tag as 'div';
  return (
    <El
      ref={ref as Ref<HTMLDivElement>}
      className={cx('ds-stack', className)}
      data-gap={gap}
      data-pad={pad}
      data-align={align}
      {...rest}
    >
      {children}
    </El>
  );
});
