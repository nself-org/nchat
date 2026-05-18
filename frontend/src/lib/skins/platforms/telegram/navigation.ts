/**
 * Telegram Navigation Pattern
 *
 * Defines Telegram's navigation structure, which differs from WhatsApp:
 *
 * Mobile:
 *   - Hamburger menu (drawer) with: New Group, New Channel, Contacts, Calls,
 *     People Nearby, Saved Messages, Settings
 *   - Chat folder tabs at top of chat list
 *   - Floating action button (pencil icon) for new message
 *   - Search bar at top with global search
 *
 * Desktop:
 *   - Left sidebar with chat list
 *   - Hamburger menu in sidebar header
 *   - Chat folder tabs at top of chat list
 *   - Search bar in sidebar
 *   - No bottom tabs
 *
 * @module lib/skins/platforms/telegram/navigation
 * @version 1.0.0
 */

// ============================================================================
// NAVIGATION TYPES (Telegram-specific)
// ============================================================================

/**
 * Represents a single navigation tab/item for Telegram.
 */
export interface TelegramNavigationTab {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Icon name (from icon set) */
  icon: string;
  /** Icon name when tab is active */
  activeIcon: string;
  /** Badge type shown on the tab */
  badgeType: "count" | "dot" | "none";
  /** Whether this tab is the default/landing tab */
  isDefault: boolean;
  /** Route/path associated with this tab */
  route: string;
  /** Nested sub-routes */
  subRoutes?: string[];
}

/**
 * Telegram drawer (hamburger) menu item.
 */
export interface TelegramDrawerItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon name */
  icon: string;
  /** Route/action */
  route: string;
  /** Whether this opens a new view or triggers an action */
  type: "navigate" | "action";
  /** Divider after this item */
  dividerAfter: boolean;
}

/**
 * Telegram navigation layout configuration.
 */
export interface TelegramNavigationLayout {
  /** Primary navigation style */
  style: "drawer" | "bottom-tabs" | "sidebar";
  /** Chat folder tabs position */
  folderTabsPosition: "top" | "none";
  /** Whether the navigation is collapsible */
  collapsible: boolean;
  /** Whether folder tabs show labels */
  showFolderLabels: boolean;
  /** Folder tab indicator style */
  folderIndicatorStyle: "underline" | "background" | "pill";
  /** Active folder indicator color */
  folderIndicatorColor: string;
  /** Inactive folder text color */
  folderInactiveColor: string;
  /** Active folder text color */
  folderActiveColor: string;
  /** Folder tab bar background */
  folderBarBackground: string;
  /** Tab bar height */
  folderBarHeight: string;
  /** Search bar background color */
  searchBarBg: string;
  /** Search bar text color */
  searchBarText: string;
  /** Search bar placeholder color */
  searchBarPlaceholder: string;
}

/**
 * Telegram header bar configuration.
 */
export interface TelegramHeaderBarConfig {
  /** Header height */
  height: string;
  /** Header background color */
  backgroundColor: string;
  /** Header text color */
  textColor: string;
  /** Header icon color */
  iconColor: string;
  /** App title shown in header */
  title: string;
  /** Whether title is shown */
  showTitle: boolean;
  /** Whether hamburger menu icon is shown */
  hamburgerMenu: boolean;
  /** Whether search icon is shown in header */
  searchIcon: boolean;
  /** Header shadow/elevation */
  elevation: string;
}

/**
 * Telegram chat list navigation configuration.
 */
export interface TelegramChatListNavConfig {
  /** Whether the chat list is the primary view */
  isPrimaryView: boolean;
  /** Chat list layout mode */
  layout: "full-width" | "sidebar" | "split-view";
  /** Whether there's a floating action button */
  floatingActionButton: boolean;
  /** FAB icon */
  fabIcon: string;
  /** FAB action */
  fabAction: string;
  /** Search placement */
  searchPlacement: "header" | "inline" | "floating";
  /** Whether long-press context menu is available */
  longPressMenu: boolean;
  /** Whether swipe-to-archive is available */
  swipeToArchive: boolean;
  /** Whether swipe-to-pin is available */
  swipeToPin: boolean;
  /** Whether swipe-to-mute is available */
  swipeToMute: boolean;
  /** Whether swipe-to-read is available */
  swipeToRead: boolean;
}

/**
 * Complete navigation configuration for Telegram.
 */
export interface TelegramNavigationConfig {
  /** Platform variant */
  platform: "mobile" | "desktop";
  /** Drawer menu items */
  drawerItems: TelegramDrawerItem[];
  /** Chat folder default tabs */
  defaultFolderTabs: TelegramNavigationTab[];
  /** Layout configuration */
  layout: TelegramNavigationLayout;
  /** Header bar configuration */
  header: TelegramHeaderBarConfig;
  /** Chat list navigation */
  chatList: TelegramChatListNavConfig;
}

// ============================================================================
// TELEGRAM DRAWER MENU
// ============================================================================

export const telegramDrawerItems: TelegramDrawerItem[] = [
  {
    id: "new-group",
    label: "New Group",
    icon: "users",
    route: "/new-group",
    type: "navigate",
    dividerAfter: false,
  },
  {
    id: "new-channel",
    label: "New Channel",
    icon: "megaphone",
    route: "/new-channel",
    type: "navigate",
    dividerAfter: false,
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: "contact",
    route: "/contacts",
    type: "navigate",
    dividerAfter: false,
  },
  {
    id: "calls",
    label: "Calls",
    icon: "phone",
    route: "/calls",
    type: "navigate",
    dividerAfter: false,
  },
  {
    id: "people-nearby",
    label: "People Nearby",
    icon: "map-pin",
    route: "/people-nearby",
    type: "navigate",
    dividerAfter: false,
  },
  {
    id: "saved-messages",
    label: "Saved Messages",
    icon: "bookmark",
    route: "/saved-messages",
    type: "navigate",
    dividerAfter: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
    route: "/settings",
    type: "navigate",
    dividerAfter: false,
  },
];

// ============================================================================
// TELEGRAM DEFAULT FOLDER TABS
// ============================================================================

export const telegramDefaultFolderTabs: TelegramNavigationTab[] = [
  {
    id: "all-chats",
    label: "All Chats",
    icon: "message-circle",
    activeIcon: "message-circle",
    badgeType: "count",
    isDefault: true,
    route: "/chats",
  },
];

// ============================================================================
// TELEGRAM MOBILE NAVIGATION
// ============================================================================

export const telegramMobileNavigation: TelegramNavigationConfig = {
  platform: "mobile",
  drawerItems: telegramDrawerItems,
  defaultFolderTabs: telegramDefaultFolderTabs,
  layout: {
    style: "drawer",
    folderTabsPosition: "top",
    collapsible: false,
    showFolderLabels: true,
    folderIndicatorStyle: "underline",
    folderIndicatorColor: "#3390EC",
    folderInactiveColor: "#707579",
    folderActiveColor: "#3390EC",
    folderBarBackground: "#FFFFFF",
    folderBarHeight: "40px",
    searchBarBg: "#F0F2F5",
    searchBarText: "#000000",
    searchBarPlaceholder: "#707579",
  },
  header: {
    height: "56px",
    backgroundColor: "#4A8ECB",
    textColor: "#FFFFFF",
    iconColor: "#FFFFFF",
    title: "Telegram",
    showTitle: true,
    hamburgerMenu: true,
    searchIcon: true,
    elevation: "0 1px 2px rgba(0, 0, 0, 0.1)",
  },
  chatList: {
    isPrimaryView: true,
    layout: "full-width",
    floatingActionButton: true,
    fabIcon: "pencil",
    fabAction: "new-message",
    searchPlacement: "header",
    longPressMenu: true,
    swipeToArchive: true,
    swipeToPin: true,
    swipeToMute: true,
    swipeToRead: true,
  },
};

// ============================================================================
// TELEGRAM DESKTOP NAVIGATION
// ============================================================================

export const telegramDesktopNavigation: TelegramNavigationConfig = {
  platform: "desktop",
  drawerItems: telegramDrawerItems,
  defaultFolderTabs: telegramDefaultFolderTabs,
  layout: {
    style: "sidebar",
    folderTabsPosition: "top",
    collapsible: false,
    showFolderLabels: true,
    folderIndicatorStyle: "underline",
    folderIndicatorColor: "#3390EC",
    folderInactiveColor: "#707579",
    folderActiveColor: "#3390EC",
    folderBarBackground: "#FFFFFF",
    folderBarHeight: "36px",
    searchBarBg: "#F0F2F5",
    searchBarText: "#000000",
    searchBarPlaceholder: "#707579",
  },
  header: {
    height: "56px",
    backgroundColor: "#FFFFFF",
    textColor: "#000000",
    iconColor: "#707579",
    title: "",
    showTitle: false,
    hamburgerMenu: true,
    searchIcon: false,
    elevation: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  chatList: {
    isPrimaryView: true,
    layout: "sidebar",
    floatingActionButton: false,
    fabIcon: "",
    fabAction: "",
    searchPlacement: "inline",
    longPressMenu: false,
    swipeToArchive: false,
    swipeToPin: false,
    swipeToMute: false,
    swipeToRead: false,
  },
};

// ============================================================================
// DARK MODE NAVIGATION CONFIGS
// ============================================================================

export const telegramMobileNavigationDark: TelegramNavigationConfig = {
  ...telegramMobileNavigation,
  layout: {
    ...telegramMobileNavigation.layout,
    folderIndicatorColor: "#6AB2F2",
    folderInactiveColor: "#6D7883",
    folderActiveColor: "#6AB2F2",
    folderBarBackground: "#17212B",
    searchBarBg: "#242F3D",
    searchBarText: "#F5F5F5",
    searchBarPlaceholder: "#6D7883",
  },
  header: {
    ...telegramMobileNavigation.header,
    backgroundColor: "#17212B",
    textColor: "#F5F5F5",
    iconColor: "#AAAAAA",
    elevation: "0 1px 2px rgba(0, 0, 0, 0.3)",
  },
};

export const telegramDesktopNavigationDark: TelegramNavigationConfig = {
  ...telegramDesktopNavigation,
  layout: {
    ...telegramDesktopNavigation.layout,
    folderIndicatorColor: "#6AB2F2",
    folderInactiveColor: "#6D7883",
    folderActiveColor: "#6AB2F2",
    folderBarBackground: "#17212B",
    searchBarBg: "#242F3D",
    searchBarText: "#F5F5F5",
    searchBarPlaceholder: "#6D7883",
  },
  header: {
    ...telegramDesktopNavigation.header,
    backgroundColor: "#17212B",
    textColor: "#F5F5F5",
    iconColor: "#6D7883",
    elevation: "0 1px 2px rgba(0, 0, 0, 0.2)",
  },
};

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the Telegram navigation configuration for the given platform and mode.
 */
export function getTelegramNavigation(
  platform: "mobile" | "desktop",
  isDarkMode: boolean = false,
): TelegramNavigationConfig {
  if (platform === "mobile") {
    return isDarkMode ? telegramMobileNavigationDark : telegramMobileNavigation;
  }
  return isDarkMode ? telegramDesktopNavigationDark : telegramDesktopNavigation;
}

/**
 * Get the default folder tab for Telegram navigation.
 */
export function getTelegramDefaultTab(): TelegramNavigationTab {
  return (
    telegramDefaultFolderTabs.find((t) => t.isDefault) ??
    telegramDefaultFolderTabs[0]
  );
}

/**
 * Get the drawer item count.
 */
export function getTelegramDrawerItemCount(): number {
  return telegramDrawerItems.length;
}

/**
 * Find a drawer item by its ID.
 */
export function getTelegramDrawerItemById(
  itemId: string,
): TelegramDrawerItem | undefined {
  return telegramDrawerItems.find((item) => item.id === itemId);
}

/**
 * Get drawer items that have dividers after them (section separators).
 */
export function getTelegramDrawerDividers(): TelegramDrawerItem[] {
  return telegramDrawerItems.filter((item) => item.dividerAfter);
}
