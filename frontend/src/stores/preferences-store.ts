/**
 * Preferences Store - Manages user preferences for the nself-chat application
 *
 * Handles theme, display, notification, and keyboard shortcut preferences
 * All preferences are persisted to localStorage
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ThemeMode = "light" | "dark" | "system";

export type MessageDensity = "compact" | "comfortable" | "spacious";

export type TimestampFormat = "relative" | "absolute" | "both";

export type TimeFormat = "12h" | "24h";

export type DateFormat = "mdy" | "dmy" | "ymd";

export type FontSize = "small" | "medium" | "large";

export type MessageGrouping = "none" | "time" | "sender";

export type SidebarPosition = "left" | "right";

export type EnterKeyBehavior = "send" | "newline";

export type MediaAutoplay = "always" | "wifi" | "never";

export interface DisplayPreferences {
  // Theme
  theme: ThemeMode;
  accentColor: string;

  // Messages
  messageDensity: MessageDensity;
  messageGrouping: MessageGrouping;
  showAvatars: boolean;
  showUsernames: boolean;
  showTimestamps: boolean;
  timestampFormat: TimestampFormat;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;

  // Font
  fontSize: FontSize;
  fontFamily: string;
  useMonospaceForCode: boolean;

  // Layout
  sidebarPosition: SidebarPosition;
  sidebarWidth: number;
  threadPanelWidth: number;

  // Animations
  animationsEnabled: boolean;
  reduceMotion: boolean;
}

export interface InputPreferences {
  // Compose behavior
  enterKeyBehavior: EnterKeyBehavior;
  spellCheckEnabled: boolean;
  autocorrectEnabled: boolean;
  markdownEnabled: boolean;
  emojiAutocomplete: boolean;
  mentionAutocomplete: boolean;

  // Draft
  saveDrafts: boolean;
  confirmClearDraft: boolean;
}

export interface MediaPreferences {
  // Playback
  autoplayMedia: MediaAutoplay;
  autoplayGifs: boolean;
  loopVideos: boolean;
  muteByDefault: boolean;
  defaultVolume: number;

  // Display
  showLinkPreviews: boolean;
  showImagePreviews: boolean;
  compactImageMode: boolean;
  maxPreviewHeight: number;
}

export interface SoundPreferences {
  enabled: boolean;
  volume: number;
  notificationSound: string;
  mentionSound: string;
  dmSound: string;
  playSoundWhenFocused: boolean;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeClickTargets: boolean;
  screenReaderOptimized: boolean;
  focusIndicatorsEnabled: boolean;
  keyboardNavigationEnabled: boolean;
}

export interface PrivacyPreferences {
  showOnlineStatus: boolean;
  showTypingIndicator: boolean;
  shareReadReceipts: boolean;
  allowProfileIndexing: boolean;
}

export interface KeyboardShortcut {
  id: string;
  label: string;
  keys: string[];
  category: string;
  enabled: boolean;
}

export interface PreferencesState {
  display: DisplayPreferences;
  input: InputPreferences;
  media: MediaPreferences;
  sound: SoundPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
  keyboardShortcuts: KeyboardShortcut[];

  // UI state
  preferencesOpen: boolean;
  activeSection: string;
}

export interface PreferencesActions {
  // Display preferences
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setMessageDensity: (density: MessageDensity) => void;
  setFontSize: (size: FontSize) => void;
  updateDisplayPreferences: (updates: Partial<DisplayPreferences>) => void;

  // Input preferences
  setEnterKeyBehavior: (behavior: EnterKeyBehavior) => void;
  updateInputPreferences: (updates: Partial<InputPreferences>) => void;

  // Media preferences
  setAutoplayMedia: (autoplay: MediaAutoplay) => void;
  updateMediaPreferences: (updates: Partial<MediaPreferences>) => void;

  // Sound preferences
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  updateSoundPreferences: (updates: Partial<SoundPreferences>) => void;

  // Accessibility preferences
  updateAccessibilityPreferences: (
    updates: Partial<AccessibilityPreferences>,
  ) => void;

  // Privacy preferences
  updatePrivacyPreferences: (updates: Partial<PrivacyPreferences>) => void;

  // Keyboard shortcuts
  setKeyboardShortcut: (id: string, keys: string[]) => void;
  enableKeyboardShortcut: (id: string, enabled: boolean) => void;
  resetKeyboardShortcut: (id: string) => void;
  resetAllKeyboardShortcuts: () => void;

  // UI actions
  openPreferences: (section?: string) => void;
  closePreferences: () => void;
  setActiveSection: (section: string) => void;

  // Utility
  resetToDefaults: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => boolean;
}

export type PreferencesStore = PreferencesState & PreferencesActions;

// ============================================================================
// Default Values
// ============================================================================

const defaultDisplayPreferences: DisplayPreferences = {
  theme: "system",
  accentColor: "#6366f1", // Indigo
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
};

const defaultInputPreferences: InputPreferences = {
  enterKeyBehavior: "send",
  spellCheckEnabled: true,
  autocorrectEnabled: true,
  markdownEnabled: true,
  emojiAutocomplete: true,
  mentionAutocomplete: true,
  saveDrafts: true,
  confirmClearDraft: true,
};

const defaultMediaPreferences: MediaPreferences = {
  autoplayMedia: "wifi",
  autoplayGifs: true,
  loopVideos: true,
  muteByDefault: false,
  defaultVolume: 80,
  showLinkPreviews: true,
  showImagePreviews: true,
  compactImageMode: false,
  maxPreviewHeight: 400,
};

const defaultSoundPreferences: SoundPreferences = {
  enabled: true,
  volume: 80,
  notificationSound: "default",
  mentionSound: "mention",
  dmSound: "dm",
  playSoundWhenFocused: false,
};

const defaultAccessibilityPreferences: AccessibilityPreferences = {
  highContrast: false,
  largeClickTargets: false,
  screenReaderOptimized: false,
  focusIndicatorsEnabled: true,
  keyboardNavigationEnabled: true,
};

const defaultPrivacyPreferences: PrivacyPreferences = {
  showOnlineStatus: true,
  showTypingIndicator: true,
  shareReadReceipts: true,
  allowProfileIndexing: true,
};

const defaultKeyboardShortcuts: KeyboardShortcut[] = [
  // Navigation
  {
    id: "goto-channel",
    label: "Quick switch channel",
    keys: ["mod", "k"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-threads",
    label: "Open threads",
    keys: ["mod", "shift", "t"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-dms",
    label: "Open direct messages",
    keys: ["mod", "shift", "d"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-search",
    label: "Open search",
    keys: ["mod", "/"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-prev-channel",
    label: "Previous channel",
    keys: ["alt", "up"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-next-channel",
    label: "Next channel",
    keys: ["alt", "down"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-prev-unread",
    label: "Previous unread",
    keys: ["alt", "shift", "up"],
    category: "navigation",
    enabled: true,
  },
  {
    id: "goto-next-unread",
    label: "Next unread",
    keys: ["alt", "shift", "down"],
    category: "navigation",
    enabled: true,
  },

  // Messages
  {
    id: "edit-last-message",
    label: "Edit last message",
    keys: ["up"],
    category: "messages",
    enabled: true,
  },
  {
    id: "reply-to-message",
    label: "Reply to message",
    keys: ["r"],
    category: "messages",
    enabled: true,
  },
  {
    id: "react-to-message",
    label: "Add reaction",
    keys: ["e"],
    category: "messages",
    enabled: true,
  },
  {
    id: "pin-message",
    label: "Pin message",
    keys: ["p"],
    category: "messages",
    enabled: true,
  },
  {
    id: "delete-message",
    label: "Delete message",
    keys: ["backspace"],
    category: "messages",
    enabled: true,
  },
  {
    id: "mark-unread",
    label: "Mark as unread",
    keys: ["u"],
    category: "messages",
    enabled: true,
  },

  // Compose
  {
    id: "focus-composer",
    label: "Focus composer",
    keys: ["mod", "n"],
    category: "compose",
    enabled: true,
  },
  {
    id: "send-message",
    label: "Send message",
    keys: ["enter"],
    category: "compose",
    enabled: true,
  },
  {
    id: "newline",
    label: "New line",
    keys: ["shift", "enter"],
    category: "compose",
    enabled: true,
  },
  {
    id: "bold",
    label: "Bold text",
    keys: ["mod", "b"],
    category: "compose",
    enabled: true,
  },
  {
    id: "italic",
    label: "Italic text",
    keys: ["mod", "i"],
    category: "compose",
    enabled: true,
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    keys: ["mod", "shift", "x"],
    category: "compose",
    enabled: true,
  },
  {
    id: "code",
    label: "Inline code",
    keys: ["mod", "e"],
    category: "compose",
    enabled: true,
  },
  {
    id: "link",
    label: "Insert link",
    keys: ["mod", "shift", "u"],
    category: "compose",
    enabled: true,
  },
  {
    id: "emoji-picker",
    label: "Emoji picker",
    keys: ["mod", "shift", "e"],
    category: "compose",
    enabled: true,
  },
  {
    id: "attach-file",
    label: "Attach file",
    keys: ["mod", "shift", "a"],
    category: "compose",
    enabled: true,
  },

  // UI
  {
    id: "toggle-sidebar",
    label: "Toggle sidebar",
    keys: ["mod", "s"],
    category: "ui",
    enabled: true,
  },
  {
    id: "toggle-thread-panel",
    label: "Toggle thread panel",
    keys: ["mod", "."],
    category: "ui",
    enabled: true,
  },
  {
    id: "toggle-members",
    label: "Toggle members panel",
    keys: ["mod", "m"],
    category: "ui",
    enabled: true,
  },
  {
    id: "toggle-fullscreen",
    label: "Toggle fullscreen",
    keys: ["mod", "shift", "f"],
    category: "ui",
    enabled: true,
  },
  {
    id: "open-preferences",
    label: "Open preferences",
    keys: ["mod", ","],
    category: "ui",
    enabled: true,
  },
  {
    id: "close-modal",
    label: "Close modal",
    keys: ["escape"],
    category: "ui",
    enabled: true,
  },
];

// ============================================================================
// Initial State
// ============================================================================

const initialState: PreferencesState = {
  display: defaultDisplayPreferences,
  input: defaultInputPreferences,
  media: defaultMediaPreferences,
  sound: defaultSoundPreferences,
  accessibility: defaultAccessibilityPreferences,
  privacy: defaultPrivacyPreferences,
  keyboardShortcuts: defaultKeyboardShortcuts,
  preferencesOpen: false,
  activeSection: "display",
};

// ============================================================================
// Store
// ============================================================================

export const usePreferencesStore = create<PreferencesStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Display preferences
          setTheme: (theme) =>
            set(
              (state) => {
                state.display.theme = theme;
              },
              false,
              "preferences/setTheme",
            ),

          setAccentColor: (color) =>
            set(
              (state) => {
                state.display.accentColor = color;
              },
              false,
              "preferences/setAccentColor",
            ),

          setMessageDensity: (density) =>
            set(
              (state) => {
                state.display.messageDensity = density;
              },
              false,
              "preferences/setMessageDensity",
            ),

          setFontSize: (size) =>
            set(
              (state) => {
                state.display.fontSize = size;
              },
              false,
              "preferences/setFontSize",
            ),

          updateDisplayPreferences: (updates) =>
            set(
              (state) => {
                state.display = { ...state.display, ...updates };
              },
              false,
              "preferences/updateDisplayPreferences",
            ),

          // Input preferences
          setEnterKeyBehavior: (behavior) =>
            set(
              (state) => {
                state.input.enterKeyBehavior = behavior;
              },
              false,
              "preferences/setEnterKeyBehavior",
            ),

          updateInputPreferences: (updates) =>
            set(
              (state) => {
                state.input = { ...state.input, ...updates };
              },
              false,
              "preferences/updateInputPreferences",
            ),

          // Media preferences
          setAutoplayMedia: (autoplay) =>
            set(
              (state) => {
                state.media.autoplayMedia = autoplay;
              },
              false,
              "preferences/setAutoplayMedia",
            ),

          updateMediaPreferences: (updates) =>
            set(
              (state) => {
                state.media = { ...state.media, ...updates };
              },
              false,
              "preferences/updateMediaPreferences",
            ),

          // Sound preferences
          setSoundEnabled: (enabled) =>
            set(
              (state) => {
                state.sound.enabled = enabled;
              },
              false,
              "preferences/setSoundEnabled",
            ),

          setSoundVolume: (volume) =>
            set(
              (state) => {
                state.sound.volume = Math.max(0, Math.min(100, volume));
              },
              false,
              "preferences/setSoundVolume",
            ),

          updateSoundPreferences: (updates) =>
            set(
              (state) => {
                state.sound = { ...state.sound, ...updates };
              },
              false,
              "preferences/updateSoundPreferences",
            ),

          // Accessibility preferences
          updateAccessibilityPreferences: (updates) =>
            set(
              (state) => {
                state.accessibility = { ...state.accessibility, ...updates };
              },
              false,
              "preferences/updateAccessibilityPreferences",
            ),

          // Privacy preferences
          updatePrivacyPreferences: (updates) =>
            set(
              (state) => {
                state.privacy = { ...state.privacy, ...updates };
              },
              false,
              "preferences/updatePrivacyPreferences",
            ),

          // Keyboard shortcuts
          setKeyboardShortcut: (id, keys) =>
            set(
              (state) => {
                const shortcut = state.keyboardShortcuts.find(
                  (s) => s.id === id,
                );
                if (shortcut) {
                  shortcut.keys = keys;
                }
              },
              false,
              "preferences/setKeyboardShortcut",
            ),

          enableKeyboardShortcut: (id, enabled) =>
            set(
              (state) => {
                const shortcut = state.keyboardShortcuts.find(
                  (s) => s.id === id,
                );
                if (shortcut) {
                  shortcut.enabled = enabled;
                }
              },
              false,
              "preferences/enableKeyboardShortcut",
            ),

          resetKeyboardShortcut: (id) =>
            set(
              (state) => {
                const defaultShortcut = defaultKeyboardShortcuts.find(
                  (s) => s.id === id,
                );
                const shortcut = state.keyboardShortcuts.find(
                  (s) => s.id === id,
                );
                if (defaultShortcut && shortcut) {
                  shortcut.keys = [...defaultShortcut.keys];
                  shortcut.enabled = defaultShortcut.enabled;
                }
              },
              false,
              "preferences/resetKeyboardShortcut",
            ),

          resetAllKeyboardShortcuts: () =>
            set(
              (state) => {
                state.keyboardShortcuts = defaultKeyboardShortcuts.map((s) => ({
                  ...s,
                }));
              },
              false,
              "preferences/resetAllKeyboardShortcuts",
            ),

          // UI actions
          openPreferences: (section) =>
            set(
              (state) => {
                state.preferencesOpen = true;
                if (section) {
                  state.activeSection = section;
                }
              },
              false,
              "preferences/openPreferences",
            ),

          closePreferences: () =>
            set(
              (state) => {
                state.preferencesOpen = false;
              },
              false,
              "preferences/closePreferences",
            ),

          setActiveSection: (section) =>
            set(
              (state) => {
                state.activeSection = section;
              },
              false,
              "preferences/setActiveSection",
            ),

          // Utility
          resetToDefaults: () =>
            set(
              () => ({
                ...initialState,
                keyboardShortcuts: defaultKeyboardShortcuts.map((s) => ({
                  ...s,
                })),
              }),
              false,
              "preferences/resetToDefaults",
            ),

          exportPreferences: () => {
            const state = get();
            return JSON.stringify({
              display: state.display,
              input: state.input,
              media: state.media,
              sound: state.sound,
              accessibility: state.accessibility,
              privacy: state.privacy,
              keyboardShortcuts: state.keyboardShortcuts,
            });
          },

          importPreferences: (json) => {
            try {
              const data = JSON.parse(json);
              set(
                (state) => {
                  if (data.display)
                    state.display = {
                      ...defaultDisplayPreferences,
                      ...data.display,
                    };
                  if (data.input)
                    state.input = { ...defaultInputPreferences, ...data.input };
                  if (data.media)
                    state.media = { ...defaultMediaPreferences, ...data.media };
                  if (data.sound)
                    state.sound = { ...defaultSoundPreferences, ...data.sound };
                  if (data.accessibility)
                    state.accessibility = {
                      ...defaultAccessibilityPreferences,
                      ...data.accessibility,
                    };
                  if (data.privacy)
                    state.privacy = {
                      ...defaultPrivacyPreferences,
                      ...data.privacy,
                    };
                  if (data.keyboardShortcuts)
                    state.keyboardShortcuts = data.keyboardShortcuts;
                },
                false,
                "preferences/importPreferences",
              );
              return true;
            } catch {
              return false;
            }
          },
        })),
      ),
      {
        name: "nchat-preferences",
        // Persist all preferences except UI state
        partialize: (state) => ({
          display: state.display,
          input: state.input,
          media: state.media,
          sound: state.sound,
          accessibility: state.accessibility,
          privacy: state.privacy,
          keyboardShortcuts: state.keyboardShortcuts,
        }),
      },
    ),
    { name: "preferences-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectTheme = (state: PreferencesStore) => state.display.theme;

export const selectAccentColor = (state: PreferencesStore) =>
  state.display.accentColor;

export const selectMessageDensity = (state: PreferencesStore) =>
  state.display.messageDensity;

export const selectFontSize = (state: PreferencesStore) =>
  state.display.fontSize;

export const selectDisplayPreferences = (state: PreferencesStore) =>
  state.display;

export const selectInputPreferences = (state: PreferencesStore) => state.input;

export const selectMediaPreferences = (state: PreferencesStore) => state.media;

export const selectSoundPreferences = (state: PreferencesStore) => state.sound;

export const selectAccessibilityPreferences = (state: PreferencesStore) =>
  state.accessibility;

export const selectPrivacyPreferences = (state: PreferencesStore) =>
  state.privacy;

export const selectKeyboardShortcuts = (state: PreferencesStore) =>
  state.keyboardShortcuts;

export const selectKeyboardShortcutsByCategory =
  (category: string) => (state: PreferencesStore) =>
    state.keyboardShortcuts.filter((s) => s.category === category);

export const selectKeyboardShortcut =
  (id: string) => (state: PreferencesStore) =>
    state.keyboardShortcuts.find((s) => s.id === id);

export const selectEnabledKeyboardShortcuts = (state: PreferencesStore) =>
  state.keyboardShortcuts.filter((s) => s.enabled);

export const selectPreferencesOpen = (state: PreferencesStore) =>
  state.preferencesOpen;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert keyboard shortcut keys array to display string
 */
export const formatShortcutKeys = (keys: string[]): string => {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  return keys
    .map((key) => {
      switch (key) {
        case "mod":
          return isMac ? "⌘" : "Ctrl";
        case "alt":
          return isMac ? "⌥" : "Alt";
        case "shift":
          return isMac ? "⇧" : "Shift";
        case "ctrl":
          return isMac ? "⌃" : "Ctrl";
        case "enter":
          return "↵";
        case "backspace":
          return "⌫";
        case "escape":
          return "Esc";
        case "up":
          return "↑";
        case "down":
          return "↓";
        case "left":
          return "←";
        case "right":
          return "→";
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
};

/**
 * Get font size in pixels
 */
export const getFontSizePixels = (size: FontSize): number => {
  switch (size) {
    case "small":
      return 13;
    case "medium":
      return 15;
    case "large":
      return 17;
    default:
      return 15;
  }
};

/**
 * Get message spacing based on density
 */
export const getMessageSpacing = (density: MessageDensity): number => {
  switch (density) {
    case "compact":
      return 4;
    case "comfortable":
      return 8;
    case "spacious":
      return 16;
    default:
      return 8;
  }
};
