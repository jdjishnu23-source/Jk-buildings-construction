import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error) {
          friendly = `Database access issue (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <h1 className="text-xl font-bold text-slate-900">Something needs attention</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{friendly}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 text-sm font-semibold text-white bg-[#0B2C5D] rounded-lg hover:bg-slate-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
