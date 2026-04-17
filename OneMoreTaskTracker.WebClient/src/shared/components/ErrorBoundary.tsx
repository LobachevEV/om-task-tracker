import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Replace with a proper logger (e.g. Sentry) in production
    const message = error instanceof Error ? error.message : String(error);
    const componentStack = info.componentStack ?? '';
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', message, componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary">
          <p className="error-boundary__message">Что-то пошло не так.</p>
          <p className="error-boundary__detail">{this.state.message}</p>
          <button className="primary-button" type="button" onClick={this.handleReset}>
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
