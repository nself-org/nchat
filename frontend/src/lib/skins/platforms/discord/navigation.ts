/**
 * Discord Navigation Pattern
 *
 * Defines Discord's unique navigation structure which features a two-sidebar
 * layout:
 *
 * Desktop (primary):
 *   - Left: Server list column (72px) + Channel sidebar (240px)
 *   - Server list: Home button, DMs, server icons (vertical column)
 *   - Channel sidebar: Categories (collapsible) with channel list by type
 *   - Right panel: Toggleable member list
 *   - Top bar: Channel name, topic, pinned messages, member toggle, search
 *   - Bottom: User area (avatar, username, mic/deafen/settings)
 *
 * Mobile:
 *   - Slide-out server list
 *   - Channel drawer
 *   - Full-screen chat
 *   - Bottom: composer
 *   - Swipe gestures for member list
 *
 * Discord is fundamentally a desktop-first application with dark mode as default.
 *
 * @module lib/skins/platforms/discord/navigation
 * @version 1.0.0
 */

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Server list item in the vertical server column.
 */
export interface DiscordServerListItem {
  /** Unique identifier */
  id: string;
  /** Item type */
  type: "home" | "separator" | "server" | "folder" | "add" | "explore";
  /** Display label / server name */
  label: string;
  /** Icon (URL or initials) */
  icon: string;
  /** Badge type */
  badgeType: "count" | "dot" | "none";
  /** Route/path */
  route: string;
  /** Whether this is the currently selected server */
  isActive: boolean;
  /** Pill indicator position */
  pillIndicator: "full" | "partial" | "dot" | "none";
}

/**
 * Channel list item within a server sidebar.
 */
export interface DiscordChannelItem {
  /** Channel ID */
  id: string;
  /** Channel type */
  type: "text" | "voice" | "stage" | "forum" | "announcement" | "rules";
  /** Channel name */
  name: string;
  /** Icon prefix character/symbol */
  iconPrefix: string;
  /** Whether channel has unread messages */
  hasUnread: boolean;
  /** Mention count */
  mentionCount: number;
  /** Whether channel is muted */
  isMuted: boolean;
  /** Whether channel is currently selected */
  isActive: boolean;
  /** NSFW channel marker */
  isNsfw: boolean;
  /** Connected users (for voice channels) */
  connectedUsers?: number;
}

/**
 * Category in the channel sidebar.
 */
export interface DiscordCategory {
  /** Category ID */
  id: string;
  /** Category name */
  name: string;
  /** Whether category is collapsed */
  collapsed: boolean;
  /** Channels within this category */
  channels: DiscordChannelItem[];
}

/**
 * Header bar configuration for Discord.
 */
export interface DiscordHeaderBarConfig {
  /** Header height */
  height: string;
  /** Header background (matches chat bg) */
  backgroundColor: string;
  /** Header text color */
  textColor: string;
  /** Header icon color */
  iconColor: string;
  /** Channel hash icon shown */
  channelIcon: boolean;
  /** Channel name displayed */
  channelName: boolean;
  /** Channel topic shown (truncated) */
  channelTopic: boolean;
  /** Separator between name and actions */
  separator: boolean;
  /** Header actions (right side) */
  actions: DiscordHeaderAction[];
  /** Header shadow */
  elevation: string;
}

/**
 * Header action button.
 */
export interface DiscordHeaderAction {
  id: string;
  icon: string;
  label: string;
  /** Whether this is a toggle (active/inactive state) */
  isToggle: boolean;
  /** Whether this action is currently active */
  defaultActive?: boolean;
}

/**
 * User area configuration (bottom-left panel).
 */
export interface DiscordUserAreaConfig {
  /** Background color */
  backgroundColor: string;
  /** Avatar display */
  showAvatar: boolean;
  /** Username display */
  showUsername: boolean;
  /** Custom status display */
  showCustomStatus: boolean;
  /** Online status indicator */
  showStatusIndicator: boolean;
  /** Microphone toggle button */
  microphoneToggle: boolean;
  /** Headphone/deafen toggle button */
  deafenToggle: boolean;
  /** Settings gear button */
  settingsButton: boolean;
  /** Height of the user area */
  height: string;
}

/**
 * Members panel configuration (right side).
 */
export interface DiscordMembersPanelConfig {
  /** Whether panel is toggleable */
  toggleable: boolean;
  /** Default visibility */
  defaultVisible: boolean;
  /** Panel width */
  width: string;
  /** Background color */
  backgroundColor: string;
  /** Group members by role */
  groupByRole: boolean;
  /** Show online/offline sections */
  showOnlineOfflineSections: boolean;
  /** Show member count in sections */
  showMemberCount: boolean;
}

/**
 * Server list column configuration.
 */
export interface DiscordServerListConfig {
  /** Column width */
  width: string;
  /** Background color */
  backgroundColor: string;
  /** Home button (DMs) at top */
  homeButton: boolean;
  /** Separator after home button */
  separatorAfterHome: boolean;
  /** Add server button */
  addServerButton: boolean;
  /** Explore servers button */
  exploreServersButton: boolean;
  /** Server folder support */
  folders: boolean;
  /** Unread pill indicators */
  unreadIndicators: boolean;
  /** Server icon shape (circle when hovered, rounded-square default) */
  iconShapeDefault: "rounded-square";
  /** Server icon shape when hovered */
  iconShapeHover: "circle";
  /** Server icon size */
  iconSize: string;
  /** Spacing between icons */
  iconGap: string;
}

/**
 * Complete Discord navigation configuration.
 */
export interface DiscordNavigationConfig {
  /** Platform variant */
  platform: "desktop" | "mobile";
  /** Server list column */
  serverList: DiscordServerListConfig;
  /** Header bar */
  header: DiscordHeaderBarConfig;
  /** User area (bottom left) */
  userArea: DiscordUserAreaConfig;
  /** Members panel (right side) */
  membersPanel: DiscordMembersPanelConfig;
  /** Default color scheme */
  defaultColorScheme: "dark" | "light";
}

// ============================================================================
// DISCORD SERVER LIST CONFIG
// ============================================================================

export const discordServerListLight: DiscordServerListConfig = {
  width: "72px",
  backgroundColor: "#E3E5E8",
  homeButton: true,
  separatorAfterHome: true,
  addServerButton: true,
  exploreServersButton: true,
  folders: true,
  unreadIndicators: true,
  iconShapeDefault: "rounded-square",
  iconShapeHover: "circle",
  iconSize: "48px",
  iconGap: "8px",
};

export const discordServerListDark: DiscordServerListConfig = {
  ...discordServerListLight,
  backgroundColor: "#1E1F22",
};

// ============================================================================
// DISCORD HEADER BAR CONFIG
// ============================================================================

export const discordDesktopHeaderActions: DiscordHeaderAction[] = [
  {
    id: "threads",
    icon: "hash",
    label: "Threads",
    isToggle: true,
    defaultActive: false,
  },
  {
    id: "notifications",
    icon: "bell",
    label: "Notification Settings",
    isToggle: false,
  },
  {
    id: "pinned",
    icon: "pin",
    label: "Pinned Messages",
    isToggle: true,
    defaultActive: false,
  },
  {
    id: "members",
    icon: "users",
    label: "Member List",
    isToggle: true,
    defaultActive: true,
  },
  {
    id: "search",
    icon: "search",
    label: "Search",
    isToggle: true,
    defaultActive: false,
  },
  {
    id: "inbox",
    icon: "inbox",
    label: "Inbox",
    isToggle: true,
    defaultActive: false,
  },
  { id: "help", icon: "help-circle", label: "Help", isToggle: false },
];

export const discordHeaderLight: DiscordHeaderBarConfig = {
  height: "48px",
  backgroundColor: "#FFFFFF",
  textColor: "#313338",
  iconColor: "#4E5058",
  channelIcon: true,
  channelName: true,
  channelTopic: true,
  separator: true,
  actions: discordDesktopHeaderActions,
  elevation: "0 1px 0 rgba(6, 6, 7, 0.08)",
};

export const discordHeaderDark: DiscordHeaderBarConfig = {
  ...discordHeaderLight,
  backgroundColor: "#313338",
  textColor: "#F2F3F5",
  iconColor: "#B5BAC1",
  elevation:
    "0 1px 0 rgba(4, 4, 5, 0.2), 0 1.5px 0 rgba(6, 6, 7, 0.05), 0 2px 0 rgba(4, 4, 5, 0.05)",
};

// ============================================================================
// DISCORD USER AREA CONFIG
// ============================================================================

export const discordUserAreaLight: DiscordUserAreaConfig = {
  backgroundColor: "#EBEDEF",
  showAvatar: true,
  showUsername: true,
  showCustomStatus: true,
  showStatusIndicator: true,
  microphoneToggle: true,
  deafenToggle: true,
  settingsButton: true,
  height: "52px",
};

export const discordUserAreaDark: DiscordUserAreaConfig = {
  ...discordUserAreaLight,
  backgroundColor: "#232428",
};

// ============================================================================
// DISCORD MEMBERS PANEL CONFIG
// ============================================================================

export const discordMembersPanelLight: DiscordMembersPanelConfig = {
  toggleable: true,
  defaultVisible: true,
  width: "240px",
  backgroundColor: "#F2F3F5",
  groupByRole: true,
  showOnlineOfflineSections: true,
  showMemberCount: true,
};

export const discordMembersPanelDark: DiscordMembersPanelConfig = {
  ...discordMembersPanelLight,
  backgroundColor: "#2B2D31",
};

// ============================================================================
// ASSEMBLED DISCORD NAVIGATION CONFIGS
// ============================================================================

export const discordDesktopNavigation: DiscordNavigationConfig = {
  platform: "desktop",
  serverList: discordServerListLight,
  header: discordHeaderLight,
  userArea: discordUserAreaLight,
  membersPanel: discordMembersPanelLight,
  defaultColorScheme: "dark",
};

export const discordDesktopNavigationDark: DiscordNavigationConfig = {
  platform: "desktop",
  serverList: discordServerListDark,
  header: discordHeaderDark,
  userArea: discordUserAreaDark,
  membersPanel: discordMembersPanelDark,
  defaultColorScheme: "dark",
};

export const discordMobileNavigation: DiscordNavigationConfig = {
  platform: "mobile",
  serverList: {
    ...discordServerListLight,
    width: "72px",
  },
  header: {
    ...discordHeaderLight,
    channelTopic: false,
    separator: false,
    actions: discordDesktopHeaderActions.filter((a) =>
      ["search", "members", "threads"].includes(a.id),
    ),
  },
  userArea: {
    ...discordUserAreaLight,
    showCustomStatus: false,
  },
  membersPanel: {
    ...discordMembersPanelLight,
    defaultVisible: false,
  },
  defaultColorScheme: "dark",
};

export const discordMobileNavigationDark: DiscordNavigationConfig = {
  platform: "mobile",
  serverList: discordServerListDark,
  header: {
    ...discordHeaderDark,
    channelTopic: false,
    separator: false,
    actions: discordDesktopHeaderActions.filter((a) =>
      ["search", "members", "threads"].includes(a.id),
    ),
  },
  userArea: discordUserAreaDark,
  membersPanel: {
    ...discordMembersPanelDark,
    defaultVisible: false,
  },
  defaultColorScheme: "dark",
};

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the Discord navigation configuration for the given platform and mode.
 */
export function getDiscordNavigation(
  platform: "desktop" | "mobile",
  isDarkMode: boolean = true,
): DiscordNavigationConfig {
  if (platform === "mobile") {
    return isDarkMode ? discordMobileNavigationDark : discordMobileNavigation;
  }
  return isDarkMode ? discordDesktopNavigationDark : discordDesktopNavigation;
}

/**
 * Get the server list configuration.
 */
export function getDiscordServerList(
  isDarkMode: boolean = true,
): DiscordServerListConfig {
  return isDarkMode ? discordServerListDark : discordServerListLight;
}

/**
 * Get the header bar configuration.
 */
export function getDiscordHeader(
  isDarkMode: boolean = true,
): DiscordHeaderBarConfig {
  return isDarkMode ? discordHeaderDark : discordHeaderLight;
}

/**
 * Get the user area configuration.
 */
export function getDiscordUserArea(
  isDarkMode: boolean = true,
): DiscordUserAreaConfig {
  return isDarkMode ? discordUserAreaDark : discordUserAreaLight;
}

/**
 * Get the header action count.
 */
export function getDiscordHeaderActionCount(): number {
  return discordDesktopHeaderActions.length;
}

/**
 * Find a header action by its ID.
 */
export function getDiscordHeaderActionById(
  id: string,
): DiscordHeaderAction | undefined {
  return discordDesktopHeaderActions.find((a) => a.id === id);
}
