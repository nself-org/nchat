"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorFallback } from "./error-fallback";
import { errorReporter } from "@/lib/error/error-reporter";
import { isDevelopment } from "@/lib/environment";

import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showReportButton?: boolean;
  showStack?: boolean;
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Main error boundary component that catches React errors
 * and displays a fallback UI with recovery options.
 */
export class ErrorBoundary extends Component<
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
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console in development
    if (isDevelopment()) {
      logger.error("ErrorBoundary caught an error:", error);
      logger.error("Component stack:", errorInfo.componentStack);
    }

    // Report error to backend
    errorReporter.reportError(error, {
      componentStack: errorInfo.componentStack || undefined,
      componentName: this.props.componentName,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  handleReport = async (): Promise<void> => {
    if (this.state.error) {
      await errorReporter.reportError(this.state.error, {
        componentStack: this.state.errorInfo?.componentStack || undefined,
        componentName: this.props.componentName,
        userInitiated: true,
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReport={this.handleReport}
          showStack={this.props.showStack ?? isDevelopment()}
          showReportButton={this.props.showReportButton ?? true}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P> {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...boundaryProps} componentName={displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithBoundary;
}

export default ErrorBoundary;
