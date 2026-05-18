"use client";

import { Map, Play, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingStepProps } from "@/lib/onboarding/onboarding-types";
import { tourStops } from "@/lib/onboarding/tour-manager";

interface TourStepProps extends OnboardingStepProps {
  onStartTour?: () => void;
}

export function TourStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  onStartTour,
}: TourStepProps) {
  const handleStartTour = () => {
    onStartTour?.();
    onNext();
  };

  const handleSkipTour = () => {
    onSkip?.();
  };

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <Map className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Take a Quick Tour
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Learn how to get the most out of nchat with an interactive
          walkthrough.
        </p>
      </div>

      {/* Tour Preview */}
      <div className="mx-auto mb-8 w-full max-w-lg">
        <div className="from-primary/10 to-primary/5 mb-6 rounded-2xl bg-gradient-to-br p-6">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              About 2 minutes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {tourStops.slice(0, 4).map((stop, index) => (
              <div
                key={stop.id}
                className="flex items-center gap-2 rounded-lg bg-white/50 p-3 dark:bg-zinc-800/50"
              >
                <div className="bg-primary/20 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {stop.title}
                </span>
              </div>
            ))}
          </div>

          {tourStops.length > 4 && (
            <p className="mt-3 text-center text-sm text-zinc-500">
              +{tourStops.length - 4} more stops
            </p>
          )}
        </div>

        {/* What you'll learn */}
        <div className="space-y-3">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            What you'll learn:
          </h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Navigate between channels and direct messages
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Send messages, reactions, and start threads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Search for messages and files
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Use keyboard shortcuts like a pro
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto w-full max-w-lg text-center">
        <Button size="lg" onClick={handleStartTour} className="min-w-[200px]">
          <Play className="mr-2 h-4 w-4" />
          Start Tour
        </Button>
        <p className="mt-3 text-xs text-zinc-500">
          You can always restart the tour from Settings
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && (
            <Button variant="ghost" onClick={handleSkipTour}>
              Skip Tour
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
