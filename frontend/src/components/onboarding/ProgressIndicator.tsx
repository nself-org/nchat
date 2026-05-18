"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type {
  OnboardingStepId,
  OnboardingStepStatus,
} from "@/lib/onboarding/onboarding-types";
import {
  onboardingSteps,
  getStepIndex,
} from "@/lib/onboarding/onboarding-steps";

interface ProgressIndicatorProps {
  currentStepId: OnboardingStepId;
  stepStatuses: Record<OnboardingStepId, OnboardingStepStatus>;
  onStepClick?: (stepId: OnboardingStepId) => void;
  variant?: "dots" | "bar" | "steps";
  className?: string;
}

export function ProgressIndicator({
  currentStepId,
  stepStatuses,
  onStepClick,
  variant = "dots",
  className,
}: ProgressIndicatorProps) {
  const currentIndex = getStepIndex(currentStepId);
  const totalSteps = onboardingSteps.length;
  const completedCount = Object.values(stepStatuses).filter(
    (status) => status === "completed" || status === "skipped",
  ).length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);

  if (variant === "bar") {
    return (
      <div className={cn("w-full", className)}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            Step {currentIndex + 1} of {totalSteps}
          </span>
          <span className="font-medium text-zinc-900 dark:text-white">
            {percentComplete}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === "steps") {
    return (
      <nav aria-label="Progress" className={cn("w-full", className)}>
        <ol className="flex items-center justify-between">
          {onboardingSteps.map((step, index) => {
            const status = stepStatuses[step.id] || "pending";
            const isCurrent = step.id === currentStepId;
            const isClickable =
              onStepClick &&
              (status === "completed" ||
                status === "skipped" ||
                index <= currentIndex);

            return (
              <li key={step.id} className="relative flex-1">
                {index !== 0 && (
                  <div
                    className={cn(
                      "absolute left-0 right-0 top-4 h-0.5 -translate-y-1/2",
                      status === "completed" || status === "skipped"
                        ? "bg-primary"
                        : "bg-zinc-200 dark:bg-zinc-700",
                    )}
                    style={{ left: "-50%", right: "50%" }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "group relative flex flex-col items-center",
                    isClickable && "cursor-pointer",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                      isCurrent
                        ? "border-primary bg-primary text-white"
                        : status === "completed"
                          ? "border-primary bg-primary text-white"
                          : status === "skipped"
                            ? "border-zinc-400 bg-zinc-400 text-white"
                            : "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800",
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : status === "skipped" ? (
                      <span className="text-xs">-</span>
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "mt-2 hidden max-w-[80px] truncate text-center text-xs font-medium sm:block",
                      isCurrent
                        ? "text-primary"
                        : status === "completed" || status === "skipped"
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-500 dark:text-zinc-400",
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Default: dots variant
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {onboardingSteps.map((step, index) => {
        const status = stepStatuses[step.id] || "pending";
        const isCurrent = step.id === currentStepId;
        const isClickable =
          onStepClick &&
          (status === "completed" ||
            status === "skipped" ||
            index <= currentIndex);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick?.(step.id)}
            disabled={!isClickable}
            className={cn(
              "transition-all duration-200",
              isClickable && "cursor-pointer hover:scale-110",
              isCurrent
                ? "h-2 w-8 rounded-full bg-primary"
                : status === "completed"
                  ? "h-2 w-2 rounded-full bg-primary"
                  : status === "skipped"
                    ? "h-2 w-2 rounded-full bg-zinc-400"
                    : "h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600",
            )}
            aria-label={`${step.title} - ${status}`}
            aria-current={isCurrent ? "step" : undefined}
          />
        );
      })}
    </div>
  );
}
