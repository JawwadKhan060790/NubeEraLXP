import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isFailedFetchError = (error: any): boolean => {
  const errorString = String(error?.message || error);
  return (
    errorString.includes('Failed to fetch dynamically imported module') ||
    errorString.includes('Importing a module script failed') ||
    errorString.includes('error loading dynamically imported module') ||
    errorString.includes('ChunkLoadError')
  );
};

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GlobalErrorBoundary caught an error:', error, errorInfo);

    if (isFailedFetchError(error)) {
      const hasReloaded = sessionStorage.getItem('chunk-load-reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk-load-reloaded', 'true');
        window.location.reload();
      }
    }
  }

  componentDidMount() {
    // Clear the reload flag once the application mounts successfully
    sessionStorage.removeItem('chunk-load-reloaded');
  }

  handleRefresh = () => {
    sessionStorage.removeItem('chunk-load-reloaded');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isFailedFetch = isFailedFetchError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-base)] text-[var(--text-primary)]">
          <div className="max-w-md w-full p-6 md:p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)] transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              {/* Title & Description */}
              <h1 className="text-2xl font-bold mb-3 tracking-tight">
                {isFailedFetch ? 'Application Update Available' : 'Something went wrong'}
              </h1>
              <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
                {isFailedFetch
                  ? 'A new version of the application is available. Please click below to refresh and load the latest files.'
                  : 'An unexpected error occurred while loading this page. Please try refreshing the page.'}
              </p>

              {/* Error details inside disclosure */}
              <details className="w-full text-left mb-6 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-subtle)]">
                <summary className="px-4 py-2 text-xs font-semibold cursor-pointer select-none text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors">
                  View Technical Details
                </summary>
                <div className="p-4 border-t border-[var(--border)]">
                  <p className="text-xs font-mono break-all text-red-600 dark:text-red-400 mb-2">
                    {this.state.error?.name}: {this.state.error?.message}
                  </p>
                  {this.state.error?.stack && (
                    <pre className="text-[10px] font-mono leading-normal max-h-32 overflow-y-auto whitespace-pre-wrap text-[var(--text-muted)]">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>

              {/* Actions */}
              <button
                onClick={this.handleRefresh}
                className="w-full py-3 px-4 font-medium rounded-xl text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 active:scale-[0.98]"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
