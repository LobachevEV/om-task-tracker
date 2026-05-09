import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Popover } from '../../../../src/common/ds/Popover/Popover';

function PopoverHarness({
  open,
  onClose,
  testId,
  role,
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  testId?: string;
  role?: 'dialog' | 'listbox';
  ariaLabel?: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef}>Trigger</button>
      <Popover
        anchorRef={anchorRef}
        open={open}
        onClose={onClose}
        testId={testId}
        role={role}
        ariaLabel={ariaLabel}
      >
        <span>Popover content</span>
      </Popover>
    </>
  );
}

describe('Popover', () => {
  it('renders nothing when closed', () => {
    render(<PopoverHarness open={false} onClose={vi.fn()} testId="pop" />);
    expect(screen.queryByTestId('pop')).toBeNull();
  });

  it('renders children into a portal when open', () => {
    render(<PopoverHarness open={true} onClose={vi.fn()} testId="pop" />);
    expect(screen.getByTestId('pop')).toBeInTheDocument();
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('forwards testId to the portal root', () => {
    render(<PopoverHarness open={true} onClose={vi.fn()} testId="my-pop" />);
    expect(screen.getByTestId('my-pop')).toBeInTheDocument();
  });

  it('forwards role and ariaLabel props', () => {
    render(
      <PopoverHarness
        open={true}
        onClose={vi.fn()}
        role="dialog"
        ariaLabel="Pick a date"
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Pick a date' })).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<PopoverHarness open={true} onClose={onClose} testId="pop" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on pointer-down outside anchor and popover', () => {
    const onClose = vi.fn();
    render(
      <div>
        <PopoverHarness open={true} onClose={onClose} testId="pop" />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on pointer-down inside the popover', () => {
    const onClose = vi.fn();
    render(<PopoverHarness open={true} onClose={onClose} testId="pop" />);
    fireEvent.pointerDown(screen.getByText('Popover content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose on pointer-down on the anchor', () => {
    const onClose = vi.fn();
    render(<PopoverHarness open={true} onClose={onClose} testId="pop" />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trigger' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('positions the portal off-screen until layout resolves', () => {
    render(<PopoverHarness open={true} onClose={vi.fn()} testId="pop" />);
    const portal = screen.getByTestId('pop');
    // jsdom has no layout engine — coords stay at -9999 sentinel
    expect(portal).toHaveStyle({ position: 'fixed' });
  });
});
