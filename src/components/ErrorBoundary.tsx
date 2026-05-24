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
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <section className="max-w-xl rounded-lg border border-red-200 bg-white p-6 shadow-panel">
            <h1 className="text-xl font-bold text-red-800">The app hit an unexpected error.</h1>
            <p className="mt-3 text-sm text-slate-700">
              Refresh the page to continue. Project text saved in localStorage should still be
              available, but uploaded files need to be re-uploaded after refresh.
            </p>
            {this.state.message ? (
              <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-900">{this.state.message}</p>
            ) : null}
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
