/**
 * Tests for onboarding-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  OnboardingStore,
  OnboardingStoreState,
} from "../onboarding-store";
import {
  selectOnboarding,
  selectTour,
  selectFeatureDiscovery,
  selectWhatsNew,
  selectTourActive,
  selectOnboardingDialogOpen,
  selectProfileData,
  selectPreferencesData,
  selectSelectedChannels,
  selectTeamInvitations,
  selectIsLoading,
  selectIsSaving,
  selectError,
  selectCurrentOnboardingStep,
  selectCurrentTourStop,
  selectOnboardingStatus,
  selectTourStatus,
} from "../onboarding-store";

import type {
  OnboardingState,
  TourState,
  FeatureDiscoveryState,
  WhatsNewState,
  OnboardingConfig,
  TourConfig,
  FeatureDiscoveryConfig,
  TeamInvitation,
  UserProfile,
  OnboardingPreferences,
} from "@/lib/onboarding/onboarding-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOnboarding(overrides?: Partial<OnboardingState>): OnboardingState {
  return {
    userId: "u1",
    currentStepId: "welcome",
    status: "in_progress",
    completedSteps: [],
    skippedSteps: [],
    data: {},
    startedAt: new Date("2026-01-01"),
    completedAt: null,
    ...overrides,
  } as unknown as OnboardingState;
}

function makeTour(overrides?: Partial<TourState>): TourState {
  return {
    userId: "u1",
    currentStopId: "dashboard",
    status: "in_progress",
    completedStops: [],
    startedAt: new Date("2026-01-01"),
    completedAt: null,
    dismissedAt: null,
    ...overrides,
  } as unknown as TourState;
}

function makeWhatsNew(overrides?: Partial<WhatsNewState>): WhatsNewState {
  return {
    seenItems: [],
    dismissedUntil: null,
    ...overrides,
  } as WhatsNewState;
}

function makeState(overrides?: Partial<OnboardingStoreState>): OnboardingStore {
  const defaultState: OnboardingStoreState = {
    userId: null,
    onboarding: null,
    onboardingConfig: {} as OnboardingConfig,
    tour: null,
    tourConfig: {} as TourConfig,
    tourActive: false,
    featureDiscovery: null,
    featureDiscoveryConfig: {} as FeatureDiscoveryConfig,
    whatsNew: makeWhatsNew(),
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
  return { ...defaultState, ...overrides } as unknown as OnboardingStore;
}

// ---------------------------------------------------------------------------
// selectOnboarding
// ---------------------------------------------------------------------------

describe("selectOnboarding", () => {
  it("returns null when no onboarding state", () => {
    expect(selectOnboarding(makeState())).toBeNull();
  });

  it("returns the onboarding state object", () => {
    const onboarding = makeOnboarding();
    expect(selectOnboarding(makeState({ onboarding }))).toBe(onboarding);
  });
});

// ---------------------------------------------------------------------------
// selectTour
// ---------------------------------------------------------------------------

describe("selectTour", () => {
  it("returns null when no tour state", () => {
    expect(selectTour(makeState())).toBeNull();
  });

  it("returns the tour state object", () => {
    const tour = makeTour();
    expect(selectTour(makeState({ tour }))).toBe(tour);
  });
});

// ---------------------------------------------------------------------------
// selectFeatureDiscovery
// ---------------------------------------------------------------------------

describe("selectFeatureDiscovery", () => {
  it("returns null when feature discovery is not initialized", () => {
    expect(selectFeatureDiscovery(makeState())).toBeNull();
  });

  it("returns the feature discovery state", () => {
    const featureDiscovery = {
      userId: "u1",
      discoveredFeatures: [],
      seenTips: [],
      dismissedTips: [],
    } as unknown as FeatureDiscoveryState;
    expect(selectFeatureDiscovery(makeState({ featureDiscovery }))).toBe(
      featureDiscovery,
    );
  });
});

// ---------------------------------------------------------------------------
// selectWhatsNew
// ---------------------------------------------------------------------------

describe("selectWhatsNew", () => {
  it("returns the default whats new state", () => {
    const result = selectWhatsNew(makeState());
    expect(result.seenItems).toEqual([]);
    expect(result.dismissedUntil).toBeNull();
  });

  it("returns the custom whats new state", () => {
    const whatsNew = makeWhatsNew({ seenItems: ["item1", "item2"] });
    const result = selectWhatsNew(makeState({ whatsNew }));
    expect(result.seenItems).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectTourActive
// ---------------------------------------------------------------------------

describe("selectTourActive", () => {
  it("returns false when tour is not active", () => {
    expect(selectTourActive(makeState())).toBe(false);
  });

  it("returns true when tour is active", () => {
    expect(selectTourActive(makeState({ tourActive: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectOnboardingDialogOpen
// ---------------------------------------------------------------------------

describe("selectOnboardingDialogOpen", () => {
  it("returns false when dialog is not open", () => {
    expect(selectOnboardingDialogOpen(makeState())).toBe(false);
  });

  it("returns true when dialog is open", () => {
    expect(
      selectOnboardingDialogOpen(makeState({ onboardingDialogOpen: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectProfileData
// ---------------------------------------------------------------------------

describe("selectProfileData", () => {
  it("returns empty object when no profile data", () => {
    expect(selectProfileData(makeState())).toEqual({});
  });

  it("returns the profile data", () => {
    const profileData: Partial<UserProfile> = {
      displayName: "Alice",
      avatarUrl: "https://example.com/avatar.jpg",
    } as Partial<UserProfile>;
    expect(selectProfileData(makeState({ profileData }))).toBe(profileData);
  });
});

// ---------------------------------------------------------------------------
// selectPreferencesData
// ---------------------------------------------------------------------------

describe("selectPreferencesData", () => {
  it("returns empty object when no preferences data", () => {
    expect(selectPreferencesData(makeState())).toEqual({});
  });

  it("returns the preferences data", () => {
    const preferencesData: Partial<OnboardingPreferences> = {
      theme: "dark",
    } as Partial<OnboardingPreferences>;
    expect(selectPreferencesData(makeState({ preferencesData }))).toBe(
      preferencesData,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSelectedChannels
// ---------------------------------------------------------------------------

describe("selectSelectedChannels", () => {
  it("returns empty array when no channels selected", () => {
    expect(selectSelectedChannels(makeState())).toEqual([]);
  });

  it("returns the selected channel ids", () => {
    const selectedChannels = ["ch1", "ch2", "ch3"];
    expect(selectSelectedChannels(makeState({ selectedChannels }))).toBe(
      selectedChannels,
    );
  });
});

// ---------------------------------------------------------------------------
// selectTeamInvitations
// ---------------------------------------------------------------------------

describe("selectTeamInvitations", () => {
  it("returns empty array when no invitations", () => {
    expect(selectTeamInvitations(makeState())).toEqual([]);
  });

  it("returns the team invitations", () => {
    const teamInvitations: TeamInvitation[] = [
      { email: "alice@example.com", role: "member" } as TeamInvitation,
      { email: "bob@example.com", role: "admin" } as TeamInvitation,
    ];
    expect(selectTeamInvitations(makeState({ teamInvitations }))).toBe(
      teamInvitations,
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false when not loading", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsSaving
// ---------------------------------------------------------------------------

describe("selectIsSaving", () => {
  it("returns false when not saving", () => {
    expect(selectIsSaving(makeState())).toBe(false);
  });

  it("returns true when saving", () => {
    expect(selectIsSaving(makeState({ isSaving: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null when no error", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error message", () => {
    expect(selectError(makeState({ error: "Something went wrong" }))).toBe(
      "Something went wrong",
    );
  });
});

// ---------------------------------------------------------------------------
// selectCurrentOnboardingStep
// ---------------------------------------------------------------------------

describe("selectCurrentOnboardingStep", () => {
  it("returns null when onboarding is null", () => {
    expect(selectCurrentOnboardingStep(makeState())).toBeNull();
  });

  it("returns the current step id when onboarding is active", () => {
    const onboarding = makeOnboarding({ currentStepId: "profile" as never });
    expect(selectCurrentOnboardingStep(makeState({ onboarding }))).toBe(
      "profile",
    );
  });

  it("returns null when currentStepId is null", () => {
    const onboarding = makeOnboarding({ currentStepId: null as never });
    expect(selectCurrentOnboardingStep(makeState({ onboarding }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectCurrentTourStop
// ---------------------------------------------------------------------------

describe("selectCurrentTourStop", () => {
  it("returns null when tour is null", () => {
    expect(selectCurrentTourStop(makeState())).toBeNull();
  });

  it("returns the current stop id when tour is active", () => {
    const tour = makeTour({ currentStopId: "sidebar" as never });
    expect(selectCurrentTourStop(makeState({ tour }))).toBe("sidebar");
  });

  it("returns null when currentStopId is null", () => {
    const tour = makeTour({ currentStopId: null as never });
    expect(selectCurrentTourStop(makeState({ tour }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectOnboardingStatus
// ---------------------------------------------------------------------------

describe("selectOnboardingStatus", () => {
  it("returns 'not_started' when onboarding is null", () => {
    expect(selectOnboardingStatus(makeState())).toBe("not_started");
  });

  it("returns 'in_progress' when onboarding is active", () => {
    const onboarding = makeOnboarding({ status: "in_progress" as never });
    expect(selectOnboardingStatus(makeState({ onboarding }))).toBe(
      "in_progress",
    );
  });

  it("returns 'completed' when onboarding is done", () => {
    const onboarding = makeOnboarding({ status: "completed" as never });
    expect(selectOnboardingStatus(makeState({ onboarding }))).toBe("completed");
  });

  it("returns 'skipped' when onboarding was skipped", () => {
    const onboarding = makeOnboarding({ status: "skipped" as never });
    expect(selectOnboardingStatus(makeState({ onboarding }))).toBe("skipped");
  });
});

// ---------------------------------------------------------------------------
// selectTourStatus
// ---------------------------------------------------------------------------

describe("selectTourStatus", () => {
  it("returns 'not_started' when tour is null", () => {
    expect(selectTourStatus(makeState())).toBe("not_started");
  });

  it("returns 'in_progress' when tour is running", () => {
    const tour = makeTour({ status: "in_progress" as never });
    expect(selectTourStatus(makeState({ tour }))).toBe("in_progress");
  });

  it("returns 'completed' when tour is done", () => {
    const tour = makeTour({ status: "completed" as never });
    expect(selectTourStatus(makeState({ tour }))).toBe("completed");
  });

  it("returns 'dismissed' when tour was dismissed", () => {
    const tour = makeTour({ status: "dismissed" as never });
    expect(selectTourStatus(makeState({ tour }))).toBe("dismissed");
  });
});
