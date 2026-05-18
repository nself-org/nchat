// Error boundaries
export { ErrorBoundary, withErrorBoundary } from "./error-boundary";
export {
  ChatErrorBoundary,
  ChatErrorBoundaryWrapper,
} from "./chat-error-boundary";
export {
  ComponentErrorBoundary,
  withComponentErrorBoundary,
} from "./component-error-boundary";

// Error display components
export { ErrorFallback } from "./error-fallback";
export { ErrorPage } from "./error-page";

// Connection and offline components
export { OfflineIndicator, useOnlineStatus } from "./offline-indicator";
export { ConnectionLost, ConnectionStatusDot } from "./connection-lost";

// Not found and permission components
export {
  NotFound,
  ChannelNotFound,
  UserNotFound,
  MessageNotFound,
  FileNotFound,
} from "./not-found";
export {
  PermissionDenied,
  Unauthorized,
  Forbidden,
  AccountSuspended,
  AccountBanned,
} from "./permission-denied";
