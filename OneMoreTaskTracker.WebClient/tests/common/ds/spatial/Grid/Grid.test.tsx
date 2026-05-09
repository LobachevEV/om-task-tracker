import { createRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid } from '../../../../../src/common/ds/spatial/Grid/Grid';

describe('Grid', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Grid columns="1fr 1fr">
        <span>cell-1</span>
        <span>cell-2</span>
      </Grid>,
    );
    expect(getByText('cell-1')).toBeTruthy();
    expect(getByText('cell-2')).toBeTruthy();
  });

  it('applies ds-grid base class', () => {
    const { container } = render(<Grid columns="1fr">content</Grid>);
    expect(container.firstElementChild?.classList.contains('ds-grid')).toBe(true);
  });

  it('forwards className concatenated with base class', () => {
    const { container } = render(<Grid columns="1fr" className="my-grid">content</Grid>);
    const el = container.firstElementChild;
    expect(el?.classList.contains('ds-grid')).toBe(true);
    expect(el?.classList.contains('my-grid')).toBe(true);
  });

  it('sets --ds-grid-columns CSS custom property via inline style', () => {
    const { container } = render(<Grid columns="32px 120px 1fr 180px">content</Grid>);
    const el = container.firstElementChild as HTMLElement;
    expect(el?.style.getPropertyValue('--ds-grid-columns')).toBe('32px 120px 1fr 180px');
  });

  it('sets data-gap attribute from gap prop', () => {
    const { container } = render(<Grid columns="1fr" gap="2">content</Grid>);
    expect(container.firstElementChild?.getAttribute('data-gap')).toBe('2');
  });

  it('sets data-row-gap attribute from rowGap prop', () => {
    const { container } = render(<Grid columns="1fr" rowGap="1">content</Grid>);
    expect(container.firstElementChild?.getAttribute('data-row-gap')).toBe('1');
  });

  it('sets data-column-gap attribute from columnGap prop', () => {
    const { container } = render(<Grid columns="1fr" columnGap="3">content</Grid>);
    expect(container.firstElementChild?.getAttribute('data-column-gap')).toBe('3');
  });

  it('preserves source order of children', () => {
    const { container } = render(
      <Grid columns="100px 100px 100px">
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </Grid>,
    );
    const spans = container.querySelectorAll('span');
    expect(spans[0]?.textContent).toBe('a');
    expect(spans[1]?.textContent).toBe('b');
    expect(spans[2]?.textContent).toBe('c');
  });

  it('renders as a div by default', () => {
    const { container } = render(<Grid columns="1fr">content</Grid>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders as the element specified via as prop', () => {
    const { container } = render(<Grid columns="1fr" as="ul">content</Grid>);
    expect(container.firstElementChild?.tagName).toBe('UL');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Grid columns="1fr" ref={ref}>content</Grid>);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it('forwards arbitrary data attributes', () => {
    const { container } = render(<Grid columns="1fr" data-testid="my-grid">content</Grid>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('my-grid');
  });

  it('merges consumer style with grid columns property', () => {
    const { container } = render(
      <Grid columns="1fr" style={{ color: 'red' }}>
        content
      </Grid>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el?.style.getPropertyValue('--ds-grid-columns')).toBe('1fr');
    expect(el?.style.color).toBe('red');
  });
});
