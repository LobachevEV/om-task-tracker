import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Inline } from '../../../../../src/common/ds/spatial/Inline/Inline';

describe('Inline', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Inline>
        <span>label</span>
        <span>value</span>
      </Inline>,
    );
    expect(getByText('label')).toBeTruthy();
    expect(getByText('value')).toBeTruthy();
  });

  it('applies ds-inline base class', () => {
    const { container } = render(<Inline>content</Inline>);
    expect(container.firstElementChild?.classList.contains('ds-inline')).toBe(true);
  });

  it('forwards className concatenated with base class', () => {
    const { container } = render(<Inline className="row">content</Inline>);
    const el = container.firstElementChild;
    expect(el?.classList.contains('ds-inline')).toBe(true);
    expect(el?.classList.contains('row')).toBe(true);
  });

  it('sets data-gap attribute from gap prop', () => {
    const { container } = render(<Inline gap="1">content</Inline>);
    expect(container.firstElementChild?.getAttribute('data-gap')).toBe('1');
  });

  it('sets data-align attribute from align prop', () => {
    const { container } = render(<Inline align="baseline">content</Inline>);
    expect(container.firstElementChild?.getAttribute('data-align')).toBe('baseline');
  });

  it('sets data-justify attribute from justify prop', () => {
    const { container } = render(<Inline justify="between">content</Inline>);
    expect(container.firstElementChild?.getAttribute('data-justify')).toBe('between');
  });

  it('sets data-wrap to "true" when wrap prop is true', () => {
    const { container } = render(<Inline wrap>content</Inline>);
    expect(container.firstElementChild?.getAttribute('data-wrap')).toBe('true');
  });

  it('omits data-wrap when wrap prop is false or absent', () => {
    const { container } = render(<Inline>content</Inline>);
    expect(container.firstElementChild?.hasAttribute('data-wrap')).toBe(false);
  });

  it('renders as a div by default', () => {
    const { container } = render(<Inline>content</Inline>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders as the element specified via as prop', () => {
    const { container } = render(<Inline as="nav">content</Inline>);
    expect(container.firstElementChild?.tagName).toBe('NAV');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Inline ref={ref}>content</Inline>);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it('forwards arbitrary data attributes', () => {
    const { container } = render(<Inline data-testid="my-inline">content</Inline>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('my-inline');
  });
});
