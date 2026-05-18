/**
 * Canonical Skin Architecture - Core Types
 *
 * Separates visual presentation (VisualSkin) from interaction behavior (BehaviorPreset),
 * allowing independent switching. A CompositeProfile binds a skin + behavior together
 * with optional overrides.
 *
 * @module lib/skins/types
 * @version 1.0.0
 */

// ============================================================================
// VISUAL SKIN TYPES
// ============================================================================

/**
 * Color palette for a visual skin. Every skin must define all fields for both
 * light and dark modes. Values are CSS color strings (hex, rgb, hsl, etc.).
 */
export interface SkinColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  muted: string;
  border: string;
  /** Status / feedback colors */
  success: string;
  warning: string;
  error: string;
  info: string;
  /** Button colors */
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
}

/**
 * Typography tokens.
 */
export interface SkinTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSizeBase: string;
  fontSizeSm: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightBold: number;
  lineHeight: number;
  letterSpacing: string;
}

/**
 * Spacing tokens that influence layout.
 */
export interface SkinSpacing {
  messageGap: string;
  messagePadding: string;
  sidebarWidth: string;
  headerHeight: string;
  inputHeight: string;
  avatarSize: string;
  avatarSizeSm: string;
  avatarSizeLg: string;
}

/**
 * Border radius scale.
 */
export interface SkinBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

/**
 * Icon style configuration.
 */
export interface SkinIconStyle {
  style: "outline" | "filled" | "duotone";
  set: string;
  strokeWidth: number;
}

/**
 * Component-level style tokens that change the "feel" of the skin without
 * altering behaviour.
 */
export interface SkinComponentStyles {
  messageLayout: "default" | "compact" | "cozy" | "bubbles";
  avatarShape: "circle" | "rounded" | "square";
  buttonStyle: "default" | "pill" | "square" | "ghost";
  inputStyle: "default" | "underline" | "filled" | "outline";
  sidebarStyle: "default" | "compact" | "wide" | "icons-only";
  headerStyle: "default" | "minimal" | "prominent";
  scrollbarStyle: "default" | "thin" | "hidden" | "overlay";
}

/**
 * Complete visual skin definition. Governs everything about how the UI LOOKS
 * without prescribing how it BEHAVES.
 */
export interface VisualSkin {
  id: string;
  name: string;
  description: string;
  version: string;
  colors: SkinColorPalette;
  typography: SkinTypography;
  spacing: SkinSpacing;
  borderRadius: SkinBorderRadius;
  icons: SkinIconStyle;
  components: SkinComponentStyles;
  /** Dark mode overrides -- merged on top of root fields when dark mode is active */
  darkMode: {
    colors: SkinColorPalette;
  };
}

// ============================================================================
// BEHAVIOR PRESET TYPES
// ============================================================================

/**
 * Messaging behaviour configuration.
 */
export interface BehaviorMessaging {
  /** Edit window in milliseconds; 0 = unlimited, -1 = disabled */
  editWindow: number;
  /** Delete-for-self window in milliseconds; 0 = unlimited */
  deleteWindow: number;
  /** Whether "delete for everyone" is available */
  deleteForEveryone: boolean;
  /** Delete-for-everyone window in ms */
  deleteForEveryoneWindow: number;
  /** Show "(edited)" indicator */
  showEditedIndicator: boolean;
  /** Reaction style */
  reactionStyle:
    | "emoji-bar"
    | "quick-reactions"
    | "full-picker"
    | "limited-set";
  /** Maximum reactions per message per user */
  maxReactionsPerMessage: number;
  /** Threading model */
  threadingModel: "none" | "reply-chain" | "side-panel" | "inline" | "forum";
  /** Max message length in characters */
  maxMessageLength: number;
  /** Whether to show message forwarding */
  forwarding: boolean;
  /** Forward limit (max chats at once) */
  forwardLimit: number;
  /** Whether messages can be pinned */
  pinning: boolean;
  /** Whether messages can be bookmarked/starred */
  bookmarking: boolean;
  /** Scheduled messages */
  scheduling: boolean;
  /** Whether to show link previews */
  linkPreviews: boolean;
}

/**
 * Channel / conversation structure behaviour.
 */
export interface BehaviorChannels {
  types: (
    | "public"
    | "private"
    | "dm"
    | "group-dm"
    | "broadcast"
    | "forum"
    | "voice"
    | "stage"
    | "announcement"
  )[];
  hierarchy: boolean;
  categories: boolean;
  forums: boolean;
  maxGroupDmMembers: number;
  maxGroupMembers: number;
  archiving: boolean;
  slowMode: boolean;
}

/**
 * Presence and typing behaviour.
 */
export interface BehaviorPresence {
  states: string[];
  showLastSeen: boolean;
  lastSeenPrivacy: boolean;
  customStatus: boolean;
  activityStatus: boolean;
  typingIndicator: boolean;
  typingTimeout: number;
  autoAway: boolean;
  autoAwayTimeout: number;
  invisibleMode: boolean;
}

/**
 * Call / voice behaviour.
 */
export interface BehaviorCalls {
  supported: boolean;
  voiceCalls: boolean;
  videoCalls: boolean;
  groupCalls: boolean;
  groupMax: number;
  screenShare: boolean;
  recording: boolean;
  huddles: boolean;
}

/**
 * Notification behaviour defaults.
 */
export interface BehaviorNotifications {
  defaultLevel: "all" | "mentions" | "none";
  mentionRules: ("user" | "role" | "channel" | "here" | "everyone")[];
  quietHours: boolean;
  threadNotifications: boolean;
  soundEnabled: boolean;
  badgeCount: boolean;
  emailDigest: boolean;
}

/**
 * Moderation behaviour defaults.
 */
export interface BehaviorModeration {
  profanityFilter: boolean;
  spamDetection: boolean;
  automod: boolean;
  slowMode: boolean;
  appeals: boolean;
  reportSystem: boolean;
  userTimeout: boolean;
  userBan: boolean;
}

/**
 * Privacy behaviour defaults.
 */
export interface BehaviorPrivacy {
  readReceipts: boolean;
  readReceiptsOptional: boolean;
  lastSeen: boolean;
  lastSeenPrivacy: boolean;
  profileVisibility: "everyone" | "contacts" | "nobody";
  onlineStatusVisible: boolean;
  e2eeDefault: boolean;
  disappearingMessages: boolean;
  disappearingOptions: string[];
}

/**
 * Complete behavior preset. Governs how the application BEHAVES without
 * prescribing how it LOOKS.
 */
export interface BehaviorPreset {
  id: string;
  name: string;
  description: string;
  version: string;
  messaging: BehaviorMessaging;
  channels: BehaviorChannels;
  presence: BehaviorPresence;
  calls: BehaviorCalls;
  notifications: BehaviorNotifications;
  moderation: BehaviorModeration;
  privacy: BehaviorPrivacy;
  /** Granular feature flags for features not covered by the structured sections */
  features: Record<string, boolean>;
}

// ============================================================================
// COMPOSITE PROFILE TYPES
// ============================================================================

/**
 * A named combination of a visual skin and a behavior preset, with optional
 * per-field overrides.
 */
export interface CompositeProfile {
  id: string;
  name: string;
  description: string;
  skinId: string;
  behaviorId: string;
  overrides?: {
    skin?: DeepPartial<VisualSkin>;
    behavior?: DeepPartial<BehaviorPreset>;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Recursively makes every property of T optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Validation result returned by skin/behavior validators.
 */
export interface SkinValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Registry of all skins, behaviors, and profiles available to the engine.
 */
export interface SkinRegistry {
  skins: Record<string, VisualSkin>;
  behaviors: Record<string, BehaviorPreset>;
  profiles: Record<string, CompositeProfile>;
}

/**
 * Resolved state after applying a profile (or individual skin + behavior).
 */
export interface ResolvedSkinState {
  skin: VisualSkin;
  behavior: BehaviorPreset;
  profileId?: string;
  isDarkMode: boolean;
}
