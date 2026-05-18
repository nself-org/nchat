/**
 * Onboarding Module - Public API
 *
 * Exports all onboarding-related utilities, types, and managers
 */

// Types
export * from "./onboarding-types";

// Step Definitions
export {
  onboardingSteps,
  getStepById,
  getNextStep,
  getPreviousStep,
  getRequiredSteps,
  getOptionalSteps,
  getTotalSteps,
  getStepIndex,
  getStepByIndex,
  getTotalEstimatedTime,
  getStepIds,
  canSkipStep,
  isStepRequired,
  validateStep,
  stepValidators,
  defaultOnboardingPreferences,
  defaultNotificationSettings,
  defaultUserProfile,
} from "./onboarding-steps";

// Onboarding Manager
export {
  createInitialOnboardingState,
  getStepState,
  updateStepState,
  calculateOnboardingProgress,
  isOnboardingCompleted,
  areAllStepsDone,
  startOnboarding,
  completeCurrentStep,
  skipCurrentStep,
  goToPreviousStep,
  goToStep,
  skipOnboarding,
  resetOnboarding,
  updateStepData,
  getStepData,
  serializeOnboardingState,
  deserializeOnboardingState,
  defaultOnboardingConfig,
  applyOnboardingConfig,
  getStatusLabel,
  getStepStatusLabel,
  shouldShowOnboarding,
  canSkipRemainingOnboarding,
  formatTimeEstimate,
} from "./onboarding-manager";

// Tour Manager
export {
  tourStops,
  getTourStopById,
  getNextTourStop,
  getPreviousTourStop,
  getTourStopIndex,
  getTotalTourStops,
  getTourStopIds,
  getTourStopByIndex,
  calculateTourProgress,
  createInitialTourState,
  isTourCompleted,
  isTourInProgress,
  isStopCompleted,
  getElementPosition,
  calculateTooltipPosition,
  scrollToElement,
  tourActionHandlers,
  executeTourAction,
  defaultTourConfig,
} from "./tour-manager";

// Feature Discovery
export {
  featureTips,
  proTips,
  keyboardShortcutTips,
  whatsNewItems,
  getRandomProTip,
  getProTipsByCategory,
  getRandomShortcutTip,
  createInitialFeatureDiscoveryState,
  markFeatureDiscovered,
  markTipSeen,
  dismissTip,
  getNextTipToShow,
  isFeatureDiscovered,
  getFeatureTipById,
  getTipsForFeature,
  createInitialWhatsNewState,
  getUnseenWhatsNewItems,
  markWhatsNewSeen,
  markAllWhatsNewSeen,
  dismissWhatsNew,
  defaultFeatureDiscoveryConfig,
} from "./feature-discovery";

// Analytics
export {
  setAnalyticsTracker,
  getAnalyticsTracker,
  defaultAnalyticsTracker,
  trackOnboardingStepStarted,
  trackOnboardingStepCompleted,
  trackOnboardingStepSkipped,
  trackOnboardingCompleted,
  trackOnboardingAbandoned,
  trackTourStarted,
  trackTourStopViewed,
  trackTourStopSkipped,
  trackTourCompleted,
  trackTourDismissed,
  trackTipShown,
  trackTipDismissed,
  trackTipClicked,
  trackFeatureUsed,
  calculateStepDuration,
  getAnalyticsSummary,
  clearAnalytics,
  exportAnalytics,
} from "./onboarding-analytics";
