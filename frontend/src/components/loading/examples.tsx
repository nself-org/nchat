/**
 * Loading Components Examples
 * Real-world examples demonstrating various loading patterns
 *
 * This file is for reference/documentation only - not used in production
 */

"use client";

import { useState } from "react";
import {
  Spinner,
  MessageSkeleton,
  ChannelSkeleton,
  ProfileSkeleton,
  LoadingButton,
  ProgressBar,
  InfiniteScrollLoader,
  LoadingOverlay,
  DataWrapper,
  EmptyState,
  UploadProgress,
  StepProgress,
} from "@/components/loading";

// Example 1: Simple loading spinner
export function Example1_BasicSpinner() {
  return (
    <div className="flex items-center gap-4">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" text="Loading..." />
    </div>
  );
}

// Example 2: Skeleton screens for different content types
export function Example2_SkeletonScreens() {
  return (
    <div className="space-y-8">
      {/* Message list skeleton */}
      <div>
        <h3 className="mb-4 font-semibold">Messages</h3>
        <MessageSkeleton count={3} showAvatar showReactions />
      </div>

      {/* Channel list skeleton */}
      <div>
        <h3 className="mb-4 font-semibold">Channels</h3>
        <ChannelSkeleton count={5} showCategories />
      </div>

      {/* Profile skeleton */}
      <div>
        <h3 className="mb-4 font-semibold">Profile</h3>
        <ProfileSkeleton showCover showBio showStats />
      </div>
    </div>
  );
}

// Example 3: Loading button states
export function Example3_ButtonLoading() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <div className="space-x-2">
      <LoadingButton
        isLoading={isLoading}
        loadingText="Saving..."
        onClick={handleClick}
      >
        Save Changes
      </LoadingButton>
    </div>
  );
}

// Example 4: Progress indicators
export function Example4_ProgressIndicators() {
  const [progress, setProgress] = useState(0);

  // Simulate progress
  useState(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 500);
    return () => clearInterval(interval);
  });

  return (
    <div className="space-y-6">
      {/* Linear progress */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Linear Progress</h3>
        <ProgressBar value={progress} showPercentage variant="gradient" />
      </div>

      {/* Indeterminate progress */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Indeterminate</h3>
        <ProgressBar indeterminate variant="animated" />
      </div>

      {/* Step progress */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Step Progress</h3>
        <StepProgress
          steps={["Select", "Configure", "Review", "Complete"]}
          currentStep={Math.floor(progress / 25)}
        />
      </div>

      {/* Upload progress */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Upload Progress</h3>
        <UploadProgress
          fileName="document.pdf"
          fileSize="2.4 MB"
          progress={progress}
          status={progress < 100 ? "uploading" : "success"}
        />
      </div>
    </div>
  );
}

// Example 5: Loading overlay
export function Example5_LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="relative h-64 rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">Content Area</h3>
      <p className="text-sm text-muted-foreground">
        This is some content that will be covered by a loading overlay.
      </p>

      <button
        onClick={() => setIsLoading(!isLoading)}
        className="text-primary-foreground mt-4 rounded bg-primary px-4 py-2 text-sm"
      >
        Toggle Loading
      </button>

      <LoadingOverlay
        isLoading={isLoading}
        message="Processing your request..."
        opacity="medium"
        blur
      />
    </div>
  );
}

// Example 6: Data wrapper with loading states
export function Example6_DataWrapper() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setData({ name: "John Doe", email: "john@example.com" });
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={loadData}
        className="text-primary-foreground rounded bg-primary px-4 py-2 text-sm"
      >
        Load Data
      </button>

      <DataWrapper
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={loadData}
        loadingSkeleton={<ProfileSkeleton />}
        emptyState={
          <EmptyState
            title="No data"
            description="Click the button to load data"
          />
        }
      >
        {(data) => (
          <div className="rounded-lg border p-4">
            <h4 className="font-medium">{data.name}</h4>
            <p className="text-sm text-muted-foreground">{data.email}</p>
          </div>
        )}
      </DataWrapper>
    </div>
  );
}

// Example 7: Infinite scroll
export function Example7_InfiniteScroll() {
  const [items, setItems] = useState<number[]>(
    Array.from({ length: 10 }, (_, i) => i),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newItems = Array.from({ length: 10 }, (_, i) => items.length + i);
    setItems([...items, ...newItems]);

    if (items.length + newItems.length >= 50) {
      setHasMore(false);
    }

    setIsLoading(false);
  };

  return (
    <div className="h-96 overflow-auto rounded-lg border p-4">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border bg-card p-4">
            Item {item + 1}
          </div>
        ))}
      </div>

      <InfiniteScrollLoader
        hasMore={hasMore}
        isLoading={isLoading}
        onLoadMore={loadMore}
        mode="auto"
        rootMargin="100px"
      />
    </div>
  );
}

// Example 8: Multi-step form with loading
export function Example8_MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = ["Account", "Profile", "Preferences", "Complete"];

  const handleNext = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 rounded-lg border p-6">
      {/* Step indicator */}
      <StepProgress steps={steps} currentStep={currentStep} />

      {/* Form content */}
      <div className="min-h-[200px] rounded-lg border-2 border-dashed p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold">
          Step {currentStep + 1}: {steps[currentStep]}
        </h3>
        <p className="text-sm text-muted-foreground">Form content goes here</p>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
          disabled={currentStep === 0 || isSubmitting}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Back
        </button>

        <LoadingButton
          isLoading={isSubmitting}
          loadingText="Processing..."
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
        >
          {currentStep === steps.length - 1 ? "Complete" : "Next"}
        </LoadingButton>
      </div>
    </div>
  );
}

// Example 9: Empty states
export function Example9_EmptyStates() {
  return (
    <div className="space-y-8">
      {/* No messages */}
      <EmptyState
        icon={
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        }
        title="No messages yet"
        description="Start a conversation to see messages appear here"
        action={
          <button className="text-primary-foreground rounded bg-primary px-4 py-2 text-sm">
            Start Chat
          </button>
        }
      />

      {/* No results */}
      <EmptyState
        icon={
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        title="No results found"
        description="Try adjusting your search terms"
      />
    </div>
  );
}

// Example 10: Complete chat interface with all loading states
export function Example10_CompleteChatExample() {
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Simulate loading messages
  useState(() => {
    setTimeout(() => {
      setMessages([
        { id: 1, text: "Hello!", user: "Alice" },
        { id: 2, text: "Hi there!", user: "Bob" },
      ]);
      setIsLoadingMessages(false);
    }, 2000);
  });

  const handleSend = async (text: string) => {
    setIsSending(true);

    // Optimistically add message
    const tempMessage = {
      id: "temp-" + Date.now(),
      text,
      user: "You",
      isPending: true,
    };
    setMessages([...messages, tempMessage]);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Replace with real message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempMessage.id
          ? { ...m, id: Date.now(), isPending: false }
          : m,
      ),
    );

    setIsSending(false);
  };

  return (
    <div className="flex h-[600px] flex-col rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary" />
          <div>
            <h3 className="font-semibold">General</h3>
            <p className="text-xs text-muted-foreground">5 members</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        {isLoadingMessages ? (
          <MessageSkeleton count={5} showAvatar />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Be the first to say something!"
          />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isPending ? "opacity-50" : ""}`}
              >
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{message.user}</span>
                    {message.isPending && (
                      <Spinner size="sm" className="ml-2" />
                    )}
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value) {
                handleSend(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
          <LoadingButton
            isLoading={isSending}
            loadingText="Sending..."
            onClick={() => handleSend("Test message")}
            disabled={isLoadingMessages}
          >
            Send
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

// Export all examples
export const examples = {
  Example1_BasicSpinner,
  Example2_SkeletonScreens,
  Example3_ButtonLoading,
  Example4_ProgressIndicators,
  Example5_LoadingOverlay,
  Example6_DataWrapper,
  Example7_InfiniteScroll,
  Example8_MultiStepForm,
  Example9_EmptyStates,
  Example10_CompleteChatExample,
};
