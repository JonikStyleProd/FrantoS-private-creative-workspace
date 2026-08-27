import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FrantoS Studio Error Boundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8 text-white bg-[#090B0E]">
          <div className="max-w-md p-8 rounded-3xl bg-[#11141A] border border-rose-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-white">
              Studio Visual Pipeline Recovered
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono">
              A 3D shader or spatial visual module encountered a GPU context reset. All workspace data and offline states remain safely preserved.
            </p>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs flex items-center gap-2 mx-auto hover:bg-zinc-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Visual Studio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
