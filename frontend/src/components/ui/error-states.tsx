/**
 * Error State Components
 *
 * Reusable error state components for consistent error handling across the app.
 * Provides helpful messages and recovery actions for users.
 */

import {
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  ServerCrash,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Base error state component
interface ErrorStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ErrorState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  dismissible,
  onDismiss,
}: ErrorStateProps) {
  return (
    <Card className="mx-auto max-w-md" role="alert">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon || (
              <AlertCircle
                className="h-5 w-5 text-destructive"
                aria-hidden="true"
              />
            )}
            <CardTitle>{title}</CardTitle>
          </div>
          {dismissible && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              aria-label="Dismiss error message"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      {(action || secondaryAction) && (
        <CardContent className="flex gap-2">
          {action && (
            <Button onClick={action.onClick} aria-label={action.label}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Network error (offline/connection issues)
interface NetworkErrorProps {
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function NetworkError({ onRetry, onDismiss }: NetworkErrorProps) {
  return (
    <ErrorState
      title="Connection Error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      icon={<WifiOff className="h-5 w-5 text-destructive" aria-hidden="true" />}
      action={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
            }
          : undefined
      }
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
    />
  );
}

// Server error (500, 502, 503, etc.)
interface ServerErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function ServerError({ onRetry, message }: ServerErrorProps) {
  return (
    <ErrorState
      title="Server Error"
      description={
        message ||
        "Something went wrong on our end. We've been notified and are working to fix it. Please try again in a few moments."
      }
      icon={
        <ServerCrash className="h-5 w-5 text-destructive" aria-hidden="true" />
      }
      action={
        onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

// Not found error (404)
interface NotFoundErrorProps {
  resourceType?: string;
  onGoBack?: () => void;
  onGoHome?: () => void;
}

export function NotFoundError({
  resourceType = "page",
  onGoBack,
  onGoHome,
}: NotFoundErrorProps) {
  return (
    <ErrorState
      title={`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Not Found`}
      description={`The ${resourceType} you're looking for doesn't exist or has been removed.`}
      icon={<AlertCircle className="text-warning h-5 w-5" aria-hidden="true" />}
      action={
        onGoHome
          ? {
              label: "Go to Home",
              onClick: onGoHome,
            }
          : undefined
      }
      secondaryAction={
        onGoBack
          ? {
              label: "Go Back",
              onClick: onGoBack,
            }
          : undefined
      }
    />
  );
}

// Permission denied error (403)
interface PermissionErrorProps {
  resource?: string;
  onGoBack?: () => void;
}

export function PermissionError({
  resource = "this resource",
  onGoBack,
}: PermissionErrorProps) {
  return (
    <ErrorState
      title="Access Denied"
      description={`You don't have permission to access ${resource}. Please contact your administrator if you believe this is a mistake.`}
      icon={
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
      }
      secondaryAction={
        onGoBack
          ? {
              label: "Go Back",
              onClick: onGoBack,
            }
          : undefined
      }
    />
  );
}

// Load failed error (for failed data fetches)
interface LoadFailedErrorProps {
  resourceType?: string;
  onRetry?: () => void;
}

export function LoadFailedError({
  resourceType = "data",
  onRetry,
}: LoadFailedErrorProps) {
  return (
    <ErrorState
      title="Failed to Load"
      description={`We couldn't load the ${resourceType}. This might be a temporary issue.`}
      icon={
        <RefreshCw className="h-5 w-5 text-destructive" aria-hidden="true" />
      }
      action={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

// Inline error message (for form errors, etc.)
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = "" }: InlineErrorProps) {
  return (
    <div
      className={`bg-destructive/10 flex items-center gap-2 rounded-md p-3 text-sm text-destructive ${className}`}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// Success message (for confirmation feedback)
interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({
  message,
  onDismiss,
  className = "",
}: SuccessMessageProps) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300 ${className}`}
      role="status"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
          <svg
            className="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span>{message}</span>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss success message"
          className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Warning message
interface WarningMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function WarningMessage({
  message,
  onDismiss,
  className = "",
}: WarningMessageProps) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle
          className="h-4 w-4 flex-shrink-0 text-yellow-500"
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss warning message"
          className="h-6 w-6 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
