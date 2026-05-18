"use client";

import { cn } from "@/lib/utils";

interface TourStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function TourStepIndicator({
  currentStep,
  totalSteps,
  className,
}: TourStepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200",
            index === currentStep
              ? "w-4 bg-primary"
              : index < currentStep
                ? "bg-primary/60 w-1.5"
                : "w-1.5 bg-zinc-300 dark:bg-zinc-600",
          )}
        />
      ))}
    </div>
  );
}
