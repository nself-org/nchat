"use client";

import { useEffect } from "react";
import { ErrorPage } from "@/components/error/error-page";
import { errorReporter } from "@/lib/error/error-reporter";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js error boundary page.
 * This catches errors at the route level and displays an error page.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report error to error tracking service
    errorReporter.reportError(error, {
      tags: ["route-error"],
      context: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <ErrorPage
      error={error}
      statusCode={500}
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. Please try again."
      onRetry={reset}
      showHomeButton={true}
      showBackButton={true}
      showRetryButton={true}
    />
  );
}
