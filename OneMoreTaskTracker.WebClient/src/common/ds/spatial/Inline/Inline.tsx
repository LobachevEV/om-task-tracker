import { forwardRef, type ElementType, type HTMLAttributes, type Ref } from 'react';
import type { SpaceTokenKey } from '../spaceToken';
import { cx } from '../../cx';
import './Inline.css';

export interface InlineProps extends HTMLAttributes<HTMLElement> {
  gap?: SpaceTokenKey;
  pad?: SpaceTokenKey;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  as?: ElementType;
}

export const Inline = forwardRef<HTMLElement, InlineProps>(function Inline(
  { gap, pad, align, justify, wrap, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  const El = Tag as 'div';
  return (
    <El
      ref={ref as Ref<HTMLDivElement>}
      className={cx('ds-inline', className)}
      data-gap={gap}
      data-pad={pad}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap === true ? 'true' : undefined}
      {...rest}
    >
      {children}
    </El>
  );
});
