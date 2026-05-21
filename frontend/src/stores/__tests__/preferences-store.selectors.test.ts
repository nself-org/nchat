/**
 * Tests for preferences-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  PreferencesStore,
  PreferencesState,
  DisplayPreferences,
  InputPreferences,
  MediaPreferences,
  SoundPreferences,
  AccessibilityPreferences,
  PrivacyPreferences,
  KeyboardShortcut,
} from "../preferences-store";
import {
  selectTheme,
  selectAccentColor,
  selectMessageDensity,
  selectFontSize,
  selectDisplayPreferences,
  selectInputPreferences,
  selectMediaPreferences,
  selectSoundPreferences,
  selectAccessibilityPreferences,
  selectPrivacyPreferences,
  selectKeyboardShortcuts,
  selectKeyboardShortcutsByCategory,
  selectKeyboardShortcut,
  selectEnabledKeyboardShortcuts,
  selectPreferencesOpen,
} from "../preferences-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDisplay(
  overrides?: Partial<DisplayPreferences>,
): DisplayPreferences {
  return {
    theme: "system",
    accentColor: "#6366f1",
    messageDensity: "comfortable",
    messageGrouping: "sender",
    showAvatars: true,
    showUsernames: true,
    showTimestamps: true,
    timestampFormat: "relative",
    timeFormat: "12h",
    dateFormat: "mdy",
    fontSize: "medium",
    fontFamily: "system-ui",
    useMonospaceForCode: true,
    sidebarPosition: "left",
    sidebarWidth: 260,
    threadPanelWidth: 400,
    animationsEnabled: true,
    reduceMotion: false,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<InputPreferences>): InputPreferences {
  return {
    enterKeyBehavior: "send",
    spellCheckEnabled: true,
    autocorrectEnabled: true,
    markdownEnabled: true,
    emojiAutocomplete: true,
    mentionAutocomplete: true,
    saveDrafts: true,
    confirmClearDraft: true,
    ...overrides,
  };
}

function makeMedia(overrides?: Partial<MediaPreferences>): MediaPreferences {
  return {
    autoplayMedia: "wifi",
    autoplayGifs: true,
    loopVideos: true,
    muteByDefault: false,
    defaultVolume: 80,
    showLinkPreviews: true,
    showImagePreviews: true,
    compactImageMode: false,
    maxPreviewHeight: 400,
    ...overrides,
  };
}

function makeSound(overrides?: Partial<SoundPreferences>): SoundPreferences {
  return {
    enabled: true,
    volume: 80,
    notificationSound: "default",
    mentionSound: "mention",
    dmSound: "dm",
    playSoundWhenFocused: false,
    ...overrides,
  };
}

function makeAccessibility(
  overrides?: Partial<AccessibilityPreferences>,
): AccessibilityPreferences {
  return {
    highContrast: false,
    largeClickTargets: false,
    screenReaderOptimized: false,
    focusIndicatorsEnabled: true,
    keyboardNavigationEnabled: true,
    ...overrides,
  };
}

function makePrivacy(
  overrides?: Partial<PrivacyPreferences>,
): PrivacyPreferences {
  return {
    showOnlineStatus: true,
    showTypingIndicator: true,
    shareReadReceipts: true,
    allowProfileIndexing: true,
    ...overrides,
  };
}

function makeShortcut(overrides?: Partial<KeyboardShortcut>): KeyboardShortcut {
  return {
    id: "goto-channel",
    label: "Quick switch channel",
    keys: ["mod", "k"],
    category: "navigation",
    enabled: true,
    ...overrides,
  };
}

function makeState(overrides?: Partial<PreferencesState>): PreferencesStore {
  const defaultState: PreferencesState = {
    display: makeDisplay(),
    input: makeInput(),
    media: makeMedia(),
    sound: makeSound(),
    accessibility: makeAccessibility(),
    privacy: makePrivacy(),
    keyboardShortcuts: [],
    preferencesOpen: false,
    activeSection: "display",
  };
  return { ...defaultState, ...overrides } as unknown as PreferencesStore;
}

// ---------------------------------------------------------------------------
// selectTheme
// ---------------------------------------------------------------------------

describe("selectTheme", () => {
  it("returns system theme by default", () => {
    expect(selectTheme(makeState())).toBe("system");
  });

  it("returns the configured theme", () => {
    expect(
      selectTheme(makeState({ display: makeDisplay({ theme: "dark" }) })),
    ).toBe("dark");
  });

  it("returns light theme", () => {
    expect(
      selectTheme(makeState({ display: makeDisplay({ theme: "light" }) })),
    ).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// selectAccentColor
// ---------------------------------------------------------------------------

describe("selectAccentColor", () => {
  it("returns the default accent color", () => {
    expect(selectAccentColor(makeState())).toBe("#6366f1");
  });

  it("returns a custom accent color", () => {
    expect(
      selectAccentColor(
        makeState({ display: makeDisplay({ accentColor: "#ff0000" }) }),
      ),
    ).toBe("#ff0000");
  });
});

// ---------------------------------------------------------------------------
// selectMessageDensity
// ---------------------------------------------------------------------------

describe("selectMessageDensity", () => {
  it("returns comfortable by default", () => {
    expect(selectMessageDensity(makeState())).toBe("comfortable");
  });

  it("returns compact density", () => {
    expect(
      selectMessageDensity(
        makeState({ display: makeDisplay({ messageDensity: "compact" }) }),
      ),
    ).toBe("compact");
  });

  it("returns spacious density", () => {
    expect(
      selectMessageDensity(
        makeState({ display: makeDisplay({ messageDensity: "spacious" }) }),
      ),
    ).toBe("spacious");
  });
});

// ---------------------------------------------------------------------------
// selectFontSize
// ---------------------------------------------------------------------------

describe("selectFontSize", () => {
  it("returns medium by default", () => {
    expect(selectFontSize(makeState())).toBe("medium");
  });

  it("returns small font size", () => {
    expect(
      selectFontSize(
        makeState({ display: makeDisplay({ fontSize: "small" }) }),
      ),
    ).toBe("small");
  });

  it("returns large font size", () => {
    expect(
      selectFontSize(
        makeState({ display: makeDisplay({ fontSize: "large" }) }),
      ),
    ).toBe("large");
  });
});

// ---------------------------------------------------------------------------
// selectDisplayPreferences
// ---------------------------------------------------------------------------

describe("selectDisplayPreferences", () => {
  it("returns the full display preferences object", () => {
    const display = makeDisplay({ theme: "dark", fontSize: "large" });
    const result = selectDisplayPreferences(makeState({ display }));
    expect(result).toBe(display);
  });

  it("returns default display preferences", () => {
    const result = selectDisplayPreferences(makeState());
    expect(result.theme).toBe("system");
    expect(result.accentColor).toBe("#6366f1");
    expect(result.messageDensity).toBe("comfortable");
  });
});

// ---------------------------------------------------------------------------
// selectInputPreferences
// ---------------------------------------------------------------------------

describe("selectInputPreferences", () => {
  it("returns the input preferences object", () => {
    const input = makeInput({ enterKeyBehavior: "newline" });
    const result = selectInputPreferences(makeState({ input }));
    expect(result).toBe(input);
  });

  it("returns default input preferences", () => {
    const result = selectInputPreferences(makeState());
    expect(result.enterKeyBehavior).toBe("send");
    expect(result.spellCheckEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMediaPreferences
// ---------------------------------------------------------------------------

describe("selectMediaPreferences", () => {
  it("returns the media preferences object", () => {
    const media = makeMedia({ autoplayMedia: "always" });
    const result = selectMediaPreferences(makeState({ media }));
    expect(result).toBe(media);
  });

  it("returns default media preferences", () => {
    const result = selectMediaPreferences(makeState());
    expect(result.autoplayMedia).toBe("wifi");
    expect(result.autoplayGifs).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSoundPreferences
// ---------------------------------------------------------------------------

describe("selectSoundPreferences", () => {
  it("returns the sound preferences object", () => {
    const sound = makeSound({ enabled: false });
    const result = selectSoundPreferences(makeState({ sound }));
    expect(result).toBe(sound);
  });

  it("returns default sound preferences", () => {
    const result = selectSoundPreferences(makeState());
    expect(result.enabled).toBe(true);
    expect(result.volume).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// selectAccessibilityPreferences
// ---------------------------------------------------------------------------

describe("selectAccessibilityPreferences", () => {
  it("returns the accessibility preferences object", () => {
    const accessibility = makeAccessibility({ highContrast: true });
    const result = selectAccessibilityPreferences(makeState({ accessibility }));
    expect(result).toBe(accessibility);
  });

  it("returns default accessibility preferences", () => {
    const result = selectAccessibilityPreferences(makeState());
    expect(result.highContrast).toBe(false);
    expect(result.focusIndicatorsEnabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPrivacyPreferences
// ---------------------------------------------------------------------------

describe("selectPrivacyPreferences", () => {
  it("returns the privacy preferences object", () => {
    const privacy = makePrivacy({ showOnlineStatus: false });
    const result = selectPrivacyPreferences(makeState({ privacy }));
    expect(result).toBe(privacy);
  });

  it("returns default privacy preferences", () => {
    const result = selectPrivacyPreferences(makeState());
    expect(result.showOnlineStatus).toBe(true);
    expect(result.shareReadReceipts).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectKeyboardShortcuts
// ---------------------------------------------------------------------------

describe("selectKeyboardShortcuts", () => {
  it("returns empty array when no shortcuts configured", () => {
    expect(selectKeyboardShortcuts(makeState())).toEqual([]);
  });

  it("returns all keyboard shortcuts", () => {
    const shortcuts = [
      makeShortcut({ id: "goto-channel" }),
      makeShortcut({ id: "goto-search", keys: ["mod", "/"] }),
    ];
    expect(
      selectKeyboardShortcuts(makeState({ keyboardShortcuts: shortcuts })),
    ).toBe(shortcuts);
  });
});

// ---------------------------------------------------------------------------
// selectKeyboardShortcutsByCategory
// ---------------------------------------------------------------------------

describe("selectKeyboardShortcutsByCategory", () => {
  it("returns empty array when no shortcuts", () => {
    expect(
      selectKeyboardShortcutsByCategory("navigation")(makeState()),
    ).toEqual([]);
  });

  it("returns shortcuts matching the given category", () => {
    const nav1 = makeShortcut({ id: "goto-channel", category: "navigation" });
    const nav2 = makeShortcut({ id: "goto-search", category: "navigation" });
    const msg = makeShortcut({ id: "edit-message", category: "messages" });
    const shortcuts = [nav1, nav2, msg];
    const result = selectKeyboardShortcutsByCategory("navigation")(
      makeState({ keyboardShortcuts: shortcuts }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(nav1);
    expect(result[1]).toBe(nav2);
  });

  it("returns empty array for unknown category", () => {
    const shortcuts = [makeShortcut({ category: "navigation" })];
    expect(
      selectKeyboardShortcutsByCategory("unknown")(
        makeState({ keyboardShortcuts: shortcuts }),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectKeyboardShortcut
// ---------------------------------------------------------------------------

describe("selectKeyboardShortcut", () => {
  it("returns undefined when no shortcuts configured", () => {
    expect(selectKeyboardShortcut("goto-channel")(makeState())).toBeUndefined();
  });

  it("returns the shortcut with the matching id", () => {
    const target = makeShortcut({ id: "goto-search", keys: ["mod", "/"] });
    const shortcuts = [makeShortcut({ id: "goto-channel" }), target];
    const result = selectKeyboardShortcut("goto-search")(
      makeState({ keyboardShortcuts: shortcuts }),
    );
    expect(result).toBe(target);
  });

  it("returns undefined for unknown id", () => {
    const shortcuts = [makeShortcut({ id: "goto-channel" })];
    expect(
      selectKeyboardShortcut("missing")(
        makeState({ keyboardShortcuts: shortcuts }),
      ),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectEnabledKeyboardShortcuts
// ---------------------------------------------------------------------------

describe("selectEnabledKeyboardShortcuts", () => {
  it("returns empty array when no shortcuts", () => {
    expect(selectEnabledKeyboardShortcuts(makeState())).toEqual([]);
  });

  it("returns only enabled shortcuts", () => {
    const enabled = makeShortcut({ id: "goto-channel", enabled: true });
    const disabled = makeShortcut({ id: "goto-search", enabled: false });
    const shortcuts = [enabled, disabled];
    const result = selectEnabledKeyboardShortcuts(
      makeState({ keyboardShortcuts: shortcuts }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(enabled);
  });

  it("returns all shortcuts when all are enabled", () => {
    const shortcuts = [
      makeShortcut({ id: "s1", enabled: true }),
      makeShortcut({ id: "s2", enabled: true }),
    ];
    expect(
      selectEnabledKeyboardShortcuts(
        makeState({ keyboardShortcuts: shortcuts }),
      ),
    ).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectPreferencesOpen
// ---------------------------------------------------------------------------

describe("selectPreferencesOpen", () => {
  it("returns false when preferences are closed", () => {
    expect(selectPreferencesOpen(makeState())).toBe(false);
  });

  it("returns true when preferences are open", () => {
    expect(selectPreferencesOpen(makeState({ preferencesOpen: true }))).toBe(
      true,
    );
  });
});
