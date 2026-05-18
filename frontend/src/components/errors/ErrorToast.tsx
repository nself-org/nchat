"use client";

/**
 * Error Toast Component
 *
 * Specialized toast notifications for different error scenarios
 * with retry buttons and contextual actions.
 */

import React from "react";
import {
  WifiOff,
  AlertTriangle,
  XCircle,
  Clock,
  Upload,
  Server,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AppError, ErrorCategory } from "@/lib/errors/error-types";
import { cn } from "@/lib/utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Error Toast Options
// ============================================================================

export interface ErrorToastOptions {
  error: AppError;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  duration?: number;
  actionLabel?: string;
  showErrorCode?: boolean;
}

// ============================================================================
// Error Toast Functions
// ============================================================================

/**
 * Show error toast with appropriate styling and actions
 */
export function showErrorToast(options: ErrorToastOptions) {
  const {
    error,
    onRetry,
    onDismiss,
    duration = 5000,
    actionLabel = "Retry",
    showErrorCode = false,
  } = options;

  const icon = getErrorIcon(error.category);
  const title = getErrorTitle(error.category);

  toast({
    title: (
      <div className="flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </div>
    ),
    description: (
      <div className="space-y-1">
        <p>{error.userMessage}</p>
        {showErrorCode && error.context.errorCode && (
          <p className="text-xs text-muted-foreground">
            Error code: {error.context.errorCode}
          </p>
        )}
      </div>
    ),
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          try {
            await onRetry();
          } catch (retryError) {
            logger.error("Retry failed:", retryError);
          }
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <RefreshCw className="h-3 w-3" />
        {actionLabel}
      </button>
    ) : undefined,
  });

  onDismiss?.();
}

/**
 * Show network error toast
 */
export function showNetworkErrorToast(
  message?: string,
  onRetry?: () => void | Promise<void>,
) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>Connection Error</span>
      </div>
    ),
    description:
      message || "Unable to connect. Please check your internet connection.",
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    ) : undefined,
    duration: 5000,
  });
}

/**
 * Show upload error toast
 */
export function showUploadErrorToast(
  fileName: string,
  onRetry?: () => void | Promise<void>,
) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        <span>Upload Failed</span>
      </div>
    ),
    description: `Failed to upload "${fileName}". Please try again.`,
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry Upload
      </button>
    ) : undefined,
    duration: 5000,
  });
}

/**
 * Show send message error toast
 */
export function showSendErrorToast(onRetry?: () => void | Promise<void>) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4" />
        <span>Send Failed</span>
      </div>
    ),
    description: "Failed to send message. Please try again.",
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    ) : undefined,
    duration: 5000,
  });
}

/**
 * Show save error toast
 */
export function showSaveErrorToast(
  itemName?: string,
  onRetry?: () => void | Promise<void>,
) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>Save Failed</span>
      </div>
    ),
    description: itemName
      ? `Failed to save ${itemName}. Please try again.`
      : "Failed to save changes. Please try again.",
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    ) : undefined,
    duration: 5000,
  });
}

/**
 * Show offline toast (informational, not destructive)
 */
export function showOfflineToast(queued = false) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are Offline</span>
      </div>
    ),
    description: queued
      ? "This action will be completed when you reconnect."
      : "Please check your internet connection.",
    variant: "default",
    duration: 5000,
  });
}

/**
 * Show queued operation toast
 */
export function showQueuedToast(operationName: string, queueSize?: number) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Action Queued</span>
      </div>
    ),
    description: queueSize
      ? `${operationName} queued. ${queueSize} pending operations.`
      : `${operationName} will be completed when you reconnect.`,
    variant: "default",
    duration: 3000,
  });
}

/**
 * Show timeout error toast
 */
export function showTimeoutErrorToast(onRetry?: () => void | Promise<void>) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Request Timeout</span>
      </div>
    ),
    description: "The request took too long. Please try again.",
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    ) : undefined,
    duration: 5000,
  });
}

/**
 * Show server error toast
 */
export function showServerErrorToast(onRetry?: () => void | Promise<void>) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4" />
        <span>Server Error</span>
      </div>
    ),
    description: "Something went wrong on our end. Our team has been notified.",
    variant: "destructive",
    action: onRetry ? (
      <button
        onClick={async () => {
          await onRetry();
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    ) : undefined,
    duration: 7000,
  });
}

/**
 * Show auth error toast
 */
export function showAuthErrorToast(message?: string) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span>Authentication Required</span>
      </div>
    ),
    description: message || "Your session has expired. Please log in again.",
    variant: "destructive",
    action: (
      <button
        onClick={() => {
          window.location.href = "/auth/signin?reason=session_expired";
        }}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Log In
      </button>
    ),
    duration: 7000,
  });
}

/**
 * Show permission error toast
 */
export function showPermissionErrorToast(action?: string) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span>Permission Denied</span>
      </div>
    ),
    description: action
      ? `You don't have permission to ${action}.`
      : "You do not have permission to perform this action.",
    variant: "destructive",
    duration: 5000,
  });
}

/**
 * Show not found error toast
 */
export function showNotFoundErrorToast(itemName?: string) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>Not Found</span>
      </div>
    ),
    description: itemName
      ? `${itemName} not found.`
      : "The requested item was not found.",
    variant: "destructive",
    duration: 5000,
  });
}

/**
 * Show rate limit error toast
 */
export function showRateLimitErrorToast(retryAfterSeconds?: number) {
  toast({
    title: (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Too Many Requests</span>
      </div>
    ),
    description: retryAfterSeconds
      ? `Please wait ${retryAfterSeconds} seconds before trying again.`
      : "You are making too many requests. Please slow down.",
    variant: "destructive",
    duration: 7000,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorIcon(category: ErrorCategory): React.ReactNode {
  const iconClass = "h-4 w-4";

  switch (category) {
    case ErrorCategory.NETWORK:
      return <WifiOff className={iconClass} />;
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.AUTHORIZATION:
      return <Lock className={iconClass} />;
    case ErrorCategory.TIMEOUT:
    case ErrorCategory.RATE_LIMIT:
      return <Clock className={iconClass} />;
    case ErrorCategory.UPLOAD:
      return <Upload className={iconClass} />;
    case ErrorCategory.SERVER:
      return <Server className={iconClass} />;
    case ErrorCategory.OFFLINE:
      return <WifiOff className={iconClass} />;
    default:
      return <AlertTriangle className={iconClass} />;
  }
}

function getErrorTitle(category: ErrorCategory): string {
  const titles: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: "Connection Error",
    [ErrorCategory.AUTHENTICATION]: "Authentication Required",
    [ErrorCategory.AUTHORIZATION]: "Permission Denied",
    [ErrorCategory.VALIDATION]: "Invalid Input",
    [ErrorCategory.NOT_FOUND]: "Not Found",
    [ErrorCategory.RATE_LIMIT]: "Rate Limit Exceeded",
    [ErrorCategory.SERVER]: "Server Error",
    [ErrorCategory.CLIENT]: "Request Error",
    [ErrorCategory.GRAPHQL]: "Data Error",
    [ErrorCategory.UPLOAD]: "Upload Failed",
    [ErrorCategory.OFFLINE]: "Offline",
    [ErrorCategory.TIMEOUT]: "Request Timeout",
    [ErrorCategory.UNKNOWN]: "Error",
  };
  return titles[category];
}

// ============================================================================
// Error Toast Hook
// ============================================================================

export interface UseErrorToastOptions {
  showToast?: boolean;
  allowRetry?: boolean;
  onRetry?: () => void | Promise<void>;
}

export function useErrorToast() {
  const showError = React.useCallback(
    (error: AppError, options: UseErrorToastOptions = {}) => {
      const { showToast: show = true, allowRetry = false, onRetry } = options;

      if (!show) return;

      showErrorToast({
        error,
        onRetry: allowRetry ? onRetry : undefined,
      });
    },
    [],
  );

  return {
    showError,
    showNetworkError: showNetworkErrorToast,
    showUploadError: showUploadErrorToast,
    showSendError: showSendErrorToast,
    showSaveError: showSaveErrorToast,
    showOffline: showOfflineToast,
    showQueued: showQueuedToast,
    showTimeout: showTimeoutErrorToast,
    showServerError: showServerErrorToast,
    showAuthError: showAuthErrorToast,
    showPermissionError: showPermissionErrorToast,
    showNotFoundError: showNotFoundErrorToast,
    showRateLimitError: showRateLimitErrorToast,
  };
}
