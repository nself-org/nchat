"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  isLastStep?: boolean;
  className?: string;
}

export function TourNavigation({
  onNext,
  onPrev,
  onSkip,
  hasNext,
  hasPrev,
  isLastStep,
  className,
}: TourNavigationProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrev}
        disabled={!hasPrev}
        className="text-zinc-600 dark:text-zinc-400"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Skip Tour
        </Button>

        <Button size="sm" onClick={onNext}>
          {isLastStep ? (
            "Finish"
          ) : (
            <>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
