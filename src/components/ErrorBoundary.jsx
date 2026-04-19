import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2>Something went wrong</h2>
          <pre className="text-sm mt-2">{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()} className="mt-2 bg-red-500 text-white px-3 py-1 rounded">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}