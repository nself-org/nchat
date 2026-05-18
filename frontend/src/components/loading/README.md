# Loading States & Skeleton Screens

Comprehensive loading components and utilities for the nself-chat application.

## Table of Contents

- [Base Components](#base-components)
- [Skeleton Screens](#skeleton-screens)
- [Loading Overlays](#loading-overlays)
- [Button Loading](#button-loading)
- [Progress Components](#progress-components)
- [Suspense Helpers](#suspense-helpers)
- [Loading State Management](#loading-state-management)
- [Optimistic Updates](#optimistic-updates)
- [Best Practices](#best-practices)

## Base Components

### Spinner

Basic loading spinners in various sizes and colors.

```tsx
import { Spinner, CenteredSpinner, InlineSpinner } from '@/components/loading'

// Basic spinner
<Spinner size="md" color="primary" />

// With text
<Spinner size="lg" text="Loading..." textPosition="bottom" />

// Centered in container
<CenteredSpinner size="xl" text="Loading page..." />

// Inline (for buttons)
<InlineSpinner size="sm" />
```

### Skeleton

Base skeleton components for building custom loading states.

```tsx
import {
  Skeleton,
  CircleSkeleton,
  LineSkeleton,
  TextBlockSkeleton,
  ShimmerSkeleton,
} from '@/components/loading'

// Basic skeleton
<Skeleton className="h-10 w-full" />

// Circle (for avatars)
<CircleSkeleton size={40} />

// Line (for text)
<LineSkeleton width={120} height={14} />

// Text block
<TextBlockSkeleton lines={3} lastLineWidth="60%" />

// With shimmer animation
<ShimmerSkeleton className="h-32 w-full" />
```

## Skeleton Screens

### Message Skeleton

Loading state for chat messages.

```tsx
import { MessageSkeleton, MessageListSkeleton } from '@/components/loading'

// Multiple messages
<MessageSkeleton count={5} showAvatar showReactions />

// Full message list with header and input
<MessageListSkeleton />

// Single message
<MessageSkeletonItem showAvatar showThreadPreview />

// With attachment
<MessageWithAttachmentSkeleton />
```

### Channel Skeleton

Loading state for channel lists.

```tsx
import {
  ChannelSkeleton,
  ChannelListSkeleton,
  DirectMessagesSkeleton,
} from '@/components/loading'

// Channel list
<ChannelSkeleton count={5} showCategories />

// Full channel list
<ChannelListSkeleton />

// Direct messages
<DirectMessagesSkeleton count={4} />
```

### Profile Skeleton

Loading state for user profiles.

```tsx
import {
  ProfileSkeleton,
  CompactProfileSkeleton,
  ProfileHeaderSkeleton,
} from '@/components/loading'

// Full profile
<ProfileSkeleton showCover showBio showStats showActions />

// Compact (for cards)
<CompactProfileSkeleton />

// Header only
<ProfileHeaderSkeleton />
```

### Settings Skeleton

Loading state for settings pages.

```tsx
import {
  SettingsSkeleton,
  ProfileSettingsSkeleton,
  NotificationSettingsSkeleton,
} from '@/components/loading'

// Full settings page
<SettingsSkeleton showNav sectionCount={3} />

// Profile settings
<ProfileSettingsSkeleton />

// Notification settings
<NotificationSettingsSkeleton />
```

### Search Skeleton

Loading state for search results.

```tsx
import { SearchSkeleton, QuickSearchSkeleton } from '@/components/loading'

// Full search page
<SearchSkeleton count={5} showInput showFilters />

// Quick search dropdown
<QuickSearchSkeleton />
```

## Loading Overlays

### LoadingOverlay

Semi-transparent overlay with spinner.

```tsx
import { LoadingOverlay, CardLoadingOverlay } from '@/components/loading'

// Full overlay
<LoadingOverlay
  isLoading={true}
  message="Processing..."
  opacity="medium"
  blur
/>

// Card overlay
<div className="relative">
  <CardContent />
  <CardLoadingOverlay isLoading={isProcessing} />
</div>

// With children
<WithLoadingOverlay isLoading={isLoading} message="Saving...">
  <YourContent />
</WithLoadingOverlay>
```

## Button Loading

### Button States

Buttons with loading, success, and error states.

```tsx
import {
  LoadingButton,
  ButtonLoading,
  SubmitButton,
  AsyncActionButton,
} from '@/components/loading'

// Simple loading button
<LoadingButton
  isLoading={isSubmitting}
  loadingText="Saving..."
  onClick={handleClick}
>
  Save
</LoadingButton>

// With multiple states
<ButtonLoading
  loadingState="loading" // 'idle' | 'loading' | 'success' | 'error'
  loadingText="Uploading..."
  successText="Uploaded!"
  errorText="Failed"
>
  Upload
</ButtonLoading>

// Form submit button
<SubmitButton
  isSubmitting={isSubmitting}
  submittingText="Creating account..."
>
  Sign Up
</SubmitButton>

// Async action (auto-manages state)
<AsyncActionButton
  onAction={async () => {
    await saveData()
  }}
  actionText="Saving..."
  showSuccess
>
  Save Changes
</AsyncActionButton>
```

## Progress Components

### ProgressBar

Determinate and indeterminate progress bars.

```tsx
import { ProgressBar, CircularProgress, StepProgress } from '@/components/loading'

// Linear progress
<ProgressBar
  value={progress}
  showPercentage
  variant="gradient"
  color="primary"
/>

// Indeterminate
<ProgressBar indeterminate variant="animated" />

// Circular progress
<CircularProgress
  value={75}
  size={64}
  showValue
  color="success"
/>

// Step progress
<StepProgress
  steps={['Account', 'Profile', 'Preferences', 'Complete']}
  currentStep={1}
  variant="default"
/>
```

### Upload Progress

Specialized upload progress indicator.

```tsx
import { UploadProgress } from "@/components/loading";
<UploadProgress
  fileName="document.pdf"
  fileSize="2.4 MB"
  progress={45}
  status="uploading"
  onCancel={() => cancelUpload()}
/>;
```

## Suspense Helpers

### Lazy Loading

Type-safe lazy loading utilities.

```tsx
import { lazyLoad, lazyLoadWithRetry, preloadComponent } from "@/lib/loading";

// Basic lazy load
const ChatView = lazyLoad(
  () => import("@/components/chat/ChatView"),
  "ChatView",
);

// With retry
const HeavyComponent = lazyLoadWithRetry(() => import("./HeavyComponent"), {
  maxRetries: 3,
  retryDelay: 1000,
});

// Preload before needed
preloadComponent(ChatView);
```

### Suspense Wrappers

Convenient Suspense boundary components.

```tsx
import {
  SuspenseWrapper,
  PageSuspense,
  SectionSuspense,
} from '@/components/loading'

// Page-level suspense
<PageSuspense skeleton={<PageSkeleton />}>
  <YourPage />
</PageSuspense>

// Section-level
<SectionSuspense
  skeleton={<SectionSkeleton />}
  minHeight={200}
>
  <LazySection />
</SectionSuspense>

// Custom wrapper
<SuspenseWrapper
  fallback={<CustomSkeleton />}
>
  <LazyComponent />
</SuspenseWrapper>
```

### Data Fetching

Suspense-compatible data fetching.

```tsx
import {
  createResource,
  createSuspenseFetcher,
  suspenseFetch,
} from '@/lib/loading'

// Create resource
const userResource = createResource(fetchUser(userId))
const user = userResource.read() // Suspends until loaded

// Create fetcher
const userFetcher = createSuspenseFetcher(
  async (userId: string) => {
    const response = await fetch(\`/api/users/\${userId}\`)
    return response.json()
  }
)

// Use in component
function UserProfile({ userId }) {
  const user = userFetcher.fetch(userId).read()
  return <div>{user.name}</div>
}
```

## Loading State Management

### LoadingState Component

Unified loading state management.

```tsx
import { LoadingState } from "@/components/loading";
<LoadingState
  state={loadingState} // 'idle' | 'loading' | 'success' | 'error'
  loadingContent={<Skeleton />}
  errorContent={<ErrorMessage />}
  successContent={<YourContent />}
  error={error}
  onRetry={handleRetry}
/>;
```

### Data Wrapper

Wrapper for async data with loading states.

```tsx
import { DataWrapper, ListWrapper } from '@/components/loading'

// Single data item
<DataWrapper
  data={user}
  isLoading={isLoading}
  error={error}
  loadingSkeleton={<ProfileSkeleton />}
  emptyState={<EmptyState title="User not found" />}
>
  {(user) => <UserProfile user={user} />}
</DataWrapper>

// List of items
<ListWrapper
  items={messages}
  isLoading={isLoading}
  error={error}
  loadingSkeleton={<MessageSkeleton count={5} />}
  emptyState={<EmptyState title="No messages" />}
  renderItem={(message) => <MessageItem message={message} />}
/>
```

### Empty States

```tsx
import { EmptyState } from "@/components/loading";
<EmptyState
  icon={<InboxIcon className="h-12 w-12" />}
  title="No messages yet"
  description="Start a conversation to see messages here"
  action={<Button onClick={handleStartChat}>Start Chat</Button>}
/>;
```

## Optimistic Updates

### useOptimistic Hook

Manage optimistic UI updates.

```tsx
import { useOptimistic } from "@/lib/loading";

function MessageList() {
  const [{ data: messages, isPending }, updateMessages] =
    useOptimistic(initialMessages);

  const sendMessage = async (text: string) => {
    // Optimistically add message
    updateMessages((prev) => [
      ...prev,
      {
        id: "temp-" + Date.now(),
        text,
        isPending: true,
      },
    ]);

    try {
      // Send to server
      const result = await api.sendMessage(text);
      // Update with real message
      updateMessages((prev) =>
        prev.map((m) => (m.id === "temp-" + Date.now() ? result : m)),
      );
    } catch (error) {
      // Revert on error
      revert();
    }
  };

  return (
    <div>
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} isPending={msg.isPending} />
      ))}
    </div>
  );
}
```

### useOptimisticList Hook

Optimistic operations on lists.

```tsx
import { useOptimisticList } from "@/lib/loading";

function TodoList() {
  const {
    list,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    confirmUpdate,
    isPending,
  } = useOptimisticList(initialTodos);

  const addTodo = async (text: string) => {
    const tempId = "temp-" + Date.now();

    // Add optimistically
    addOptimistic({ id: tempId, text, completed: false });

    try {
      // Create on server
      const newTodo = await api.createTodo(text);
      // Confirm with real ID
      confirmUpdate(tempId);
    } catch (error) {
      revertItem(tempId);
    }
  };

  return (
    <ul>
      {list.map((todo) => (
        <li key={todo.id} className={isPending(todo.id) ? "opacity-50" : ""}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

## Infinite Scroll

```tsx
import { InfiniteScrollLoader, LoadMoreButton } from '@/components/loading'

// Auto-loading on scroll
<InfiniteScrollLoader
  hasMore={hasMoreMessages}
  isLoading={isLoadingMore}
  onLoadMore={loadMoreMessages}
  mode="auto"
  rootMargin="100px"
/>

// Manual load more button
<LoadMoreButton
  hasMore={hasMore}
  isLoading={isLoading}
  onClick={loadMore}
  remainingCount={remainingCount}
/>
```

## Best Practices

### 1. Match Content Shape

Skeleton screens should match the actual content layout:

```tsx
// Good: Matches message layout
<MessageSkeleton showAvatar showReactions />

// Bad: Generic skeleton
<Skeleton className="h-20 w-full" />
```

### 2. Use Appropriate Loading States

Choose the right loading pattern for the context:

```tsx
// Initial page load: Full skeleton
<PageSuspense skeleton={<FullPageSkeleton />} />

// Data refresh: Overlay
<LoadingOverlay isLoading={isRefreshing} opacity="light" />

// Button action: Button loading state
<LoadingButton isLoading={isSubmitting} />
```

### 3. Provide Feedback

Always provide clear feedback about what's happening:

```tsx
// Good: Specific message
<Spinner text="Uploading image..." />

// Bad: Generic or no message
<Spinner />
```

### 4. Handle Errors Gracefully

Always provide error states with retry options:

```tsx
<DataWrapper
  data={data}
  isLoading={isLoading}
  error={error}
  onRetry={refetch} // Important!
>
  {(data) => <Content data={data} />}
</DataWrapper>
```

### 5. Optimize Transitions

Use smooth transitions between loading states:

```tsx
<FadeTransition isVisible={!isLoading}>
  <Content />
</FadeTransition>
```

### 6. Accessibility

Ensure loading states are accessible:

```tsx
<div role="status" aria-live="polite" aria-label="Loading content">
  <Spinner />
</div>
```

### 7. Performance

Avoid over-rendering skeletons:

```tsx
// Good: Single wrapper
<SkeletonWrapper isLoading={isLoading} skeleton={<Skeleton />}>
  <Content />
</SkeletonWrapper>;

// Bad: Conditional rendering (re-mounts)
{
  isLoading ? <Skeleton /> : <Content />;
}
```

## Complete Example

Here's a complete example combining multiple patterns:

```tsx
'use client'

import { useState } from 'react'
import {
  MessageSkeleton,
  InfiniteScrollLoader,
  EmptyState,
  DataWrapper,
  useOptimisticList,
} from '@/components/loading'

function ChatMessages({ channelId }: { channelId: string }) {
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const {
    list: messages,
    addOptimistic,
    confirmUpdate,
    isPending,
  } = useOptimisticList([])

  const sendMessage = async (text: string) => {
    const tempId = \`temp-\${Date.now()}\`

    // Optimistically add
    addOptimistic({
      id: tempId,
      text,
      userId: currentUser.id,
      timestamp: new Date(),
    })

    try {
      const result = await api.sendMessage(channelId, text)
      confirmUpdate(tempId)
    } catch (err) {
      revertItem(tempId)
      toast.error('Failed to send message')
    }
  }

  return (
    <DataWrapper
      data={messages}
      isLoading={isInitialLoading}
      error={error}
      loadingSkeleton={<MessageSkeleton count={10} />}
      emptyState={
        <EmptyState
          title="No messages yet"
          description="Be the first to say something!"
        />
      }
    >
      {(messages) => (
        <div className="flex flex-col gap-2">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isPending={isPending(message.id)}
            />
          ))}

          <InfiniteScrollLoader
            hasMore={hasMore}
            isLoading={isLoadingMore}
            onLoadMore={loadMore}
            mode="auto"
          />
        </div>
      )}
    </DataWrapper>
  )
}
```

## TypeScript Support

All components are fully typed with TypeScript:

```tsx
import type { SpinnerProps, LoadingStateType } from "@/components/loading";

const spinnerProps: SpinnerProps = {
  size: "lg",
  color: "primary",
  text: "Loading...",
};

const state: LoadingStateType = "loading";
```

## Testing

Test loading states easily:

```tsx
import { render, screen } from "@testing-library/react";
import { MessageSkeleton } from "@/components/loading";

test("renders message skeleton", () => {
  render(<MessageSkeleton count={3} />);
  expect(screen.getAllByRole("status")).toHaveLength(3);
});
```
