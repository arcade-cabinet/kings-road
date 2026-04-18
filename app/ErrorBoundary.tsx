import { Component, type ReactNode } from 'react';
import { ErrorOverlay } from './ui/ErrorOverlay';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Label for where this boundary is mounted (e.g. "GameScene", "App") */
  source: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string;
}

/**
 * React error boundary that renders ErrorOverlay.
 * Always logs to console.error so DevTools captures full context.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.source}]`, error);
    console.error(
      `[ErrorBoundary:${this.props.source}] Component stack:`,
      errorInfo.componentStack,
    );
    this.setState({
      componentStack: errorInfo.componentStack || '',
    });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorOverlay
          error={this.state.error}
          componentStack={this.state.componentStack}
          source={this.props.source}
        />
      );
    }
    return this.props.children;
  }
}
