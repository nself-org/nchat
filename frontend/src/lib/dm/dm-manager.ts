/**
 * DM Manager - Core logic for managing direct messages
 *
 * Handles DM creation, participant management, and common operations
 */

import type {
  DirectMessage,
  DMParticipant,
  DMUser,
  DMType,
  DMSettings,
  CreateDMInput,
  GroupDMCreateInput,
  GroupDMUpdateInput,
  AddParticipantsInput,
  RemoveParticipantInput,
  DM_CONSTANTS,
} from "./dm-types";

// ============================================================================
// DM Creation
// ============================================================================

/**
 * Generate a unique slug for a DM
 */
export function generateDMSlug(participants: DMUser[], type: DMType): string {
  if (type === "direct") {
    const sortedIds = participants
      .map((p) => p.id)
      .sort()
      .join("-");
    return `dm-${sortedIds}`;
  }
  // Group DM - use timestamp
  return `gdm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate display name for a DM based on participants
 */
export function generateDMDisplayName(
  participants: DMParticipant[],
  currentUserId: string,
  customName?: string | null,
): string {
  if (customName) {
    return customName;
  }

  const otherParticipants = participants.filter(
    (p) => p.userId !== currentUserId,
  );

  if (otherParticipants.length === 0) {
    return "Just You";
  }

  if (otherParticipants.length === 1) {
    return (
      otherParticipants[0].user.displayName ||
      otherParticipants[0].user.username
    );
  }

  if (otherParticipants.length === 2) {
    return otherParticipants
      .map((p) => p.user.displayName || p.user.username)
      .join(" and ");
  }

  const firstTwo = otherParticipants
    .slice(0, 2)
    .map((p) => p.user.displayName || p.user.username)
    .join(", ");
  const remaining = otherParticipants.length - 2;
  return `${firstTwo} and ${remaining} other${remaining > 1 ? "s" : ""}`;
}

/**
 * Get default DM settings
 */
export function getDefaultDMSettings(): DMSettings {
  return {
    allowReactions: true,
    allowAttachments: true,
    maxAttachmentSize: 100 * 1024 * 1024, // 100MB
    allowVoiceMessages: true,
    allowVideoMessages: true,
    readReceiptsEnabled: true,
    typingIndicatorsEnabled: true,
  };
}

/**
 * Validate DM creation input
 */
export function validateCreateDMInput(
  input: CreateDMInput,
  currentUserId: string,
): { valid: boolean; error?: string } {
  if (!input.participantIds || input.participantIds.length === 0) {
    return { valid: false, error: "At least one participant is required" };
  }

  // Remove current user from the list if included
  const otherParticipants = input.participantIds.filter(
    (id) => id !== currentUserId,
  );

  if (otherParticipants.length === 0) {
    return { valid: false, error: "Cannot create DM with only yourself" };
  }

  return { valid: true };
}

/**
 * Validate group DM creation input
 */
export function validateGroupDMInput(
  input: GroupDMCreateInput,
  maxParticipants: number = 256,
): { valid: boolean; error?: string } {
  if (!input.name || input.name.trim().length === 0) {
    return { valid: false, error: "Group name is required" };
  }

  if (input.name.length > 100) {
    return { valid: false, error: "Group name must be 100 characters or less" };
  }

  if (!input.participantIds || input.participantIds.length < 2) {
    return {
      valid: false,
      error: "At least 2 participants are required for a group DM",
    };
  }

  if (input.participantIds.length > maxParticipants) {
    return {
      valid: false,
      error: `Group DM cannot have more than ${maxParticipants} participants`,
    };
  }

  if (input.description && input.description.length > 500) {
    return {
      valid: false,
      error: "Description must be 500 characters or less",
    };
  }

  return { valid: true };
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Check if a user can add participants to a DM
 */
export function canAddParticipants(dm: DirectMessage, userId: string): boolean {
  if (dm.type === "direct") {
    return false; // Cannot add to 1:1 DMs
  }

  const participant = dm.participants.find((p) => p.userId === userId);
  if (!participant) {
    return false;
  }

  return participant.role === "owner" || participant.role === "admin";
}

/**
 * Check if a user can remove a participant from a DM
 */
export function canRemoveParticipant(
  dm: DirectMessage,
  actorId: string,
  targetId: string,
): boolean {
  if (dm.type === "direct") {
    return false;
  }

  // Users can always leave themselves
  if (actorId === targetId) {
    return true;
  }

  const actor = dm.participants.find((p) => p.userId === actorId);
  const target = dm.participants.find((p) => p.userId === targetId);

  if (!actor || !target) {
    return false;
  }

  // Only owner can remove admins
  if (target.role === "admin" && actor.role !== "owner") {
    return false;
  }

  // Owner and admins can remove members
  return actor.role === "owner" || actor.role === "admin";
}

/**
 * Check if a user can update DM settings
 */
export function canUpdateDMSettings(
  dm: DirectMessage,
  userId: string,
): boolean {
  if (dm.type === "direct") {
    // Both participants can update 1:1 DM settings
    return dm.participants.some((p) => p.userId === userId);
  }

  const participant = dm.participants.find((p) => p.userId === userId);
  if (!participant) {
    return false;
  }

  return participant.role === "owner" || participant.role === "admin";
}

/**
 * Check if a user can archive a DM
 */
export function canArchiveDM(dm: DirectMessage, userId: string): boolean {
  // Any participant can archive for themselves
  return dm.participants.some((p) => p.userId === userId);
}

/**
 * Check if a user can delete a DM (permanently)
 */
export function canDeleteDM(dm: DirectMessage, userId: string): boolean {
  if (dm.type === "direct") {
    return dm.createdBy === userId;
  }

  const participant = dm.participants.find((p) => p.userId === userId);
  return participant?.role === "owner";
}

// ============================================================================
// DM Utilities
// ============================================================================

/**
 * Get the other participant in a 1:1 DM
 */
export function getOtherParticipant(
  dm: DirectMessage,
  currentUserId: string,
): DMParticipant | null {
  if (dm.type !== "direct") {
    return null;
  }

  return dm.participants.find((p) => p.userId !== currentUserId) || null;
}

/**
 * Get all other participants (excluding current user)
 */
export function getOtherParticipants(
  dm: DirectMessage,
  currentUserId: string,
): DMParticipant[] {
  return dm.participants.filter((p) => p.userId !== currentUserId);
}

/**
 * Check if a DM exists between two users
 */
export function findExistingDM(
  dms: DirectMessage[],
  userId1: string,
  userId2: string,
): DirectMessage | null {
  return (
    dms.find((dm) => {
      if (dm.type !== "direct") return false;
      const participantIds = dm.participants.map((p) => p.userId);
      return (
        participantIds.includes(userId1) && participantIds.includes(userId2)
      );
    }) || null
  );
}

/**
 * Sort DMs by last message time
 */
export function sortDMsByRecent(dms: DirectMessage[]): DirectMessage[] {
  return [...dms].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Sort DMs by unread count
 */
export function sortDMsByUnread(dms: DirectMessage[]): DirectMessage[] {
  return [...dms].sort((a, b) => {
    const aUnread = a.unreadCount || 0;
    const bUnread = b.unreadCount || 0;
    if (aUnread !== bUnread) {
      return bUnread - aUnread;
    }
    // Secondary sort by recent
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Sort DMs alphabetically by display name
 */
export function sortDMsAlphabetically(
  dms: DirectMessage[],
  currentUserId: string,
): DirectMessage[] {
  return [...dms].sort((a, b) => {
    const aName = generateDMDisplayName(a.participants, currentUserId, a.name);
    const bName = generateDMDisplayName(b.participants, currentUserId, b.name);
    return aName.localeCompare(bName);
  });
}

/**
 * Filter DMs by search query
 */
export function filterDMsByQuery(
  dms: DirectMessage[],
  query: string,
  currentUserId: string,
): DirectMessage[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return dms;
  }

  return dms.filter((dm) => {
    // Check DM name
    if (dm.name?.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Check participant names
    const participants = getOtherParticipants(dm, currentUserId);
    return participants.some(
      (p) =>
        p.user.displayName?.toLowerCase().includes(normalizedQuery) ||
        p.user.username.toLowerCase().includes(normalizedQuery),
    );
  });
}

/**
 * Get unread DMs
 */
export function getUnreadDMs(dms: DirectMessage[]): DirectMessage[] {
  return dms.filter((dm) => (dm.unreadCount || 0) > 0);
}

/**
 * Get total unread count across all DMs
 */
export function getTotalUnreadCount(dms: DirectMessage[]): number {
  return dms.reduce((total, dm) => total + (dm.unreadCount || 0), 0);
}

// ============================================================================
// Avatar Utilities
// ============================================================================

/**
 * Get avatar URL(s) for a DM
 */
export function getDMAvatarUrls(
  dm: DirectMessage,
  currentUserId: string,
): string[] {
  if (dm.type === "direct") {
    const other = getOtherParticipant(dm, currentUserId);
    return other?.user.avatarUrl ? [other.user.avatarUrl] : [];
  }

  // Group DM - use custom avatar or combine participant avatars
  if (dm.avatarUrl) {
    return [dm.avatarUrl];
  }

  const others = getOtherParticipants(dm, currentUserId);
  return others
    .slice(0, 4)
    .map((p) => p.user.avatarUrl)
    .filter((url): url is string => !!url);
}

/**
 * Get initials for DM avatar fallback
 */
export function getDMAvatarInitials(
  dm: DirectMessage,
  currentUserId: string,
): string {
  if (dm.type === "direct") {
    const other = getOtherParticipant(dm, currentUserId);
    if (other) {
      const name = other.user.displayName || other.user.username;
      return name.charAt(0).toUpperCase();
    }
    return "?";
  }

  // Group DM
  if (dm.name) {
    return dm.name.charAt(0).toUpperCase();
  }

  const others = getOtherParticipants(dm, currentUserId);
  if (others.length > 0) {
    return others
      .slice(0, 2)
      .map((p) => (p.user.displayName || p.user.username).charAt(0))
      .join("")
      .toUpperCase();
  }

  return "G";
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Format DM timestamp for display
 */
export function formatDMTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    // This week - show day name
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Older - show date
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Check if a DM has recent activity
 */
export function hasRecentActivity(
  dm: DirectMessage,
  thresholdMinutes: number = 5,
): boolean {
  if (!dm.lastMessageAt) {
    return false;
  }

  const lastActivity = new Date(dm.lastMessageAt);
  const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
  return lastActivity > threshold;
}
