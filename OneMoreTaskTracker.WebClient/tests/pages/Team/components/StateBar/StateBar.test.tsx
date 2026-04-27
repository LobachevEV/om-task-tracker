import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateBar } from '../../../../../src/pages/Team/components/StateBar/StateBar';

describe('StateBar', () => {
  it('renders empty state with muted track when all counts are zero', () => {
    const mix = {
      inDev: 0,
      mrToRelease: 0,
      inTest: 0,
      mrToMaster: 0,
      completed: 0,
    };

    render(<StateBar mix={mix} />);

    const bar = screen.getByRole('img');
    expect(bar).toHaveClass('statebar__empty');
    expect(bar).toHaveAttribute('aria-label', 'В разработке: 0, MR в релиз: 0, В тесте: 0, MR в мастер: 0, Готово: 0');
  });

  it('renders only non-zero segments', () => {
    const mix = {
      inDev: 2,
      mrToRelease: 0,
      inTest: 1,
      mrToMaster: 0,
      completed: 1,
    };

    const { container } = render(<StateBar mix={mix} />);

    const segments = container.querySelectorAll('.statebar__segment');
    expect(segments).toHaveLength(3); // inDev, inTest, completed
  });

  it('sets flex property proportional to count', () => {
    const mix = {
      inDev: 2,
      mrToRelease: 1,
      inTest: 0,
      mrToMaster: 0,
      completed: 1,
    };

    const { container } = render(<StateBar mix={mix} />);

    const segments = container.querySelectorAll('.statebar__segment');
    expect(segments[0]).toHaveStyle('flex: 2');
    expect(segments[1]).toHaveStyle('flex: 1');
    expect(segments[2]).toHaveStyle('flex: 1');
  });

  it('renders segments with correct class names', () => {
    const mix = {
      inDev: 1,
      mrToRelease: 1,
      inTest: 0,
      mrToMaster: 1,
      completed: 0,
    };

    const { container } = render(<StateBar mix={mix} />);

    expect(container.querySelector('.statebar__segment--inDev')).toBeInTheDocument();
    expect(container.querySelector('.statebar__segment--mrToRelease')).toBeInTheDocument();
    expect(container.querySelector('.statebar__segment--mrToMaster')).toBeInTheDocument();
    expect(container.querySelector('.statebar__segment--inTest')).not.toBeInTheDocument();
    expect(container.querySelector('.statebar__segment--completed')).not.toBeInTheDocument();
  });

  it('includes all states in aria-label regardless of count', () => {
    const mix = {
      inDev: 3,
      mrToRelease: 0,
      inTest: 2,
      mrToMaster: 0,
      completed: 1,
    };

    render(<StateBar mix={mix} />);

    const bar = screen.getByRole('img');
    expect(bar).toHaveAttribute(
      'aria-label',
      'В разработке: 3, MR в релиз: 0, В тесте: 2, MR в мастер: 0, Готово: 1'
    );
  });
});
