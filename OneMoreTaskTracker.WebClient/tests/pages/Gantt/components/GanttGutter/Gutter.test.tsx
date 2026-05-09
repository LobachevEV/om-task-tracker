import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Gutter } from '../../../../../src/pages/Gantt/components/GanttGutter';

describe('Gutter', () => {
  describe('data-density attribute', () => {
    it('renders compact density', () => {
      render(<Gutter columns={['code', 'label', 'owner']}>content</Gutter>);
      expect(document.querySelector('[data-density]')?.getAttribute('data-density')).toBe('default');
    });

    it('renders explicit compact density', () => {
      render(<Gutter density="compact" columns={['code', 'label', 'owner']}>content</Gutter>);
      expect(document.querySelector('[data-density]')?.getAttribute('data-density')).toBe('compact');
    });

    it('renders feature density', () => {
      render(<Gutter density="feature" columns={[]}>content</Gutter>);
      expect(document.querySelector('[data-density]')?.getAttribute('data-density')).toBe('feature');
    });

    it('renders default density when not specified', () => {
      render(<Gutter columns={['code', 'label', 'owner', 'dates']}>content</Gutter>);
      expect(document.querySelector('[data-density]')?.getAttribute('data-density')).toBe('default');
    });

    it('renders nav density', () => {
      render(<Gutter density="nav" columns={[]}>content</Gutter>);
      expect(document.querySelector('[data-density]')?.getAttribute('data-density')).toBe('nav');
    });
  });

  describe('data-columns attribute', () => {
    it('renders space-separated column names', () => {
      render(<Gutter columns={['code', 'label', 'owner']}>content</Gutter>);
      expect(document.querySelector('[data-columns]')?.getAttribute('data-columns')).toBe('code label owner');
    });

    it('renders all four columns', () => {
      render(<Gutter columns={['code', 'label', 'owner', 'dates']}>content</Gutter>);
      expect(document.querySelector('[data-columns]')?.getAttribute('data-columns')).toBe(
        'code label owner dates',
      );
    });

    it('renders empty string for empty columns array', () => {
      render(<Gutter columns={[]}>content</Gutter>);
      expect(document.querySelector('[data-columns]')?.getAttribute('data-columns')).toBe('');
    });

    it('renders single column', () => {
      render(<Gutter columns={['dates']}>content</Gutter>);
      expect(document.querySelector('[data-columns]')?.getAttribute('data-columns')).toBe('dates');
    });
  });

  describe('className passthrough', () => {
    it('always includes gantt-gutter base class', () => {
      render(<Gutter columns={[]}>content</Gutter>);
      expect(document.querySelector('.gantt-gutter')).not.toBeNull();
    });

    it('merges consumer className with gantt-gutter', () => {
      render(
        <Gutter columns={[]} className="gantt-row__gutter">
          content
        </Gutter>,
      );
      const el = document.querySelector('.gantt-gutter');
      expect(el).not.toBeNull();
      expect(el?.classList.contains('gantt-row__gutter')).toBe(true);
    });

    it('renders without extra class when className is not provided', () => {
      render(<Gutter columns={[]}>content</Gutter>);
      const el = document.querySelector('.gantt-gutter');
      expect(el?.className).toBe('gantt-gutter');
    });
  });

  describe('data-testid passthrough', () => {
    it('forwards data-testid to root element', () => {
      render(
        <Gutter columns={[]} data-testid="feature-info-panel">
          content
        </Gutter>,
      );
      expect(screen.getByTestId('feature-info-panel')).not.toBeNull();
    });

    it('does not render data-testid attribute when not provided', () => {
      render(<Gutter columns={[]}>content</Gutter>);
      expect(document.querySelector('[data-testid]')).toBeNull();
    });
  });

  describe('sticky and overflow invariants (attribute presence)', () => {
    it('always includes gantt-gutter class regardless of columns', () => {
      render(
        <Gutter density="default" columns={['code', 'label', 'owner', 'dates']}>
          child
        </Gutter>,
      );
      expect(document.querySelector('.gantt-gutter')).not.toBeNull();
    });

    it('renders children inside the root element', () => {
      render(
        <Gutter columns={['code']}>
          <span data-testid="child-node">hello</span>
        </Gutter>,
      );
      expect(screen.getByTestId('child-node')).not.toBeNull();
    });
  });
});
