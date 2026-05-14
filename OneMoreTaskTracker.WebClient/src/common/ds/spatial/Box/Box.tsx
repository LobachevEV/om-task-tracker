import { forwardRef, type ElementType, type HTMLAttributes, type Ref } from 'react';
import type { SpaceTokenKey } from '../spaceToken';
import { cx } from '../../cx';
import './Box.css';

export interface BoxProps extends HTMLAttributes<HTMLElement> {
  pad?: SpaceTokenKey;
  padInline?: SpaceTokenKey;
  padBlock?: SpaceTokenKey;
  as?: ElementType;
}

export const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  { pad, padInline, padBlock, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  const El = Tag as 'div';
  return (
    <El
      ref={ref as Ref<HTMLDivElement>}
      className={cx('ds-box', className)}
      data-pad={pad}
      data-pad-inline={padInline}
      data-pad-block={padBlock}
      {...rest}
    >
      {children}
    </El>
  );
});
