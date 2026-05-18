/**
 * Tests for app-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  AppStore,
  AppState,
  FeatureFlags,
  UserSession,
  GlobalSettings,
  AppError,
} from "../app-store";
import {
  selectInitStatus,
  selectIsReady,
  selectIsLoading,
  selectConnectionStatus,
  selectIsConnected,
  selectSession,
  selectIsAuthenticated,
  selectSettings,
  selectFeatureFlags,
  selectLastError,
  selectHasError,
  selectActiveModal,
  selectModalData,
} from "../app-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  return {
    channels: true,
    directMessages: true,
    threads: true,
    reactions: true,
    fileUploads: true,
    search: true,
    voiceMessages: false,
    videoConferencing: false,
    customEmojis: false,
    messageScheduling: false,
    slackIntegration: false,
    githubIntegration: false,
    webhooks: false,
    adminDashboard: true,
    userManagement: true,
    channelManagement: true,
    experimentalFeatures: false,
    ...overrides,
  };
}

function makeSettings(overrides?: Partial<GlobalSettings>): GlobalSettings {
  return {
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    soundEnabled: true,
    desktopNotifications: true,
    notificationSound: "default",
    reducedMotion: false,
    highContrast: false,
    fontSize: "medium",
    showOnlineStatus: true,
    showTypingIndicator: true,
    showReadReceipts: true,
    ...overrides,
  };
}

function makeSession(overrides?: Partial<UserSession>): UserSession {
  return {
    userId: "u1",
    email: "user@example.com",
    username: "user",
    displayName: "Test User",
    role: "member",
    isAuthenticated: true,
    ...overrides,
  };
}

function makeState(overrides?: Partial<AppState>): AppStore {
  const defaultState: AppState = {
    initStatus: "idle",
    initProgress: 0,
    initMessage: "",
    connectionStatus: "disconnected",
    lastConnectedAt: null,
    reconnectAttempts: 0,
    errors: [],
    lastError: null,
    hasUnrecoverableError: false,
    featureFlags: makeFeatureFlags(),
    session: null,
    settings: makeSettings(),
    isSetupComplete: false,
    isFirstVisit: false,
    lastVisitedChannel: null,
    currentRoute: "/",
    activeModal: null,
    modalData: null,
    debugMode: false,
  };
  return { ...defaultState, ...overrides } as unknown as AppStore;
}

// ---------------------------------------------------------------------------
// selectInitStatus
// ---------------------------------------------------------------------------

describe("selectInitStatus", () => {
  it("returns idle by default", () => {
    expect(selectInitStatus(makeState())).toBe("idle");
  });

  it("returns the current init status", () => {
    expect(selectInitStatus(makeState({ initStatus: "ready" }))).toBe("ready");
    expect(selectInitStatus(makeState({ initStatus: "error" }))).toBe("error");
    expect(selectInitStatus(makeState({ initStatus: "initializing" }))).toBe(
      "initializing",
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsReady
// ---------------------------------------------------------------------------

describe("selectIsReady", () => {
  it("returns false by default (idle)", () => {
    expect(selectIsReady(makeState())).toBe(false);
  });

  it("returns true only when status is ready", () => {
    expect(selectIsReady(makeState({ initStatus: "ready" }))).toBe(true);
  });

  it("returns false for non-ready statuses", () => {
    expect(selectIsReady(makeState({ initStatus: "initializing" }))).toBe(
      false,
    );
    expect(selectIsReady(makeState({ initStatus: "error" }))).toBe(false);
    expect(selectIsReady(makeState({ initStatus: "loading-user" }))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false when idle", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns false when ready", () => {
    expect(selectIsLoading(makeState({ initStatus: "ready" }))).toBe(false);
  });

  it("returns false when error", () => {
    expect(selectIsLoading(makeState({ initStatus: "error" }))).toBe(false);
  });

  it("returns true when initializing", () => {
    expect(selectIsLoading(makeState({ initStatus: "initializing" }))).toBe(
      true,
    );
  });

  it("returns true when loading-user", () => {
    expect(selectIsLoading(makeState({ initStatus: "loading-user" }))).toBe(
      true,
    );
  });

  it("returns true when loading-data", () => {
    expect(selectIsLoading(makeState({ initStatus: "loading-data" }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectConnectionStatus
// ---------------------------------------------------------------------------

describe("selectConnectionStatus", () => {
  it("returns disconnected by default", () => {
    expect(selectConnectionStatus(makeState())).toBe("disconnected");
  });

  it("returns the current connection status", () => {
    expect(
      selectConnectionStatus(makeState({ connectionStatus: "connected" })),
    ).toBe("connected");
    expect(
      selectConnectionStatus(makeState({ connectionStatus: "reconnecting" })),
    ).toBe("reconnecting");
  });
});

// ---------------------------------------------------------------------------
// selectIsConnected
// ---------------------------------------------------------------------------

describe("selectIsConnected", () => {
  it("returns false by default (disconnected)", () => {
    expect(selectIsConnected(makeState())).toBe(false);
  });

  it("returns true only when connected", () => {
    expect(
      selectIsConnected(makeState({ connectionStatus: "connected" })),
    ).toBe(true);
  });

  it("returns false for non-connected statuses", () => {
    expect(
      selectIsConnected(makeState({ connectionStatus: "connecting" })),
    ).toBe(false);
    expect(
      selectIsConnected(makeState({ connectionStatus: "reconnecting" })),
    ).toBe(false);
    expect(
      selectIsConnected(makeState({ connectionStatus: "error" })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSession
// ---------------------------------------------------------------------------

describe("selectSession", () => {
  it("returns null when no session", () => {
    expect(selectSession(makeState())).toBeNull();
  });

  it("returns the session object", () => {
    const session = makeSession();
    expect(selectSession(makeState({ session }))).toBe(session);
  });
});

// ---------------------------------------------------------------------------
// selectIsAuthenticated
// ---------------------------------------------------------------------------

describe("selectIsAuthenticated", () => {
  it("returns false when no session", () => {
    expect(selectIsAuthenticated(makeState())).toBe(false);
  });

  it("returns true when session is authenticated", () => {
    const session = makeSession({ isAuthenticated: true });
    expect(selectIsAuthenticated(makeState({ session }))).toBe(true);
  });

  it("returns false when session is not authenticated", () => {
    const session = makeSession({ isAuthenticated: false });
    expect(selectIsAuthenticated(makeState({ session }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSettings
// ---------------------------------------------------------------------------

describe("selectSettings", () => {
  it("returns the settings object", () => {
    const settings = makeSettings({ language: "fr" });
    expect(selectSettings(makeState({ settings }))).toBe(settings);
  });

  it("returns default settings", () => {
    const settings = selectSettings(makeState());
    expect(settings.language).toBe("en");
    expect(settings.timeFormat).toBe("12h");
  });
});

// ---------------------------------------------------------------------------
// selectFeatureFlags
// ---------------------------------------------------------------------------

describe("selectFeatureFlags", () => {
  it("returns the feature flags object", () => {
    const featureFlags = makeFeatureFlags({ channels: false });
    expect(selectFeatureFlags(makeState({ featureFlags }))).toBe(featureFlags);
  });

  it("returns default flags", () => {
    const flags = selectFeatureFlags(makeState());
    expect(flags.channels).toBe(true);
    expect(flags.videoConferencing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectLastError
// ---------------------------------------------------------------------------

describe("selectLastError", () => {
  it("returns null by default", () => {
    expect(selectLastError(makeState())).toBeNull();
  });

  it("returns the last error", () => {
    const lastError: AppError = {
      code: "NETWORK_ERROR",
      message: "Network failure",
      timestamp: new Date(),
      recoverable: true,
    };
    expect(selectLastError(makeState({ lastError }))).toBe(lastError);
  });
});

// ---------------------------------------------------------------------------
// selectHasError
// ---------------------------------------------------------------------------

describe("selectHasError", () => {
  it("returns false by default", () => {
    expect(selectHasError(makeState())).toBe(false);
  });

  it("returns true when there is an unrecoverable error", () => {
    expect(
      selectHasError(makeState({ hasUnrecoverableError: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveModal
// ---------------------------------------------------------------------------

describe("selectActiveModal", () => {
  it("returns null by default", () => {
    expect(selectActiveModal(makeState())).toBeNull();
  });

  it("returns the active modal name", () => {
    expect(
      selectActiveModal(makeState({ activeModal: "invite-members" })),
    ).toBe("invite-members");
  });
});

// ---------------------------------------------------------------------------
// selectModalData
// ---------------------------------------------------------------------------

describe("selectModalData", () => {
  it("returns null by default", () => {
    expect(selectModalData(makeState())).toBeNull();
  });

  it("returns the modal data object", () => {
    const modalData = { userId: "u1", channelId: "c1" };
    expect(selectModalData(makeState({ modalData }))).toBe(modalData);
  });
});
