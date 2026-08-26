import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlightErrorBoundaryState {
  error: Error | null;
}

export default class FlightErrorBoundary extends Component<{ children: ReactNode }, FlightErrorBoundaryState> {
  state: FlightErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): FlightErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FlightSearch] Render crash:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto mt-20 max-w-lg p-8">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h3 className="mb-2 text-lg font-semibold text-destructive">Something went wrong</h3>
            <p className="mb-4 text-sm text-destructive/80">{this.state.error.message}</p>
            <pre className="mb-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-3 text-left text-xs text-destructive/80">
              {this.state.error.stack?.slice(0, 800)}
            </pre>
            <Button variant="destructive" onClick={() => this.setState({ error: null })}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
