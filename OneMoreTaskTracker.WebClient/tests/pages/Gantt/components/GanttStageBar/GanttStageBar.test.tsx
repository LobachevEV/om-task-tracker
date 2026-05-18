import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GanttStageBar } from '../../../../../src/pages/Gantt/components/GanttStageBar/GanttStageBar';
import type { BarGeometryPx } from '../../../../../src/pages/Gantt/ganttMath';

const BAR: BarGeometryPx = { leftPx: 64, widthPx: 96, clampedLeft: false, clampedRight: false };

describe('GanttStageBar — read-only', () => {
  it('renders as a div with role=img when canEdit is false', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="Development: Apr 15 – Apr 25"
      />,
    );
    const el = screen.getByRole('img', { name: 'Development: Apr 15 – Apr 25' });
    expect(el.tagName).toBe('DIV');
  });

  it('applies status class modifier', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="completed"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="done"
      />,
    );
    const el = screen.getByRole('img', { name: 'done' });
    expect(el.className).toContain('gantt-stage-bar--completed');
  });

  it('applies stripe axis class modifier', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="upcoming"
        tokenVar="--state-development"
        stripeAxis="ttb"
        ariaLabel="upcoming stage"
      />,
    );
    const el = screen.getByRole('img', { name: 'upcoming stage' });
    expect(el.className).toContain('gantt-stage-bar--stripe-ttb');
  });

  it('applies correct inline position styles', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="positioned bar"
      />,
    );
    const el = screen.getByRole('img', { name: 'positioned bar' });
    expect(el).toHaveStyle({ left: `${BAR.leftPx}px`, width: `${BAR.widthPx}px` });
  });

  it('renders a stripe child element', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="with stripe"
      />,
    );
    const el = screen.getByRole('img', { name: 'with stripe' });
    expect(el.querySelector('.gantt-stage-bar__stripe')).not.toBeNull();
  });
});

describe('GanttStageBar — children and dataTestId', () => {
  it('renders children inside the bar', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="bar with child"
      >
        <span data-testid="child-node">child</span>
      </GanttStageBar>,
    );
    expect(screen.getByTestId('child-node')).toBeInTheDocument();
  });

  it('exposes data-testid when provided', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="test-id bar"
        dataTestId="my-bar"
      />,
    );
    expect(screen.getByTestId('my-bar')).toBeInTheDocument();
  });

  it('always renders as role=img regardless of children', () => {
    render(
      <GanttStageBar
        bar={BAR}
        status="current"
        tokenVar="--state-development"
        stripeAxis="btt"
        ariaLabel="always img"
      >
        <span>inner</span>
      </GanttStageBar>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('img', { name: 'always img' })).toBeInTheDocument();
  });
});
