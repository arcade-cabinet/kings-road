import { Component, type ReactNode } from 'react';
import { useGameStore } from '../stores/gameStore';

interface GameErrorBoundaryProps {
  children: ReactNode;
}

interface GameErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary for the 3D GameScene.
 *
 * Catches render errors from the Canvas and its descendants, then shows a
 * themed fallback UI with "Return to Menu" and "Try Again" actions.
 * Placed OUTSIDE the Canvas so the fallback renders as normal HTML.
 */
export class GameErrorBoundary extends Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<GameErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GameErrorBoundary]', error);
    console.error(
      '[GameErrorBoundary] Component stack:',
      errorInfo.componentStack,
    );
  }

  handleReturnToMenu = () => {
    const store = useGameStore.getState();
    store.setGameActive(false);
    store.resetGame();
    this.setState({ error: null });
  };

  handleTryAgain = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid="game-error-boundary"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f0e8',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '48px 40px',
              textAlign: 'center',
            }}
          >
            {/* Decorative divider */}
            <div
              style={{
                width: '60px',
                height: '2px',
                background: '#c4a747',
                margin: '0 auto 24px',
              }}
            />

            <h1
              style={{
                fontFamily: 'Lora, serif',
                fontSize: '28px',
                fontWeight: 700,
                color: '#3d2e1f',
                margin: '0 0 12px',
                lineHeight: 1.3,
              }}
            >
              A Shadow Falls
            </h1>

            <p
              style={{
                fontFamily: 'Crimson Text, serif',
                fontSize: '18px',
                color: '#6b5b4a',
                margin: '0 0 24px',
                lineHeight: 1.6,
              }}
            >
              Something has gone awry in the realm. The world could not be
              rendered.
            </p>

            {/* Error message */}
            <div
              style={{
                background: '#ede8dc',
                border: '1px solid #d4c9b0',
                borderRadius: '4px',
                padding: '16px 20px',
                margin: '0 0 32px',
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  fontFamily: 'Crimson Text, serif',
                  fontSize: '14px',
                  color: '#8b6f47',
                  margin: '0 0 4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Cause
              </p>
              <p
                data-testid="game-error-message"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  color: '#3d2e1f',
                  margin: 0,
                  wordBreak: 'break-word',
                  userSelect: 'text',
                  cursor: 'text',
                }}
              >
                {this.state.error.message}
              </p>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                data-testid="error-return-to-menu"
                onClick={this.handleReturnToMenu}
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '12px 28px',
                  background: '#c4a747',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                Return to Menu
              </button>
              <button
                type="button"
                data-testid="error-try-again"
                onClick={this.handleTryAgain}
                style={{
                  fontFamily: 'Lora, serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  padding: '12px 28px',
                  background: 'transparent',
                  color: '#8b6f47',
                  border: '2px solid #d4c9b0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                Try Again
              </button>
            </div>

            {/* Bottom decorative divider */}
            <div
              style={{
                width: '60px',
                height: '2px',
                background: '#c4a747',
                margin: '32px auto 0',
              }}
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
