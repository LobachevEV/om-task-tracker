import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GanttRow } from '../../../../../src/pages/Gantt/components/GanttRow/GanttRow';

describe('GanttRow', () => {
  it('renders gutter content', () => {
    render(
      <GanttRow
        gutter={<span data-testid="gutter-content">Gutter</span>}
        lane={<span>Lane</span>}
      />,
    );

    expect(screen.getByTestId('gutter-content')).toBeInTheDocument();
    expect(screen.getByText('Gutter')).toBeInTheDocument();
  });

  it('renders lane content', () => {
    render(
      <GanttRow
        gutter={<span>Gutter</span>}
        lane={<span data-testid="lane-content">Lane</span>}
      />,
    );

    expect(screen.getByTestId('lane-content')).toBeInTheDocument();
  });

  it('applies gantt-row-frame class to root element', () => {
    const { container: rootContainer } = render(
      <GanttRow gutter={<span />} lane={<span />} />,
    );

    expect(rootContainer.firstElementChild).toHaveClass('gantt-row-frame');
  });

  it('applies gantt-row-frame__gutter class to gutter wrapper', () => {
    render(<GanttRow gutter={<span data-testid="g" />} lane={<span />} />);

    const gutter = screen.getByTestId('g').parentElement;
    expect(gutter).toHaveClass('gantt-row-frame__gutter');
  });

  it('applies gantt-row-frame__lane class to lane wrapper', () => {
    render(<GanttRow gutter={<span />} lane={<span data-testid="l" />} />);

    const lane = screen.getByTestId('l').parentElement;
    expect(lane).toHaveClass('gantt-row-frame__lane');
  });

  it('passes additional className to root element', () => {
    const { container } = render(
      <GanttRow gutter={<span />} lane={<span />} className="custom-class" />,
    );

    expect(container.firstElementChild).toHaveClass('custom-class');
    expect(container.firstElementChild).toHaveClass('gantt-row-frame');
  });

  it('passes gutterClassName to gutter wrapper', () => {
    render(<GanttRow gutter={<span data-testid="g" />} lane={<span />} gutterClassName="my-gutter" />);

    const gutter = screen.getByTestId('g').parentElement;
    expect(gutter).toHaveClass('my-gutter');
    expect(gutter).toHaveClass('gantt-row-frame__gutter');
  });

  it('passes laneClassName to lane wrapper', () => {
    render(
      <GanttRow gutter={<span />} lane={<span data-testid="l" />} laneClassName="my-lane" />,
    );

    const lane = screen.getByTestId('l').parentElement;
    expect(lane).toHaveClass('my-lane');
    expect(lane).toHaveClass('gantt-row-frame__lane');
  });

  it('applies soft border class by default', () => {
    const { container } = render(
      <GanttRow gutter={<span />} lane={<span />} />,
    );

    expect(container.firstElementChild).toHaveClass('gantt-row-frame--border-bottom');
  });

  it('applies strong border class when borderVariant=strong', () => {
    const { container } = render(
      <GanttRow gutter={<span />} lane={<span />} borderVariant="strong" />,
    );

    expect(container.firstElementChild).toHaveClass('gantt-row-frame--border-bottom-strong');
  });

  it('applies no border class when borderVariant=none', () => {
    const { container } = render(
      <GanttRow gutter={<span />} lane={<span />} borderVariant="none" />,
    );

    expect(container.firstElementChild).not.toHaveClass('gantt-row-frame--border-bottom');
    expect(container.firstElementChild).not.toHaveClass('gantt-row-frame--border-bottom-strong');
  });

  it('forwards data- attributes to root element', () => {
    render(
      <GanttRow
        gutter={<span />}
        lane={<span />}
        data-testid="my-row"
        data-feature-id="42"
      />,
    );

    const row = screen.getByTestId('my-row');
    expect(row).toHaveAttribute('data-feature-id', '42');
  });
});
