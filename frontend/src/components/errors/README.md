# Error Components

React components for error handling and display.

## Quick Start

```tsx
import { AppErrorBoundary } from "@/components/errors";
import { useErrorToast } from "@/components/errors";

// Wrap app with error boundary
function App() {
  return (
    <AppErrorBoundary>
      <YourApp />
    </AppErrorBoundary>
  );
}

// Use error toasts
function Component() {
  const errorToast = useErrorToast();

  const handleError = (error) => {
    errorToast.showError(error, { allowRetry: true, onRetry: retry });
  };
}
```

## Files

### ErrorBoundary.tsx

React error boundary components:

- `ErrorBoundary` - Generic error boundary
- `AppErrorBoundary` - App-level (full screen)
- `PageErrorBoundary` - Page-level
- `SectionErrorBoundary` - Section-level
- `ComponentErrorBoundary` - Component-level

Features:

- Automatic error catching
- Sentry integration
- Retry functionality
- Reset keys support
- Custom fallback UI

### ErrorToast.tsx

Toast notification functions:

- `showErrorToast()` - Generic error toast
- `showNetworkErrorToast()` - Network errors
- `showUploadErrorToast()` - Upload failures
- `showSendErrorToast()` - Send failures
- `showSaveErrorToast()` - Save failures
- `showOfflineToast()` - Offline status
- `showQueuedToast()` - Queued operations
- `showTimeoutErrorToast()` - Timeouts
- `showServerErrorToast()` - Server errors
- `showAuthErrorToast()` - Auth errors
- `showPermissionErrorToast()` - Permission denied
- `showNotFoundErrorToast()` - Not found
- `showRateLimitErrorToast()` - Rate limits
- `useErrorToast()` - Hook for all toasts

### index.ts

Exports all error components.

## Usage Examples

### App Level Error Boundary

```tsx
import { AppErrorBoundary } from "@/components/errors";

function App() {
  return (
    <AppErrorBoundary>
      <YourApp />
    </AppErrorBoundary>
  );
}
```

Shows full-screen error UI with:

- Large error icon
- Error title and message
- Try Again button
- Go Home button
- Error details (dev mode)
- Support contact

### Page Level Error Boundary

```tsx
import { PageErrorBoundary } from "@/components/errors";

function Page() {
  return (
    <PageErrorBoundary>
      <YourPage />
    </PageErrorBoundary>
  );
}
```

Shows centered error UI with:

- Error icon
- Error message
- Retry and Go Back buttons

### Section Level Error Boundary

```tsx
import { SectionErrorBoundary } from "@/components/errors";

function Section() {
  return (
    <SectionErrorBoundary>
      <YourSection />
    </SectionErrorBoundary>
  );
}
```

Shows inline error UI with:

- Error icon and message
- Retry button

### Component Level Error Boundary

```tsx
import { ComponentErrorBoundary } from "@/components/errors";

function Component() {
  return (
    <ComponentErrorBoundary>
      <YourComponent />
    </ComponentErrorBoundary>
  );
}
```

Shows compact error UI with:

- Error icon and message
- Small retry button

### Custom Fallback

```tsx
import { ErrorBoundary, type ErrorFallbackProps } from "@/components/errors";

function CustomFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div>
      <h1>Oops!</h1>
      <p>{error.userMessage}</p>
      <button onClick={resetError}>Try Again</button>
    </div>
  );
}

function Component() {
  return (
    <ErrorBoundary fallback={CustomFallback} level="component">
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Error Toast Hook

```tsx
import { useErrorToast } from "@/components/errors";
import { parseError } from "@/lib/errors";

function Component() {
  const errorToast = useErrorToast();

  const handleAction = async () => {
    try {
      await someOperation();
    } catch (error) {
      errorToast.showError(parseError(error), {
        allowRetry: true,
        onRetry: handleAction,
      });
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Network Error Toast

```tsx
import { showNetworkErrorToast } from "@/components/errors";

try {
  await fetch("/api/data");
} catch (error) {
  showNetworkErrorToast("Connection lost", async () => {
    await retryFetch();
  });
}
```

### Upload Error Toast

```tsx
import { showUploadErrorToast } from "@/components/errors";

try {
  await uploadFile(file);
} catch (error) {
  showUploadErrorToast(file.name, async () => {
    await uploadFile(file);
  });
}
```

### Send Error Toast

```tsx
import { showSendErrorToast } from "@/components/errors";

try {
  await sendMessage(message);
} catch (error) {
  showSendErrorToast(async () => {
    await sendMessage(message);
  });
}
```

### Save Error Toast

```tsx
import { showSaveErrorToast } from "@/components/errors";

try {
  await saveSettings(settings);
} catch (error) {
  showSaveErrorToast("settings", async () => {
    await saveSettings(settings);
  });
}
```

### Offline Toast

```tsx
import { showOfflineToast } from "@/components/errors";

if (!navigator.onLine) {
  showOfflineToast(true); // queued = true
}
```

### Queued Toast

```tsx
import { showQueuedToast } from "@/components/errors";
import { offlineQueue } from "@/lib/errors";

if (!navigator.onLine) {
  offlineQueue.enqueue(() => operation(), "Send message");
  showQueuedToast("Message", offlineQueue.size());
}
```

### Timeout Error Toast

```tsx
import { showTimeoutErrorToast } from "@/components/errors";

try {
  await fetchWithTimeout("/api/data", 30000);
} catch (error) {
  if (error instanceof TimeoutError) {
    showTimeoutErrorToast(async () => {
      await fetchWithTimeout("/api/data", 30000);
    });
  }
}
```

### Server Error Toast

```tsx
import { showServerErrorToast } from "@/components/errors";

try {
  await fetch("/api/data");
} catch (error) {
  if (error.statusCode >= 500) {
    showServerErrorToast(async () => {
      await retryFetch();
    });
  }
}
```

### Auth Error Toast

```tsx
import { showAuthErrorToast } from "@/components/errors";

try {
  await authenticatedRequest();
} catch (error) {
  if (error.statusCode === 401) {
    showAuthErrorToast("Your session has expired");
  }
}
```

### Permission Error Toast

```tsx
import { showPermissionErrorToast } from "@/components/errors";

try {
  await deleteMessage(messageId);
} catch (error) {
  if (error.statusCode === 403) {
    showPermissionErrorToast("delete messages");
  }
}
```

### Not Found Error Toast

```tsx
import { showNotFoundErrorToast } from "@/components/errors";

try {
  await fetchChannel(channelId);
} catch (error) {
  if (error.statusCode === 404) {
    showNotFoundErrorToast("Channel");
  }
}
```

### Rate Limit Error Toast

```tsx
import { showRateLimitErrorToast } from "@/components/errors";

try {
  await sendMessage(message);
} catch (error) {
  if (error instanceof RateLimitError) {
    showRateLimitErrorToast(error.retryAfter / 1000);
  }
}
```

## Nested Error Boundaries

```tsx
<AppErrorBoundary>
  <App>
    <PageErrorBoundary>
      <Page>
        <SectionErrorBoundary>
          <Sidebar />
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Content>
            <ComponentErrorBoundary>
              <MessageList />
            </ComponentErrorBoundary>

            <ComponentErrorBoundary>
              <MessageInput />
            </ComponentErrorBoundary>
          </Content>
        </SectionErrorBoundary>
      </Page>
    </PageErrorBoundary>
  </App>
</AppErrorBoundary>
```

Errors propagate up through boundaries:

1. Component error caught by ComponentErrorBoundary
2. If not caught, propagates to SectionErrorBoundary
3. Then to PageErrorBoundary
4. Finally to AppErrorBoundary

## Reset Keys

Error boundaries can reset when dependencies change:

```tsx
import { ErrorBoundary } from "@/components/errors";

function Component({ userId }: { userId: string }) {
  return (
    <ErrorBoundary resetKeys={[userId]}>
      <UserProfile userId={userId} />
    </ErrorBoundary>
  );
}
```

When `userId` changes, error boundary resets automatically.

## Custom Error Handling

```tsx
import { ErrorBoundary } from "@/components/errors";

function Component() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Custom error handler:", error, errorInfo);
    // Send to analytics, etc.
  };

  const handleReset = () => {
    console.log("Error boundary reset");
    // Clear state, etc.
  };

  return (
    <ErrorBoundary onError={handleError} onReset={handleReset}>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## Styling

All error components use Tailwind CSS and respect the app theme:

- `bg-destructive` - Error backgrounds
- `text-destructive` - Error text
- `border-destructive` - Error borders
- `bg-warning` - Warning backgrounds

Icons from `lucide-react`:

- `AlertTriangle` - Generic errors
- `WifiOff` - Network/offline errors
- `Lock` - Auth/permission errors
- `Clock` - Timeout/rate limit errors
- `Upload` - Upload errors
- `Server` - Server errors
- `XCircle` - Send errors

## Accessibility

Error components include:

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

## Testing

```tsx
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/errors";
import { AppError, ErrorCategory } from "@/lib/errors";

test("renders error boundary fallback", () => {
  const ThrowError = () => {
    throw new AppError("Test error", ErrorCategory.UNKNOWN);
  };

  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>,
  );

  expect(screen.getByText(/test error/i)).toBeInTheDocument();
});

test("calls onError callback", () => {
  const onError = jest.fn();

  const ThrowError = () => {
    throw new Error("Test error");
  };

  render(
    <ErrorBoundary onError={onError}>
      <ThrowError />
    </ErrorBoundary>,
  );

  expect(onError).toHaveBeenCalled();
});
```

## See Also

- [Error Handling Guide](/docs/Error-Handling-Guide.md)
- [Error Utilities](/src/lib/errors/)
- [Toast Component](/src/hooks/use-toast.tsx)
