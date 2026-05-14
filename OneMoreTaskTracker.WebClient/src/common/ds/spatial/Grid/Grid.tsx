import { forwardRef, type CSSProperties, type ElementType, type HTMLAttributes, type Ref } from 'react';
import type { SpaceTokenKey } from '../spaceToken';
import { cx } from '../../cx';
import './Grid.css';

export interface GridProps extends HTMLAttributes<HTMLElement> {
  columns: string;
  gap?: SpaceTokenKey;
  pad?: SpaceTokenKey;
  rowGap?: SpaceTokenKey;
  columnGap?: SpaceTokenKey;
  as?: ElementType;
}

export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { columns, gap, pad, rowGap, columnGap, as: Tag = 'div', className, style, children, ...rest },
  ref,
) {
  const El = Tag as 'div';
  const gridStyle: CSSProperties & { '--ds-grid-columns': string } = {
    '--ds-grid-columns': columns,
    ...style,
  };
  return (
    <El
      ref={ref as Ref<HTMLDivElement>}
      className={cx('ds-grid', className)}
      style={gridStyle}
      data-gap={gap}
      data-pad={pad}
      data-row-gap={rowGap}
      data-column-gap={columnGap}
      {...rest}
    >
      {children}
    </El>
  );
});
