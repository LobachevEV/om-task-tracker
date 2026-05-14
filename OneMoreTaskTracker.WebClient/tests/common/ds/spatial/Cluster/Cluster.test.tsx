import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Cluster } from '../../../../../src/common/ds/spatial/Cluster/Cluster';

describe('Cluster', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Cluster>
        <span>tag-a</span>
        <span>tag-b</span>
      </Cluster>,
    );
    expect(getByText('tag-a')).toBeTruthy();
    expect(getByText('tag-b')).toBeTruthy();
  });

  it('applies ds-cluster base class', () => {
    const { container } = render(<Cluster>content</Cluster>);
    expect(container.firstElementChild?.classList.contains('ds-cluster')).toBe(true);
  });

  it('forwards className concatenated with base class', () => {
    const { container } = render(<Cluster className="chip-row">content</Cluster>);
    const el = container.firstElementChild;
    expect(el?.classList.contains('ds-cluster')).toBe(true);
    expect(el?.classList.contains('chip-row')).toBe(true);
  });

  it('sets data-gap attribute from gap prop', () => {
    const { container } = render(<Cluster gap="2">content</Cluster>);
    expect(container.firstElementChild?.getAttribute('data-gap')).toBe('2');
  });

  it('sets data-align attribute from align prop', () => {
    const { container } = render(<Cluster align="start">content</Cluster>);
    expect(container.firstElementChild?.getAttribute('data-align')).toBe('start');
  });

  it('sets data-justify attribute from justify prop', () => {
    const { container } = render(<Cluster justify="space-between">content</Cluster>);
    expect(container.firstElementChild?.getAttribute('data-justify')).toBe('space-between');
  });

  it('renders as a div by default', () => {
    const { container } = render(<Cluster>content</Cluster>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('renders as the element specified via as prop', () => {
    const { container } = render(<Cluster as="ul">content</Cluster>);
    expect(container.firstElementChild?.tagName).toBe('UL');
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<Cluster ref={ref}>content</Cluster>);
    expect(ref.current).toBe(container.firstElementChild);
  });

  it('forwards arbitrary data attributes', () => {
    const { container } = render(<Cluster data-testid="my-cluster">content</Cluster>);
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('my-cluster');
  });

  it('omits data-justify when justify prop is not provided', () => {
    const { container } = render(<Cluster>content</Cluster>);
    expect(container.firstElementChild?.hasAttribute('data-justify')).toBe(false);
  });
});

describe('Cluster CSS contract', () => {
  const cssPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../../src/common/ds/spatial/Cluster/Cluster.css',
  );
  const css = readFileSync(cssPath, 'utf-8');

  it('defines CSS rule for data-gap token key 2', () => {
    expect(css).toContain("[data-gap='2']");
  });

  it('defines CSS rule for data-pad token key 3', () => {
    expect(css).toContain("[data-pad='3']");
  });

  it('defines CSS rule for data-justify value space-between', () => {
    expect(css).toContain("[data-justify='space-between']");
  });
});
