"use client";

import { cn } from "@/lib/utils";
import { CenteredSpinner, Spinner } from "./spinner";
import { Button } from "@/components/ui/button";

export type LoadingStateType = "idle" | "loading" | "success" | "error";

interface LoadingStateProps {
  /** Current state */
  state: LoadingStateType;
  /** Loading content */
  loadingContent?: React.ReactNode;
  /** Success content */
  successContent?: React.ReactNode;
  /** Error content */
  errorContent?: React.ReactNode;
  /** Idle content */
  idleContent?: React.ReactNode;
  /** Error message */
  error?: Error | string;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Children to render (overrides state-specific content) */
  children?: React.ReactNode;
}

/**
 * Loading state manager component
 * Renders different content based on loading state
 */
export function LoadingState({
  state,
  loadingContent,
  successContent,
  errorContent,
  idleContent,
  error,
  onRetry,
  className,
  children,
}: LoadingStateProps) {
  if (children) {
    return <>{children}</>;
  }

  switch (state) {
    case "loading":
      return (
        <div className={cn("flex items-center justify-center p-8", className)}>
          {loadingContent ?? <CenteredSpinner text="Loading..." />}
        </div>
      );

    case "success":
      return successContent ? (
        <div className={className}>{successContent}</div>
      ) : null;

    case "error":
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8",
            className,
          )}
        >
          {errorContent ?? <ErrorDisplay error={error} onRetry={onRetry} />}
        </div>
      );

    case "idle":
    default:
      return idleContent ? (
        <div className={className}>{idleContent}</div>
      ) : null;
  }
}

/**
 * Default error display component
 */
function ErrorDisplay({
  error,
  onRetry,
}: {
  error?: Error | string;
  onRetry?: () => void;
}) {
  const errorMessage =
    typeof error === "string"
      ? error
      : (error?.message ?? "Something went wrong");

  return (
    <div className="flex max-w-md flex-col items-center gap-4 text-center">
      {/* Error icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Error message */}
      <div>
        <h3 className="mb-1 text-lg font-semibold">Error</h3>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className,
      )}
    >
      {/* Icon */}
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>

      {/* Description */}
      {description && (
        <p className="mb-4 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Action */}
      {action}
    </div>
  );
}

/**
 * Data wrapper with loading states
 */
export function DataWrapper<T>({
  data,
  isLoading,
  error,
  onRetry,
  loadingSkeleton,
  emptyState,
  children,
  className,
}: {
  data: T | null | undefined;
  isLoading: boolean;
  error?: Error | string;
  onRetry?: () => void;
  loadingSkeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className={className}>
        {loadingSkeleton ?? <CenteredSpinner text="Loading..." />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={className}>
        {emptyState ?? (
          <EmptyState
            title="No data"
            description="No data available to display"
          />
        )}
      </div>
    );
  }

  return <div className={className}>{children(data)}</div>;
}

/**
 * List wrapper with loading states
 */
export function ListWrapper<T>({
  items,
  isLoading,
  error,
  onRetry,
  loadingSkeleton,
  emptyState,
  renderItem,
  className,
}: {
  items: T[] | null | undefined;
  isLoading: boolean;
  error?: Error | string;
  onRetry?: () => void;
  loadingSkeleton?: React.ReactNode;
  emptyState?: React.ReactNode;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className={className}>
        {loadingSkeleton ?? <CenteredSpinner text="Loading..." />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={className}>
        {emptyState ?? (
          <EmptyState title="No items" description="No items to display" />
        )}
      </div>
    );
  }

  return <div className={className}>{items.map(renderItem)}</div>;
}

/**
 * Skeleton wrapper component
 * Shows skeleton during loading, children when loaded
 */
export function SkeletonWrapper({
  isLoading,
  skeleton,
  children,
  className,
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{isLoading ? skeleton : children}</div>;
}

/**
 * Fade transition wrapper for loading states
 */
export function FadeTransition({
  isVisible,
  children,
  className,
}: {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "transition-opacity duration-200",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Conditional render with loading state
 */
export function ConditionalRender({
  condition,
  loading,
  fallback,
  children,
}: {
  condition: boolean;
  loading?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (loading) {
    return <Spinner size="sm" />;
  }

  if (!condition) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Placeholder text skeleton
 */
export function PlaceholderText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 animate-pulse rounded bg-muted",
            i === lines - 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Placeholder image skeleton
 */
export function PlaceholderImage({
  aspectRatio = "16/9",
  className,
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full animate-pulse items-center justify-center rounded bg-muted",
        className,
      )}
      style={{ aspectRatio }}
    >
      <svg
        className="text-muted-foreground/50 h-12 w-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
}
