// ===============================================================================
// WhatsApp Feature Set - Complete Feature Parity
// ===============================================================================
//
// This file defines all WhatsApp features available in the template.
// Use these feature flags to enable/disable specific WhatsApp functionality.
//
// ===============================================================================

/**
 * WhatsApp Chat Types
 */
export type WhatsAppChatType =
  | "individual" // 1-on-1 chat
  | "group" // Group chat (up to 1024 members)
  | "broadcast" // Broadcast list
  | "community" // Community (groups of groups)
  | "business"; // Business account chat

/**
 * WhatsApp Message Types
 */
export type WhatsAppMessageType =
  | "text" // Plain text message
  | "image" // Image with optional caption
  | "video" // Video with optional caption
  | "audio" // Audio file
  | "voice" // Voice note
  | "document" // Document/file attachment
  | "sticker" // Sticker
  | "gif" // GIF
  | "location" // Location share
  | "live-location" // Live location share
  | "contact" // Contact card
  | "poll" // Poll
  | "view-once" // View once media
  | "payment" // Payment (placeholder)
  | "system"; // System message (joined, left, etc.)

/**
 * WhatsApp Message Status (Read Receipts)
 */
export type WhatsAppMessageStatus =
  | "pending" // Clock icon - sending
  | "sent" // Single gray check - sent to server
  | "delivered" // Double gray check - delivered to recipient
  | "read" // Double blue check - read by recipient
  | "failed"; // Red exclamation - failed to send

/**
 * WhatsApp User Status/Presence
 */
export type WhatsAppPresence =
  | "online" // Currently online
  | "typing" // Typing...
  | "recording" // Recording audio...
  | "last-seen" // Last seen at [time]
  | "offline"; // Hidden or unavailable

/**
 * WhatsApp Privacy Settings
 */
export interface WhatsAppPrivacySettings {
  lastSeen: "everyone" | "contacts" | "contacts-except" | "nobody";
  profilePhoto: "everyone" | "contacts" | "contacts-except" | "nobody";
  about: "everyone" | "contacts" | "contacts-except" | "nobody";
  status: "everyone" | "contacts" | "contacts-except" | "nobody";
  groups: "everyone" | "contacts" | "contacts-except";
  readReceipts: boolean;
  onlineStatus: boolean;
}

/**
 * WhatsApp Group Settings
 */
export interface WhatsAppGroupSettings {
  maxMembers: number; // Default: 1024
  onlyAdminsCanSend: boolean;
  onlyAdminsCanEditInfo: boolean;
  onlyAdminsCanAddMembers: boolean;
  approvalRequired: boolean; // Require admin approval to join
  disappearingMessages: "off" | "24h" | "7d" | "90d";
}

/**
 * WhatsApp Disappearing Message Durations
 */
export const DISAPPEARING_DURATIONS = {
  off: 0,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
} as const;

/**
 * WhatsApp Quick Reactions
 */
export const WHATSAPP_QUICK_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🙏", label: "Thanks" },
];

/**
 * WhatsApp Full Feature Configuration
 */
export interface WhatsAppFeatures {
  // Chat Types
  individualChats: boolean;
  groups: boolean;
  groupsMaxMembers: number; // Up to 1024
  broadcastLists: boolean;
  broadcastMaxRecipients: number; // Up to 256
  communities: boolean;

  // Messaging
  textMessages: boolean;
  voiceNotes: boolean;
  voiceNotesMaxDuration: number; // 15 minutes in seconds
  imageMessages: boolean;
  videoMessages: boolean;
  videoMaxDuration: number; // 16 minutes in seconds
  documentMessages: boolean;
  documentMaxSize: number; // 2GB in bytes
  locationSharing: boolean;
  liveLocationSharing: boolean;
  contactSharing: boolean;
  stickers: boolean;
  gifs: boolean;
  polls: boolean;
  pollsMaxOptions: number;

  // Message Features
  reactions: boolean;
  reply: boolean;
  forward: boolean;
  forwardLimit: number; // Max 5 chats at once
  star: boolean;
  copy: boolean;
  deleteForMe: boolean;
  deleteForEveryone: boolean;
  deleteForEveryoneTimeout: number; // Time limit for delete (48h+)
  edit: boolean;
  editTimeout: number; // 15 minutes after sending

  // Media Features
  viewOnce: boolean;
  mediaAutoDownload: boolean;
  highQualityMedia: boolean;

  // Privacy & Security
  endToEndEncryption: boolean;
  encryptedBackups: boolean;
  disappearingMessages: boolean;
  disappearingOptions: ("off" | "24h" | "7d" | "90d")[];
  blockedContacts: boolean;
  reportMessages: boolean;

  // Read Receipts & Presence
  readReceipts: boolean;
  readReceiptsOptional: boolean; // Can be disabled
  typing: boolean;
  online: boolean;
  lastSeen: boolean;
  lastSeenPrivacy: boolean;

  // Status (Stories)
  status: boolean;
  statusPhotos: boolean;
  statusVideos: boolean;
  statusText: boolean;
  statusDuration: number; // 24 hours in seconds
  statusMaxLength: number; // 30 seconds for videos
  statusMuted: boolean;
  statusPrivacy: boolean;

  // Calls (Placeholders)
  voiceCalls: boolean;
  videoCalls: boolean;
  groupCalls: boolean;
  groupCallsMaxParticipants: number;

  // Business Features (Placeholder)
  businessProfile: boolean;
  catalogue: boolean;
  quickReplies: boolean;
  labels: boolean;
  awayMessages: boolean;
}

/**
 * Default WhatsApp Feature Configuration
 */
export const defaultWhatsAppFeatures: WhatsAppFeatures = {
  // Chat Types
  individualChats: true,
  groups: true,
  groupsMaxMembers: 1024,
  broadcastLists: true,
  broadcastMaxRecipients: 256,
  communities: true,

  // Messaging
  textMessages: true,
  voiceNotes: true,
  voiceNotesMaxDuration: 15 * 60, // 15 minutes
  imageMessages: true,
  videoMessages: true,
  videoMaxDuration: 16 * 60, // 16 minutes
  documentMessages: true,
  documentMaxSize: 2 * 1024 * 1024 * 1024, // 2GB
  locationSharing: true,
  liveLocationSharing: true,
  contactSharing: true,
  stickers: true,
  gifs: true,
  polls: true,
  pollsMaxOptions: 12,

  // Message Features
  reactions: true,
  reply: true,
  forward: true,
  forwardLimit: 5,
  star: true,
  copy: true,
  deleteForMe: true,
  deleteForEveryone: true,
  deleteForEveryoneTimeout: 48 * 60 * 60 * 1000 + 8 * 60 * 1000, // ~2 days 8 min
  edit: true,
  editTimeout: 15 * 60 * 1000, // 15 minutes

  // Media Features
  viewOnce: true,
  mediaAutoDownload: true,
  highQualityMedia: true,

  // Privacy & Security
  endToEndEncryption: true,
  encryptedBackups: true,
  disappearingMessages: true,
  disappearingOptions: ["off", "24h", "7d", "90d"],
  blockedContacts: true,
  reportMessages: true,

  // Read Receipts & Presence
  readReceipts: true,
  readReceiptsOptional: true,
  typing: true,
  online: true,
  lastSeen: true,
  lastSeenPrivacy: true,

  // Status (Stories)
  status: true,
  statusPhotos: true,
  statusVideos: true,
  statusText: true,
  statusDuration: 24 * 60 * 60, // 24 hours
  statusMaxLength: 30, // 30 seconds for videos
  statusMuted: true,
  statusPrivacy: true,

  // Calls (Placeholders - UI only)
  voiceCalls: true,
  videoCalls: true,
  groupCalls: true,
  groupCallsMaxParticipants: 32,

  // Business Features (Placeholder)
  businessProfile: false,
  catalogue: false,
  quickReplies: false,
  labels: false,
  awayMessages: false,
};

/**
 * WhatsApp Message Interface
 */
export interface WhatsAppMessage {
  id: string;
  chatId: string;
  senderId: string;
  type: WhatsAppMessageType;
  content: string;
  caption?: string;
  status: WhatsAppMessageStatus;
  timestamp: Date;

  // Reply context
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    type: WhatsAppMessageType;
  };

  // Forwarded
  isForwarded: boolean;
  forwardCount?: number; // Shows "Forwarded many times" after 4

  // Starred
  isStarred: boolean;

  // Edited
  isEdited: boolean;
  editedAt?: Date;

  // Disappearing
  expiresAt?: Date;

  // View once
  isViewOnce: boolean;
  viewedAt?: Date;

  // Reactions
  reactions?: {
    emoji: string;
    userId: string;
    timestamp: Date;
  }[];

  // Media
  media?: {
    url: string;
    thumbnail?: string;
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
    mimeType?: string;
  };

  // Voice note specific
  voiceNote?: {
    duration: number;
    waveform: number[]; // Audio waveform data for visualization
    isPlayed: boolean;
  };

  // Location specific
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    isLive: boolean;
    expiresAt?: Date;
  };

  // Contact specific
  contact?: {
    name: string;
    phone: string;
    email?: string;
    avatar?: string;
  };

  // Poll specific
  poll?: {
    question: string;
    options: {
      id: string;
      text: string;
      votes: string[]; // User IDs
    }[];
    allowMultiple: boolean;
    isAnonymous: boolean;
    closedAt?: Date;
  };
}

/**
 * WhatsApp Chat Interface
 */
export interface WhatsAppChat {
  id: string;
  type: WhatsAppChatType;
  name: string;
  avatar?: string;

  // For individual chats
  userId?: string;
  phone?: string;
  about?: string;

  // For groups
  groupInfo?: {
    description?: string;
    createdAt: Date;
    createdBy: string;
    memberCount: number;
    admins: string[];
    settings: WhatsAppGroupSettings;
  };

  // For broadcasts
  broadcastInfo?: {
    recipientCount: number;
    recipients: string[];
  };

  // Chat state
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderId: string;
    type: WhatsAppMessageType;
    status: WhatsAppMessageStatus;
  };
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  muteUntil?: Date;
  isArchived: boolean;
  isBlocked: boolean;

  // Disappearing messages
  disappearingMessages: "off" | "24h" | "7d" | "90d";

  // Presence (for individual chats)
  presence?: WhatsAppPresence;
  lastSeen?: Date;
  isTyping?: boolean;

  // Media stats
  mediaCount?: {
    images: number;
    videos: number;
    documents: number;
    links: number;
  };
}

/**
 * WhatsApp Status (Story)
 */
export interface WhatsAppStatus {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  items: WhatsAppStatusItem[];
  viewedBy: string[];
  createdAt: Date;
  isMuted: boolean;
}

export interface WhatsAppStatusItem {
  id: string;
  type: "image" | "video" | "text";
  content: string; // URL for media, text for text status
  caption?: string;
  backgroundColor?: string; // For text status
  textColor?: string;
  font?: string;
  duration: number; // Display duration in seconds
  timestamp: Date;
  viewedBy: string[];
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  features: WhatsAppFeatures,
  feature: keyof WhatsAppFeatures,
): boolean {
  const value = features[feature];
  return typeof value === "boolean" ? value : Boolean(value);
}

/**
 * Get message status icon configuration
 */
export function getMessageStatusConfig(status: WhatsAppMessageStatus) {
  const configs = {
    pending: {
      icon: "clock",
      color: "text-muted-foreground",
      label: "Sending...",
    },
    sent: {
      icon: "check",
      color: "text-muted-foreground",
      label: "Sent",
    },
    delivered: {
      icon: "check-check",
      color: "text-muted-foreground",
      label: "Delivered",
    },
    read: {
      icon: "check-check",
      color: "text-[#53BDEB]",
      label: "Read",
    },
    failed: {
      icon: "alert-circle",
      color: "text-destructive",
      label: "Failed to send",
    },
  };
  return configs[status];
}

/**
 * Format last seen time
 */
export function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "last seen just now";
  if (minutes < 60)
    return `last seen ${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `last seen ${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days === 1) return "last seen yesterday";
  if (days < 7) return `last seen ${days} days ago`;

  return `last seen on ${date.toLocaleDateString()}`;
}

/**
 * Format voice note duration
 */
export function formatVoiceNoteDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default defaultWhatsAppFeatures;
