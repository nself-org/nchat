"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ProgressBarProps {
  /** Current progress value (0-100) */
  value?: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Progress bar variant */
  variant?: "default" | "gradient" | "striped" | "animated";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color scheme */
  color?: "primary" | "success" | "warning" | "error";
  /** Indeterminate/loading state */
  indeterminate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const colorClasses = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

const gradientClasses = {
  primary: "bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9]",
  success: "bg-gradient-to-r from-green-400 to-green-600",
  warning: "bg-gradient-to-r from-yellow-400 to-orange-500",
  error: "bg-gradient-to-r from-red-400 to-red-600",
};

/**
 * Progress bar component
 * Supports determinate and indeterminate states
 */
export function ProgressBar({
  value = 0,
  showPercentage = false,
  variant = "default",
  size = "md",
  color = "primary",
  indeterminate = false,
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const barColorClass =
    variant === "gradient" ? gradientClasses[color] : colorClasses[color];

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar track */}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={indeterminate ? "Loading" : `${clampedValue}% complete`}
      >
        {indeterminate ? (
          // Indeterminate animation
          <div
            className={cn(
              "h-full w-1/3 animate-[slide_1s_ease-in-out_infinite]",
              barColorClass,
            )}
          />
        ) : (
          // Determinate progress
          <div
            className={cn(
              "h-full transition-all duration-300 ease-out",
              barColorClass,
              variant === "striped" &&
                "bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]",
              variant === "animated" && "animate-[shimmer_2s_infinite]",
            )}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>

      {/* Percentage text */}
      {showPercentage && !indeterminate && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {Math.round(clampedValue)}%
        </p>
      )}
    </div>
  );
}

/**
 * Circular progress indicator
 */
export function CircularProgress({
  value = 0,
  size = 64,
  strokeWidth = 4,
  color = "primary",
  indeterminate = false,
  showValue = false,
  className,
}: {
  value?: number;
  size?: number;
  strokeWidth?: number;
  color?: "primary" | "success" | "warning" | "error";
  indeterminate?: boolean;
  showValue?: boolean;
  className?: string;
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  const strokeColors = {
    primary: "stroke-primary",
    success: "stroke-green-500",
    warning: "stroke-yellow-500",
    error: "stroke-red-500",
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <svg
        width={size}
        height={size}
        className={cn(indeterminate && "animate-spin")}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-25"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          className={cn(
            strokeColors[color],
            "transition-all duration-300 ease-out",
            "origin-center -rotate-90",
          )}
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        />
      </svg>

      {/* Value text */}
      {showValue && !indeterminate && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: size / 4 }}
        >
          <span className="font-semibold">{Math.round(clampedValue)}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Step progress indicator
 */
export function StepProgress({
  steps,
  currentStep,
  variant = "default",
  className,
}: {
  steps: string[] | number;
  currentStep: number;
  variant?: "default" | "dots" | "minimal";
  className?: string;
}) {
  const stepCount = typeof steps === "number" ? steps : steps.length;
  const stepLabels = typeof steps === "number" ? [] : steps;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: stepCount }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={index} className="flex flex-1 flex-col items-center">
              {/* Step indicator */}
              <div className="flex w-full items-center">
                {/* Connector line (before) */}
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isCompleted || isCurrent ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}

                {/* Step circle/dot */}
                {variant === "dots" ? (
                  <div
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full transition-colors",
                      isCompleted && "bg-primary",
                      isCurrent && "ring-primary/20 bg-primary ring-4",
                      isUpcoming && "bg-muted",
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      isCompleted &&
                        "text-primary-foreground border-primary bg-primary",
                      isCurrent && "border-primary bg-background text-primary",
                      isUpcoming &&
                        "border-muted bg-background text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                )}

                {/* Connector line (after) */}
                {index < stepCount - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
              </div>

              {/* Step label */}
              {variant !== "minimal" && stepLabels[index] && (
                <p
                  className={cn(
                    "mt-2 text-xs transition-colors",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {stepLabels[index]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Upload progress with file info
 */
export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status = "uploading",
  onCancel,
  className,
}: {
  fileName: string;
  fileSize?: string;
  progress?: number;
  status?: "uploading" | "success" | "error" | "paused";
  onCancel?: () => void;
  className?: string;
}) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (status !== "uploading") return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  const statusConfig = {
    uploading: {
      color: "primary" as const,
      text: `Uploading${dots}`,
      icon: null,
    },
    success: {
      color: "success" as const,
      text: "Upload complete",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    },
    error: {
      color: "error" as const,
      text: "Upload failed",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
    },
    paused: {
      color: "warning" as const,
      text: "Upload paused",
      icon: null,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* File info and progress */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{fileName}</p>
            {onCancel && status === "uploading" && (
              <button
                onClick={onCancel}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Cancel upload"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {fileSize && (
            <p className="text-xs text-muted-foreground">{fileSize}</p>
          )}

          {/* Progress bar */}
          <div className="mt-2">
            <ProgressBar
              value={progress}
              color={config.color}
              size="sm"
              indeterminate={status === "uploading" && progress === undefined}
            />
          </div>

          {/* Status text */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {config.icon}
            <span>{config.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
