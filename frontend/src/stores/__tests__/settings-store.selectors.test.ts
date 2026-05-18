/**
 * Tests for settings-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { SettingsStore, SettingsState } from "../settings-store";
import {
  selectSettings,
  selectAppearance,
  selectNotifications,
  selectPrivacy,
  selectAccessibility,
  selectLanguage,
  selectAdvanced,
  selectTheme,
  selectAccentColor,
  selectFontSize,
  selectMessageDensity,
  selectNotificationsEnabled,
  selectDoNotDisturb,
  selectReduceMotion,
  selectHighContrast,
  selectMutedChannels,
  selectMutedUsers,
  selectBlockList,
  selectIsLoading,
  selectIsSaving,
  selectActiveCategory,
  selectSearchQuery,
  selectHasUnsavedChanges,
  selectSyncStatus,
  selectError,
  selectIsChannelMuted,
  selectIsUserMuted,
  selectIsUserBlocked,
} from "../settings-store";

import type {
  UserSettings,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AccessibilitySettings,
  LanguageSettings,
  AdvancedSettings,
} from "@/lib/settings/settings-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAppearance(
  overrides?: Partial<AppearanceSettings>,
): AppearanceSettings {
  return {
    theme: "system",
    accentColor: "#6366f1",
    fontSize: "medium",
    fontFamily: "system",
    messageDensity: "comfortable",
    sidebarPosition: "left",
    sidebarWidth: 260,
    showAvatars: true,
    showTimestamps: true,
    compactMode: false,
    animationsEnabled: true,
    reduceMotion: false,
    reduceTransparency: false,
    ...overrides,
  } as AppearanceSettings;
}

function makeNotifications(
  overrides?: Partial<NotificationSettings>,
): NotificationSettings {
  return {
    enabled: true,
    sound: "default",
    soundVolume: 80,
    position: "top-right",
    duration: 5000,
    showPreview: true,
    showSender: true,
    desktopNotifications: true,
    emailNotifications: false,
    pushNotifications: true,
    doNotDisturb: false,
    doNotDisturbStart: "22:00",
    doNotDisturbEnd: "08:00",
    mutedChannels: [],
    mutedUsers: [],
    mentions: { enabled: true, sound: "default", desktop: true },
    directMessages: { enabled: true, sound: "default", desktop: true },
    threads: { enabled: true, sound: "default", desktop: true },
    reactions: { enabled: false, sound: "none", desktop: false },
    ...overrides,
  } as NotificationSettings;
}

function makePrivacy(overrides?: Partial<PrivacySettings>): PrivacySettings {
  return {
    onlineStatus: "everyone",
    lastSeen: true,
    readReceipts: true,
    typingIndicator: true,
    profileVisibility: "members",
    showEmail: false,
    showBio: true,
    showActivity: true,
    dmPermission: "everyone",
    allowInvites: true,
    allowMentions: true,
    blockList: [],
    ...overrides,
  } as PrivacySettings;
}

function makeAccessibility(
  overrides?: Partial<AccessibilitySettings>,
): AccessibilitySettings {
  return {
    reduceMotion: false,
    highContrast: false,
    contrastMode: "normal",
    fontSize: "medium",
    dyslexiaFont: false,
    reduceTransparency: false,
    alwaysShowFocus: false,
    largerTargets: false,
    showKeyboardHints: true,
    screenReaderMode: false,
    announceMessages: false,
    preferCaptions: false,
    ...overrides,
  } as AccessibilitySettings;
}

function makeLanguage(
  overrides?: Partial<LanguageSettings>,
): LanguageSettings {
  return {
    language: "en",
    timezone: "UTC",
    timeFormat: "12h",
    dateFormat: "mdy",
    weekStart: "sunday",
    numberFormat: "en-US",
    ...overrides,
  } as LanguageSettings;
}

function makeAdvanced(
  overrides?: Partial<AdvancedSettings>,
): AdvancedSettings {
  return {
    developerMode: false,
    showDebugInfo: false,
    betaFeatures: false,
    analyticsEnabled: true,
    errorReporting: true,
    cacheEnabled: true,
    offlineMode: false,
    autoUpdate: true,
    syncEnabled: true,
    syncFrequency: 30000,
    ...overrides,
  } as AdvancedSettings;
}

function makeSettings(overrides?: Partial<UserSettings>): UserSettings {
  return {
    appearance: makeAppearance(),
    notifications: makeNotifications(),
    privacy: makePrivacy(),
    accessibility: makeAccessibility(),
    language: makeLanguage(),
    advanced: makeAdvanced(),
    ...overrides,
  } as UserSettings;
}

function makeState(overrides?: Partial<SettingsState>): SettingsStore {
  const defaultState: SettingsState = {
    settings: makeSettings(),
    isLoading: false,
    isSaving: false,
    activeCategory: "appearance",
    searchQuery: "",
    hasUnsavedChanges: false,
    syncStatus: "synced",
    error: null,
  };
  return { ...defaultState, ...overrides } as unknown as SettingsStore;
}

// ---------------------------------------------------------------------------
// selectSettings
// ---------------------------------------------------------------------------

describe("selectSettings", () => {
  it("returns the settings object", () => {
    const settings = makeSettings();
    expect(selectSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectAppearance
// ---------------------------------------------------------------------------

describe("selectAppearance", () => {
  it("returns appearance settings", () => {
    const appearance = makeAppearance({ theme: "dark" });
    const settings = makeSettings({ appearance });
    expect(selectAppearance(makeState({ settings }))).toBe(appearance);
  });

  it("returns default appearance theme", () => {
    const result = selectAppearance(makeState());
    expect(result.theme).toBe("system");
  });
});

// ---------------------------------------------------------------------------
// selectNotifications
// ---------------------------------------------------------------------------

describe("selectNotifications", () => {
  it("returns notifications settings", () => {
    const notifications = makeNotifications({ enabled: false });
    const settings = makeSettings({ notifications });
    expect(selectNotifications(makeState({ settings }))).toBe(notifications);
  });
});

// ---------------------------------------------------------------------------
// selectPrivacy
// ---------------------------------------------------------------------------

describe("selectPrivacy", () => {
  it("returns privacy settings", () => {
    const privacy = makePrivacy({ readReceipts: false });
    const settings = makeSettings({ privacy });
    expect(selectPrivacy(makeState({ settings }))).toBe(privacy);
  });
});

// ---------------------------------------------------------------------------
// selectAccessibility
// ---------------------------------------------------------------------------

describe("selectAccessibility", () => {
  it("returns accessibility settings", () => {
    const accessibility = makeAccessibility({ highContrast: true });
    const settings = makeSettings({ accessibility });
    expect(selectAccessibility(makeState({ settings }))).toBe(accessibility);
  });
});

// ---------------------------------------------------------------------------
// selectLanguage
// ---------------------------------------------------------------------------

describe("selectLanguage", () => {
  it("returns language settings", () => {
    const language = makeLanguage({ language: "ar" });
    const settings = makeSettings({ language });
    expect(selectLanguage(makeState({ settings }))).toBe(language);
  });
});

// ---------------------------------------------------------------------------
// selectAdvanced
// ---------------------------------------------------------------------------

describe("selectAdvanced", () => {
  it("returns advanced settings", () => {
    const advanced = makeAdvanced({ developerMode: true });
    const settings = makeSettings({ advanced });
    expect(selectAdvanced(makeState({ settings }))).toBe(advanced);
  });
});

// ---------------------------------------------------------------------------
// selectTheme
// ---------------------------------------------------------------------------

describe("selectTheme", () => {
  it("returns system when default", () => {
    expect(selectTheme(makeState())).toBe("system");
  });

  it("returns light", () => {
    const settings = makeSettings({
      appearance: makeAppearance({ theme: "light" }),
    });
    expect(selectTheme(makeState({ settings }))).toBe("light");
  });

  it("returns dark", () => {
    const settings = makeSettings({
      appearance: makeAppearance({ theme: "dark" }),
    });
    expect(selectTheme(makeState({ settings }))).toBe("dark");
  });
});

// ---------------------------------------------------------------------------
// selectAccentColor
// ---------------------------------------------------------------------------

describe("selectAccentColor", () => {
  it("returns the accent color", () => {
    expect(selectAccentColor(makeState())).toBe("#6366f1");
  });

  it("returns a custom accent color", () => {
    const settings = makeSettings({
      appearance: makeAppearance({ accentColor: "#ff0000" }),
    });
    expect(selectAccentColor(makeState({ settings }))).toBe("#ff0000");
  });
});

// ---------------------------------------------------------------------------
// selectFontSize
// ---------------------------------------------------------------------------

describe("selectFontSize", () => {
  it("returns medium by default", () => {
    expect(selectFontSize(makeState())).toBe("medium");
  });

  it("returns large when set", () => {
    const settings = makeSettings({
      appearance: makeAppearance({ fontSize: "large" }),
    });
    expect(selectFontSize(makeState({ settings }))).toBe("large");
  });
});

// ---------------------------------------------------------------------------
// selectMessageDensity
// ---------------------------------------------------------------------------

describe("selectMessageDensity", () => {
  it("returns comfortable by default", () => {
    expect(selectMessageDensity(makeState())).toBe("comfortable");
  });

  it("returns compact when set", () => {
    const settings = makeSettings({
      appearance: makeAppearance({ messageDensity: "compact" }),
    });
    expect(selectMessageDensity(makeState({ settings }))).toBe("compact");
  });
});

// ---------------------------------------------------------------------------
// selectNotificationsEnabled
// ---------------------------------------------------------------------------

describe("selectNotificationsEnabled", () => {
  it("returns true by default", () => {
    expect(selectNotificationsEnabled(makeState())).toBe(true);
  });

  it("returns false when disabled", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ enabled: false }),
    });
    expect(selectNotificationsEnabled(makeState({ settings }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectDoNotDisturb
// ---------------------------------------------------------------------------

describe("selectDoNotDisturb", () => {
  it("returns false by default", () => {
    expect(selectDoNotDisturb(makeState())).toBe(false);
  });

  it("returns true when enabled", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ doNotDisturb: true }),
    });
    expect(selectDoNotDisturb(makeState({ settings }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectReduceMotion
// ---------------------------------------------------------------------------

describe("selectReduceMotion", () => {
  it("returns false by default", () => {
    expect(selectReduceMotion(makeState())).toBe(false);
  });

  it("returns true when enabled", () => {
    const settings = makeSettings({
      accessibility: makeAccessibility({ reduceMotion: true }),
    });
    expect(selectReduceMotion(makeState({ settings }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectHighContrast
// ---------------------------------------------------------------------------

describe("selectHighContrast", () => {
  it("returns false by default", () => {
    expect(selectHighContrast(makeState())).toBe(false);
  });

  it("returns true when enabled", () => {
    const settings = makeSettings({
      accessibility: makeAccessibility({ highContrast: true }),
    });
    expect(selectHighContrast(makeState({ settings }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMutedChannels
// ---------------------------------------------------------------------------

describe("selectMutedChannels", () => {
  it("returns empty array by default", () => {
    expect(selectMutedChannels(makeState())).toEqual([]);
  });

  it("returns muted channel ids", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedChannels: ["ch1", "ch2"] }),
    });
    expect(selectMutedChannels(makeState({ settings }))).toEqual(["ch1", "ch2"]);
  });
});

// ---------------------------------------------------------------------------
// selectMutedUsers
// ---------------------------------------------------------------------------

describe("selectMutedUsers", () => {
  it("returns empty array by default", () => {
    expect(selectMutedUsers(makeState())).toEqual([]);
  });

  it("returns muted user ids", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedUsers: ["u1", "u2"] }),
    });
    expect(selectMutedUsers(makeState({ settings }))).toEqual(["u1", "u2"]);
  });
});

// ---------------------------------------------------------------------------
// selectBlockList
// ---------------------------------------------------------------------------

describe("selectBlockList", () => {
  it("returns empty array by default", () => {
    expect(selectBlockList(makeState())).toEqual([]);
  });

  it("returns blocked user ids", () => {
    const settings = makeSettings({
      privacy: makePrivacy({ blockList: ["u3", "u4"] }),
    });
    expect(selectBlockList(makeState({ settings }))).toEqual(["u3", "u4"]);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
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
  it("returns false by default", () => {
    expect(selectIsSaving(makeState())).toBe(false);
  });

  it("returns true when saving", () => {
    expect(selectIsSaving(makeState({ isSaving: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectActiveCategory
// ---------------------------------------------------------------------------

describe("selectActiveCategory", () => {
  it("returns the active category", () => {
    expect(selectActiveCategory(makeState({ activeCategory: "appearance" }))).toBe(
      "appearance",
    );
  });

  it("returns a different category when set", () => {
    expect(selectActiveCategory(makeState({ activeCategory: "privacy" }))).toBe(
      "privacy",
    );
  });
});

// ---------------------------------------------------------------------------
// selectSearchQuery
// ---------------------------------------------------------------------------

describe("selectSearchQuery", () => {
  it("returns empty string by default", () => {
    expect(selectSearchQuery(makeState())).toBe("");
  });

  it("returns the search query when set", () => {
    expect(selectSearchQuery(makeState({ searchQuery: "notif" }))).toBe("notif");
  });
});

// ---------------------------------------------------------------------------
// selectHasUnsavedChanges
// ---------------------------------------------------------------------------

describe("selectHasUnsavedChanges", () => {
  it("returns false by default", () => {
    expect(selectHasUnsavedChanges(makeState())).toBe(false);
  });

  it("returns true when there are unsaved changes", () => {
    expect(selectHasUnsavedChanges(makeState({ hasUnsavedChanges: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectSyncStatus
// ---------------------------------------------------------------------------

describe("selectSyncStatus", () => {
  it("returns synced by default", () => {
    expect(selectSyncStatus(makeState())).toBe("synced");
  });

  it("returns pending when syncing", () => {
    expect(selectSyncStatus(makeState({ syncStatus: "pending" }))).toBe("pending");
  });

  it("returns error when sync failed", () => {
    expect(selectSyncStatus(makeState({ syncStatus: "error" }))).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error message", () => {
    expect(selectError(makeState({ error: "Save failed" }))).toBe("Save failed");
  });
});

// ---------------------------------------------------------------------------
// selectIsChannelMuted (factory selector)
// ---------------------------------------------------------------------------

describe("selectIsChannelMuted", () => {
  it("returns false when channel is not muted", () => {
    const selector = selectIsChannelMuted("ch1");
    expect(selector(makeState())).toBe(false);
  });

  it("returns true when channel is muted", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedChannels: ["ch1", "ch2"] }),
    });
    const selector = selectIsChannelMuted("ch1");
    expect(selector(makeState({ settings }))).toBe(true);
  });

  it("returns false for a different channel", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedChannels: ["ch1"] }),
    });
    const selector = selectIsChannelMuted("ch2");
    expect(selector(makeState({ settings }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsUserMuted (factory selector)
// ---------------------------------------------------------------------------

describe("selectIsUserMuted", () => {
  it("returns false when user is not muted", () => {
    const selector = selectIsUserMuted("u1");
    expect(selector(makeState())).toBe(false);
  });

  it("returns true when user is muted", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedUsers: ["u1", "u2"] }),
    });
    const selector = selectIsUserMuted("u1");
    expect(selector(makeState({ settings }))).toBe(true);
  });

  it("returns false for a different user", () => {
    const settings = makeSettings({
      notifications: makeNotifications({ mutedUsers: ["u1"] }),
    });
    const selector = selectIsUserMuted("u2");
    expect(selector(makeState({ settings }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsUserBlocked (factory selector)
// ---------------------------------------------------------------------------

describe("selectIsUserBlocked", () => {
  it("returns false when user is not blocked", () => {
    const selector = selectIsUserBlocked("u1");
    expect(selector(makeState())).toBe(false);
  });

  it("returns true when user is blocked", () => {
    const settings = makeSettings({
      privacy: makePrivacy({ blockList: ["u1", "u2"] }),
    });
    const selector = selectIsUserBlocked("u1");
    expect(selector(makeState({ settings }))).toBe(true);
  });

  it("returns false for a different user", () => {
    const settings = makeSettings({
      privacy: makePrivacy({ blockList: ["u1"] }),
    });
    const selector = selectIsUserBlocked("u2");
    expect(selector(makeState({ settings }))).toBe(false);
  });
});
