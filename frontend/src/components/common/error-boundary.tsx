"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  showDetails?: boolean;
  className?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface FallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetErrorBoundary: () => void;
  showDetails?: boolean;
}

// ============================================================================
// Default Fallback Component
// ============================================================================

export function ErrorFallback({
  error,
  errorInfo,
  resetErrorBoundary,
  showDetails = false,
}: FallbackProps) {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center"
      role="alert"
      data-testid="error-fallback"
    >
      <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="mb-2 text-xl font-semibold" data-testid="error-title">
        Something went wrong
      </h2>

      <p
        className="mb-6 max-w-md text-muted-foreground"
        data-testid="error-message"
      >
        {error?.message || "An unexpected error occurred"}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={resetErrorBoundary} data-testid="retry-button">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>

        <Button
          variant="outline"
          onClick={() => (window.location.href = "/")}
          data-testid="home-button"
        >
          <Home className="mr-2 h-4 w-4" />
          Go Home
        </Button>

        {showDetails && (
          <Button
            variant="ghost"
            onClick={() => setShowStack(!showStack)}
            data-testid="details-button"
          >
            <Bug className="mr-2 h-4 w-4" />
            {showStack ? "Hide Details" : "Show Details"}
          </Button>
        )}
      </div>

      {showDetails && showStack && (
        <div className="mt-6 w-full max-w-2xl" data-testid="error-details">
          <div className="rounded-lg bg-muted p-4 text-left">
            <h3 className="mb-2 font-mono text-sm font-semibold">
              Error Stack:
            </h3>
            <pre className="overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {error?.stack}
            </pre>
            {errorInfo?.componentStack && (
              <>
                <h3 className="mb-2 mt-4 font-mono text-sm font-semibold">
                  Component Stack:
                </h3>
                <pre className="overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                  {errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index],
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails, className } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className={cn("min-h-[200px]", className)}>
          <ErrorFallback
            error={error}
            errorInfo={errorInfo}
            resetErrorBoundary={this.reset}
            showDetails={showDetails}
          />
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Hook for Programmatic Error Throwing
// ============================================================================

export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  if (error) {
    throw error;
  }

  const showBoundary = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetBoundary = React.useCallback(() => {
    setError(null);
  }, []);

  return { showBoundary, resetBoundary };
}

// ============================================================================
// HOC for Wrapping Components
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}

// ============================================================================
// Compact Error Fallback
// ============================================================================

export function CompactErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div
      className="border-destructive/20 bg-destructive/5 flex items-center gap-3 rounded-lg border p-4"
      role="alert"
      data-testid="compact-error-fallback"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-destructive">
          Error loading content
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {error?.message || "An unexpected error occurred"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={resetErrorBoundary}
        data-testid="compact-retry-button"
      >
        Retry
      </Button>
    </div>
  );
}
