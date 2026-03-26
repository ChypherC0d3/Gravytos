import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0f',
            color: '#ffffff',
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            {/* Error Icon */}
            <div
              style={{
                fontSize: 56,
                marginBottom: 24,
                lineHeight: 1,
                filter: 'grayscale(0.2)',
              }}
              aria-hidden="true"
            >
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f87171"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ margin: '0 auto' }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                marginBottom: 12,
                color: '#ffffff',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: 14,
                color: '#a1a1aa',
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 500,
                color: '#ffffff',
                background: '#7c3aed',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = '#6d28d9')
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = '#7c3aed')
              }
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
