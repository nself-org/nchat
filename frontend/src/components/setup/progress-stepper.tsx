"use client";

import {
  Info,
  Monitor,
  Server,
  User,
  Palette,
  Layout,
  Shield,
  Users,
  Settings,
  CheckCircle,
  Brush,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  visitedSteps?: Set<number>;
}

const stepLabels = [
  "Welcome",
  "Environment",
  "Backend",
  "Owner",
  "Brand",
  "Theme",
  "Landing",
  "Auth",
  "Access",
  "Features",
  "Deploy",
  "Review",
];

const stepIcons = [
  Info,
  Monitor,
  Server,
  User,
  Palette,
  Brush,
  Layout,
  Shield,
  Users,
  Settings,
  Rocket,
  CheckCircle,
];

export function ProgressStepper({
  currentStep,
  totalSteps,
  onStepClick,
  visitedSteps = new Set(),
}: ProgressStepperProps) {
  return (
    <div className="w-full px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="relative flex items-center justify-between">
          {/* Background line - positioned at step circle height */}
          <div className="absolute left-0 right-0 top-6 h-0.5 bg-zinc-900/10 dark:bg-white/10" />

          {/* Active progress line - nself glowing blues */}
          <div
            className="absolute left-0 top-6 h-0.5 bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
          />

          {/* Steps */}
          {stepLabels.map((label, index) => {
            const Icon = stepIcons[index];
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isVisited = visitedSteps.has(index);
            const isUnvisited = index > currentStep && !visitedSteps.has(index);
            const isClickable = visitedSteps.has(index) || index <= currentStep;

            const handleClick = () => {
              if (isClickable && onStepClick) {
                onStepClick(index);
              }
            };

            const stepContent = (
              <>
                {/* Step circle - centered on the progress line */}
                <div
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300",
                    // Current active step: nself cyan glow
                    isCurrent &&
                      "shadow-glow border-[#00D4FF] bg-[#00D4FF] text-zinc-900",
                    // All visited steps: solid dark blue background with blue text
                    (isCompleted || (isVisited && index > currentStep)) &&
                      "border-[#0EA5E9] bg-blue-50 text-[#0EA5E9] dark:border-[#0EA5E9] dark:bg-blue-950 dark:text-[#0EA5E9]",
                    // Unvisited steps: white/dark background to block line
                    isUnvisited &&
                      "border-zinc-900/10 bg-white text-zinc-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-500",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-all duration-300",
                      // Current active: zinc-900 icon (Protocol style)
                      isCurrent && "text-zinc-900",
                      // All visited steps: nself blue icons
                      (isCompleted || (isVisited && index > currentStep)) &&
                        "text-[#0EA5E9] dark:text-[#0EA5E9]",
                      // Unvisited: zinc gray icon
                      isUnvisited && "text-zinc-400 dark:text-zinc-500",
                    )}
                  />

                  {/* Small numbered circle */}
                  <div
                    className={cn(
                      "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white text-xs font-bold transition-all duration-300 dark:border-zinc-900",
                      // Current active: glowing nself blue
                      isCurrent && "shadow-glow bg-[#0EA5E9] text-white",
                      // All visited steps: nself blue variations
                      (isCompleted || (isVisited && index > currentStep)) &&
                        "bg-[#00D4FF] text-zinc-900 dark:bg-[#0EA5E9] dark:text-white",
                      // Unvisited: Protocol zinc colors
                      isUnvisited &&
                        "bg-zinc-300 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-400",
                    )}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Step label */}
                <div
                  className={cn(
                    "mt-2 text-center text-sm font-medium transition-all duration-300",
                    // Current active: zinc text (Protocol style)
                    isCurrent && "font-semibold text-zinc-900 dark:text-white",
                    // All visited steps: nself blue text
                    (isCompleted || (isVisited && index > currentStep)) &&
                      "text-[#0EA5E9] dark:text-[#00D4FF]",
                    // Unvisited: zinc gray text
                    isUnvisited &&
                      "text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white",
                  )}
                >
                  {label}
                </div>
              </>
            );

            // Use conditional rendering to avoid undefined role attribute
            if (isClickable && onStepClick) {
              return (
                <div
                  key={index}
                  className={cn(
                    "relative z-10 flex cursor-pointer flex-col items-center",
                    isClickable && "hover:scale-105",
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={handleClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClick();
                    }
                  }}
                >
                  {stepContent}
                </div>
              );
            }

            return (
              <div
                key={index}
                className="relative z-10 flex flex-col items-center"
              >
                {stepContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
