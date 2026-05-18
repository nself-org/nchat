/**
 * WhatsApp Navigation Pattern
 *
 * Defines WhatsApp's navigation structure, which differs significantly
 * from other platforms:
 *
 * Mobile:
 *   - Bottom tab bar with 4 tabs: Chats, Updates (Status), Communities, Calls
 *   - Camera access via header action
 *   - Search via header action or floating button
 *   - Settings via profile avatar in header
 *
 * Desktop (Web/Desktop App):
 *   - Left sidebar with chat list
 *   - Top navigation icons for Chats, Status, Communities, Channels
 *   - Settings gear icon in sidebar header
 *   - Right panel for chat view
 *
 * @module lib/skins/platforms/whatsapp/navigation
 * @version 1.0.0
 */

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

/**
 * Represents a single navigation tab/item.
 */
export interface NavigationTab {
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
 * Navigation layout configuration.
 */
export interface NavigationLayout {
  /** Primary navigation position */
  position: "bottom" | "top" | "left" | "right";
  /** Secondary navigation position (e.g., header actions) */
  secondaryPosition: "header" | "sidebar-top" | "none";
  /** Whether the navigation is collapsible */
  collapsible: boolean;
  /** Whether the navigation shows labels on mobile */
  showLabels: boolean;
  /** Tab indicator style */
  indicatorStyle: "underline" | "background" | "dot" | "pill";
  /** Active tab indicator color */
  indicatorColor: string;
  /** Inactive tab text color */
  inactiveColor: string;
  /** Active tab text color */
  activeColor: string;
  /** Tab bar background color */
  backgroundColor: string;
  /** Tab bar border */
  borderPosition: "top" | "bottom" | "none";
  /** Tab bar height (mobile) */
  height: string;
  /** Tab icon size */
  iconSize: string;
  /** Tab label font size */
  labelFontSize: string;
  /** Whether swipe gestures navigate between tabs */
  swipeNavigation: boolean;
}

/**
 * Header bar configuration for WhatsApp.
 */
export interface HeaderBarConfig {
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
  /** Whether title is shown or replaced by search */
  showTitle: boolean;
  /** Header actions (right side icons) */
  actions: HeaderAction[];
  /** Whether the header has a search bar */
  searchBar: boolean;
  /** Whether the header has a back button on sub-pages */
  backButton: boolean;
  /** Header shadow/elevation */
  elevation: string;
}

/**
 * Header action button configuration.
 */
export interface HeaderAction {
  id: string;
  icon: string;
  label: string;
  route?: string;
  /** Whether this opens a dropdown menu */
  hasMenu: boolean;
}

/**
 * Chat list navigation configuration.
 */
export interface ChatListNavConfig {
  /** Whether the chat list is the primary view */
  isPrimaryView: boolean;
  /** Chat list layout mode */
  layout: "full-width" | "sidebar" | "split-view";
  /** Whether there's a floating action button */
  floatingActionButton: boolean;
  /** FAB icon and action */
  fabAction: string;
  /** Whether filter chips are shown (All, Unread, Groups) */
  filterChips: boolean;
  /** Filter chip options */
  filterOptions: string[];
  /** Search placement */
  searchPlacement: "header" | "inline" | "floating";
  /** Whether long-press context menu is available */
  longPressMenu: boolean;
  /** Whether swipe-to-archive is available */
  swipeToArchive: boolean;
  /** Whether swipe-to-pin is available */
  swipeToPin: boolean;
}

/**
 * Complete navigation configuration for WhatsApp.
 */
export interface WhatsAppNavigationConfig {
  /** Platform variant */
  platform: "mobile" | "desktop";
  /** Navigation tabs */
  tabs: NavigationTab[];
  /** Layout configuration */
  layout: NavigationLayout;
  /** Header bar configuration */
  header: HeaderBarConfig;
  /** Chat list navigation */
  chatList: ChatListNavConfig;
}

// ============================================================================
// WHATSAPP NAVIGATION TABS
// ============================================================================

export const whatsappMobileTabs: NavigationTab[] = [
  {
    id: "chats",
    label: "Chats",
    icon: "message-circle",
    activeIcon: "message-circle",
    badgeType: "count",
    isDefault: true,
    route: "/chats",
    subRoutes: ["/chats/:id", "/chats/:id/info"],
  },
  {
    id: "updates",
    label: "Updates",
    icon: "circle-dot",
    activeIcon: "circle-dot",
    badgeType: "dot",
    isDefault: false,
    route: "/updates",
    subRoutes: ["/updates/status/:id", "/updates/channels"],
  },
  {
    id: "communities",
    label: "Communities",
    icon: "users",
    activeIcon: "users",
    badgeType: "count",
    isDefault: false,
    route: "/communities",
    subRoutes: ["/communities/:id", "/communities/:id/groups"],
  },
  {
    id: "calls",
    label: "Calls",
    icon: "phone",
    activeIcon: "phone",
    badgeType: "dot",
    isDefault: false,
    route: "/calls",
    subRoutes: ["/calls/:id"],
  },
];

export const whatsappDesktopTabs: NavigationTab[] = [
  {
    id: "chats",
    label: "Chats",
    icon: "message-circle",
    activeIcon: "message-circle",
    badgeType: "count",
    isDefault: true,
    route: "/chats",
  },
  {
    id: "status",
    label: "Status",
    icon: "circle-dot",
    activeIcon: "circle-dot",
    badgeType: "dot",
    isDefault: false,
    route: "/status",
  },
  {
    id: "channels",
    label: "Channels",
    icon: "radio",
    activeIcon: "radio",
    badgeType: "count",
    isDefault: false,
    route: "/channels",
  },
  {
    id: "communities",
    label: "Communities",
    icon: "users",
    activeIcon: "users",
    badgeType: "count",
    isDefault: false,
    route: "/communities",
  },
];

// ============================================================================
// WHATSAPP HEADER ACTIONS
// ============================================================================

export const whatsappMobileHeaderActions: HeaderAction[] = [
  { id: "camera", icon: "camera", label: "Camera", hasMenu: false },
  { id: "search", icon: "search", label: "Search", hasMenu: false },
  {
    id: "more",
    icon: "more-vertical",
    label: "More options",
    hasMenu: true,
  },
];

export const whatsappDesktopHeaderActions: HeaderAction[] = [
  {
    id: "new-chat",
    icon: "message-square-plus",
    label: "New chat",
    hasMenu: false,
  },
  {
    id: "menu",
    icon: "more-vertical",
    label: "Menu",
    hasMenu: true,
  },
];

// ============================================================================
// WHATSAPP MOBILE NAVIGATION CONFIG
// ============================================================================

export const whatsappMobileNavigation: WhatsAppNavigationConfig = {
  platform: "mobile",
  tabs: whatsappMobileTabs,
  layout: {
    position: "bottom",
    secondaryPosition: "header",
    collapsible: false,
    showLabels: true,
    indicatorStyle: "pill",
    indicatorColor: "#008069",
    inactiveColor: "#54656F",
    activeColor: "#008069",
    backgroundColor: "#FFFFFF",
    borderPosition: "top",
    height: "56px",
    iconSize: "24px",
    labelFontSize: "11px",
    swipeNavigation: true,
  },
  header: {
    height: "56px",
    backgroundColor: "#FFFFFF",
    textColor: "#111B21",
    iconColor: "#54656F",
    title: "WhatsApp",
    showTitle: true,
    actions: whatsappMobileHeaderActions,
    searchBar: false,
    backButton: true,
    elevation: "0 1px 3px rgba(11, 20, 26, 0.08)",
  },
  chatList: {
    isPrimaryView: true,
    layout: "full-width",
    floatingActionButton: true,
    fabAction: "new-chat",
    filterChips: true,
    filterOptions: ["All", "Unread", "Favorites", "Groups"],
    searchPlacement: "header",
    longPressMenu: true,
    swipeToArchive: true,
    swipeToPin: false,
  },
};

// ============================================================================
// WHATSAPP DESKTOP NAVIGATION CONFIG
// ============================================================================

export const whatsappDesktopNavigation: WhatsAppNavigationConfig = {
  platform: "desktop",
  tabs: whatsappDesktopTabs,
  layout: {
    position: "left",
    secondaryPosition: "sidebar-top",
    collapsible: false,
    showLabels: false,
    indicatorStyle: "background",
    indicatorColor: "#E7FCE3",
    inactiveColor: "#54656F",
    activeColor: "#008069",
    backgroundColor: "#FFFFFF",
    borderPosition: "none",
    height: "60px",
    iconSize: "24px",
    labelFontSize: "12px",
    swipeNavigation: false,
  },
  header: {
    height: "59px",
    backgroundColor: "#F0F2F5",
    textColor: "#111B21",
    iconColor: "#54656F",
    title: "",
    showTitle: false,
    actions: whatsappDesktopHeaderActions,
    searchBar: true,
    backButton: false,
    elevation: "none",
  },
  chatList: {
    isPrimaryView: true,
    layout: "sidebar",
    floatingActionButton: false,
    fabAction: "",
    filterChips: true,
    filterOptions: ["All", "Unread", "Favorites", "Groups"],
    searchPlacement: "inline",
    longPressMenu: false,
    swipeToArchive: false,
    swipeToPin: false,
  },
};

// ============================================================================
// DARK MODE NAVIGATION CONFIGS
// ============================================================================

export const whatsappMobileNavigationDark: WhatsAppNavigationConfig = {
  ...whatsappMobileNavigation,
  layout: {
    ...whatsappMobileNavigation.layout,
    indicatorColor: "#00A884",
    inactiveColor: "#8696A0",
    activeColor: "#00A884",
    backgroundColor: "#202C33",
  },
  header: {
    ...whatsappMobileNavigation.header,
    backgroundColor: "#202C33",
    textColor: "#E9EDEF",
    iconColor: "#AEBAC1",
    elevation: "0 1px 3px rgba(0, 0, 0, 0.16)",
  },
};

export const whatsappDesktopNavigationDark: WhatsAppNavigationConfig = {
  ...whatsappDesktopNavigation,
  layout: {
    ...whatsappDesktopNavigation.layout,
    indicatorColor: "#0B3D2E",
    inactiveColor: "#8696A0",
    activeColor: "#00A884",
    backgroundColor: "#111B21",
  },
  header: {
    ...whatsappDesktopNavigation.header,
    backgroundColor: "#202C33",
    textColor: "#E9EDEF",
    iconColor: "#AEBAC1",
    elevation: "none",
  },
};

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

/**
 * Get the WhatsApp navigation configuration for the given platform and mode.
 */
export function getWhatsAppNavigation(
  platform: "mobile" | "desktop",
  isDarkMode: boolean = false,
): WhatsAppNavigationConfig {
  if (platform === "mobile") {
    return isDarkMode ? whatsappMobileNavigationDark : whatsappMobileNavigation;
  }
  return isDarkMode ? whatsappDesktopNavigationDark : whatsappDesktopNavigation;
}

/**
 * Get the default tab for WhatsApp navigation.
 */
export function getWhatsAppDefaultTab(
  platform: "mobile" | "desktop",
): NavigationTab {
  const nav = getWhatsAppNavigation(platform);
  return nav.tabs.find((t) => t.isDefault) ?? nav.tabs[0];
}

/**
 * Get the tab count for a given platform.
 */
export function getWhatsAppTabCount(platform: "mobile" | "desktop"): number {
  const nav = getWhatsAppNavigation(platform);
  return nav.tabs.length;
}

/**
 * Find a tab by its ID.
 */
export function getWhatsAppTabById(
  platform: "mobile" | "desktop",
  tabId: string,
): NavigationTab | undefined {
  const nav = getWhatsAppNavigation(platform);
  return nav.tabs.find((t) => t.id === tabId);
}
