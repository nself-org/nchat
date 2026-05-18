/**
 * Meeting Invites - Utilities for managing meeting invitations
 *
 * Handles participant invitations, RSVP, and permission management
 */

import {
  Meeting,
  MeetingParticipant,
  ParticipantRole,
  ParticipantStatus,
  InviteParticipantsInput,
} from "./meeting-types";

// ============================================================================
// Constants
// ============================================================================

export const ROLE_HIERARCHY: Record<ParticipantRole, number> = {
  host: 4,
  "co-host": 3,
  presenter: 2,
  participant: 1,
};

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  host: "Host",
  "co-host": "Co-host",
  presenter: "Presenter",
  participant: "Participant",
};

export const STATUS_LABELS: Record<ParticipantStatus, string> = {
  invited: "Invited",
  accepted: "Accepted",
  declined: "Declined",
  tentative: "Tentative",
  joined: "In Meeting",
  left: "Left",
};

export const STATUS_COLORS: Record<ParticipantStatus, string> = {
  invited: "text-muted-foreground",
  accepted: "text-green-600",
  declined: "text-red-600",
  tentative: "text-yellow-600",
  joined: "text-blue-600",
  left: "text-muted-foreground",
};

// ============================================================================
// Role & Permission Utilities
// ============================================================================

/**
 * Check if a user has a specific role or higher
 */
export function hasRole(
  userRole: ParticipantRole,
  requiredRole: ParticipantRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can perform an action based on their role
 */
export function canPerformAction(
  userRole: ParticipantRole,
  action:
    | "mute-others"
    | "remove-participant"
    | "assign-co-host"
    | "end-meeting"
    | "record"
    | "screen-share",
): boolean {
  switch (action) {
    case "mute-others":
    case "remove-participant":
      return hasRole(userRole, "co-host");
    case "assign-co-host":
    case "end-meeting":
    case "record":
      return hasRole(userRole, "host");
    case "screen-share":
      return hasRole(userRole, "presenter");
    default:
      return false;
  }
}

/**
 * Get available roles that a user can assign
 */
export function getAssignableRoles(
  assignerRole: ParticipantRole,
): ParticipantRole[] {
  const roles: ParticipantRole[] = [];
  const assignerLevel = ROLE_HIERARCHY[assignerRole];

  if (assignerLevel >= ROLE_HIERARCHY["host"]) {
    roles.push("co-host", "presenter", "participant");
  } else if (assignerLevel >= ROLE_HIERARCHY["co-host"]) {
    roles.push("presenter", "participant");
  }

  return roles;
}

// ============================================================================
// Participant Utilities
// ============================================================================

/**
 * Check if a user is the host of a meeting
 */
export function isHost(meeting: Meeting, userId: string): boolean {
  return meeting.hostId === userId;
}

/**
 * Get a participant's role in a meeting
 */
export function getParticipantRole(
  meeting: Meeting,
  userId: string,
): ParticipantRole | null {
  if (meeting.hostId === userId) {
    return "host";
  }
  const participant = meeting.participants.find((p) => p.userId === userId);
  return participant?.role ?? null;
}

/**
 * Check if a user is a participant in a meeting
 */
export function isParticipant(meeting: Meeting, userId: string): boolean {
  return (
    meeting.hostId === userId ||
    meeting.participants.some((p) => p.userId === userId)
  );
}

/**
 * Get participants grouped by status
 */
export function groupParticipantsByStatus(
  participants: MeetingParticipant[],
): Record<ParticipantStatus, MeetingParticipant[]> {
  return participants.reduce(
    (acc, p) => {
      if (!acc[p.status]) {
        acc[p.status] = [];
      }
      acc[p.status].push(p);
      return acc;
    },
    {} as Record<ParticipantStatus, MeetingParticipant[]>,
  );
}

/**
 * Get participants grouped by role
 */
export function groupParticipantsByRole(
  participants: MeetingParticipant[],
): Record<ParticipantRole, MeetingParticipant[]> {
  return participants.reduce(
    (acc, p) => {
      if (!acc[p.role]) {
        acc[p.role] = [];
      }
      acc[p.role].push(p);
      return acc;
    },
    {} as Record<ParticipantRole, MeetingParticipant[]>,
  );
}

/**
 * Sort participants by role hierarchy then by name
 */
export function sortParticipants(
  participants: MeetingParticipant[],
): MeetingParticipant[] {
  return [...participants].sort((a, b) => {
    // First sort by role (higher roles first)
    const roleComparison = ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role];
    if (roleComparison !== 0) {
      return roleComparison;
    }
    // Then sort alphabetically by name
    return (a.displayName ?? "").localeCompare(b.displayName ?? "");
  });
}

/**
 * Get response statistics for a meeting
 */
export function getResponseStats(participants: MeetingParticipant[]): {
  total: number;
  accepted: number;
  declined: number;
  tentative: number;
  pending: number;
} {
  const stats = {
    total: participants.length,
    accepted: 0,
    declined: 0,
    tentative: 0,
    pending: 0,
  };

  participants.forEach((p) => {
    switch (p.status) {
      case "accepted":
        stats.accepted++;
        break;
      case "declined":
        stats.declined++;
        break;
      case "tentative":
        stats.tentative++;
        break;
      case "invited":
        stats.pending++;
        break;
    }
  });

  return stats;
}

// ============================================================================
// Invitation Utilities
// ============================================================================

/**
 * Create participant objects from user IDs
 */
export function createParticipants(
  meetingId: string,
  userIds: string[],
  role: ParticipantRole = "participant",
): Omit<MeetingParticipant, "id" | "displayName" | "avatarUrl" | "email">[] {
  const now = new Date().toISOString();
  return userIds.map((userId) => ({
    meetingId,
    userId,
    role,
    status: "invited" as ParticipantStatus,
    invitedAt: now,
    respondedAt: null,
    joinedAt: null,
    leftAt: null,
  }));
}

/**
 * Validate invite input
 */
export function validateInviteInput(
  input: InviteParticipantsInput,
  existingParticipants: MeetingParticipant[],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.userIds?.length) {
    errors.push("At least one user must be invited");
  }

  // Check for duplicate invites
  const existingUserIds = new Set(existingParticipants.map((p) => p.userId));
  const duplicates = input.userIds.filter((id) => existingUserIds.has(id));
  if (duplicates.length > 0) {
    errors.push(`${duplicates.length} user(s) are already participants`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// RSVP Utilities
// ============================================================================

/**
 * Check if a participant can change their response
 */
export function canChangeResponse(
  participant: MeetingParticipant,
  meeting: Meeting,
): boolean {
  // Cannot change if meeting has ended
  if (meeting.status === "ended" || meeting.status === "cancelled") {
    return false;
  }
  // Cannot change if already joined
  if (participant.status === "joined") {
    return false;
  }
  return true;
}

/**
 * Get available response options for a participant
 */
export function getResponseOptions(): Array<{
  value: ParticipantStatus;
  label: string;
  icon: string;
}> {
  return [
    { value: "accepted", label: "Accept", icon: "check" },
    { value: "declined", label: "Decline", icon: "x" },
    { value: "tentative", label: "Maybe", icon: "help-circle" },
  ];
}

// ============================================================================
// Email/Notification Utilities
// ============================================================================

/**
 * Generate meeting invitation message
 */
export function generateInviteMessage(
  meeting: Meeting,
  hostName: string,
  recipientName: string,
): string {
  const startDate = new Date(meeting.scheduledStartAt);
  const endDate = new Date(meeting.scheduledEndAt);

  const dateStr = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const startTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const endTime = endDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `Hi ${recipientName},

${hostName} has invited you to a meeting.

**${meeting.title}**

**When:** ${dateStr}
**Time:** ${startTime} - ${endTime} (${meeting.timezone})

${meeting.description ? `**Details:** ${meeting.description}\n` : ""}
**Join:** ${meeting.meetingLink}

Please respond to let the organizer know if you can attend.`;
}

/**
 * Generate meeting update message
 */
export function generateUpdateMessage(
  meeting: Meeting,
  changedFields: string[],
): string {
  const changes = changedFields.map((field) => {
    switch (field) {
      case "scheduledStartAt":
      case "scheduledEndAt":
        return "Time has been changed";
      case "title":
        return "Title has been updated";
      case "description":
        return "Description has been updated";
      default:
        return `${field} has been updated`;
    }
  });

  return `The meeting "${meeting.title}" has been updated:

${changes.map((c) => `- ${c}`).join("\n")}

Please check the meeting details for the latest information.`;
}

/**
 * Generate meeting cancellation message
 */
export function generateCancellationMessage(
  meeting: Meeting,
  hostName: string,
  reason?: string,
): string {
  return `The meeting "${meeting.title}" scheduled for ${new Date(meeting.scheduledStartAt).toLocaleDateString()} has been cancelled by ${hostName}.${reason ? `\n\nReason: ${reason}` : ""}`;
}
