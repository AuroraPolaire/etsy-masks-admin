import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
          <section className="max-w-xl rounded-panel border border-feedback-danger-border bg-surface-panel p-6 shadow-panel">
            <h1 className="text-xl font-bold text-feedback-danger-fg">
              The app hit an unexpected error.
            </h1>
            <p className="mt-3 text-sm text-ink-base">
              Refresh the page to continue. Project text saved in localStorage should still be
              available, but uploaded files need to be re-uploaded after refresh.
            </p>
            {this.state.message ? (
              <p className="mt-4 rounded-control bg-feedback-danger-bg p-3 text-sm text-feedback-danger-fg">
                {this.state.message}
              </p>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
