/**
 * Slack Navigation Pattern
 *
 * Defines Slack's navigation structure, which uses a workspace-centric
 * model with a left rail and sidebar:
 *
 * Left Rail (always visible):
 *   - Workspace icon (top-left)
 *   - Home
 *   - DMs
 *   - Activity / Mentions
 *   - Later (saved)
 *   - More
 *
 * Sidebar:
 *   - Search bar at top
 *   - User-defined sections with channels/DMs
 *   - Starred section
 *   - Channels section
 *   - DMs section
 *   - Add channel / invite people
 *
 * Main Content:
 *   - Channel header with topic, members, search, huddle
 *   - Message list (flat, no bubbles)
 *   - Composer at bottom
 *
 * Thread Panel (right side):
 *   - Opens as a side panel
 *   - Shows thread context + replies
 *
 * @module lib/skins/platforms/slack/navigation
 * @version 1.0.0
 */

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Represents a navigation item in Slack's left rail.
 */
export interface SlackRailItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name (from icon set) */
  icon: string;
  /** Icon name when item is active */
  activeIcon: string;
  /** Badge type shown on the item */
  badgeType: "count" | "dot" | "none";
  /** Whether this item is the default/landing view */
  isDefault: boolean;
  /** Route/path associated with this item */
  route: string;
  /** Tooltip text */
  tooltip: string;
}

/**
 * Workspace switcher item in Slack's left rail.
 */
export interface SlackWorkspaceItem {
  /** Workspace ID */
  id: string;
  /** Workspace name */
  name: string;
  /** Workspace icon URL (or initials) */
  iconUrl: string;
  /** Notification badge count */
  badgeCount: number;
  /** Whether this workspace is currently active */
  isActive: boolean;
}

/**
 * Sidebar section (user-defined channel grouping).
 */
export interface SlackSidebarSection {
  /** Section ID */
  id: string;
  /** Section display name */
  name: string;
  /** Whether the section is collapsed */
  collapsed: boolean;
  /** Whether the section is the default */
  isDefault: boolean;
  /** Whether the section is reorderable */
  reorderable: boolean;
  /** Item count in the section */
  itemCount: number;
  /** Section icon (optional) */
  icon?: string;
}

/**
 * Slack sidebar channel/DM list item.
 */
export interface SlackChannelListItem {
  /** Channel/DM ID */
  id: string;
  /** Display name */
  name: string;
  /** Channel type */
  type: "public" | "private" | "dm" | "mpdm" | "app";
  /** Prefix icon (# for public, lock for private, user for DM) */
  prefixIcon: string;
  /** Whether the channel has unread messages */
  hasUnread: boolean;
  /** Unread count (0 if no unreads) */
  unreadCount: number;
  /** Whether the channel has a mention */
  hasMention: boolean;
  /** Mention count */
  mentionCount: number;
  /** Whether the channel is muted */
  isMuted: boolean;
  /** Whether the channel is starred */
  isStarred: boolean;
  /** Whether there is an active huddle */
  hasActiveHuddle: boolean;
  /** Presence status (for DMs) */
  presenceStatus?: "online" | "away" | "dnd" | "offline";
  /** Section this item belongs to */
  sectionId: string;
}

/**
 * Slack channel header configuration.
 */
export interface SlackHeaderConfig {
  /** Channel header height */
  height: string;
  /** Header background color */
  backgroundColor: string;
  /** Header text color */
  textColor: string;
  /** Header icon color */
  iconColor: string;
  /** Whether channel name is shown */
  showChannelName: boolean;
  /** Whether channel topic is shown */
  showTopic: boolean;
  /** Whether member count is shown */
  showMemberCount: boolean;
  /** Whether star/bookmark icon is shown */
  showStar: boolean;
  /** Header action buttons */
  actions: SlackHeaderAction[];
  /** Header border style */
  borderBottom: string;
  /** Header shadow */
  shadow: string;
}

/**
 * Header action button.
 */
export interface SlackHeaderAction {
  /** Action ID */
  id: string;
  /** Icon name */
  icon: string;
  /** Label */
  label: string;
  /** Tooltip */
  tooltip: string;
  /** Whether this opens a panel or dropdown */
  panelType: "panel" | "dropdown" | "modal" | "none";
  /** Sort order */
  order: number;
}

/**
 * Slack left rail configuration.
 */
export interface SlackRailConfig {
  /** Rail width */
  width: string;
  /** Rail background color */
  backgroundColor: string;
  /** Rail item hover background */
  itemHoverBg: string;
  /** Rail item active background */
  itemActiveBg: string;
  /** Rail item text color */
  itemTextColor: string;
  /** Rail item active text color */
  itemActiveTextColor: string;
  /** Rail item icon size */
  iconSize: string;
  /** Rail item padding */
  itemPadding: string;
  /** Workspace icon size */
  workspaceIconSize: string;
  /** Whether the workspace switcher is shown */
  showWorkspaceSwitcher: boolean;
}

/**
 * Complete navigation configuration for Slack.
 */
export interface SlackNavigationConfig {
  /** Platform variant */
  platform: "desktop" | "mobile";
  /** Left rail navigation items */
  railItems: SlackRailItem[];
  /** Left rail configuration */
  rail: SlackRailConfig;
  /** Default sidebar sections */
  defaultSections: SlackSidebarSection[];
  /** Channel header configuration */
  header: SlackHeaderConfig;
  /** Sidebar width */
  sidebarWidth: string;
  /** Sidebar background color */
  sidebarBg: string;
  /** Sidebar text color */
  sidebarText: string;
  /** Sidebar border */
  sidebarBorder: string;
  /** Thread panel width */
  threadPanelWidth: string;
  /** Whether thread panel is resizable */
  threadPanelResizable: boolean;
  /** Search bar placement */
  searchPlacement: "header" | "sidebar-top";
  /** Search bar width */
  searchBarWidth: string;
}

// ============================================================================
// SLACK LEFT RAIL ITEMS
// ============================================================================

export const slackRailItems: SlackRailItem[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    activeIcon: "home",
    badgeType: "count",
    isDefault: true,
    route: "/home",
    tooltip: "Home",
  },
  {
    id: "dms",
    label: "DMs",
    icon: "message-square",
    activeIcon: "message-square",
    badgeType: "count",
    isDefault: false,
    route: "/dms",
    tooltip: "Direct messages",
  },
  {
    id: "activity",
    label: "Activity",
    icon: "bell",
    activeIcon: "bell",
    badgeType: "count",
    isDefault: false,
    route: "/activity",
    tooltip: "Activity",
  },
  {
    id: "later",
    label: "Later",
    icon: "bookmark",
    activeIcon: "bookmark",
    badgeType: "count",
    isDefault: false,
    route: "/later",
    tooltip: "Later",
  },
  {
    id: "more",
    label: "More",
    icon: "more-horizontal",
    activeIcon: "more-horizontal",
    badgeType: "none",
    isDefault: false,
    route: "/more",
    tooltip: "More",
  },
];

// ============================================================================
// SLACK MOBILE RAIL ITEMS
// ============================================================================

export const slackMobileRailItems: SlackRailItem[] = [
  {
    id: "home",
    label: "Home",
    icon: "home",
    activeIcon: "home",
    badgeType: "count",
    isDefault: true,
    route: "/home",
    tooltip: "Home",
  },
  {
    id: "dms",
    label: "DMs",
    icon: "message-square",
    activeIcon: "message-square",
    badgeType: "count",
    isDefault: false,
    route: "/dms",
    tooltip: "Direct messages",
  },
  {
    id: "activity",
    label: "Activity",
    icon: "bell",
    activeIcon: "bell",
    badgeType: "count",
    isDefault: false,
    route: "/activity",
    tooltip: "Activity",
  },
  {
    id: "search",
    label: "Search",
    icon: "search",
    activeIcon: "search",
    badgeType: "none",
    isDefault: false,
    route: "/search",
    tooltip: "Search",
  },
  {
    id: "you",
    label: "You",
    icon: "user",
    activeIcon: "user",
    badgeType: "none",
    isDefault: false,
    route: "/you",
    tooltip: "You",
  },
];

// ============================================================================
// SLACK HEADER ACTIONS
// ============================================================================

export const slackHeaderActions: SlackHeaderAction[] = [
  {
    id: "huddle",
    icon: "headphones",
    label: "Huddle",
    tooltip: "Start a huddle",
    panelType: "none",
    order: 1,
  },
  {
    id: "canvas",
    icon: "file-text",
    label: "Canvas",
    tooltip: "Open canvas",
    panelType: "panel",
    order: 2,
  },
  {
    id: "members",
    icon: "users",
    label: "Members",
    tooltip: "View members",
    panelType: "panel",
    order: 3,
  },
  {
    id: "pins",
    icon: "pin",
    label: "Pins",
    tooltip: "View pinned items",
    panelType: "panel",
    order: 4,
  },
  {
    id: "bookmarks",
    icon: "bookmark",
    label: "Bookmarks",
    tooltip: "View bookmarks",
    panelType: "panel",
    order: 5,
  },
  {
    id: "search",
    icon: "search",
    label: "Search",
    tooltip: "Search in conversation",
    panelType: "panel",
    order: 6,
  },
];

// ============================================================================
// SLACK DEFAULT SECTIONS
// ============================================================================

export const slackDefaultSections: SlackSidebarSection[] = [
  {
    id: "starred",
    name: "Starred",
    collapsed: false,
    isDefault: true,
    reorderable: false,
    itemCount: 0,
    icon: "star",
  },
  {
    id: "channels",
    name: "Channels",
    collapsed: false,
    isDefault: true,
    reorderable: true,
    itemCount: 0,
    icon: "hash",
  },
  {
    id: "direct-messages",
    name: "Direct messages",
    collapsed: false,
    isDefault: true,
    reorderable: true,
    itemCount: 0,
    icon: "message-square",
  },
  {
    id: "apps",
    name: "Apps",
    collapsed: true,
    isDefault: true,
    reorderable: true,
    itemCount: 0,
    icon: "grid",
  },
];

// ============================================================================
// SLACK DESKTOP NAVIGATION CONFIG (LIGHT)
// ============================================================================

export const slackDesktopNavigation: SlackNavigationConfig = {
  platform: "desktop",
  railItems: slackRailItems,
  rail: {
    width: "68px",
    backgroundColor: "#4A154B",
    itemHoverBg: "#3A1040",
    itemActiveBg: "#FFFFFF1A",
    itemTextColor: "#FFFFFF",
    itemActiveTextColor: "#FFFFFF",
    iconSize: "20px",
    itemPadding: "8px 12px",
    workspaceIconSize: "36px",
    showWorkspaceSwitcher: true,
  },
  defaultSections: slackDefaultSections,
  header: {
    height: "49px",
    backgroundColor: "#FFFFFF",
    textColor: "#1D1C1D",
    iconColor: "#616061",
    showChannelName: true,
    showTopic: true,
    showMemberCount: true,
    showStar: true,
    actions: slackHeaderActions,
    borderBottom: "1px solid #DDDDDC",
    shadow: "none",
  },
  sidebarWidth: "260px",
  sidebarBg: "#4A154B",
  sidebarText: "#FFFFFF",
  sidebarBorder: "none",
  threadPanelWidth: "400px",
  threadPanelResizable: true,
  searchPlacement: "header",
  searchBarWidth: "100%",
};

// ============================================================================
// SLACK MOBILE NAVIGATION CONFIG (LIGHT)
// ============================================================================

export const slackMobileNavigation: SlackNavigationConfig = {
  platform: "mobile",
  railItems: slackMobileRailItems,
  rail: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    itemHoverBg: "#F8F8F8",
    itemActiveBg: "#F0EDFF",
    itemTextColor: "#616061",
    itemActiveTextColor: "#611F69",
    iconSize: "24px",
    itemPadding: "8px",
    workspaceIconSize: "28px",
    showWorkspaceSwitcher: true,
  },
  defaultSections: slackDefaultSections,
  header: {
    height: "49px",
    backgroundColor: "#FFFFFF",
    textColor: "#1D1C1D",
    iconColor: "#616061",
    showChannelName: true,
    showTopic: false,
    showMemberCount: false,
    showStar: false,
    actions: slackHeaderActions.slice(0, 3), // huddle, canvas, members only
    borderBottom: "1px solid #DDDDDC",
    shadow: "none",
  },
  sidebarWidth: "100%",
  sidebarBg: "#FFFFFF",
  sidebarText: "#1D1C1D",
  sidebarBorder: "none",
  threadPanelWidth: "100%",
  threadPanelResizable: false,
  searchPlacement: "header",
  searchBarWidth: "100%",
};

// ============================================================================
// DARK MODE NAVIGATION CONFIGS
// ============================================================================

export const slackDesktopNavigationDark: SlackNavigationConfig = {
  ...slackDesktopNavigation,
  rail: {
    ...slackDesktopNavigation.rail,
    backgroundColor: "#1A1D21",
    itemHoverBg: "#27242C",
    itemActiveBg: "#FFFFFF1A",
  },
  header: {
    ...slackDesktopNavigation.header,
    backgroundColor: "#222529",
    textColor: "#D1D2D3",
    iconColor: "#D1D2D3",
    borderBottom: "1px solid #35383C",
  },
  sidebarBg: "#1A1D21",
  sidebarText: "#D1D2D3",
};

export const slackMobileNavigationDark: SlackNavigationConfig = {
  ...slackMobileNavigation,
  rail: {
    ...slackMobileNavigation.rail,
    backgroundColor: "#1A1D21",
    itemHoverBg: "#222529",
    itemActiveBg: "#2D2A35",
    itemTextColor: "#ABABAD",
    itemActiveTextColor: "#D1B3D3",
  },
  header: {
    ...slackMobileNavigation.header,
    backgroundColor: "#222529",
    textColor: "#D1D2D3",
    iconColor: "#D1D2D3",
    borderBottom: "1px solid #35383C",
  },
  sidebarBg: "#1A1D21",
  sidebarText: "#D1D2D3",
};

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the Slack navigation configuration for the given platform and mode.
 */
export function getSlackNavigation(
  platform: "desktop" | "mobile",
  isDarkMode: boolean = false,
): SlackNavigationConfig {
  if (platform === "mobile") {
    return isDarkMode ? slackMobileNavigationDark : slackMobileNavigation;
  }
  return isDarkMode ? slackDesktopNavigationDark : slackDesktopNavigation;
}

/**
 * Get the default rail item for Slack navigation.
 */
export function getSlackDefaultRailItem(
  platform: "desktop" | "mobile",
): SlackRailItem {
  const nav = getSlackNavigation(platform);
  return nav.railItems.find((t) => t.isDefault) ?? nav.railItems[0];
}

/**
 * Get the rail item count for a given platform.
 */
export function getSlackRailItemCount(platform: "desktop" | "mobile"): number {
  const nav = getSlackNavigation(platform);
  return nav.railItems.length;
}

/**
 * Find a rail item by its ID.
 */
export function getSlackRailItemById(
  platform: "desktop" | "mobile",
  itemId: string,
): SlackRailItem | undefined {
  const nav = getSlackNavigation(platform);
  return nav.railItems.find((t) => t.id === itemId);
}

/**
 * Get the header action count.
 */
export function getSlackHeaderActionCount(): number {
  return slackHeaderActions.length;
}

/**
 * Find a header action by its ID.
 */
export function getSlackHeaderActionById(
  actionId: string,
): SlackHeaderAction | undefined {
  return slackHeaderActions.find((a) => a.id === actionId);
}

/**
 * Get the default section count.
 */
export function getSlackDefaultSectionCount(): number {
  return slackDefaultSections.length;
}
