"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { errorReporter } from "@/lib/error/error-reporter";
import { isDevelopment } from "@/lib/environment";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, MessageSquareOff } from "lucide-react";

import { logger } from "@/lib/logger";

interface ChatErrorBoundaryProps {
  children: ReactNode;
  channelId?: string;
  onRetry?: () => void;
  className?: string;
}

interface ChatErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

/**
 * Chat-specific error boundary that handles message list errors
 * without crashing the entire application.
 */
export class ChatErrorBoundary extends Component<
  ChatErrorBoundaryProps,
  ChatErrorBoundaryState
> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<ChatErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (isDevelopment()) {
      logger.error("ChatErrorBoundary caught an error:", error);
      logger.error("Component stack:", errorInfo.componentStack);
    }

    errorReporter.reportError(error, {
      componentStack: errorInfo.componentStack || undefined,
      componentName: "ChatErrorBoundary",
      context: {
        channelId: this.props.channelId,
      },
    });
  }

  handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });

    // Small delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.setState({
      hasError: false,
      error: null,
      isRetrying: false,
    });

    this.props.onRetry?.();
  };

  render(): ReactNode {
    const { hasError, error, isRetrying } = this.state;
    const { children, className } = this.props;

    if (hasError) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center p-8 text-center",
            "rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50",
            className,
          )}
        >
          <div className="mb-4 rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
            <MessageSquareOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Unable to load messages
          </h3>

          <p className="mb-4 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            There was a problem loading the chat messages.
            {isDevelopment() && error && (
              <span className="mt-2 block font-mono text-xs text-amber-600 dark:text-amber-400">
                {error.message}
              </span>
            )}
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={this.handleRetry}
              disabled={isRetrying}
              className="gap-2"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRetrying && "animate-spin")}
              />
              {isRetrying ? "Retrying..." : "Try Again"}
            </Button>
          </div>

          {isDevelopment() && error?.stack && (
            <details className="mt-4 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                View error details
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-friendly wrapper for ChatErrorBoundary
 */
export function ChatErrorBoundaryWrapper({
  children,
  channelId,
  className,
}: {
  children: ReactNode;
  channelId?: string;
  className?: string;
}) {
  const [key, setKey] = React.useState(0);

  const handleRetry = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <ChatErrorBoundary
      key={key}
      channelId={channelId}
      onRetry={handleRetry}
      className={className}
    >
      {children}
    </ChatErrorBoundary>
  );
}

export default ChatErrorBoundary;
