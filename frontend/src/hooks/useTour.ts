/**
 * useTour Hook - Convenient hook for product tour functionality
 *
 * Provides easy access to tour state and actions
 */

import { useCallback, useEffect } from "react";
import { useOnboardingStore } from "@/stores/onboarding-store";
import type {
  TourStopId,
  TourProgress,
  TourStop,
} from "@/lib/onboarding/onboarding-types";
import { getTourStopById, tourStops } from "@/lib/onboarding/tour-manager";

interface UseTourOptions {
  /**
   * User ID for initializing tour
   */
  userId?: string;
  /**
   * Auto-initialize tour on mount
   */
  autoInit?: boolean;
  /**
   * Auto-start tour when initialized
   */
  autoStart?: boolean;
  /**
   * Callback when tour is completed
   */
  onComplete?: () => void;
  /**
   * Callback when tour is dismissed
   */
  onDismiss?: () => void;
}

interface UseTourReturn {
  // State
  isActive: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  currentStop: TourStop | null;
  currentStopId: TourStopId | null;
  currentIndex: number;
  totalStops: number;
  progress: TourProgress | null;
  hasNext: boolean;
  hasPrev: boolean;

  // Actions
  start: () => void;
  next: () => void;
  previous: () => void;
  goTo: (stopId: TourStopId) => void;
  complete: () => void;
  dismiss: () => void;
  setActive: (active: boolean) => void;
}

export function useTour(options: UseTourOptions = {}): UseTourReturn {
  const {
    userId,
    autoInit = true,
    autoStart = false,
    onComplete,
    onDismiss,
  } = options;

  const {
    tour,
    tourActive,
    initialize,
    startTour,
    nextTourStop,
    previousTourStop,
    goToTourStop,
    completeTour,
    dismissTour,
    setTourActive,
    getTourProgress,
  } = useOnboardingStore();

  // Initialize on mount if userId provided
  useEffect(() => {
    if (autoInit && userId) {
      initialize(userId);
    }
  }, [autoInit, userId, initialize]);

  // Auto-start tour if configured
  useEffect(() => {
    if (autoStart && tour && tour.status === "not_started") {
      startTour();
    }
  }, [autoStart, tour?.status, startTour]);

  // Watch for completion/dismissal
  useEffect(() => {
    if (tour?.status === "completed" && onComplete) {
      onComplete();
    }
    if (tour?.status === "dismissed" && onDismiss) {
      onDismiss();
    }
  }, [tour?.status, onComplete, onDismiss]);

  // Computed state
  const currentStopId = tour?.currentStopId ?? null;
  const currentStop = currentStopId
    ? (getTourStopById(currentStopId) ?? null)
    : null;
  const currentIndex = currentStop
    ? tourStops.findIndex((s) => s.id === currentStop.id)
    : -1;
  const totalStops = tourStops.length;
  const progress = getTourProgress();
  const hasNext = currentIndex >= 0 && currentIndex < totalStops - 1;
  const hasPrev = currentIndex > 0;
  const isActive = tourActive;
  const isCompleted = tour?.status === "completed";
  const isDismissed = tour?.status === "dismissed";

  // Actions
  const start = useCallback(() => {
    startTour();
  }, [startTour]);

  const next = useCallback(() => {
    if (hasNext) {
      nextTourStop();
    } else {
      completeTour();
      onComplete?.();
    }
  }, [hasNext, nextTourStop, completeTour, onComplete]);

  const previous = useCallback(() => {
    if (hasPrev) {
      previousTourStop();
    }
  }, [hasPrev, previousTourStop]);

  const goTo = useCallback(
    (stopId: TourStopId) => {
      goToTourStop(stopId);
    },
    [goToTourStop],
  );

  const complete = useCallback(() => {
    completeTour();
    onComplete?.();
  }, [completeTour, onComplete]);

  const dismiss = useCallback(() => {
    dismissTour();
    onDismiss?.();
  }, [dismissTour, onDismiss]);

  const setActive = useCallback(
    (active: boolean) => {
      setTourActive(active);
    },
    [setTourActive],
  );

  return {
    // State
    isActive,
    isCompleted,
    isDismissed,
    currentStop,
    currentStopId,
    currentIndex,
    totalStops,
    progress,
    hasNext,
    hasPrev,

    // Actions
    start,
    next,
    previous,
    goTo,
    complete,
    dismiss,
    setActive,
  };
}

/**
 * Hook to check if tour should be shown
 */
export function useShouldShowTour(userId?: string): boolean {
  const { tour, tourConfig, initialize, shouldShowTour } = useOnboardingStore();

  useEffect(() => {
    if (userId) {
      initialize(userId);
    }
  }, [userId, initialize]);

  return shouldShowTour();
}

/**
 * Hook to get current tour stop data
 */
export function useCurrentTourStop(): TourStop | null {
  const { tour } = useOnboardingStore();
  const currentStopId = tour?.currentStopId;

  if (!currentStopId) return null;

  return getTourStopById(currentStopId) ?? null;
}
