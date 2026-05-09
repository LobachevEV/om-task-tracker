import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Box } from '../../../../../src/common/ds/spatial/Box/Box';

describe('Box', () => {
  it('renders children', () => {
    const { getByText } = render(<Box>hello world</Box>);
    expect(getByText('hello world')).toBeTruthy();
  });

  it('applies ds-box base class', () => {
    const { container } = render(<Box>content</Box>);
    expect(container.firstElementChild?.classList.contains('ds-box')).toBe(true);
  });

  it('forwards className concatenated with base class', () => {
    const { container } = render(<Box className="panel">content</Box>);
    const el = container.firstElementChild;
    expect(el?.classList.contains('ds-box')).toBe(true);
    expect(el?.classList.contains('panel')).toBe(true);
  });

  it('sets data-pad attribute from pad prop', () => {
    const { container } = render(<Box pad="4">content</Box>);
    expect(container.firstElementChild?.getAttribute('data-pad')).toBe('4');
  });

  it('sets data-pad-inline attribute from padInline prop', () => {
    const { container } = render(<Box padInline="2">content</Box>);
    expect(container.firstElementChild?.getAttribute('data-pad-inline')).toBe('2');
  });

  it('sets data-pad-block attribute from padBlock prop', () => {
    const { container } = render(<Box padBlock="1">content</Box>);
    expect(container.firstElementChild?.getAttribute('data-pad-block')).toBe('1');
  });

  it('renders as a div by default', () => {
    const { container } = render(<Box>content</Box>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders as the element specified via as prop', () => {
    const { container } = render(<Box as="article">content</Box>);
    expect(container.firstElementChild?.tagName).toBe('ARTICLE');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Box ref={ref}>content</Box>);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it('forwards arbitrary data attributes', () => {
    const { container } = render(<Box data-testid="my-box">content</Box>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('my-box');
  });

  it('forwards aria attributes', () => {
    const { container } = render(<Box aria-label="region">content</Box>);
    expect(container.firstElementChild?.getAttribute('aria-label')).toBe('region');
  });

  it('omits data-pad when pad prop is not provided', () => {
    const { container } = render(<Box>content</Box>);
    expect(container.firstElementChild?.hasAttribute('data-pad')).toBe(false);
  });

  it('renders without children when children prop is absent', () => {
    const { container } = render(<Box />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.firstElementChild?.childNodes.length).toBe(0);
  });
});
