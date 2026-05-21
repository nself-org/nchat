/**
 * Tests for notification-settings-store selectors
 *
 * The selectors are pure functions (state: NotificationSettingsStore) => value.
 * We call them directly with minimal plain-object state — no Zustand context needed.
 */

import {
  selectPreferences,
  selectGlobalEnabled,
  selectDesktopSettings,
  selectPushSettings,
  selectEmailSettings,
  selectSoundSettings,
  selectQuietHours,
  selectMentionSettings,
  selectDMSettings,
  selectKeywords,
  selectChannelSettings,
  selectIsDirty,
  selectIsLoading,
  selectError,
  selectActiveSection,
  selectIsSettingsOpen,
  selectChannelSettingsById,
  selectIsChannelMuted,
  selectKeywordById,
  selectEnabledKeywords,
  selectMutedChannelCount,
} from "../notification-settings-store";
import type { NotificationSettingsStore } from "../notification-settings-store";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/notification-types";

// ---------------------------------------------------------------------------
// Minimal state factory
// ---------------------------------------------------------------------------

function makeState(
  overrides?: Partial<NotificationSettingsStore>,
): NotificationSettingsStore {
  return {
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    isDirty: false,
    isLoading: false,
    error: null,
    activeSection: "general",
    isSettingsOpen: false,
    // Required actions — never called in selector tests
    setGlobalEnabled: jest.fn(),
    updateDesktopSettings: jest.fn(),
    updatePushSettings: jest.fn(),
    updateEmailSettings: jest.fn(),
    updateSoundSettings: jest.fn(),
    updateQuietHours: jest.fn(),
    updateMentionSettings: jest.fn(),
    updateDMSettings: jest.fn(),
    addKeyword: jest.fn(),
    removeKeyword: jest.fn(),
    updateKeyword: jest.fn(),
    setChannelSettings: jest.fn(),
    removeChannelSettings: jest.fn(),
    muteChannel: jest.fn(),
    unmuteChannel: jest.fn(),
    resetToDefaults: jest.fn(),
    setActiveSection: jest.fn(),
    setIsSettingsOpen: jest.fn(),
    setIsDirty: jest.fn(),
    setIsLoading: jest.fn(),
    setError: jest.fn(),
    loadFromServer: jest.fn(),
    saveToServer: jest.fn(),
    ...overrides,
  } as unknown as NotificationSettingsStore;
}

// ---------------------------------------------------------------------------
// selectPreferences
// ---------------------------------------------------------------------------

describe("selectPreferences", () => {
  it("returns the preferences object", () => {
    const state = makeState();
    expect(selectPreferences(state)).toBe(state.preferences);
  });

  it("reflects custom preferences", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        globalEnabled: false,
      },
    });
    expect(selectPreferences(state).globalEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectGlobalEnabled
// ---------------------------------------------------------------------------

describe("selectGlobalEnabled", () => {
  it("returns true when globalEnabled is true (default)", () => {
    const state = makeState();
    expect(selectGlobalEnabled(state)).toBe(true);
  });

  it("returns false when globalEnabled is false", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        globalEnabled: false,
      },
    });
    expect(selectGlobalEnabled(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectDesktopSettings
// ---------------------------------------------------------------------------

describe("selectDesktopSettings", () => {
  it("returns the desktop settings sub-object", () => {
    const state = makeState();
    expect(selectDesktopSettings(state)).toBe(state.preferences.desktop);
  });

  it("reflects changed desktop.enabled", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        desktop: {
          ...DEFAULT_NOTIFICATION_PREFERENCES.desktop,
          enabled: false,
        },
      },
    });
    expect(selectDesktopSettings(state).enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectPushSettings
// ---------------------------------------------------------------------------

describe("selectPushSettings", () => {
  it("returns the push settings sub-object", () => {
    const state = makeState();
    expect(selectPushSettings(state)).toBe(state.preferences.push);
  });

  it("returns push.enabled = true by default", () => {
    expect(selectPushSettings(makeState()).enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectEmailSettings
// ---------------------------------------------------------------------------

describe("selectEmailSettings", () => {
  it("returns the email settings sub-object", () => {
    const state = makeState();
    expect(selectEmailSettings(state)).toBe(state.preferences.email);
  });

  it("returns email.enabled = false by default", () => {
    expect(selectEmailSettings(makeState()).enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectSoundSettings
// ---------------------------------------------------------------------------

describe("selectSoundSettings", () => {
  it("returns the sound settings sub-object", () => {
    const state = makeState();
    expect(selectSoundSettings(state)).toBe(state.preferences.sound);
  });

  it("returns sound.enabled = true by default", () => {
    expect(selectSoundSettings(makeState()).enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectQuietHours
// ---------------------------------------------------------------------------

describe("selectQuietHours", () => {
  it("returns the quietHours sub-object", () => {
    const state = makeState();
    expect(selectQuietHours(state)).toBe(state.preferences.quietHours);
  });

  it("returns quietHours.enabled = false by default", () => {
    expect(selectQuietHours(makeState()).enabled).toBe(false);
  });

  it("returns quietHours.startTime = '22:00' by default", () => {
    expect(selectQuietHours(makeState()).startTime).toBe("22:00");
  });
});

// ---------------------------------------------------------------------------
// selectMentionSettings
// ---------------------------------------------------------------------------

describe("selectMentionSettings", () => {
  it("returns the mentions sub-object", () => {
    const state = makeState();
    expect(selectMentionSettings(state)).toBe(state.preferences.mentions);
  });

  it("returns mentions.enabled = true by default", () => {
    expect(selectMentionSettings(makeState()).enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectDMSettings
// ---------------------------------------------------------------------------

describe("selectDMSettings", () => {
  it("returns the directMessages sub-object", () => {
    const state = makeState();
    expect(selectDMSettings(state)).toBe(state.preferences.directMessages);
  });

  it("returns directMessages.enabled = true by default", () => {
    expect(selectDMSettings(makeState()).enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectKeywords
// ---------------------------------------------------------------------------

describe("selectKeywords", () => {
  it("returns empty array by default", () => {
    expect(selectKeywords(makeState())).toEqual([]);
  });

  it("returns keywords array from preferences", () => {
    const kw = {
      id: "k1",
      keyword: "urgent",
      enabled: true,
      caseSensitive: false,
      wholeWord: false,
      color: "#f00",
      sound: "default",
      desktopNotification: true,
      mobileNotification: true,
    };
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        keywords: [kw],
      },
    });
    expect(selectKeywords(state)).toHaveLength(1);
    expect(selectKeywords(state)[0].keyword).toBe("urgent");
  });
});

// ---------------------------------------------------------------------------
// selectChannelSettings
// ---------------------------------------------------------------------------

describe("selectChannelSettings", () => {
  it("returns empty object by default", () => {
    expect(selectChannelSettings(makeState())).toEqual({});
  });

  it("returns channelSettings from preferences", () => {
    const cs = {
      level: "all" as const,
      muted: false,
      muteUntil: null,
      desktop: true,
      mobile: true,
      email: false,
      sound: true,
    };
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: { ch1: cs },
      },
    });
    expect(selectChannelSettings(state)).toHaveProperty("ch1");
  });
});

// ---------------------------------------------------------------------------
// selectIsDirty
// ---------------------------------------------------------------------------

describe("selectIsDirty", () => {
  it("returns false by default", () => {
    expect(selectIsDirty(makeState())).toBe(false);
  });

  it("returns true when isDirty = true", () => {
    expect(selectIsDirty(makeState({ isDirty: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when isLoading = true", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns error string when set", () => {
    expect(selectError(makeState({ error: "network failure" }))).toBe(
      "network failure",
    );
  });
});

// ---------------------------------------------------------------------------
// selectActiveSection
// ---------------------------------------------------------------------------

describe("selectActiveSection", () => {
  it("returns the active section string", () => {
    expect(selectActiveSection(makeState())).toBe("general");
  });

  it("reflects a custom active section", () => {
    expect(selectActiveSection(makeState({ activeSection: "desktop" }))).toBe(
      "desktop",
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsSettingsOpen
// ---------------------------------------------------------------------------

describe("selectIsSettingsOpen", () => {
  it("returns false by default", () => {
    expect(selectIsSettingsOpen(makeState())).toBe(false);
  });

  it("returns true when settings open", () => {
    expect(selectIsSettingsOpen(makeState({ isSettingsOpen: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectChannelSettingsById
// ---------------------------------------------------------------------------

describe("selectChannelSettingsById", () => {
  const cs = {
    level: "all" as const,
    muted: false,
    muteUntil: null,
    desktop: true,
    mobile: true,
    email: false,
    sound: true,
  };

  it("returns settings for a known channel", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: { ch1: cs },
      },
    });
    expect(selectChannelSettingsById("ch1")(state)).toEqual(cs);
  });

  it("returns undefined for an unknown channel", () => {
    const state = makeState();
    expect(selectChannelSettingsById("unknown")(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelMuted
// ---------------------------------------------------------------------------

describe("selectIsChannelMuted", () => {
  it("returns false when channel has no settings", () => {
    const state = makeState();
    expect(selectIsChannelMuted("ch1")(state)).toBe(false);
  });

  it("returns true when level is 'nothing'", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "nothing" as const,
            muted: true,
            muteUntil: null,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
        },
      },
    });
    expect(selectIsChannelMuted("ch1")(state)).toBe(true);
  });

  it("returns true when muteUntil is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "all" as const,
            muted: true,
            muteUntil: future,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
        },
      },
    });
    expect(selectIsChannelMuted("ch1")(state)).toBe(true);
  });

  it("returns false when muteUntil is in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "all" as const,
            muted: false,
            muteUntil: past,
            desktop: true,
            mobile: true,
            email: false,
            sound: true,
          },
        },
      },
    });
    expect(selectIsChannelMuted("ch1")(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectKeywordById
// ---------------------------------------------------------------------------

describe("selectKeywordById", () => {
  const kw = {
    id: "kw1",
    keyword: "urgent",
    enabled: true,
    caseSensitive: false,
    wholeWord: false,
    color: "#f00",
    sound: "default",
    desktopNotification: true,
    mobileNotification: true,
  };

  it("finds a keyword by id", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        keywords: [kw],
      },
    });
    expect(selectKeywordById("kw1")(state)).toEqual(kw);
  });

  it("returns undefined for unknown id", () => {
    const state = makeState();
    expect(selectKeywordById("missing")(state)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectEnabledKeywords
// ---------------------------------------------------------------------------

describe("selectEnabledKeywords", () => {
  it("returns empty array when no keywords", () => {
    expect(selectEnabledKeywords(makeState())).toEqual([]);
  });

  it("returns only enabled keywords", () => {
    const kw1 = {
      id: "k1",
      keyword: "hi",
      enabled: true,
      caseSensitive: false,
      wholeWord: false,
      color: "#0f0",
      sound: "default",
      desktopNotification: true,
      mobileNotification: true,
    };
    const kw2 = {
      id: "k2",
      keyword: "bye",
      enabled: false,
      caseSensitive: false,
      wholeWord: false,
      color: "#f00",
      sound: "default",
      desktopNotification: false,
      mobileNotification: false,
    };
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        keywords: [kw1, kw2],
      },
    });
    const enabled = selectEnabledKeywords(state);
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe("k1");
  });
});

// ---------------------------------------------------------------------------
// selectMutedChannelCount
// ---------------------------------------------------------------------------

describe("selectMutedChannelCount", () => {
  it("returns 0 when no channel settings", () => {
    expect(selectMutedChannelCount(makeState())).toBe(0);
  });

  it("counts channels with level=nothing", () => {
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "nothing" as const,
            muted: true,
            muteUntil: null,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
          ch2: {
            level: "all" as const,
            muted: false,
            muteUntil: null,
            desktop: true,
            mobile: true,
            email: false,
            sound: true,
          },
        },
      },
    });
    expect(selectMutedChannelCount(state)).toBe(1);
  });

  it("counts channels with future muteUntil", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "all" as const,
            muted: true,
            muteUntil: future,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
          ch2: {
            level: "all" as const,
            muted: false,
            muteUntil: past,
            desktop: true,
            mobile: true,
            email: false,
            sound: true,
          },
        },
      },
    });
    expect(selectMutedChannelCount(state)).toBe(1);
  });

  it("counts both nothing-level and future-muted channels", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const state = makeState({
      preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channelSettings: {
          ch1: {
            level: "nothing" as const,
            muted: true,
            muteUntil: null,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
          ch2: {
            level: "all" as const,
            muted: true,
            muteUntil: future,
            desktop: false,
            mobile: false,
            email: false,
            sound: false,
          },
          ch3: {
            level: "all" as const,
            muted: false,
            muteUntil: null,
            desktop: true,
            mobile: true,
            email: false,
            sound: true,
          },
        },
      },
    });
    expect(selectMutedChannelCount(state)).toBe(2);
  });
});
