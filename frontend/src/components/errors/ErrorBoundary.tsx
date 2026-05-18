"use client";

/**
 * Error Boundary Component
 *
 * React error boundary that catches errors in component tree,
 * displays fallback UI, and integrates with Sentry.
 */

import React from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleErrorBoundaryError } from "@/lib/errors/error-handler";
import { AppError, ErrorSeverity } from "@/lib/errors/error-types";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Error Boundary Props
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  level?: "app" | "page" | "section" | "component";
}

export interface ErrorFallbackProps {
  error: AppError;
  resetError: () => void;
  level: "app" | "page" | "section" | "component";
}

// ============================================================================
// Error Boundary State
// ============================================================================

interface ErrorBoundaryState {
  error: AppError | null;
  hasError: boolean;
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
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error: null, // Will be set in componentDidCatch
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Parse and handle error
    const appError = handleErrorBoundaryError(error, errorInfo);

    // Update state with parsed error
    this.setState({ error: appError });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error boundary if resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const resetKeysChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );

      if (resetKeysChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({
      error: null,
      hasError: false,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetErrorBoundary}
          level={this.props.level || "component"}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Default Error Fallback Components
// ============================================================================

export function DefaultErrorFallback({
  error,
  resetError,
  level,
}: ErrorFallbackProps) {
  // Different layouts based on error level
  switch (level) {
    case "app":
      return <AppLevelError error={error} resetError={resetError} />;
    case "page":
      return <PageLevelError error={error} resetError={resetError} />;
    case "section":
      return <SectionLevelError error={error} resetError={resetError} />;
    case "component":
      return <ComponentLevelError error={error} resetError={resetError} />;
    default:
      return <ComponentLevelError error={error} resetError={resetError} />;
  }
}

// ============================================================================
// App Level Error (Full Screen)
// ============================================================================

function AppLevelError({
  error,
  resetError,
}: Omit<ErrorFallbackProps, "level">) {
  const isCritical = error.severity === ErrorSeverity.CRITICAL;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div
            className={cn(
              "rounded-full p-4",
              isCritical ? "bg-destructive/10" : "bg-warning/10",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-12 w-12",
                isCritical ? "text-destructive" : "text-warning",
              )}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {isCritical ? "Critical Error" : "Something Went Wrong"}
        </h1>

        {/* Description */}
        <p className="mb-6 text-muted-foreground">{error.userMessage}</p>

        {/* Error details (dev mode) */}
        {process.env.NODE_ENV === "development" && (
          <details className="mb-6 rounded-lg border border-border bg-muted p-4 text-left">
            <summary className="cursor-pointer font-medium text-foreground">
              Error Details
            </summary>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Message:</strong> {error.message}
              </p>
              <p>
                <strong>Category:</strong> {error.category}
              </p>
              <p>
                <strong>Severity:</strong> {error.severity}
              </p>
              {error.context.statusCode && (
                <p>
                  <strong>Status Code:</strong> {error.context.statusCode}
                </p>
              )}
              {error.context.errorCode && (
                <p>
                  <strong>Error Code:</strong> {error.context.errorCode}
                </p>
              )}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={resetError} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>

          {process.env.NODE_ENV === "development" && (
            <Button
              onClick={() => logger.error("Error:", error)}
              variant="ghost"
              className="gap-2"
            >
              <Bug className="h-4 w-4" />
              Log to Console
            </Button>
          )}
        </div>

        {/* Support link */}
        <p className="mt-6 text-sm text-muted-foreground">
          If this problem persists, please{" "}
          <a
            href="mailto:support@example.com"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Page Level Error
// ============================================================================

function PageLevelError({
  error,
  resetError,
}: Omit<ErrorFallbackProps, "level">) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="w-full max-w-lg text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Page Error
        </h2>

        <p className="mb-4 text-muted-foreground">{error.userMessage}</p>

        <div className="flex justify-center gap-3">
          <Button
            onClick={resetError}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="sm"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Section Level Error
// ============================================================================

function SectionLevelError({
  error,
  resetError,
}: Omit<ErrorFallbackProps, "level">) {
  return (
    <div className="border-destructive/20 bg-destructive/5 rounded-lg border p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />

        <div className="flex-1">
          <h3 className="mb-1 font-medium text-foreground">
            Error Loading Section
          </h3>
          <p className="mb-3 text-sm text-muted-foreground">
            {error.userMessage}
          </p>

          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component Level Error
// ============================================================================

function ComponentLevelError({
  error,
  resetError,
}: Omit<ErrorFallbackProps, "level">) {
  return (
    <div className="border-destructive/20 bg-destructive/5 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-foreground">{error.userMessage}</p>
        <Button
          onClick={resetError}
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

export function AppErrorBoundary({
  children,
  onError,
  onReset,
}: Omit<ErrorBoundaryProps, "level">) {
  return (
    <ErrorBoundary level="app" onError={onError} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}

export function PageErrorBoundary({
  children,
  onError,
  onReset,
}: Omit<ErrorBoundaryProps, "level">) {
  return (
    <ErrorBoundary level="page" onError={onError} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({
  children,
  onError,
  onReset,
}: Omit<ErrorBoundaryProps, "level">) {
  return (
    <ErrorBoundary level="section" onError={onError} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({
  children,
  onError,
  onReset,
}: Omit<ErrorBoundaryProps, "level">) {
  return (
    <ErrorBoundary level="component" onError={onError} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}
