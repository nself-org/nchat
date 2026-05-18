/**
 * Onboarding Store - Zustand store for onboarding, tour, and feature discovery state
 *
 * Manages all onboarding-related state with persistence and devtools support
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  OnboardingState,
  OnboardingStepId,
  OnboardingProgress,
  OnboardingConfig,
  TourState,
  TourStopId,
  TourProgress,
  TourConfig,
  FeatureDiscoveryState,
  FeatureDiscoveryConfig,
  FeatureId,
  WhatsNewState,
  UserProfile,
  OnboardingPreferences,
  NotificationSettings,
  SuggestedChannel,
  TeamInvitation,
  InvitationResult,
} from "@/lib/onboarding/onboarding-types";

import {
  createInitialOnboardingState,
  calculateOnboardingProgress,
  completeCurrentStep,
  skipCurrentStep,
  goToPreviousStep,
  goToStep,
  skipOnboarding,
  resetOnboarding,
  updateStepData,
  isOnboardingCompleted,
  defaultOnboardingConfig,
  startOnboarding,
} from "@/lib/onboarding/onboarding-manager";

import {
  createInitialTourState,
  calculateTourProgress,
  getTourStopById,
  getNextTourStop,
  isTourCompleted,
  defaultTourConfig,
  tourStops,
} from "@/lib/onboarding/tour-manager";

import {
  createInitialFeatureDiscoveryState,
  createInitialWhatsNewState,
  markFeatureDiscovered,
  markTipSeen,
  dismissTip,
  markWhatsNewSeen,
  markAllWhatsNewSeen,
  dismissWhatsNew,
  defaultFeatureDiscoveryConfig,
} from "@/lib/onboarding/feature-discovery";

import {
  trackOnboardingStepStarted,
  trackOnboardingStepCompleted,
  trackOnboardingStepSkipped,
  trackOnboardingCompleted,
  trackTourStarted,
  trackTourStopViewed,
  trackTourCompleted,
  trackTourDismissed,
  trackTipShown,
  trackTipDismissed,
} from "@/lib/onboarding/onboarding-analytics";

// ============================================================================
// Store State Types
// ============================================================================

export interface OnboardingStoreState {
  // User identification
  userId: string | null;

  // Onboarding state
  onboarding: OnboardingState | null;
  onboardingConfig: OnboardingConfig;

  // Tour state
  tour: TourState | null;
  tourConfig: TourConfig;
  tourActive: boolean;

  // Feature discovery state
  featureDiscovery: FeatureDiscoveryState | null;
  featureDiscoveryConfig: FeatureDiscoveryConfig;

  // What's new state
  whatsNew: WhatsNewState;
  whatsNewModalOpen: boolean;

  // UI state
  onboardingDialogOpen: boolean;
  currentStepStartTime: Date | null;

  // Form data (temporary storage during onboarding)
  profileData: Partial<UserProfile>;
  preferencesData: Partial<OnboardingPreferences>;
  notificationSettings: Partial<NotificationSettings>;
  selectedChannels: string[];
  teamInvitations: TeamInvitation[];
  invitationResults: InvitationResult[];

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface OnboardingStoreActions {
  // Initialization
  initialize: (userId: string) => void;
  reset: () => void;

  // Onboarding actions
  startOnboarding: () => void;
  completeStep: (data?: Record<string, unknown>) => void;
  skipStep: () => void;
  previousStep: () => void;
  goToStep: (stepId: OnboardingStepId) => void;
  skipAllOnboarding: () => void;
  resetOnboarding: () => void;
  setOnboardingConfig: (config: Partial<OnboardingConfig>) => void;

  // Tour actions
  startTour: () => void;
  nextTourStop: () => void;
  previousTourStop: () => void;
  goToTourStop: (stopId: TourStopId) => void;
  completeTour: () => void;
  dismissTour: () => void;
  setTourActive: (active: boolean) => void;
  setTourConfig: (config: Partial<TourConfig>) => void;

  // Feature discovery actions
  discoverFeature: (featureId: FeatureId) => void;
  seeTip: (tipId: string) => void;
  dismissFeatureTip: (tipId: string) => void;
  setFeatureDiscoveryConfig: (config: Partial<FeatureDiscoveryConfig>) => void;

  // What's new actions
  seeWhatsNewItem: (itemId: string) => void;
  seeAllWhatsNew: () => void;
  dismissWhatsNewModal: (days?: number) => void;
  openWhatsNewModal: () => void;
  closeWhatsNewModal: () => void;

  // Form data actions
  updateProfileData: (data: Partial<UserProfile>) => void;
  updatePreferencesData: (data: Partial<OnboardingPreferences>) => void;
  updateNotificationSettings: (data: Partial<NotificationSettings>) => void;
  setSelectedChannels: (channelIds: string[]) => void;
  toggleChannelSelection: (channelId: string) => void;
  addTeamInvitation: (invitation: TeamInvitation) => void;
  removeTeamInvitation: (email: string) => void;
  setInvitationResults: (results: InvitationResult[]) => void;
  clearFormData: () => void;

  // UI actions
  setOnboardingDialogOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters
  getOnboardingProgress: () => OnboardingProgress | null;
  getTourProgress: () => TourProgress | null;
  shouldShowOnboarding: () => boolean;
  shouldShowTour: () => boolean;
  shouldShowWhatsNew: () => boolean;
}

export type OnboardingStore = OnboardingStoreState & OnboardingStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: OnboardingStoreState = {
  userId: null,
  onboarding: null,
  onboardingConfig: defaultOnboardingConfig,
  tour: null,
  tourConfig: defaultTourConfig,
  tourActive: false,
  featureDiscovery: null,
  featureDiscoveryConfig: defaultFeatureDiscoveryConfig,
  whatsNew: createInitialWhatsNewState(),
  whatsNewModalOpen: false,
  onboardingDialogOpen: false,
  currentStepStartTime: null,
  profileData: {},
  preferencesData: {},
  notificationSettings: {},
  selectedChannels: [],
  teamInvitations: [],
  invitationResults: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useOnboardingStore = create<OnboardingStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // ================================================================
          // Initialization
          // ================================================================

          initialize: (userId: string) =>
            set(
              (state) => {
                state.userId = userId;

                // Only create new states if not already existing for this user
                if (!state.onboarding || state.onboarding.userId !== userId) {
                  state.onboarding = createInitialOnboardingState(userId);
                }

                if (!state.tour || state.tour.userId !== userId) {
                  state.tour = createInitialTourState(userId);
                }

                if (
                  !state.featureDiscovery ||
                  state.featureDiscovery.userId !== userId
                ) {
                  state.featureDiscovery =
                    createInitialFeatureDiscoveryState(userId);
                }
              },
              false,
              "onboarding/initialize",
            ),

          reset: () => set(() => initialState, false, "onboarding/reset"),

          // ================================================================
          // Onboarding Actions
          // ================================================================

          startOnboarding: () =>
            set(
              (state) => {
                if (!state.onboarding) return;

                state.onboarding = startOnboarding(state.onboarding);
                state.currentStepStartTime = new Date();

                trackOnboardingStepStarted(state.onboarding.currentStepId);
              },
              false,
              "onboarding/startOnboarding",
            ),

          completeStep: (data) =>
            set(
              (state) => {
                if (!state.onboarding) return;

                const startTime = state.currentStepStartTime;
                const currentStepId = state.onboarding.currentStepId;

                // Track completion
                if (startTime) {
                  const duration = Math.round(
                    (new Date().getTime() - startTime.getTime()) / 1000,
                  );
                  trackOnboardingStepCompleted(currentStepId, duration, data);
                }

                state.onboarding = completeCurrentStep(state.onboarding, data);
                state.currentStepStartTime = new Date();

                // Check if onboarding is now completed
                if (isOnboardingCompleted(state.onboarding)) {
                  trackOnboardingCompleted(
                    state.onboarding.startedAt
                      ? Math.round(
                          (new Date().getTime() -
                            state.onboarding.startedAt.getTime()) /
                            1000,
                        )
                      : 0,
                  );
                } else {
                  trackOnboardingStepStarted(state.onboarding.currentStepId);
                }
              },
              false,
              "onboarding/completeStep",
            ),

          skipStep: () =>
            set(
              (state) => {
                if (!state.onboarding) return;

                const currentStepId = state.onboarding.currentStepId;
                trackOnboardingStepSkipped(currentStepId);

                state.onboarding = skipCurrentStep(state.onboarding);
                state.currentStepStartTime = new Date();

                if (!isOnboardingCompleted(state.onboarding)) {
                  trackOnboardingStepStarted(state.onboarding.currentStepId);
                }
              },
              false,
              "onboarding/skipStep",
            ),

          previousStep: () =>
            set(
              (state) => {
                if (!state.onboarding) return;

                state.onboarding = goToPreviousStep(state.onboarding);
                state.currentStepStartTime = new Date();

                trackOnboardingStepStarted(state.onboarding.currentStepId);
              },
              false,
              "onboarding/previousStep",
            ),

          goToStep: (stepId) =>
            set(
              (state) => {
                if (!state.onboarding) return;

                state.onboarding = goToStep(state.onboarding, stepId);
                state.currentStepStartTime = new Date();

                trackOnboardingStepStarted(stepId);
              },
              false,
              "onboarding/goToStep",
            ),

          skipAllOnboarding: () =>
            set(
              (state) => {
                if (!state.onboarding) return;

                state.onboarding = skipOnboarding(state.onboarding);
              },
              false,
              "onboarding/skipAllOnboarding",
            ),

          resetOnboarding: () =>
            set(
              (state) => {
                if (!state.onboarding) return;

                state.onboarding = resetOnboarding(state.onboarding);
                state.currentStepStartTime = null;
                state.profileData = {};
                state.preferencesData = {};
                state.notificationSettings = {};
                state.selectedChannels = [];
                state.teamInvitations = [];
                state.invitationResults = [];
              },
              false,
              "onboarding/resetOnboarding",
            ),

          setOnboardingConfig: (config) =>
            set(
              (state) => {
                state.onboardingConfig = {
                  ...state.onboardingConfig,
                  ...config,
                };
              },
              false,
              "onboarding/setOnboardingConfig",
            ),

          // ================================================================
          // Tour Actions
          // ================================================================

          startTour: () =>
            set(
              (state) => {
                if (!state.tour) return;

                state.tour.status = "in_progress";
                state.tour.startedAt = new Date();
                state.tour.currentStopId = tourStops[0]?.id ?? null;
                state.tourActive = true;

                trackTourStarted();
              },
              false,
              "onboarding/startTour",
            ),

          nextTourStop: () =>
            set(
              (state) => {
                if (!state.tour || !state.tour.currentStopId) return;

                const currentStopId = state.tour.currentStopId;
                trackTourStopViewed(currentStopId);

                // Mark current as completed
                if (!state.tour.completedStops.includes(currentStopId)) {
                  state.tour.completedStops.push(currentStopId);
                }

                // Move to next
                const nextStop = getNextTourStop(currentStopId);
                if (nextStop) {
                  state.tour.currentStopId = nextStop.id;
                } else {
                  // Tour complete
                  state.tour.status = "completed";
                  state.tour.completedAt = new Date();
                  state.tour.currentStopId = null;
                  state.tourActive = false;

                  trackTourCompleted(
                    state.tour.startedAt
                      ? Math.round(
                          (new Date().getTime() -
                            state.tour.startedAt.getTime()) /
                            1000,
                        )
                      : 0,
                  );
                }
              },
              false,
              "onboarding/nextTourStop",
            ),

          previousTourStop: () =>
            set(
              (state) => {
                if (!state.tour || !state.tour.currentStopId) return;

                const currentStop = getTourStopById(state.tour.currentStopId);
                if (!currentStop || currentStop.order === 0) return;

                const prevStop = tourStops.find(
                  (s) => s.order === currentStop.order - 1,
                );
                if (prevStop) {
                  state.tour.currentStopId = prevStop.id;
                }
              },
              false,
              "onboarding/previousTourStop",
            ),

          goToTourStop: (stopId) =>
            set(
              (state) => {
                if (!state.tour) return;

                const stop = getTourStopById(stopId);
                if (stop) {
                  state.tour.currentStopId = stopId;
                }
              },
              false,
              "onboarding/goToTourStop",
            ),

          completeTour: () =>
            set(
              (state) => {
                if (!state.tour) return;

                state.tour.status = "completed";
                state.tour.completedAt = new Date();
                state.tour.completedStops = tourStops.map((s) => s.id);
                state.tour.currentStopId = null;
                state.tourActive = false;

                trackTourCompleted(
                  state.tour.startedAt
                    ? Math.round(
                        (new Date().getTime() -
                          state.tour.startedAt.getTime()) /
                          1000,
                      )
                    : 0,
                );
              },
              false,
              "onboarding/completeTour",
            ),

          dismissTour: () =>
            set(
              (state) => {
                if (!state.tour) return;

                const lastStopId = state.tour.currentStopId;

                state.tour.status = "dismissed";
                state.tour.dismissedAt = new Date();
                state.tour.currentStopId = null;
                state.tourActive = false;

                if (lastStopId) {
                  trackTourDismissed(lastStopId);
                }
              },
              false,
              "onboarding/dismissTour",
            ),

          setTourActive: (active) =>
            set(
              (state) => {
                state.tourActive = active;
              },
              false,
              "onboarding/setTourActive",
            ),

          setTourConfig: (config) =>
            set(
              (state) => {
                state.tourConfig = { ...state.tourConfig, ...config };
              },
              false,
              "onboarding/setTourConfig",
            ),

          // ================================================================
          // Feature Discovery Actions
          // ================================================================

          discoverFeature: (featureId) =>
            set(
              (state) => {
                if (!state.featureDiscovery) return;

                state.featureDiscovery = markFeatureDiscovered(
                  state.featureDiscovery,
                  featureId,
                );
              },
              false,
              "onboarding/discoverFeature",
            ),

          seeTip: (tipId) =>
            set(
              (state) => {
                if (!state.featureDiscovery) return;

                state.featureDiscovery = markTipSeen(
                  state.featureDiscovery,
                  tipId,
                );
                trackTipShown(tipId as FeatureId, tipId);
              },
              false,
              "onboarding/seeTip",
            ),

          dismissFeatureTip: (tipId) =>
            set(
              (state) => {
                if (!state.featureDiscovery) return;

                state.featureDiscovery = dismissTip(
                  state.featureDiscovery,
                  tipId,
                );
                trackTipDismissed(tipId as FeatureId, tipId);
              },
              false,
              "onboarding/dismissFeatureTip",
            ),

          setFeatureDiscoveryConfig: (config) =>
            set(
              (state) => {
                state.featureDiscoveryConfig = {
                  ...state.featureDiscoveryConfig,
                  ...config,
                };
              },
              false,
              "onboarding/setFeatureDiscoveryConfig",
            ),

          // ================================================================
          // What's New Actions
          // ================================================================

          seeWhatsNewItem: (itemId) =>
            set(
              (state) => {
                state.whatsNew = markWhatsNewSeen(state.whatsNew, itemId);
              },
              false,
              "onboarding/seeWhatsNewItem",
            ),

          seeAllWhatsNew: () =>
            set(
              (state) => {
                state.whatsNew = markAllWhatsNewSeen(state.whatsNew);
              },
              false,
              "onboarding/seeAllWhatsNew",
            ),

          dismissWhatsNewModal: (days) =>
            set(
              (state) => {
                state.whatsNew = dismissWhatsNew(state.whatsNew, days);
                state.whatsNewModalOpen = false;
              },
              false,
              "onboarding/dismissWhatsNewModal",
            ),

          openWhatsNewModal: () =>
            set(
              (state) => {
                state.whatsNewModalOpen = true;
              },
              false,
              "onboarding/openWhatsNewModal",
            ),

          closeWhatsNewModal: () =>
            set(
              (state) => {
                state.whatsNewModalOpen = false;
              },
              false,
              "onboarding/closeWhatsNewModal",
            ),

          // ================================================================
          // Form Data Actions
          // ================================================================

          updateProfileData: (data) =>
            set(
              (state) => {
                state.profileData = { ...state.profileData, ...data };
              },
              false,
              "onboarding/updateProfileData",
            ),

          updatePreferencesData: (data) =>
            set(
              (state) => {
                state.preferencesData = { ...state.preferencesData, ...data };
              },
              false,
              "onboarding/updatePreferencesData",
            ),

          updateNotificationSettings: (data) =>
            set(
              (state) => {
                state.notificationSettings = {
                  ...state.notificationSettings,
                  ...data,
                };
              },
              false,
              "onboarding/updateNotificationSettings",
            ),

          setSelectedChannels: (channelIds) =>
            set(
              (state) => {
                state.selectedChannels = channelIds;
              },
              false,
              "onboarding/setSelectedChannels",
            ),

          toggleChannelSelection: (channelId) =>
            set(
              (state) => {
                const index = state.selectedChannels.indexOf(channelId);
                if (index === -1) {
                  state.selectedChannels.push(channelId);
                } else {
                  state.selectedChannels.splice(index, 1);
                }
              },
              false,
              "onboarding/toggleChannelSelection",
            ),

          addTeamInvitation: (invitation) =>
            set(
              (state) => {
                // Don't add duplicates
                if (
                  !state.teamInvitations.find(
                    (i) => i.email === invitation.email,
                  )
                ) {
                  state.teamInvitations.push(invitation);
                }
              },
              false,
              "onboarding/addTeamInvitation",
            ),

          removeTeamInvitation: (email) =>
            set(
              (state) => {
                state.teamInvitations = state.teamInvitations.filter(
                  (i) => i.email !== email,
                );
              },
              false,
              "onboarding/removeTeamInvitation",
            ),

          setInvitationResults: (results) =>
            set(
              (state) => {
                state.invitationResults = results;
              },
              false,
              "onboarding/setInvitationResults",
            ),

          clearFormData: () =>
            set(
              (state) => {
                state.profileData = {};
                state.preferencesData = {};
                state.notificationSettings = {};
                state.selectedChannels = [];
                state.teamInvitations = [];
                state.invitationResults = [];
              },
              false,
              "onboarding/clearFormData",
            ),

          // ================================================================
          // UI Actions
          // ================================================================

          setOnboardingDialogOpen: (open) =>
            set(
              (state) => {
                state.onboardingDialogOpen = open;
              },
              false,
              "onboarding/setOnboardingDialogOpen",
            ),

          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "onboarding/setLoading",
            ),

          setSaving: (saving) =>
            set(
              (state) => {
                state.isSaving = saving;
              },
              false,
              "onboarding/setSaving",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "onboarding/setError",
            ),

          // ================================================================
          // Computed Getters
          // ================================================================

          getOnboardingProgress: () => {
            const state = get();
            if (!state.onboarding) return null;
            return calculateOnboardingProgress(state.onboarding);
          },

          getTourProgress: () => {
            const state = get();
            if (!state.tour) return null;
            return calculateTourProgress(state.tour);
          },

          shouldShowOnboarding: () => {
            const state = get();
            if (!state.onboardingConfig.enabled) return false;
            if (!state.onboarding) return true;
            return (
              state.onboarding.status !== "completed" &&
              state.onboarding.status !== "skipped"
            );
          },

          shouldShowTour: () => {
            const state = get();
            if (!state.tourConfig.enabled) return false;
            if (!state.tour) return false;
            return (
              state.tour.status !== "completed" &&
              state.tour.status !== "dismissed"
            );
          },

          shouldShowWhatsNew: () => {
            const state = get();
            if (state.whatsNew.dismissedUntil) {
              const dismissedUntil = new Date(state.whatsNew.dismissedUntil);
              if (dismissedUntil > new Date()) return false;
            }
            // Check if there are unseen items
            return state.whatsNew.seenItems.length < 3; // Assuming we have items
          },
        })),
      ),
      {
        name: "nchat-onboarding",
        partialize: (state) => ({
          onboarding: state.onboarding,
          tour: state.tour,
          featureDiscovery: state.featureDiscovery,
          whatsNew: state.whatsNew,
          onboardingConfig: state.onboardingConfig,
          tourConfig: state.tourConfig,
          featureDiscoveryConfig: state.featureDiscoveryConfig,
          profileData: state.profileData,
          preferencesData: state.preferencesData,
          notificationSettings: state.notificationSettings,
          selectedChannels: state.selectedChannels,
        }),
      },
    ),
    { name: "onboarding-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectOnboarding = (state: OnboardingStore) => state.onboarding;
export const selectTour = (state: OnboardingStore) => state.tour;
export const selectFeatureDiscovery = (state: OnboardingStore) =>
  state.featureDiscovery;
export const selectWhatsNew = (state: OnboardingStore) => state.whatsNew;
export const selectTourActive = (state: OnboardingStore) => state.tourActive;
export const selectOnboardingDialogOpen = (state: OnboardingStore) =>
  state.onboardingDialogOpen;
export const selectProfileData = (state: OnboardingStore) => state.profileData;
export const selectPreferencesData = (state: OnboardingStore) =>
  state.preferencesData;
export const selectSelectedChannels = (state: OnboardingStore) =>
  state.selectedChannels;
export const selectTeamInvitations = (state: OnboardingStore) =>
  state.teamInvitations;
export const selectIsLoading = (state: OnboardingStore) => state.isLoading;
export const selectIsSaving = (state: OnboardingStore) => state.isSaving;
export const selectError = (state: OnboardingStore) => state.error;

export const selectCurrentOnboardingStep = (state: OnboardingStore) =>
  state.onboarding?.currentStepId ?? null;

export const selectCurrentTourStop = (state: OnboardingStore) =>
  state.tour?.currentStopId ?? null;

export const selectOnboardingStatus = (state: OnboardingStore) =>
  state.onboarding?.status ?? "not_started";

export const selectTourStatus = (state: OnboardingStore) =>
  state.tour?.status ?? "not_started";
