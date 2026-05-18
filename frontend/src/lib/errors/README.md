# Error Handling System

Production-ready error handling with retry logic, circuit breaker, and Sentry integration.

## Quick Start

```typescript
import { handleError, withRetry } from "@/lib/errors";

// Basic error handling
try {
  await someOperation();
} catch (error) {
  await handleError(error);
}

// With retry logic
const result = await withRetry(async () => {
  return await fetchData();
});
```

## Files

### error-types.ts

Defines all error classes and types:

- `AppError` - Base error class
- `NetworkError` - Network connection errors
- `AuthenticationError` - Auth failures
- `AuthorizationError` - Permission denied
- `ValidationError` - Invalid input
- `NotFoundError` - Resource not found
- `RateLimitError` - Rate limit exceeded
- `ServerError` - Server errors (5xx)
- `ClientError` - Client errors (4xx)
- `GraphQLErrorClass` - GraphQL errors
- `UploadError` - Upload failures
- `OfflineError` - Offline status
- `TimeoutError` - Request timeouts

### error-handler.ts

Centralized error handling:

- `handleError()` - Main error handler
- `handleErrorSilent()` - Silent handling
- `handleErrorWithRetry()` - With retry option
- `handleUploadError()` - Upload errors
- `handleGraphQLError()` - GraphQL errors
- `handleNetworkError()` - Network errors
- `handleErrorBoundaryError()` - React errors

Features:

- Toast notifications
- Sentry reporting
- Error tracking
- Flood detection
- Auth error handling

### retry-manager.ts

Retry logic with exponential backoff:

- `RetryManager` - Main retry manager class
- `withRetry()` - Execute with retry
- `withAggressiveRetry()` - 5 attempts, short delays
- `withConservativeRetry()` - 2 attempts, long delays
- `OfflineQueue` - Queue operations when offline

Features:

- Exponential backoff
- Jitter to prevent thundering herd
- Circuit breaker pattern
- Timeout handling
- Offline queue

### index.ts

Exports all error handling utilities.

## Usage Examples

### Handle GraphQL Error

```typescript
import { handleGraphQLError } from "@/lib/errors";
import { useMutation } from "@apollo/client";

const [createChannel] = useMutation(CREATE_CHANNEL);

try {
  await createChannel({ variables: { name } });
} catch (error) {
  await handleGraphQLError(error, "create_channel", { name });
}
```

### Upload with Retry

```typescript
import { handleUploadError, withRetry } from "@/lib/errors";

async function uploadFile(file: File) {
  try {
    return await withRetry(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return await response.json();
    });
  } catch (error) {
    await handleUploadError(error, file, async () => {
      await uploadFile(file);
    });
  }
}
```

### Offline Queue

```typescript
import { offlineQueue } from "@/lib/errors";
import { showQueuedToast } from "@/components/errors";

if (!navigator.onLine) {
  offlineQueue.enqueue(async () => await sendMessage(message), "Send message");
  showQueuedToast("Message", offlineQueue.size());
  return;
}

await sendMessage(message);
```

### Custom Retry Config

```typescript
import { RetryManager } from "@/lib/errors";

const retryManager = new RetryManager({
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  useCircuitBreaker: true,
  onRetry: (attempt, error, delayMs) => {
    console.log(`Retry ${attempt}, waiting ${delayMs}ms`);
  },
});

const result = await retryManager.execute(async () => {
  return await fetchData();
});
```

### Error Parsing

```typescript
import { parseError, parseHttpError, parseGraphQLError } from "@/lib/errors";

// Parse unknown error
const appError = parseError(error);

// Parse HTTP response
const httpError = parseHttpError(404, "Not found");

// Parse Apollo GraphQL error
const graphQLError = parseGraphQLError(apolloError);
```

### Check Error Type

```typescript
import {
  isNetworkError,
  isOfflineError,
  isAuthError,
  isTimeoutError,
  isRetryableError,
  shouldReportError,
} from "@/lib/errors";

if (isNetworkError(error)) {
  // Handle network error
}

if (isRetryableError(error)) {
  // Retry operation
}

if (shouldReportError(error)) {
  // Report to Sentry
}
```

## Configuration

### Retry Config Defaults

```typescript
{
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  jitterFactor: 0.3,
  timeoutMs: 60000,
  useCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeMs: 60000,
}
```

### Error Handler Options

```typescript
{
  showToast?: boolean
  toastDuration?: number
  toastTitle?: string
  toastDescription?: string
  reportToSentry?: boolean
  sentryTags?: Record<string, string>
  sentryExtra?: Record<string, unknown>
  allowRetry?: boolean
  onRetry?: () => void | Promise<void>
  onAuthError?: () => void
  redirectOnAuth?: boolean
  context?: ErrorContext
}
```

## Best Practices

1. **Use specific error types**

   ```typescript
   throw new ValidationError("Email is required");
   ```

2. **Add context**

   ```typescript
   await handleError(error, {
     context: { userId, channelId, operation: "send_message" },
   });
   ```

3. **Choose appropriate retry**

   ```typescript
   // Critical operations
   await withAggressiveRetry(() => saveData());

   // Background tasks
   await withConservativeRetry(() => syncData());
   ```

4. **Handle offline**

   ```typescript
   if (!navigator.onLine) {
     offlineQueue.enqueue(() => operation(), "Operation");
     showOfflineToast(true);
     return;
   }
   ```

5. **Don't over-report**
   ```typescript
   await handleError(error, {
     reportToSentry: error.severity >= ErrorSeverity.MEDIUM,
   });
   ```

## Testing

```typescript
import { NetworkError, withRetry } from "@/lib/errors";

test("handles network error", async () => {
  mockFetch.mockRejectedValue(new NetworkError("Connection failed"));
  await expect(fetchData()).rejects.toThrow(NetworkError);
});

test("retries failed requests", async () => {
  mockFetch
    .mockRejectedValueOnce(new Error("Fail 1"))
    .mockRejectedValueOnce(new Error("Fail 2"))
    .mockResolvedValueOnce({ data: "success" });

  const result = await withRetry(() => mockFetch());
  expect(result.data).toBe("success");
});
```

## See Also

- [Error Handling Guide](/docs/Error-Handling-Guide.md)
- [Error Components](/src/components/errors/)
- [Sentry Setup](/docs/Sentry-Setup.md)
