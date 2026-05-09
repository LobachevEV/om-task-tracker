import type { ReactNode } from 'react';
import './Gutter.css';

export type GutterColumn = 'code' | 'label' | 'owner' | 'dates';

export type GutterDensity = 'compact' | 'default' | 'feature' | 'nav';

export interface GutterProps {
  /** Ordered column keys; drives the inner grid-template-columns. */
  columns: GutterColumn[];
  /** Density step; one of the --row-h-* tokens. Default 'default'. */
  density?: GutterDensity;
  /** Children: per-column content. Children assign themselves to a
   *  column via grid-column: code | label | owner | dates. */
  children: ReactNode;
  /** Forwarded to the root for spec targetability + CSS hooks. */
  className?: string;
  /** Forwarded test id. The three row components pass their existing
   *  testid through here; <Gutter> never invents one. */
  'data-testid'?: string;
}

export function Gutter({
  columns,
  density = 'default',
  children,
  className,
  'data-testid': dataTestId,
}: GutterProps) {
  const cls = ['gantt-gutter', className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      data-density={density}
      data-columns={columns.join(' ')}
      data-testid={dataTestId}
    >
      {children}
    </div>
  );
}
