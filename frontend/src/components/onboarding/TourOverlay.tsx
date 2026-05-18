"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { tourStops, getTourStopById } from "@/lib/onboarding/tour-manager";
import { TourHighlight } from "./TourHighlight";
import { TourTooltip } from "./TourTooltip";

interface TourOverlayProps {
  isActive?: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}

export function TourOverlay({
  isActive: externalIsActive,
  onComplete,
  onDismiss,
}: TourOverlayProps) {
  const {
    tour,
    tourActive,
    nextTourStop,
    previousTourStop,
    completeTour,
    dismissTour,
  } = useOnboardingStore();

  const isActive = externalIsActive ?? tourActive;
  const currentStopId = tour?.currentStopId;
  const currentStop = currentStopId ? getTourStopById(currentStopId) : null;
  const currentIndex = currentStop
    ? tourStops.findIndex((s) => s.id === currentStop.id)
    : -1;
  const totalStops = tourStops.length;
  const hasNext = currentIndex < totalStops - 1;
  const hasPrev = currentIndex > 0;

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          handleDismiss();
          break;
        case "ArrowRight":
        case "Enter":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStopId]);

  // Prevent body scroll when tour is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      nextTourStop();
    } else {
      completeTour();
      onComplete?.();
    }
  }, [hasNext, nextTourStop, completeTour, onComplete]);

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      previousTourStop();
    }
  }, [hasPrev, previousTourStop]);

  const handleDismiss = useCallback(() => {
    dismissTour();
    onDismiss?.();
  }, [dismissTour, onDismiss]);

  if (!isActive || !currentStop) return null;

  return (
    <div className="fixed inset-0 z-[9997]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleDismiss}
        onKeyDown={(e) => e.key === "Escape" && handleDismiss()}
        role="button"
        tabIndex={0}
        aria-label="Dismiss tour"
      />

      {/* Highlight */}
      {currentStop.placement !== "center" && (
        <TourHighlight
          targetSelector={currentStop.targetSelector}
          padding={currentStop.spotlightPadding ?? 8}
          isActive={true}
        />
      )}

      {/* Tooltip */}
      <TourTooltip
        stop={currentStop}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleDismiss}
        hasNext={hasNext}
        hasPrev={hasPrev}
        currentIndex={currentIndex}
        totalStops={totalStops}
      />
    </div>
  );
}
