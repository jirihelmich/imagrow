import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error:', error, info);
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {this.props.fallbackMessage || 'Něco se pokazilo.'}
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md">
          {this.state.error.message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark"
          >
            Zkusit znovu
          </button>
          <a
            href="#/patients/dashboard"
            onClick={this.handleReset}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Zpět na úvod
          </a>
        </div>
      </div>
    );
  }
}
