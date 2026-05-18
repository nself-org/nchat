/**
 * Error Components - Exports
 *
 * Central export point for all error-related components.
 */

// Error Boundary
export {
  ErrorBoundary,
  DefaultErrorFallback,
  AppErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
} from "./ErrorBoundary";

export type { ErrorBoundaryProps, ErrorFallbackProps } from "./ErrorBoundary";

// Error Toasts
export {
  showErrorToast,
  showNetworkErrorToast,
  showUploadErrorToast,
  showSendErrorToast,
  showSaveErrorToast,
  showOfflineToast,
  showQueuedToast,
  showTimeoutErrorToast,
  showServerErrorToast,
  showAuthErrorToast,
  showPermissionErrorToast,
  showNotFoundErrorToast,
  showRateLimitErrorToast,
  useErrorToast,
} from "./ErrorToast";

export type { ErrorToastOptions, UseErrorToastOptions } from "./ErrorToast";
