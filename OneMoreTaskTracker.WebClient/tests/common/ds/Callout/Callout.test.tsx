import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from '../../../../src/common/ds/Callout/Callout';

describe('Callout', () => {
  it('renders children and defaults to role=status for neutral/info', () => {
    render(<Callout tone="info">All quiet.</Callout>);
    expect(screen.getByRole('status')).toHaveTextContent('All quiet.');
  });

  it('defaults to role=alert for warning and danger tones', () => {
    const { rerender } = render(<Callout tone="warning">Warn</Callout>);
    expect(screen.getByRole('alert')).toHaveTextContent('Warn');
    rerender(<Callout tone="danger">Oops</Callout>);
    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
  });

  it('explicit role overrides the tone default', () => {
    render(
      <Callout tone="warning" role="status">
        polite warn
      </Callout>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('polite warn');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the action slot when provided', () => {
    render(
      <Callout tone="danger" action={<button>Retry</button>}>
        Failed
      </Callout>,
    );
    expect(
      screen.getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
  });

  it('applies tone and layout classes', () => {
    const { container } = render(
      <Callout tone="warning" layout="banner">
        hi
      </Callout>,
    );
    const node = container.firstElementChild as HTMLElement;
    expect(node.className).toContain('ds-callout--warning');
    expect(node.className).toContain('ds-callout--banner');
  });

  it('forwards aria-label via the extra HTML attrs', () => {
    render(
      <Callout tone="warning" aria-label="Team">
        Team: offline
      </Callout>,
    );
    expect(screen.getByRole('alert', { name: 'Team' })).toBeInTheDocument();
  });
});
