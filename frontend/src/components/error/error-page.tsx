"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isDevelopment } from "@/lib/environment";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";

interface ErrorPageProps {
  error?: Error;
  statusCode?: number;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showRetryButton?: boolean;
  showSupportButton?: boolean;
  onRetry?: () => void;
  supportUrl?: string;
  className?: string;
}

/**
 * Full page error component for route-level errors.
 * Brand consistent and provides navigation options.
 */
export function ErrorPage({
  error,
  statusCode,
  title,
  description,
  showHomeButton = true,
  showBackButton = true,
  showRetryButton = true,
  showSupportButton = false,
  onRetry,
  supportUrl = "/support",
  className,
}: ErrorPageProps) {
  // Default titles based on status code
  const defaultTitle = statusCode
    ? {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Access Denied",
        404: "Page Not Found",
        500: "Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
      }[statusCode] || "Something Went Wrong"
    : "Something Went Wrong";

  const defaultDescription = statusCode
    ? {
        400: "The request could not be understood by the server.",
        401: "You need to sign in to access this page.",
        403: "You do not have permission to access this resource.",
        404: "The page you are looking for does not exist or has been moved.",
        500: "An internal server error occurred. Please try again later.",
        502: "The server received an invalid response from an upstream server.",
        503: "The service is temporarily unavailable. Please try again later.",
        504: "The server took too long to respond. Please try again.",
      }[statusCode] || "An unexpected error occurred. Please try again later."
    : "An unexpected error occurred. Please try again later.";

  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;

  const handleBack = () => {
    window.history.back();
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center p-6",
        "bg-gradient-to-b from-zinc-50 to-zinc-100",
        "dark:from-zinc-900 dark:to-zinc-950",
        className,
      )}
    >
      <div className="w-full max-w-lg text-center">
        {/* Status code */}
        {statusCode && (
          <div className="mb-4">
            <span className="text-8xl font-bold text-zinc-200 dark:text-zinc-800">
              {statusCode}
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="mb-6 inline-flex rounded-full bg-red-100 p-4 dark:bg-red-900/30">
          <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h1 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100 md:text-3xl">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-md text-base text-zinc-600 dark:text-zinc-400">
          {displayDescription}
        </p>

        {/* Error details (dev only) */}
        {isDevelopment() && error && (
          <div className="mb-8 text-left">
            <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Error Details (Development Only)
              </p>
              <code className="break-all text-xs text-red-600 dark:text-red-400">
                {error.message}
              </code>
              {error.stack && (
                <pre className="mt-3 max-h-40 overflow-auto text-xs text-zinc-500">
                  {error.stack}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          {showRetryButton && (
            <Button
              onClick={handleRetry}
              variant="default"
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}

          {showHomeButton && (
            <Button
              onClick={handleHome}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}

          {showBackButton && (
            <Button
              onClick={handleBack}
              variant="ghost"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          )}

          {showSupportButton && (
            <Button asChild variant="ghost" size="lg" className="gap-2">
              <a href={supportUrl}>
                <HelpCircle className="h-4 w-4" />
                Contact Support
              </a>
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-zinc-400 dark:text-zinc-600">
          If this problem persists, please contact our support team.
        </p>
      </div>
    </div>
  );
}

export default ErrorPage;
