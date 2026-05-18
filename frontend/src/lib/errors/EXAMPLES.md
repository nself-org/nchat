# Error Handling - Quick Examples

## Table of Contents

- [Basic Error Handling](#basic-error-handling)
- [GraphQL Errors](#graphql-errors)
- [File Upload Errors](#file-upload-errors)
- [Network Errors with Retry](#network-errors-with-retry)
- [Form Validation Errors](#form-validation-errors)
- [Authentication Errors](#authentication-errors)
- [Offline Operations](#offline-operations)
- [React Components](#react-components)

## Basic Error Handling

```typescript
import { handleError } from "@/lib/errors";

async function doSomething() {
  try {
    await riskyOperation();
  } catch (error) {
    // Automatically shows toast and reports to Sentry
    await handleError(error);
  }
}
```

## GraphQL Errors

```typescript
import { handleGraphQLError } from "@/lib/errors";
import { useMutation } from "@apollo/client";

function useCreateChannel() {
  const [createChannel] = useMutation(CREATE_CHANNEL_MUTATION);

  const execute = async (name: string) => {
    try {
      const result = await createChannel({ variables: { name } });
      return result.data;
    } catch (error) {
      // Parses GraphQL errors and shows user-friendly message
      await handleGraphQLError(error, "create_channel", { name });
      throw error;
    }
  };

  return { execute };
}
```

## File Upload Errors

```typescript
import { handleUploadError, withRetry } from "@/lib/errors";

async function uploadFile(file: File) {
  try {
    // Retry upload up to 3 times with exponential backoff
    const result = await withRetry(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return await response.json();
    });

    return result;
  } catch (error) {
    // Shows upload error toast with file name and retry button
    await handleUploadError(error, file, async () => {
      await uploadFile(file);
    });
    throw error;
  }
}
```

## Network Errors with Retry

```typescript
import { withRetry, NetworkError } from "@/lib/errors";

async function fetchUserData(userId: string) {
  return withRetry(
    async () => {
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        if (response.status >= 500) {
          // Retryable server error
          throw new NetworkError("Server error");
        }
        // Non-retryable client error
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    },
    {
      maxAttempts: 3,
      initialDelayMs: 1000,
    },
  );
}
```

## Form Validation Errors

```typescript
import { ValidationError, handleError } from "@/lib/errors";

async function submitForm(data: FormData) {
  try {
    // Validate data
    if (!data.email) {
      throw new ValidationError("Email is required", {
        metadata: { field: "email" },
      });
    }

    if (!data.email.includes("@")) {
      throw new ValidationError("Invalid email address", {
        metadata: { field: "email", value: data.email },
      });
    }

    // Submit form
    await fetch("/api/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Shows validation error toast (no Sentry report for validation errors)
    await handleError(error);
  }
}
```

## Authentication Errors

```typescript
import { AuthenticationError, handleError } from "@/lib/errors";

async function makeAuthenticatedRequest(url: string) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new AuthenticationError("No authentication token");
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid
      throw new AuthenticationError("Session expired");
    }

    return await response.json();
  } catch (error) {
    // Automatically clears auth state and redirects to login
    await handleError(error);
    throw error;
  }
}
```

## Offline Operations

```typescript
import { offlineQueue, showQueuedToast } from "@/lib/errors";
import { showOfflineToast } from "@/components/errors";

async function sendMessage(message: string) {
  // Check if online
  if (!navigator.onLine) {
    // Queue for later
    offlineQueue.enqueue(async () => {
      await sendMessageToServer(message);
    }, "Send message");

    // Show queued notification
    showQueuedToast("Message", offlineQueue.size());
    return;
  }

  // Send immediately
  try {
    await sendMessageToServer(message);
  } catch (error) {
    // Handle error with retry
    await handleError(error, {
      allowRetry: true,
      onRetry: async () => {
        await sendMessage(message);
      },
    });
  }
}

// Process queue when coming back online
window.addEventListener("online", async () => {
  await offlineQueue.processQueue();
});
```

## React Components

### With Error Boundary

```tsx
import { ComponentErrorBoundary } from "@/components/errors";
import { handleError, withRetry } from "@/lib/errors";
import { useState } from "react";

function MessageForm() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);

    try {
      // Retry up to 3 times
      await withRetry(async () => {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        return await response.json();
      });

      // Success
      setMessage("");
    } catch (error) {
      // Handle error with retry button
      await handleError(error, {
        allowRetry: true,
        onRetry: handleSend,
        context: {
          operation: "send_message",
          messageLength: message.length,
        },
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <ComponentErrorBoundary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
          placeholder="Type a message..."
        />
        <button type="submit" disabled={sending || !message}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </ComponentErrorBoundary>
  );
}
```

### With Error Toast Hook

```tsx
import { useErrorToast } from "@/components/errors";
import { parseError } from "@/lib/errors";
import { useState } from "react";

function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const errorToast = useErrorToast();

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Success
      console.log("File uploaded successfully");
    } catch (error) {
      // Show error toast with retry
      errorToast.showUploadError(file.name, async () => {
        await handleUpload(file);
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }}
      disabled={uploading}
    />
  );
}
```

### Nested Error Boundaries

```tsx
import {
  AppErrorBoundary,
  PageErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
} from "@/components/errors";

function App() {
  return (
    <AppErrorBoundary>
      <Layout>
        <PageErrorBoundary>
          <ChatPage>
            <SectionErrorBoundary>
              <Sidebar />
            </SectionErrorBoundary>

            <SectionErrorBoundary>
              <ChatArea>
                <ComponentErrorBoundary>
                  <MessageList />
                </ComponentErrorBoundary>

                <ComponentErrorBoundary>
                  <MessageInput />
                </ComponentErrorBoundary>
              </ChatArea>
            </SectionErrorBoundary>
          </ChatPage>
        </PageErrorBoundary>
      </Layout>
    </AppErrorBoundary>
  );
}
```

## Advanced Patterns

### Custom Retry Strategy

```typescript
import { RetryManager } from "@/lib/errors";

// Aggressive retry for critical operations
const criticalRetry = new RetryManager({
  maxAttempts: 5,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 1.5,
  useJitter: true,
});

// Conservative retry for background tasks
const backgroundRetry = new RetryManager({
  maxAttempts: 2,
  initialDelayMs: 5000,
  maxDelayMs: 60000,
  backoffMultiplier: 3,
});

// Use them
await criticalRetry.execute(() => saveCriticalData());
await backgroundRetry.execute(() => syncBackground());
```

### Circuit Breaker Pattern

```typescript
import { RetryManager } from "@/lib/errors";

const manager = new RetryManager({
  useCircuitBreaker: true,
  circuitBreakerThreshold: 5, // Open after 5 failures
  circuitBreakerResetTimeMs: 60000, // Try again after 1 minute
});

async function callExternalAPI() {
  try {
    return await manager.execute(async () => {
      const response = await fetch("https://external-api.com/data");
      if (!response.ok) throw new Error("API error");
      return await response.json();
    });
  } catch (error) {
    // Circuit breaker will prevent calls if too many failures
    console.log("Circuit state:", manager.getCircuitState());
    throw error;
  }
}
```

### Error Context and Tracking

```typescript
import { handleError } from "@/lib/errors";

async function complexOperation(userId: string, channelId: string) {
  try {
    await performOperation();
  } catch (error) {
    // Add rich context for debugging
    await handleError(error, {
      context: {
        userId,
        channelId,
        operation: "complex_operation",
        metadata: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          path: window.location.pathname,
        },
      },
      sentryTags: {
        feature: "chat",
        severity: "high",
      },
      sentryExtra: {
        customData: "any additional data",
      },
    });
  }
}
```

### Silent Error Handling

```typescript
import { handleErrorSilent } from "@/lib/errors";

async function backgroundTask() {
  try {
    await syncData();
  } catch (error) {
    // Log to Sentry but don't show toast
    await handleErrorSilent(error, {
      operation: "background_sync",
    });
  }
}
```

## Common Patterns

### API Request Pattern

```typescript
import { withRetry, parseError } from "@/lib/errors";

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = parseError(new Error(`HTTP ${response.status}`));
      throw error;
    }

    return await response.json();
  });
}

// Usage
const data = await apiRequest("/api/users");
```

### Form Submission Pattern

```typescript
import { handleError, ValidationError } from "@/lib/errors";

async function handleFormSubmit(data: FormData) {
  try {
    // Validate
    if (!data.email) {
      throw new ValidationError("Email is required");
    }

    // Submit
    await fetch("/api/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Success
    showSuccessToast("Form submitted successfully");
  } catch (error) {
    await handleError(error);
  }
}
```

### Loading State Pattern

```typescript
import { useState } from "react";
import { handleError } from "@/lib/errors";

function useAsyncAction<T>(action: () => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await action();
      return result;
    } catch (err) {
      setError(err as Error);
      await handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

// Usage
const { execute, loading } = useAsyncAction(() => saveData());
```
