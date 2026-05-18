/**
 * WhatsApp Parity Acceptance Checklist
 *
 * Comprehensive checklist of WhatsApp features and behaviors that must be
 * matched for the WhatsApp skin + behavior preset to be considered at parity.
 *
 * Each checklist item maps to a specific WhatsApp feature, with metadata about
 * the feature category, priority, and which config controls it.
 *
 * @module lib/skins/platforms/whatsapp/parity-checklist
 * @version 1.0.0
 */

// ============================================================================
// CHECKLIST TYPES
// ============================================================================

/**
 * Priority level for a parity feature.
 */
export type ParityPriority = "critical" | "high" | "medium" | "low";

/**
 * Category of the parity feature.
 */
export type ParityCategory =
  | "navigation"
  | "messaging"
  | "media"
  | "calls"
  | "status"
  | "communities"
  | "privacy"
  | "visual"
  | "composer"
  | "notifications"
  | "settings"
  | "search"
  | "groups";

/**
 * Implementation status.
 */
export type ParityStatus =
  | "implemented"
  | "partial"
  | "not-implemented"
  | "not-applicable";

/**
 * A single parity checklist item.
 */
export interface ParityChecklistItem {
  /** Unique identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Feature category */
  category: ParityCategory;
  /** Priority level */
  priority: ParityPriority;
  /** Implementation status */
  status: ParityStatus;
  /** Which config property controls this (dot notation) */
  configPath: string;
  /** Expected value in the config */
  expectedValue: unknown;
  /** Notes about the implementation */
  notes?: string;
}

/**
 * Complete parity checklist.
 */
export interface WhatsAppParityChecklist {
  /** Platform name */
  platform: string;
  /** Version being compared against */
  targetVersion: string;
  /** Date of assessment */
  assessmentDate: string;
  /** Total items */
  totalItems: number;
  /** Items by status */
  statusCounts: Record<ParityStatus, number>;
  /** Items by priority */
  priorityCounts: Record<ParityPriority, number>;
  /** Parity percentage (implemented / (total - not-applicable)) */
  parityPercentage: number;
  /** All checklist items */
  items: ParityChecklistItem[];
}

// ============================================================================
// NAVIGATION PARITY ITEMS
// ============================================================================

const navigationItems: ParityChecklistItem[] = [
  {
    id: "nav-001",
    description:
      "Bottom tab bar with 4 tabs on mobile (Chats, Updates, Communities, Calls)",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.tabs",
    expectedValue: 4,
  },
  {
    id: "nav-002",
    description: "Left sidebar navigation on desktop with icon tabs",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.layout.position",
    expectedValue: "left",
  },
  {
    id: "nav-003",
    description: "Chats tab as default landing tab",
    category: "navigation",
    priority: "critical",
    status: "implemented",
    configPath: "navigation.tabs[0].isDefault",
    expectedValue: true,
  },
  {
    id: "nav-004",
    description: "Filter chips (All, Unread, Favorites, Groups) in chat list",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.chatList.filterChips",
    expectedValue: true,
  },
  {
    id: "nav-005",
    description: "Floating action button for new chat on mobile",
    category: "navigation",
    priority: "high",
    status: "implemented",
    configPath: "navigation.chatList.floatingActionButton",
    expectedValue: true,
  },
  {
    id: "nav-006",
    description: "Swipe-to-archive on mobile chat list",
    category: "navigation",
    priority: "medium",
    status: "implemented",
    configPath: "navigation.chatList.swipeToArchive",
    expectedValue: true,
  },
  {
    id: "nav-007",
    description: "Swipe navigation between tabs on mobile",
    category: "navigation",
    priority: "medium",
    status: "implemented",
    configPath: "navigation.layout.swipeNavigation",
    expectedValue: true,
  },
];

// ============================================================================
// MESSAGING PARITY ITEMS
// ============================================================================

const messagingItems: ParityChecklistItem[] = [
  {
    id: "msg-001",
    description: "Chat bubble message layout",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "skin.components.messageLayout",
    expectedValue: "bubbles",
  },
  {
    id: "msg-002",
    description: "15-minute edit window for sent messages",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.editWindow",
    expectedValue: 900000,
  },
  {
    id: "msg-003",
    description: "Delete for everyone (~60 hour window)",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.deleteForEveryone",
    expectedValue: true,
  },
  {
    id: "msg-004",
    description: "Reply-chain threading model (not side-panel)",
    category: "messaging",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.messaging.threadingModel",
    expectedValue: "reply-chain",
  },
  {
    id: "msg-005",
    description: "Single reaction per user per message",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.maxReactionsPerMessage",
    expectedValue: 1,
  },
  {
    id: "msg-006",
    description: "Quick reactions style (not full picker)",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.reactionStyle",
    expectedValue: "quick-reactions",
  },
  {
    id: "msg-007",
    description: "Forward limit of 5 chats",
    category: "messaging",
    priority: "high",
    status: "implemented",
    configPath: "behavior.messaging.forwardLimit",
    expectedValue: 5,
  },
  {
    id: "msg-008",
    description: "Max message length of 4096 characters",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.maxMessageLength",
    expectedValue: 4096,
  },
  {
    id: "msg-009",
    description: "Star/bookmark messages",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.bookmarking",
    expectedValue: true,
  },
  {
    id: "msg-010",
    description: "Pin messages in chats",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.pinning",
    expectedValue: true,
  },
  {
    id: "msg-011",
    description: "Link previews in messages",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.linkPreviews",
    expectedValue: true,
  },
  {
    id: "msg-012",
    description: "No scheduled messages (WhatsApp does not have this)",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.scheduling",
    expectedValue: false,
  },
  {
    id: "msg-013",
    description: "Edited message indicator shown",
    category: "messaging",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.messaging.showEditedIndicator",
    expectedValue: true,
  },
];

// ============================================================================
// MEDIA PARITY ITEMS
// ============================================================================

const mediaItems: ParityChecklistItem[] = [
  {
    id: "med-001",
    description: "Voice message recording with waveform",
    category: "media",
    priority: "critical",
    status: "implemented",
    configPath: "composer.voiceRecording.enabled",
    expectedValue: true,
  },
  {
    id: "med-002",
    description: "Slide-to-cancel voice recording",
    category: "media",
    priority: "high",
    status: "implemented",
    configPath: "composer.voiceRecording.slideToCancel",
    expectedValue: true,
  },
  {
    id: "med-003",
    description: "Lock-to-hands-free voice recording",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "composer.voiceRecording.lockToHandsFree",
    expectedValue: true,
  },
  {
    id: "med-004",
    description: "View-once media messages",
    category: "media",
    priority: "high",
    status: "implemented",
    configPath: "behavior.features.viewOnce",
    expectedValue: true,
  },
  {
    id: "med-005",
    description: "Image compression before sending",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "extended.media.imageCompression",
    expectedValue: true,
  },
  {
    id: "med-006",
    description: "Send as document (uncompressed) option",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "extended.media.sendAsDocument",
    expectedValue: true,
  },
  {
    id: "med-007",
    description: "GIF search and sharing",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.gifs",
    expectedValue: true,
  },
  {
    id: "med-008",
    description: "Sticker packs support",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.stickers",
    expectedValue: true,
  },
  {
    id: "med-009",
    description: "Location sharing",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.locationSharing",
    expectedValue: true,
  },
  {
    id: "med-010",
    description: "Contact sharing",
    category: "media",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.contactSharing",
    expectedValue: true,
  },
];

// ============================================================================
// CALLS PARITY ITEMS
// ============================================================================

const callItems: ParityChecklistItem[] = [
  {
    id: "call-001",
    description: "Voice calls (1-on-1)",
    category: "calls",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.calls.voiceCalls",
    expectedValue: true,
  },
  {
    id: "call-002",
    description: "Video calls (1-on-1)",
    category: "calls",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.calls.videoCalls",
    expectedValue: true,
  },
  {
    id: "call-003",
    description: "Group calls up to 32 participants",
    category: "calls",
    priority: "high",
    status: "implemented",
    configPath: "behavior.calls.groupMax",
    expectedValue: 32,
  },
  {
    id: "call-004",
    description: "E2EE calls enabled",
    category: "calls",
    priority: "critical",
    status: "implemented",
    configPath: "extended.callAffordances.e2eeCalls",
    expectedValue: true,
  },
  {
    id: "call-005",
    description: "No call recording (WhatsApp does not support this)",
    category: "calls",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.calls.recording",
    expectedValue: false,
  },
  {
    id: "call-006",
    description: "No screen sharing in calls (WhatsApp limitation)",
    category: "calls",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.calls.screenShare",
    expectedValue: false,
  },
  {
    id: "call-007",
    description: "Call links support",
    category: "calls",
    priority: "medium",
    status: "implemented",
    configPath: "extended.callAffordances.callLinks",
    expectedValue: true,
  },
  {
    id: "call-008",
    description: "Voice-to-video call upgrade",
    category: "calls",
    priority: "medium",
    status: "implemented",
    configPath: "extended.callAffordances.voiceToVideoSwitch",
    expectedValue: true,
  },
];

// ============================================================================
// STATUS PARITY ITEMS
// ============================================================================

const statusItems: ParityChecklistItem[] = [
  {
    id: "stat-001",
    description: "Status/Stories feature enabled",
    category: "status",
    priority: "critical",
    status: "implemented",
    configPath: "extended.status.enabled",
    expectedValue: true,
  },
  {
    id: "stat-002",
    description: "Status expires after 24 hours",
    category: "status",
    priority: "high",
    status: "implemented",
    configPath: "extended.status.expirationHours",
    expectedValue: 24,
  },
  {
    id: "stat-003",
    description: "Text, image, video, and voice statuses supported",
    category: "status",
    priority: "high",
    status: "implemented",
    configPath: "extended.status.textStatus",
    expectedValue: true,
  },
  {
    id: "stat-004",
    description: "Status viewers list visible to poster",
    category: "status",
    priority: "medium",
    status: "implemented",
    configPath: "extended.status.viewersList",
    expectedValue: true,
  },
  {
    id: "stat-005",
    description: "Status reactions and replies supported",
    category: "status",
    priority: "medium",
    status: "implemented",
    configPath: "extended.status.reactions",
    expectedValue: true,
  },
  {
    id: "stat-006",
    description:
      "Status audience privacy (contacts, contacts-except, selected)",
    category: "status",
    priority: "high",
    status: "implemented",
    configPath: "extended.status.defaultAudience",
    expectedValue: "contacts",
  },
];

// ============================================================================
// COMMUNITIES PARITY ITEMS
// ============================================================================

const communityItems: ParityChecklistItem[] = [
  {
    id: "comm-001",
    description: "Communities feature enabled",
    category: "communities",
    priority: "high",
    status: "implemented",
    configPath: "extended.communities.enabled",
    expectedValue: true,
  },
  {
    id: "comm-002",
    description: "Up to 50 groups per community",
    category: "communities",
    priority: "medium",
    status: "implemented",
    configPath: "extended.communities.maxGroups",
    expectedValue: 50,
  },
  {
    id: "comm-003",
    description: "Community announcement group (read-only)",
    category: "communities",
    priority: "high",
    status: "implemented",
    configPath: "extended.communities.announcementGroup",
    expectedValue: true,
  },
  {
    id: "comm-004",
    description: "Community invite links",
    category: "communities",
    priority: "medium",
    status: "implemented",
    configPath: "extended.communities.inviteLinks",
    expectedValue: true,
  },
];

// ============================================================================
// PRIVACY PARITY ITEMS
// ============================================================================

const privacyItems: ParityChecklistItem[] = [
  {
    id: "priv-001",
    description: "End-to-end encryption on by default",
    category: "privacy",
    priority: "critical",
    status: "implemented",
    configPath: "behavior.privacy.e2eeDefault",
    expectedValue: true,
  },
  {
    id: "priv-002",
    description: "Read receipts with opt-out option",
    category: "privacy",
    priority: "high",
    status: "implemented",
    configPath: "behavior.privacy.readReceiptsOptional",
    expectedValue: true,
  },
  {
    id: "priv-003",
    description: "Last seen privacy control",
    category: "privacy",
    priority: "high",
    status: "implemented",
    configPath: "behavior.privacy.lastSeenPrivacy",
    expectedValue: true,
  },
  {
    id: "priv-004",
    description: "Profile visibility set to contacts only",
    category: "privacy",
    priority: "high",
    status: "implemented",
    configPath: "behavior.privacy.profileVisibility",
    expectedValue: "contacts",
  },
  {
    id: "priv-005",
    description: "Disappearing messages (off, 24h, 7d, 90d)",
    category: "privacy",
    priority: "high",
    status: "implemented",
    configPath: "behavior.privacy.disappearingOptions",
    expectedValue: ["off", "24h", "7d", "90d"],
  },
];

// ============================================================================
// VISUAL PARITY ITEMS
// ============================================================================

const visualItems: ParityChecklistItem[] = [
  {
    id: "vis-001",
    description: "Teal/green header color (#008069 light, #202C33 dark)",
    category: "visual",
    priority: "critical",
    status: "implemented",
    configPath: "extendedColors.light.headerBg",
    expectedValue: "#008069",
  },
  {
    id: "vis-002",
    description: "Warm chat wallpaper (#E5DDD5 light, #0B141A dark)",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "extendedColors.light.chatWallpaper",
    expectedValue: "#E5DDD5",
  },
  {
    id: "vis-003",
    description: "Green sent message bubbles (#D9FDD3 light, #005C4B dark)",
    category: "visual",
    priority: "critical",
    status: "implemented",
    configPath: "extendedColors.light.sentBubbleBg",
    expectedValue: "#D9FDD3",
  },
  {
    id: "vis-004",
    description: "White received message bubbles (#FFFFFF light, #202C33 dark)",
    category: "visual",
    priority: "critical",
    status: "implemented",
    configPath: "extendedColors.light.receivedBubbleBg",
    expectedValue: "#FFFFFF",
  },
  {
    id: "vis-005",
    description: "7.5px message bubble border radius",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.borderRadius.md",
    expectedValue: "7.5px",
  },
  {
    id: "vis-006",
    description: "Blue read receipt checkmarks (#53BDEB)",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "extendedColors.light.readReceiptColor",
    expectedValue: "#53BDEB",
  },
  {
    id: "vis-007",
    description: "Segoe UI / Helvetica Neue font family",
    category: "visual",
    priority: "high",
    status: "implemented",
    configPath: "skin.typography.fontFamily",
    expectedValue: "Segoe UI",
    notes: "Font family string starts with Segoe UI",
  },
  {
    id: "vis-008",
    description: "340px sidebar width on desktop",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.spacing.sidebarWidth",
    expectedValue: "340px",
  },
  {
    id: "vis-009",
    description: "Circular avatar shape",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "skin.components.avatarShape",
    expectedValue: "circle",
  },
  {
    id: "vis-010",
    description: "Green unread badge (#25D366 light, #00A884 dark)",
    category: "visual",
    priority: "medium",
    status: "implemented",
    configPath: "extendedColors.light.unreadBadgeBg",
    expectedValue: "#25D366",
  },
];

// ============================================================================
// COMPOSER PARITY ITEMS
// ============================================================================

const composerItems: ParityChecklistItem[] = [
  {
    id: "comp-001",
    description:
      "Mic/send toggle button (mic when empty, send when text entered)",
    category: "composer",
    priority: "critical",
    status: "implemented",
    configPath: "composer.sendButton.toggleWithMic",
    expectedValue: true,
  },
  {
    id: "comp-002",
    description:
      "Attachment menu with 7 options (document, camera, gallery, audio, location, contact, poll)",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.attachmentMenu.length",
    expectedValue: 7,
  },
  {
    id: "comp-003",
    description: "Emoji picker with stickers and GIFs tabs",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.emojiPicker.stickersTab",
    expectedValue: true,
  },
  {
    id: "comp-004",
    description: "Reply-to preview bar above composer",
    category: "composer",
    priority: "high",
    status: "implemented",
    configPath: "composer.replyPreview.enabled",
    expectedValue: true,
  },
  {
    id: "comp-005",
    description: "No formatting toolbar (WhatsApp uses inline syntax)",
    category: "composer",
    priority: "medium",
    status: "implemented",
    configPath: "extended.formatting.richTextEditor",
    expectedValue: false,
  },
  {
    id: "comp-006",
    description: "Paste images support",
    category: "composer",
    priority: "medium",
    status: "implemented",
    configPath: "composer.pasteImages",
    expectedValue: true,
  },
];

// ============================================================================
// GROUP PARITY ITEMS
// ============================================================================

const groupItems: ParityChecklistItem[] = [
  {
    id: "grp-001",
    description: "Max 1024 members per group",
    category: "groups",
    priority: "high",
    status: "implemented",
    configPath: "behavior.channels.maxGroupMembers",
    expectedValue: 1024,
  },
  {
    id: "grp-002",
    description: "Group admin can manage members and settings",
    category: "groups",
    priority: "high",
    status: "implemented",
    configPath: "extended.groupAdmin.manageAdmins",
    expectedValue: true,
  },
  {
    id: "grp-003",
    description: "Group invite links and QR codes",
    category: "groups",
    priority: "medium",
    status: "implemented",
    configPath: "extended.groupAdmin.qrCodeInvite",
    expectedValue: true,
  },
  {
    id: "grp-004",
    description: "Member approval for joining groups",
    category: "groups",
    priority: "medium",
    status: "implemented",
    configPath: "extended.groupAdmin.memberApproval",
    expectedValue: true,
  },
  {
    id: "grp-005",
    description: "No channel hierarchy (flat groups)",
    category: "groups",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.channels.hierarchy",
    expectedValue: false,
  },
  {
    id: "grp-006",
    description: "Broadcast lists supported",
    category: "groups",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.features.broadcasts",
    expectedValue: true,
  },
];

// ============================================================================
// NOTIFICATIONS PARITY ITEMS
// ============================================================================

const notificationItems: ParityChecklistItem[] = [
  {
    id: "notif-001",
    description: "All messages notify by default",
    category: "notifications",
    priority: "high",
    status: "implemented",
    configPath: "behavior.notifications.defaultLevel",
    expectedValue: "all",
  },
  {
    id: "notif-002",
    description: "Quiet hours / DND support",
    category: "notifications",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.notifications.quietHours",
    expectedValue: true,
  },
  {
    id: "notif-003",
    description: "Badge count on app icon",
    category: "notifications",
    priority: "medium",
    status: "implemented",
    configPath: "behavior.notifications.badgeCount",
    expectedValue: true,
  },
];

// ============================================================================
// ASSEMBLED CHECKLIST
// ============================================================================

const allItems: ParityChecklistItem[] = [
  ...navigationItems,
  ...messagingItems,
  ...mediaItems,
  ...callItems,
  ...statusItems,
  ...communityItems,
  ...privacyItems,
  ...visualItems,
  ...composerItems,
  ...groupItems,
  ...notificationItems,
];

function countByStatus(
  items: ParityChecklistItem[],
): Record<ParityStatus, number> {
  const counts: Record<ParityStatus, number> = {
    implemented: 0,
    partial: 0,
    "not-implemented": 0,
    "not-applicable": 0,
  };
  for (const item of items) {
    counts[item.status]++;
  }
  return counts;
}

function countByPriority(
  items: ParityChecklistItem[],
): Record<ParityPriority, number> {
  const counts: Record<ParityPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const item of items) {
    counts[item.priority]++;
  }
  return counts;
}

function calculateParityPercentage(items: ParityChecklistItem[]): number {
  const applicable = items.filter((i) => i.status !== "not-applicable");
  if (applicable.length === 0) return 0;
  const implemented = applicable.filter((i) => i.status === "implemented");
  return Math.round((implemented.length / applicable.length) * 100);
}

/**
 * Complete WhatsApp parity checklist with all items and computed stats.
 */
export const whatsappParityChecklist: WhatsAppParityChecklist = {
  platform: "WhatsApp",
  targetVersion: "WhatsApp 2.24.x (2026)",
  assessmentDate: "2026-02-09",
  totalItems: allItems.length,
  statusCounts: countByStatus(allItems),
  priorityCounts: countByPriority(allItems),
  parityPercentage: calculateParityPercentage(allItems),
  items: allItems,
};

// ============================================================================
// CHECKLIST HELPERS
// ============================================================================

/**
 * Get all checklist items for a specific category.
 */
export function getParityItemsByCategory(
  category: ParityCategory,
): ParityChecklistItem[] {
  return whatsappParityChecklist.items.filter(
    (item) => item.category === category,
  );
}

/**
 * Get all checklist items for a specific priority.
 */
export function getParityItemsByPriority(
  priority: ParityPriority,
): ParityChecklistItem[] {
  return whatsappParityChecklist.items.filter(
    (item) => item.priority === priority,
  );
}

/**
 * Get all checklist items for a specific status.
 */
export function getParityItemsByStatus(
  status: ParityStatus,
): ParityChecklistItem[] {
  return whatsappParityChecklist.items.filter((item) => item.status === status);
}

/**
 * Get a specific checklist item by ID.
 */
export function getParityItemById(id: string): ParityChecklistItem | undefined {
  return whatsappParityChecklist.items.find((item) => item.id === id);
}

/**
 * Verify that all critical items are implemented.
 */
export function verifyCriticalParity(): {
  passed: boolean;
  failedItems: ParityChecklistItem[];
} {
  const criticalItems = getParityItemsByPriority("critical");
  const failedItems = criticalItems.filter(
    (item) => item.status !== "implemented" && item.status !== "not-applicable",
  );
  return {
    passed: failedItems.length === 0,
    failedItems,
  };
}

/**
 * Get parity percentage for a specific category.
 */
export function getCategoryParityPercentage(category: ParityCategory): number {
  const items = getParityItemsByCategory(category);
  return calculateParityPercentage(items);
}
