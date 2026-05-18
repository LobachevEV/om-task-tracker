import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageBarDateEditor } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/StageBarDateEditor';
import type { StageBarDateEditorProps } from '../../../../../src/pages/Gantt/components/StageBarDateEditor/StageBarDateEditor';
import type { TrackMutationCallbacks } from '../../../../../src/pages/Gantt/components/InlineEditors/useTrackMutationCallbacks';

const LOADED_RANGE = { start: '2026-05-01', end: '2026-05-31' };
const DAY_PX = 20;

function makeMutations(overrides?: Partial<TrackMutationCallbacks>): TrackMutationCallbacks {
  return {
    saveTrackTitle: vi.fn(),
    saveTrackOwner: vi.fn(),
    saveTrackStageOwner: vi.fn(),
    saveTrackStageRange: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as TrackMutationCallbacks;
}

function makeProps(overrides?: Partial<StageBarDateEditorProps>): StageBarDateEditorProps {
  return {
    featureId: 1,
    kind: 'Frontend',
    stageKey: 'development',
    stageVersion: 0,
    plannedStart: null,
    plannedEnd: null,
    today: '2026-05-18',
    loadedRange: LOADED_RANGE,
    dayPx: DAY_PX,
    tokenVar: '--state-development',
    mutations: makeMutations(),
    ariaLabel: 'Set date range for development stage',
    dataTestId: 'stage-bar-editor-test',
    children: <div data-testid="inner-bar">bar</div>,
    ...overrides,
  };
}

describe('StageBarDateEditor — static rendering', () => {
  it('renders with role="button"', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with the given aria-label', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Set date range for development stage',
    );
  });

  it('renders children', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByTestId('inner-bar')).toBeInTheDocument();
  });

  it('has data-testid matching the prop', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByTestId('stage-bar-editor-test')).toBeInTheDocument();
  });

  it('starts in idle state (data-state="idle")', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-state', 'idle');
  });

  it('has data-has-dates="false" when plannedStart/End are null', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByRole('button')).toHaveAttribute('data-has-dates', 'false');
  });

  it('has data-has-dates="true" when both dates are set', () => {
    render(
      <StageBarDateEditor
        {...makeProps({ plannedStart: '2026-05-05', plannedEnd: '2026-05-15' })}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-has-dates', 'true');
  });

  it('exposes data-planned-start when set', () => {
    render(
      <StageBarDateEditor
        {...makeProps({ plannedStart: '2026-05-05', plannedEnd: '2026-05-15' })}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-planned-start', '2026-05-05');
  });

  it('exposes data-planned-end when set', () => {
    render(
      <StageBarDateEditor
        {...makeProps({ plannedStart: '2026-05-05', plannedEnd: '2026-05-15' })}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-planned-end', '2026-05-15');
  });

  it('does not expose data-planned-start when null', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('data-planned-start');
  });

  it('does not render the drag preview in idle state', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.queryByTestId('stage-bar-drag-preview')).toBeNull();
  });

  it('does not render the keyboard caret in idle state', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    expect(screen.queryByTestId('stage-bar-kb-caret')).toBeNull();
  });
});

describe('StageBarDateEditor — pointer capture', () => {
  it('calls setPointerCapture on pointer-down', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    const setPointerCapture = vi.fn();
    Object.defineProperty(btn, 'setPointerCapture', { value: setPointerCapture, writable: true });
    Object.defineProperty(btn, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 620, height: 24, right: 620, bottom: 24 } as DOMRect),
      writable: true,
    });

    fireEvent.pointerDown(btn, { button: 0, clientX: 100, pointerId: 1 });

    expect(setPointerCapture).toHaveBeenCalledWith(1);
  });

  it('does not call setPointerCapture for non-primary buttons', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    const setPointerCapture = vi.fn();
    Object.defineProperty(btn, 'setPointerCapture', { value: setPointerCapture, writable: true });

    fireEvent.pointerDown(btn, { button: 2, clientX: 100, pointerId: 1 });

    expect(setPointerCapture).not.toHaveBeenCalled();
  });
});

describe('StageBarDateEditor — keyboard mode activation', () => {
  it('enters keyboard selectStart phase on Enter with no existing dates', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn).toHaveAttribute('data-state', 'kb-selectStart');
  });

  it('enters keyboard rewrite phase on Enter when dates are set', () => {
    render(
      <StageBarDateEditor
        {...makeProps({ plannedStart: '2026-05-05', plannedEnd: '2026-05-15' })}
      />,
    );
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn).toHaveAttribute('data-state', 'kb-rewrite');
  });

  it('returns to idle on Escape from selectStart', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(btn).toHaveAttribute('data-state', 'kb-selectStart');
    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(btn).toHaveAttribute('data-state', 'idle');
  });

  it('renders keyboard caret after entering keyboard mode', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(screen.getByTestId('stage-bar-kb-caret')).toBeInTheDocument();
  });

  it('moves keyboard caret right on ArrowRight', () => {
    render(<StageBarDateEditor {...makeProps()} />);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    const caretBefore = screen.getByTestId('stage-bar-kb-caret');
    const leftBefore = (caretBefore as HTMLElement).style.left;
    fireEvent.keyDown(btn, { key: 'ArrowRight' });
    const leftAfter = (screen.getByTestId('stage-bar-kb-caret') as HTMLElement).style.left;
    expect(leftAfter).not.toBe(leftBefore);
  });
});
