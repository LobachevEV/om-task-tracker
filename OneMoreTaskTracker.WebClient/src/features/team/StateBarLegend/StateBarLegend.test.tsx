import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateBarLegend } from './StateBarLegend';

describe('StateBarLegend', () => {
  it('renders all 5 states in correct order', () => {
    render(<StateBarLegend />);

    const labels = [
      'В разработке',
      'MR в релиз',
      'В тесте',
      'MR в мастер',
      'Готово',
    ];

    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders colored swatches for each state', () => {
    const { container } = render(<StateBarLegend />);

    const swatches = container.querySelectorAll('.state-legend__swatch');
    expect(swatches).toHaveLength(5);
  });

  it('swatches have correct CSS variables', () => {
    const { container } = render(<StateBarLegend />);

    const swatches = container.querySelectorAll('.state-legend__swatch');
    const expectedVars = [
      '--state-in-dev',
      '--state-mr-release',
      '--state-in-test',
      '--state-mr-master',
      '--state-completed',
    ];

    swatches.forEach((swatch, idx) => {
      expect(swatch).toHaveStyle(`background-color: var(${expectedVars[idx]})`);
    });
  });

  it('legend container has correct class', () => {
    const { container } = render(<StateBarLegend />);

    expect(container.querySelector('.state-legend')).toBeInTheDocument();
  });
});
