"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { errorReporter } from "@/lib/error/error-reporter";
import { isDevelopment } from "@/lib/environment";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

import { logger } from "@/lib/logger";

type FallbackMode = "minimal" | "hidden" | "inline";

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  fallbackMode?: FallbackMode;
  className?: string;
  onError?: (error: Error) => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual components.
 * Provides graceful degradation without crashing the entire app.
 *
 * Fallback modes:
 * - 'minimal': Shows a small error indicator
 * - 'hidden': Completely hides the failed component
 * - 'inline': Shows inline error message
 */
export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<ComponentErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (isDevelopment()) {
      console.error(
        `ComponentErrorBoundary [${this.props.componentName || "Unknown"}] caught an error:`,
        error,
      );
    }

    errorReporter.reportError(error, {
      componentStack: errorInfo.componentStack || undefined,
      componentName: this.props.componentName || "Unknown",
      silent: true, // Don't show toast for component-level errors
    });

    this.props.onError?.(error);
  }

  renderFallback(): ReactNode {
    const {
      fallback,
      fallbackMode = "minimal",
      className,
      componentName,
    } = this.props;
    const { error } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Hidden mode - render nothing
    if (fallbackMode === "hidden") {
      return null;
    }

    // Inline mode - show detailed inline message
    if (fallbackMode === "inline") {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md p-3",
            "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
            "text-sm text-red-700 dark:text-red-400",
            className,
          )}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {componentName
              ? `${componentName} failed to load`
              : "Component failed to load"}
            {isDevelopment() && error && (
              <span className="mt-1 block text-xs opacity-75">
                {error.message}
              </span>
            )}
          </span>
        </div>
      );
    }

    // Minimal mode (default) - show small indicator
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center",
          "rounded-md bg-zinc-100 p-2 dark:bg-zinc-800",
          "text-zinc-500 dark:text-zinc-400",
          className,
        )}
        title={
          isDevelopment() && error ? error.message : "Component unavailable"
        }
      >
        <AlertCircle className="h-4 w-4" />
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withComponentErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    componentName?: string;
    fallbackMode?: FallbackMode;
    fallback?: ReactNode;
  },
): React.FC<P> {
  const displayName =
    options?.componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const ComponentWithBoundary: React.FC<P> = (props) => (
    <ComponentErrorBoundary
      componentName={displayName}
      fallbackMode={options?.fallbackMode}
      fallback={options?.fallback}
    >
      <WrappedComponent {...props} />
    </ComponentErrorBoundary>
  );

  ComponentWithBoundary.displayName = `withComponentErrorBoundary(${displayName})`;

  return ComponentWithBoundary;
}

export default ComponentErrorBoundary;
