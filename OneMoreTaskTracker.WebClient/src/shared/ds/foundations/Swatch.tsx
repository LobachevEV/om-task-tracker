import type { ReactNode } from 'react';

interface SwatchProps {
  token: string;
  name: string;
  note?: ReactNode;
}

export function Swatch({ token, name, note }: SwatchProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 6,
          background: `var(${token})`,
          border: '1px solid color-mix(in oklch, var(--border) 80%, transparent)',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <code
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text)',
          }}
        >
          {token}
        </code>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{name}</span>
        {note ? <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{note}</span> : null}
      </div>
    </div>
  );
}

interface SwatchGridProps {
  children: ReactNode;
}

export function SwatchGrid({ children }: SwatchGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
        margin: '16px 0',
      }}
    >
      {children}
    </div>
  );
}
