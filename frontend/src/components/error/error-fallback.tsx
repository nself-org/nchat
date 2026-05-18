"use client";

import React, { ErrorInfo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDevelopment } from "@/lib/environment";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  onReset?: () => void;
  onReport?: () => Promise<void>;
  showStack?: boolean;
  showReportButton?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Error fallback component that displays error information
 * with recovery options.
 */
export function ErrorFallback({
  error,
  errorInfo,
  onReset,
  onReport,
  showStack = isDevelopment(),
  showReportButton = true,
  className,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or contact support if the problem persists.",
}: ErrorFallbackProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReport = async () => {
    if (onReport) {
      setIsReporting(true);
      try {
        await onReport();
        setReported(true);
      } catch {
        // Ignore report errors
      } finally {
        setIsReporting(false);
      }
    }
  };

  const handleCopyError = async () => {
    const errorText = [
      `Error: ${error?.message || "Unknown error"}`,
      "",
      "Stack trace:",
      error?.stack || "No stack trace available",
      "",
      "Component stack:",
      errorInfo?.componentStack || "No component stack available",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center p-8",
        "bg-white dark:bg-zinc-900",
        className,
      )}
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 inline-flex rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>

        {/* Description */}
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        {/* Error message (dev only) */}
        {showStack && error && (
          <div className="mb-6 text-left">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <code className="break-words text-sm text-red-700 dark:text-red-400">
                {error.message}
              </code>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mb-6 flex flex-wrap justify-center gap-3">
          {onReset && (
            <Button onClick={onReset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}

          <Button onClick={handleGoHome} variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>

          {showReportButton && onReport && !reported && (
            <Button
              onClick={handleReport}
              variant="outline"
              className="gap-2"
              disabled={isReporting}
            >
              <Bug className="h-4 w-4" />
              {isReporting ? "Reporting..." : "Report Issue"}
            </Button>
          )}

          {reported && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              Issue reported
            </div>
          )}
        </div>

        {/* Stack trace (dev only) */}
        {showStack && error?.stack && (
          <div className="text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mb-2 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showDetails ? "Hide" : "Show"} error details
            </button>

            {showDetails && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={handleCopyError}
                  title="Copy error details"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>

                <div className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <pre className="max-h-64 overflow-auto p-4 pr-12 text-xs text-zinc-700 dark:text-zinc-300">
                    {error.stack}
                  </pre>

                  {errorInfo?.componentStack && (
                    <>
                      <div className="bg-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                        Component Stack
                      </div>
                      <pre className="max-h-40 overflow-auto p-4 text-xs text-zinc-700 dark:text-zinc-300">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorFallback;
