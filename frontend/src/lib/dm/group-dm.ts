/**
 * Group DM - Specialized functionality for group direct messages
 *
 * Handles group DM creation, management, and participant operations
 */

import type {
  DirectMessage,
  GroupDM,
  DMParticipant,
  DMUser,
  GroupDMCreateInput,
  GroupDMUpdateInput,
  DM_CONSTANTS,
} from "./dm-types";

// ============================================================================
// Group DM Validation
// ============================================================================

/**
 * Validate group name
 */
export function validateGroupName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Group name is required" };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: "Group name must be at least 2 characters" };
  }

  if (name.length > 100) {
    return { valid: false, error: "Group name must be 100 characters or less" };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return { valid: false, error: "Group name contains invalid characters" };
  }

  return { valid: true };
}

/**
 * Validate group description
 */
export function validateGroupDescription(description: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!description) {
    return { valid: true };
  }

  if (description.length > 500) {
    return {
      valid: false,
      error: "Description must be 500 characters or less",
    };
  }

  return { valid: true };
}

/**
 * Validate participant count
 */
export function validateParticipantCount(
  count: number,
  maxParticipants: number = 256,
): {
  valid: boolean;
  error?: string;
} {
  if (count < 2) {
    return { valid: false, error: "Group DM requires at least 2 participants" };
  }

  if (count > maxParticipants) {
    return {
      valid: false,
      error: `Group DM cannot have more than ${maxParticipants} participants`,
    };
  }

  return { valid: true };
}

/**
 * Full validation for group DM creation
 */
export function validateGroupDMCreation(
  input: GroupDMCreateInput,
  maxParticipants: number = 256,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const nameValidation = validateGroupName(input.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error!);
  }

  const descValidation = validateGroupDescription(input.description);
  if (!descValidation.valid) {
    errors.push(descValidation.error!);
  }

  const countValidation = validateParticipantCount(
    input.participantIds.length,
    maxParticipants,
  );
  if (!countValidation.valid) {
    errors.push(countValidation.error!);
  }

  // Check for duplicate participants
  const uniqueIds = new Set(input.participantIds);
  if (uniqueIds.size !== input.participantIds.length) {
    errors.push("Duplicate participants are not allowed");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Participant Management
// ============================================================================

/**
 * Check if a user can be added to a group DM
 */
export function canAddToGroup(
  group: DirectMessage,
  userId: string,
  maxParticipants: number = 256,
): {
  allowed: boolean;
  reason?: string;
} {
  // Check if already a member
  if (group.participants.some((p) => p.userId === userId)) {
    return { allowed: false, reason: "User is already a member" };
  }

  // Check participant limit
  if (group.participants.length >= maxParticipants) {
    return { allowed: false, reason: "Group has reached maximum participants" };
  }

  return { allowed: true };
}

/**
 * Check if a user can invite others to a group DM
 */
export function canInviteToGroup(
  group: DirectMessage,
  inviterId: string,
): boolean {
  const inviter = group.participants.find((p) => p.userId === inviterId);
  if (!inviter) {
    return false;
  }

  // Owners and admins can always invite
  if (inviter.role === "owner" || inviter.role === "admin") {
    return true;
  }

  // For regular members, check settings (if implemented)
  // Default: members can invite
  return true;
}

/**
 * Check if a user can remove another from a group DM
 */
export function canRemoveFromGroup(
  group: DirectMessage,
  actorId: string,
  targetId: string,
): {
  allowed: boolean;
  reason?: string;
} {
  // Can always leave yourself
  if (actorId === targetId) {
    return { allowed: true };
  }

  const actor = group.participants.find((p) => p.userId === actorId);
  const target = group.participants.find((p) => p.userId === targetId);

  if (!actor) {
    return { allowed: false, reason: "You are not a member of this group" };
  }

  if (!target) {
    return { allowed: false, reason: "User is not a member of this group" };
  }

  // Cannot remove the owner
  if (target.role === "owner") {
    return { allowed: false, reason: "Cannot remove the group owner" };
  }

  // Only owner can remove admins
  if (target.role === "admin" && actor.role !== "owner") {
    return { allowed: false, reason: "Only the owner can remove admins" };
  }

  // Owners and admins can remove members
  if (actor.role === "owner" || actor.role === "admin") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "You do not have permission to remove members",
  };
}

/**
 * Check if a user can modify group settings
 */
export function canModifyGroupSettings(
  group: DirectMessage,
  userId: string,
): boolean {
  const participant = group.participants.find((p) => p.userId === userId);
  if (!participant) {
    return false;
  }

  return participant.role === "owner" || participant.role === "admin";
}

/**
 * Check if a user can change another user's role
 */
export function canChangeRole(
  group: DirectMessage,
  actorId: string,
  targetId: string,
  newRole: "admin" | "member",
): {
  allowed: boolean;
  reason?: string;
} {
  const actor = group.participants.find((p) => p.userId === actorId);
  const target = group.participants.find((p) => p.userId === targetId);

  if (!actor) {
    return { allowed: false, reason: "You are not a member of this group" };
  }

  if (!target) {
    return { allowed: false, reason: "User is not a member of this group" };
  }

  // Cannot change own role
  if (actorId === targetId) {
    return { allowed: false, reason: "Cannot change your own role" };
  }

  // Cannot change owner's role
  if (target.role === "owner") {
    return { allowed: false, reason: "Cannot change the owner's role" };
  }

  // Only owner can promote to admin or demote admins
  if (actor.role !== "owner") {
    return { allowed: false, reason: "Only the owner can change roles" };
  }

  return { allowed: true };
}

// ============================================================================
// Group Avatar
// ============================================================================

/**
 * Generate combined avatar for group DM
 */
export function generateGroupAvatarUrls(
  participants: DMParticipant[],
  currentUserId: string,
  limit: number = 4,
): string[] {
  return participants
    .filter((p) => p.userId !== currentUserId)
    .slice(0, limit)
    .map((p) => p.user.avatarUrl)
    .filter((url): url is string => !!url);
}

/**
 * Get initials for group avatar fallback
 */
export function getGroupInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

// ============================================================================
// Group Display
// ============================================================================

/**
 * Get display name for group DM
 */
export function getGroupDisplayName(
  group: DirectMessage,
  currentUserId: string,
): string {
  if (group.name) {
    return group.name;
  }

  const others = group.participants.filter((p) => p.userId !== currentUserId);

  if (others.length === 0) {
    return "Group Chat";
  }

  if (others.length <= 3) {
    return others.map((p) => p.user.displayName || p.user.username).join(", ");
  }

  const firstTwo = others
    .slice(0, 2)
    .map((p) => p.user.displayName || p.user.username);
  return `${firstTwo.join(", ")} and ${others.length - 2} others`;
}

/**
 * Get participant summary text
 */
export function getParticipantSummary(
  participants: DMParticipant[],
  currentUserId: string,
): string {
  const count = participants.length;
  const others = participants.filter((p) => p.userId !== currentUserId);

  if (count === 1) {
    return "Just you";
  }

  return `You and ${others.length} other${others.length === 1 ? "" : "s"}`;
}

/**
 * Get online count in group
 */
export function getOnlineCount(participants: DMParticipant[]): number {
  return participants.filter((p) => p.user.status === "online").length;
}

// ============================================================================
// Group Ownership
// ============================================================================

/**
 * Transfer group ownership
 */
export function canTransferOwnership(
  group: DirectMessage,
  currentOwnerId: string,
  newOwnerId: string,
): {
  allowed: boolean;
  reason?: string;
} {
  const currentOwner = group.participants.find(
    (p) => p.userId === currentOwnerId,
  );
  const newOwner = group.participants.find((p) => p.userId === newOwnerId);

  if (!currentOwner) {
    return { allowed: false, reason: "You are not a member of this group" };
  }

  if (currentOwner.role !== "owner") {
    return { allowed: false, reason: "Only the owner can transfer ownership" };
  }

  if (!newOwner) {
    return {
      allowed: false,
      reason: "New owner is not a member of this group",
    };
  }

  if (currentOwnerId === newOwnerId) {
    return { allowed: false, reason: "Already the owner" };
  }

  return { allowed: true };
}

// ============================================================================
// Group Leave Handling
// ============================================================================

/**
 * Determine what happens when a user leaves
 */
export function getLeaveConsequences(
  group: DirectMessage,
  userId: string,
): {
  canLeave: boolean;
  willDeleteGroup: boolean;
  requiresOwnerTransfer: boolean;
  suggestedNewOwner?: DMParticipant;
} {
  const participant = group.participants.find((p) => p.userId === userId);

  if (!participant) {
    return {
      canLeave: false,
      willDeleteGroup: false,
      requiresOwnerTransfer: false,
    };
  }

  // Only 2 participants - leaving will delete group
  if (group.participants.length <= 2) {
    return {
      canLeave: true,
      willDeleteGroup: true,
      requiresOwnerTransfer: false,
    };
  }

  // Not the owner - can leave freely
  if (participant.role !== "owner") {
    return {
      canLeave: true,
      willDeleteGroup: false,
      requiresOwnerTransfer: false,
    };
  }

  // Owner leaving - need to transfer ownership
  const admins = group.participants.filter(
    (p) => p.role === "admin" && p.userId !== userId,
  );
  const suggestedNewOwner =
    admins[0] || group.participants.find((p) => p.userId !== userId);

  return {
    canLeave: true,
    willDeleteGroup: false,
    requiresOwnerTransfer: true,
    suggestedNewOwner,
  };
}
