"use client";

import { useState, useCallback } from "react";
import { X, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureTipProps {
  title: string;
  description: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function FeatureTip({
  title,
  description,
  onDismiss,
  onAction,
  actionLabel = "Learn more",
  variant = "default",
  className,
}: FeatureTipProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  if (!isVisible) return null;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "bg-primary/5 border-primary/20 flex items-start gap-3 rounded-lg border p-3",
          "transition-all duration-200",
          className,
        )}
      >
        <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">{title}:</span> {description}
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-1 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="h-3 w-3 text-zinc-500" />
          </button>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20",
          "transition-all duration-200",
          className,
        )}
      >
        <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-500" />
        <span className="flex-1 text-sm text-amber-800 dark:text-amber-200">
          {title}
        </span>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-1 transition-colors hover:bg-amber-200 dark:hover:bg-amber-800"
          >
            <X className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </button>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "from-primary/10 to-primary/5 border-primary/20 rounded-xl border bg-gradient-to-r p-4",
        "transition-all duration-200",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-zinc-900 dark:text-white">
              {title}
            </h4>
            {onDismiss && (
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded p-1 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {actionLabel}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
