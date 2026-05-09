import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stack } from '../../../../../src/common/ds/spatial/Stack/Stack';

describe('Stack', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Stack>
        <span>first</span>
        <span>second</span>
      </Stack>,
    );
    expect(getByText('first')).toBeTruthy();
    expect(getByText('second')).toBeTruthy();
  });

  it('applies ds-stack base class', () => {
    const { container } = render(<Stack>content</Stack>);
    expect(container.firstElementChild?.classList.contains('ds-stack')).toBe(true);
  });

  it('forwards className concatenated with base class', () => {
    const { container } = render(<Stack className="custom">content</Stack>);
    const el = container.firstElementChild;
    expect(el?.classList.contains('ds-stack')).toBe(true);
    expect(el?.classList.contains('custom')).toBe(true);
  });

  it('sets data-gap attribute from gap prop', () => {
    const { container } = render(<Stack gap="2">content</Stack>);
    expect(container.firstElementChild?.getAttribute('data-gap')).toBe('2');
  });

  it('sets data-pad attribute from pad prop', () => {
    const { container } = render(<Stack pad="3">content</Stack>);
    expect(container.firstElementChild?.getAttribute('data-pad')).toBe('3');
  });

  it('sets data-align attribute from align prop', () => {
    const { container } = render(<Stack align="center">content</Stack>);
    expect(container.firstElementChild?.getAttribute('data-align')).toBe('center');
  });

  it('renders as a div by default', () => {
    const { container } = render(<Stack>content</Stack>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders as the element specified via as prop', () => {
    const { container } = render(<Stack as="section">content</Stack>);
    expect(container.firstElementChild?.tagName).toBe('SECTION');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Stack ref={ref}>content</Stack>);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it('forwards arbitrary data attributes', () => {
    const { container } = render(<Stack data-testid="my-stack">content</Stack>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('my-stack');
  });

  it('forwards aria attributes', () => {
    const { container } = render(<Stack aria-label="nav">content</Stack>);
    expect(container.firstElementChild?.getAttribute('aria-label')).toBe('nav');
  });

  it('omits data-gap when gap prop is not provided', () => {
    const { container } = render(<Stack>content</Stack>);
    expect(container.firstElementChild?.hasAttribute('data-gap')).toBe(false);
  });
});
