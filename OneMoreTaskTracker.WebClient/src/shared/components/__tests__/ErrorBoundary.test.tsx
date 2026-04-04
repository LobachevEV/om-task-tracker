import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

interface ThrowerProps {
  shouldThrow: boolean;
}

const Thrower = ({ shouldThrow }: ThrowerProps) => {
  if (shouldThrow) throw new Error('Test error from child');
  return <div>Child content</div>;
};

beforeEach(() => {
  // Suppress console.error during error boundary tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('shows error message when child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Что-то пошло не так/)).toBeInTheDocument();
    expect(screen.getByText('Test error from child')).toBeInTheDocument();
  });

  it('shows custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error fallback</div>}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText(/Что-то пошло не так/)).not.toBeInTheDocument();
  });

  it('displays reset button in error state', async () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Test error from child')).toBeInTheDocument();
    const resetButton = screen.getByRole('button', { name: /Попробовать снова/ });
    expect(resetButton).toBeInTheDocument();
  });

  it('displays error message in the detail section', () => {
    const errorMessage = 'Specific error details';

    const CustomThrower = () => {
      throw new Error(errorMessage);
    };

    render(
      <ErrorBoundary>
        <CustomThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles errors without message property', () => {
    const NonErrorThrower = () => {
      throw 'String error';
    };

    render(
      <ErrorBoundary>
        <NonErrorThrower />
      </ErrorBoundary>,
    );

    // ErrorBoundary should still show the error message
    expect(screen.getByText(/Что-то пошло не так/)).toBeInTheDocument();
  });
});
