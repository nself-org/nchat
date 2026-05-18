/**
 * Meeting Service - Core meeting management operations
 *
 * Provides CRUD operations for meetings, participant management,
 * RSVP handling, and notification scheduling.
 *
 * @module services/meetings/meeting.service
 * @version 1.0.0
 */

import { v4 as uuid } from "uuid";
import { createLogger } from "@/lib/logger";
import {
  Meeting,
  MeetingParticipant,
  MeetingSettings,
  MeetingStatus,
  MeetingType,
  ParticipantRole,
  ParticipantStatus,
  RecurrenceRule,
  CreateMeetingInput,
  UpdateMeetingInput,
  RoomType,
} from "@/lib/meetings/meeting-types";
import {
  generateMeetingCode,
  generateMeetingLink,
  DEFAULT_MEETING_SETTINGS,
  validateMeetingInput,
  generateOccurrences,
} from "@/lib/meetings";

const log = createLogger("MeetingService");

// ============================================================================
// Types
// ============================================================================

export interface CreateMeetingResult {
  success: boolean;
  meeting?: Meeting;
  error?: string;
}

export interface UpdateMeetingResult {
  success: boolean;
  meeting?: Meeting;
  changedFields?: string[];
  error?: string;
}

export interface RSVPResult {
  success: boolean;
  participant?: MeetingParticipant;
  error?: string;
}

export interface InviteResult {
  success: boolean;
  participants?: MeetingParticipant[];
  inviteLink?: string;
  error?: string;
}

export interface MeetingQueryOptions {
  userId?: string;
  channelId?: string;
  status?: MeetingStatus[];
  type?: MeetingType[];
  hostId?: string;
  dateRange?: { start: string; end: string };
  limit?: number;
  offset?: number;
}

export interface RescheduleOptions {
  newStartTime: string;
  newEndTime: string;
  notifyParticipants?: boolean;
  reason?: string;
}

export interface CancelMeetingOptions {
  reason?: string;
  notifyParticipants?: boolean;
}

// ============================================================================
// In-Memory Storage (for demo - would use database in production)
// ============================================================================

const meetingsStore = new Map<string, Meeting>();
const meetingsByCode = new Map<string, string>();

// ============================================================================
// Meeting Service Class
// ============================================================================

export class MeetingService {
  // ==========================================================================
  // Meeting CRUD
  // ==========================================================================

  /**
   * Create a new meeting
   */
  async createMeeting(
    input: CreateMeetingInput,
    hostId: string,
    hostInfo?: { displayName?: string; email?: string; avatarUrl?: string },
  ): Promise<CreateMeetingResult> {
    try {
      // Validate input
      const validation = validateMeetingInput(input);
      if (!validation.isValid) {
        const firstError = Object.values(validation.errors)[0];
        return { success: false, error: firstError };
      }

      const meetingId = uuid();
      const meetingCode = generateMeetingCode();
      const meetingLink = generateMeetingLink(meetingCode);
      const now = new Date().toISOString();

      // Calculate duration
      const start = new Date(input.scheduledStartAt);
      const end = new Date(input.scheduledEndAt);
      const duration = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );

      // Create host participant
      const hostParticipant: MeetingParticipant = {
        id: uuid(),
        meetingId,
        userId: hostId,
        role: "host",
        status: "accepted",
        invitedAt: now,
        respondedAt: now,
        joinedAt: null,
        leftAt: null,
        displayName: hostInfo?.displayName,
        avatarUrl: hostInfo?.avatarUrl,
        email: hostInfo?.email,
      };

      // Create initial participants if provided
      const participants: MeetingParticipant[] = [hostParticipant];

      if (input.participantIds?.length) {
        for (const userId of input.participantIds) {
          if (userId !== hostId) {
            participants.push({
              id: uuid(),
              meetingId,
              userId,
              role: "participant",
              status: "invited",
              invitedAt: now,
              respondedAt: null,
              joinedAt: null,
              leftAt: null,
            });
          }
        }
      }

      const meeting: Meeting = {
        id: meetingId,
        title: input.title,
        description: input.description || null,
        type: input.isRecurring ? "recurring" : "scheduled",
        status: "scheduled",
        roomType: input.roomType || "video",
        scheduledStartAt: input.scheduledStartAt,
        scheduledEndAt: input.scheduledEndAt,
        timezone: input.timezone,
        actualStartAt: null,
        actualEndAt: null,
        duration,
        isRecurring: input.isRecurring || false,
        recurrenceRule: input.recurrenceRule || null,
        parentMeetingId: null,
        hostId,
        channelId: input.channelId || null,
        isPrivate: input.isPrivate || false,
        requiresApproval: false,
        password: input.password || null,
        meetingLink,
        meetingCode,
        settings: { ...DEFAULT_MEETING_SETTINGS, ...input.settings },
        participants,
        participantCount: participants.length,
        maxParticipants: null,
        createdAt: now,
        updatedAt: now,
        createdBy: hostId,
      };

      // Store meeting
      meetingsStore.set(meetingId, meeting);
      meetingsByCode.set(meetingCode, meetingId);

      // Create recurring instances if needed
      if (meeting.isRecurring && meeting.recurrenceRule) {
        await this.createRecurringInstances(meeting);
      }

      log.info("Meeting created", { meetingId, title: input.title, hostId });

      return { success: true, meeting };
    } catch (error) {
      log.error("Failed to create meeting", { error });
      return { success: false, error: "Failed to create meeting" };
    }
  }

  /**
   * Get meeting by ID
   */
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    return meetingsStore.get(meetingId) || null;
  }

  /**
   * Get meeting by code
   */
  async getMeetingByCode(code: string): Promise<Meeting | null> {
    const normalizedCode = code.toLowerCase().replace(/[^a-z]/g, "");
    const formattedCode = `${normalizedCode.slice(0, 3)}-${normalizedCode.slice(3, 7)}-${normalizedCode.slice(7)}`;
    const meetingId = meetingsByCode.get(formattedCode);
    return meetingId ? meetingsStore.get(meetingId) || null : null;
  }

  /**
   * Query meetings with filters
   */
  async queryMeetings(
    options: MeetingQueryOptions = {},
  ): Promise<{ meetings: Meeting[]; total: number }> {
    let meetings = Array.from(meetingsStore.values());

    // Apply filters
    if (options.userId) {
      meetings = meetings.filter(
        (m) =>
          m.hostId === options.userId ||
          m.participants.some((p) => p.userId === options.userId),
      );
    }

    if (options.channelId) {
      meetings = meetings.filter((m) => m.channelId === options.channelId);
    }

    if (options.status?.length) {
      meetings = meetings.filter((m) => options.status!.includes(m.status));
    }

    if (options.type?.length) {
      meetings = meetings.filter((m) => options.type!.includes(m.type));
    }

    if (options.hostId) {
      meetings = meetings.filter((m) => m.hostId === options.hostId);
    }

    if (options.dateRange) {
      const start = new Date(options.dateRange.start);
      const end = new Date(options.dateRange.end);
      meetings = meetings.filter((m) => {
        const date = new Date(m.scheduledStartAt);
        return date >= start && date <= end;
      });
    }

    // Sort by scheduled start time
    meetings.sort(
      (a, b) =>
        new Date(a.scheduledStartAt).getTime() -
        new Date(b.scheduledStartAt).getTime(),
    );

    const total = meetings.length;

    // Apply pagination
    if (options.offset) {
      meetings = meetings.slice(options.offset);
    }
    if (options.limit) {
      meetings = meetings.slice(0, options.limit);
    }

    return { meetings, total };
  }

  /**
   * Update a meeting
   */
  async updateMeeting(
    meetingId: string,
    updates: UpdateMeetingInput,
    userId: string,
  ): Promise<UpdateMeetingResult> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Check permission
      if (meeting.hostId !== userId) {
        const participant = meeting.participants.find(
          (p) => p.userId === userId,
        );
        if (!participant || participant.role !== "co-host") {
          return { success: false, error: "Not authorized to update meeting" };
        }
      }

      // Track changed fields
      const changedFields: string[] = [];

      // Apply updates
      if (updates.title !== undefined && updates.title !== meeting.title) {
        meeting.title = updates.title;
        changedFields.push("title");
      }

      if (
        updates.description !== undefined &&
        updates.description !== meeting.description
      ) {
        meeting.description = updates.description;
        changedFields.push("description");
      }

      if (
        updates.scheduledStartAt !== undefined &&
        updates.scheduledStartAt !== meeting.scheduledStartAt
      ) {
        meeting.scheduledStartAt = updates.scheduledStartAt;
        changedFields.push("scheduledStartAt");
      }

      if (
        updates.scheduledEndAt !== undefined &&
        updates.scheduledEndAt !== meeting.scheduledEndAt
      ) {
        meeting.scheduledEndAt = updates.scheduledEndAt;
        changedFields.push("scheduledEndAt");

        // Recalculate duration
        const start = new Date(meeting.scheduledStartAt);
        const end = new Date(updates.scheduledEndAt);
        meeting.duration = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60),
        );
      }

      if (
        updates.timezone !== undefined &&
        updates.timezone !== meeting.timezone
      ) {
        meeting.timezone = updates.timezone;
        changedFields.push("timezone");
      }

      if (
        updates.isPrivate !== undefined &&
        updates.isPrivate !== meeting.isPrivate
      ) {
        meeting.isPrivate = updates.isPrivate;
        changedFields.push("isPrivate");
      }

      if (
        updates.password !== undefined &&
        updates.password !== meeting.password
      ) {
        meeting.password = updates.password;
        changedFields.push("password");
      }

      if (updates.settings) {
        meeting.settings = { ...meeting.settings, ...updates.settings };
        changedFields.push("settings");
      }

      meeting.updatedAt = new Date().toISOString();

      log.info("Meeting updated", { meetingId, changedFields });

      return { success: true, meeting, changedFields };
    } catch (error) {
      log.error("Failed to update meeting", { error, meetingId });
      return { success: false, error: "Failed to update meeting" };
    }
  }

  /**
   * Reschedule a meeting
   */
  async rescheduleMeeting(
    meetingId: string,
    options: RescheduleOptions,
    userId: string,
  ): Promise<UpdateMeetingResult> {
    const meeting = meetingsStore.get(meetingId);
    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    // Only host or co-host can reschedule
    if (meeting.hostId !== userId) {
      const participant = meeting.participants.find((p) => p.userId === userId);
      if (!participant || participant.role !== "co-host") {
        return {
          success: false,
          error: "Not authorized to reschedule meeting",
        };
      }
    }

    const oldStartTime = meeting.scheduledStartAt;
    const oldEndTime = meeting.scheduledEndAt;

    const result = await this.updateMeeting(
      meetingId,
      {
        scheduledStartAt: options.newStartTime,
        scheduledEndAt: options.newEndTime,
      },
      userId,
    );

    if (result.success && options.notifyParticipants) {
      // In production, would send notifications here
      log.info("Meeting rescheduled - would notify participants", {
        meetingId,
        oldStartTime,
        newStartTime: options.newStartTime,
        reason: options.reason,
      });
    }

    return result;
  }

  /**
   * Cancel a meeting
   */
  async cancelMeeting(
    meetingId: string,
    userId: string,
    options: CancelMeetingOptions = {},
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Only host can cancel
      if (meeting.hostId !== userId) {
        return { success: false, error: "Only host can cancel meeting" };
      }

      meeting.status = "cancelled";
      meeting.updatedAt = new Date().toISOString();

      if (options.notifyParticipants) {
        // In production, would send notifications here
        log.info("Meeting cancelled - would notify participants", {
          meetingId,
          reason: options.reason,
        });
      }

      log.info("Meeting cancelled", {
        meetingId,
        userId,
        reason: options.reason,
      });

      return { success: true };
    } catch (error) {
      log.error("Failed to cancel meeting", { error, meetingId });
      return { success: false, error: "Failed to cancel meeting" };
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(
    meetingId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Only host can delete
      if (meeting.hostId !== userId) {
        return { success: false, error: "Only host can delete meeting" };
      }

      meetingsStore.delete(meetingId);
      meetingsByCode.delete(meeting.meetingCode);

      log.info("Meeting deleted", { meetingId, userId });

      return { success: true };
    } catch (error) {
      log.error("Failed to delete meeting", { error, meetingId });
      return { success: false, error: "Failed to delete meeting" };
    }
  }

  /**
   * Clone a meeting
   */
  async cloneMeeting(
    meetingId: string,
    userId: string,
    overrides?: Partial<CreateMeetingInput>,
  ): Promise<CreateMeetingResult> {
    const meeting = meetingsStore.get(meetingId);
    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    const input: CreateMeetingInput = {
      title: overrides?.title || `${meeting.title} (Copy)`,
      description: overrides?.description || meeting.description || undefined,
      roomType: overrides?.roomType || meeting.roomType,
      scheduledStartAt: overrides?.scheduledStartAt || meeting.scheduledStartAt,
      scheduledEndAt: overrides?.scheduledEndAt || meeting.scheduledEndAt,
      timezone: overrides?.timezone || meeting.timezone,
      channelId: overrides?.channelId || meeting.channelId || undefined,
      isPrivate: overrides?.isPrivate ?? meeting.isPrivate,
      password: overrides?.password || meeting.password || undefined,
      isRecurring: overrides?.isRecurring ?? meeting.isRecurring,
      recurrenceRule:
        overrides?.recurrenceRule || meeting.recurrenceRule || undefined,
      settings: overrides?.settings || meeting.settings,
    };

    return this.createMeeting(input, userId);
  }

  // ==========================================================================
  // Participant Management
  // ==========================================================================

  /**
   * Invite participants to a meeting
   */
  async inviteParticipants(
    meetingId: string,
    userIds: string[],
    role: ParticipantRole = "participant",
    inviterId: string,
    sendEmail: boolean = true,
  ): Promise<InviteResult> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Check permission
      if (meeting.hostId !== inviterId) {
        const inviter = meeting.participants.find(
          (p) => p.userId === inviterId,
        );
        if (
          !inviter ||
          (inviter.role !== "co-host" && inviter.role !== "host")
        ) {
          return {
            success: false,
            error: "Not authorized to invite participants",
          };
        }
      }

      const now = new Date().toISOString();
      const newParticipants: MeetingParticipant[] = [];

      for (const userId of userIds) {
        // Skip if already a participant
        if (meeting.participants.some((p) => p.userId === userId)) {
          continue;
        }

        const participant: MeetingParticipant = {
          id: uuid(),
          meetingId,
          userId,
          role,
          status: "invited",
          invitedAt: now,
          respondedAt: null,
          joinedAt: null,
          leftAt: null,
        };

        meeting.participants.push(participant);
        newParticipants.push(participant);
      }

      meeting.participantCount = meeting.participants.length;
      meeting.updatedAt = now;

      if (sendEmail && newParticipants.length > 0) {
        // In production, would send email invitations here
        log.info("Would send email invitations", {
          meetingId,
          recipientCount: newParticipants.length,
        });
      }

      return {
        success: true,
        participants: newParticipants,
        inviteLink: meeting.meetingLink,
      };
    } catch (error) {
      log.error("Failed to invite participants", { error, meetingId });
      return { success: false, error: "Failed to invite participants" };
    }
  }

  /**
   * RSVP to a meeting
   */
  async rsvp(
    meetingId: string,
    userId: string,
    response: "accepted" | "declined" | "tentative",
  ): Promise<RSVPResult> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      const participant = meeting.participants.find((p) => p.userId === userId);
      if (!participant) {
        return { success: false, error: "Not a participant of this meeting" };
      }

      // Cannot change response if already joined
      if (participant.status === "joined") {
        return {
          success: false,
          error: "Cannot change response after joining",
        };
      }

      // Cannot respond to ended/cancelled meetings
      if (meeting.status === "ended" || meeting.status === "cancelled") {
        return { success: false, error: "Meeting is no longer active" };
      }

      participant.status = response;
      participant.respondedAt = new Date().toISOString();
      meeting.updatedAt = new Date().toISOString();

      log.info("RSVP recorded", { meetingId, userId, response });

      return { success: true, participant };
    } catch (error) {
      log.error("Failed to record RSVP", { error, meetingId, userId });
      return { success: false, error: "Failed to record RSVP" };
    }
  }

  /**
   * Remove a participant from a meeting
   */
  async removeParticipant(
    meetingId: string,
    participantUserId: string,
    removerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Check permission
      if (meeting.hostId !== removerId) {
        const remover = meeting.participants.find(
          (p) => p.userId === removerId,
        );
        if (!remover || remover.role !== "co-host") {
          return {
            success: false,
            error: "Not authorized to remove participants",
          };
        }
      }

      // Cannot remove the host
      if (participantUserId === meeting.hostId) {
        return { success: false, error: "Cannot remove the host" };
      }

      const index = meeting.participants.findIndex(
        (p) => p.userId === participantUserId,
      );
      if (index === -1) {
        return { success: false, error: "Participant not found" };
      }

      meeting.participants.splice(index, 1);
      meeting.participantCount = meeting.participants.length;
      meeting.updatedAt = new Date().toISOString();

      log.info("Participant removed", {
        meetingId,
        participantUserId,
        removerId,
      });

      return { success: true };
    } catch (error) {
      log.error("Failed to remove participant", { error, meetingId });
      return { success: false, error: "Failed to remove participant" };
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    meetingId: string,
    participantUserId: string,
    newRole: ParticipantRole,
    updaterId: string,
  ): Promise<RSVPResult> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Only host can change roles
      if (meeting.hostId !== updaterId) {
        return {
          success: false,
          error: "Only host can change participant roles",
        };
      }

      // Cannot change host role
      if (participantUserId === meeting.hostId) {
        return { success: false, error: "Cannot change host role" };
      }

      const participant = meeting.participants.find(
        (p) => p.userId === participantUserId,
      );
      if (!participant) {
        return { success: false, error: "Participant not found" };
      }

      participant.role = newRole;
      meeting.updatedAt = new Date().toISOString();

      log.info("Participant role updated", {
        meetingId,
        participantUserId,
        newRole,
      });

      return { success: true, participant };
    } catch (error) {
      log.error("Failed to update participant role", { error, meetingId });
      return { success: false, error: "Failed to update participant role" };
    }
  }

  // ==========================================================================
  // Meeting State Management
  // ==========================================================================

  /**
   * Start a meeting
   */
  async startMeeting(
    meetingId: string,
    userId: string,
  ): Promise<{ success: boolean; meeting?: Meeting; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Only host or co-host can start
      if (meeting.hostId !== userId) {
        const participant = meeting.participants.find(
          (p) => p.userId === userId,
        );
        if (
          !participant ||
          (participant.role !== "co-host" && participant.role !== "host")
        ) {
          return { success: false, error: "Not authorized to start meeting" };
        }
      }

      if (meeting.status === "live") {
        return { success: false, error: "Meeting is already live" };
      }

      if (meeting.status === "ended" || meeting.status === "cancelled") {
        return {
          success: false,
          error: "Cannot start ended or cancelled meeting",
        };
      }

      meeting.status = "live";
      meeting.actualStartAt = new Date().toISOString();
      meeting.updatedAt = new Date().toISOString();

      log.info("Meeting started", { meetingId, userId });

      return { success: true, meeting };
    } catch (error) {
      log.error("Failed to start meeting", { error, meetingId });
      return { success: false, error: "Failed to start meeting" };
    }
  }

  /**
   * End a meeting
   */
  async endMeeting(
    meetingId: string,
    userId: string,
  ): Promise<{ success: boolean; meeting?: Meeting; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Only host can end
      if (meeting.hostId !== userId) {
        return { success: false, error: "Only host can end meeting" };
      }

      meeting.status = "ended";
      meeting.actualEndAt = new Date().toISOString();
      meeting.updatedAt = new Date().toISOString();

      // Update all joined participants to left
      for (const participant of meeting.participants) {
        if (participant.status === "joined") {
          participant.status = "left";
          participant.leftAt = meeting.actualEndAt;
        }
      }

      log.info("Meeting ended", { meetingId, userId });

      return { success: true, meeting };
    } catch (error) {
      log.error("Failed to end meeting", { error, meetingId });
      return { success: false, error: "Failed to end meeting" };
    }
  }

  /**
   * Join a meeting
   */
  async joinMeeting(
    meetingId: string,
    userId: string,
    password?: string,
  ): Promise<{ success: boolean; meeting?: Meeting; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      // Check password if required
      if (meeting.password && meeting.password !== password) {
        return { success: false, error: "Invalid password" };
      }

      // Check if meeting is joinable
      if (meeting.status === "cancelled") {
        return { success: false, error: "Meeting has been cancelled" };
      }

      if (meeting.status === "ended") {
        return { success: false, error: "Meeting has ended" };
      }

      // Check capacity
      if (meeting.maxParticipants) {
        const activeCount = meeting.participants.filter(
          (p) => p.status === "joined",
        ).length;
        if (activeCount >= meeting.maxParticipants) {
          return { success: false, error: "Meeting is at capacity" };
        }
      }

      let participant = meeting.participants.find((p) => p.userId === userId);

      if (!participant) {
        // Add as guest participant if allowed
        if (!meeting.settings.allowGuests && meeting.settings.requiresSignIn) {
          return {
            success: false,
            error: "Only invited participants can join",
          };
        }

        participant = {
          id: uuid(),
          meetingId,
          userId,
          role: "participant",
          status: "joined",
          invitedAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          leftAt: null,
        };
        meeting.participants.push(participant);
        meeting.participantCount = meeting.participants.length;
      } else {
        participant.status = "joined";
        participant.joinedAt = new Date().toISOString();
      }

      meeting.updatedAt = new Date().toISOString();

      log.info("User joined meeting", { meetingId, userId });

      return { success: true, meeting };
    } catch (error) {
      log.error("Failed to join meeting", { error, meetingId, userId });
      return { success: false, error: "Failed to join meeting" };
    }
  }

  /**
   * Leave a meeting
   */
  async leaveMeeting(
    meetingId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const meeting = meetingsStore.get(meetingId);
      if (!meeting) {
        return { success: false, error: "Meeting not found" };
      }

      const participant = meeting.participants.find((p) => p.userId === userId);
      if (!participant) {
        return { success: false, error: "Not a participant" };
      }

      participant.status = "left";
      participant.leftAt = new Date().toISOString();
      meeting.updatedAt = new Date().toISOString();

      log.info("User left meeting", { meetingId, userId });

      return { success: true };
    } catch (error) {
      log.error("Failed to leave meeting", { error, meetingId, userId });
      return { success: false, error: "Failed to leave meeting" };
    }
  }

  // ==========================================================================
  // Recurring Meetings
  // ==========================================================================

  /**
   * Create instances of a recurring meeting
   */
  private async createRecurringInstances(
    parentMeeting: Meeting,
  ): Promise<void> {
    if (!parentMeeting.recurrenceRule) {
      return;
    }

    const occurrences = generateOccurrences(
      new Date(parentMeeting.scheduledStartAt),
      parentMeeting.recurrenceRule,
      10, // Generate next 10 occurrences
    );

    // Skip the first occurrence (it's the parent meeting)
    for (let i = 1; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const duration = parentMeeting.duration;
      const endTime = new Date(occurrence.getTime() + duration * 60 * 1000);

      const instanceId = uuid();
      const instanceCode = generateMeetingCode();

      const instance: Meeting = {
        ...parentMeeting,
        id: instanceId,
        meetingCode: instanceCode,
        meetingLink: generateMeetingLink(instanceCode),
        type: "recurring",
        scheduledStartAt: occurrence.toISOString(),
        scheduledEndAt: endTime.toISOString(),
        parentMeetingId: parentMeeting.id,
        participants: parentMeeting.participants.map((p) => ({
          ...p,
          id: uuid(),
          meetingId: instanceId,
          status: p.role === "host" ? "accepted" : "invited",
          joinedAt: null,
          leftAt: null,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      meetingsStore.set(instanceId, instance);
      meetingsByCode.set(instanceCode, instanceId);
    }

    log.info("Created recurring meeting instances", {
      parentMeetingId: parentMeeting.id,
      instanceCount: occurrences.length - 1,
    });
  }

  /**
   * Get all instances of a recurring meeting
   */
  async getRecurringInstances(parentMeetingId: string): Promise<Meeting[]> {
    const instances = Array.from(meetingsStore.values()).filter(
      (m) => m.parentMeetingId === parentMeetingId,
    );

    return instances.sort(
      (a, b) =>
        new Date(a.scheduledStartAt).getTime() -
        new Date(b.scheduledStartAt).getTime(),
    );
  }

  // ==========================================================================
  // Webcast/Event Mode
  // ==========================================================================

  /**
   * Create a public event (webcast)
   */
  async createEvent(
    input: CreateMeetingInput & {
      registrationRequired?: boolean;
      maxCapacity?: number;
    },
    hostId: string,
  ): Promise<CreateMeetingResult> {
    const result = await this.createMeeting(
      {
        ...input,
        settings: {
          ...input.settings,
          waitingRoom: true,
          allowGuests: true,
          requiresSignIn: !input.registrationRequired,
        },
      },
      hostId,
    );

    if (result.success && result.meeting) {
      result.meeting.maxParticipants = input.maxCapacity || null;
      result.meeting.requiresApproval = input.registrationRequired || false;
    }

    return result;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get upcoming meetings for a user
   */
  async getUpcomingMeetings(
    userId: string,
    limit: number = 10,
  ): Promise<Meeting[]> {
    const now = new Date().toISOString();
    const result = await this.queryMeetings({
      userId,
      status: ["scheduled", "live"],
      limit,
    });

    return result.meetings.filter((m) => m.scheduledStartAt >= now);
  }

  /**
   * Get meeting statistics
   */
  async getMeetingStats(meetingId: string): Promise<{
    totalInvited: number;
    accepted: number;
    declined: number;
    tentative: number;
    pending: number;
    joined: number;
  }> {
    const meeting = meetingsStore.get(meetingId);
    if (!meeting) {
      return {
        totalInvited: 0,
        accepted: 0,
        declined: 0,
        tentative: 0,
        pending: 0,
        joined: 0,
      };
    }

    const stats = {
      totalInvited: meeting.participants.length,
      accepted: 0,
      declined: 0,
      tentative: 0,
      pending: 0,
      joined: 0,
    };

    for (const p of meeting.participants) {
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
        case "joined":
          stats.joined++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clear all meetings (for testing)
   */
  clearAll(): void {
    meetingsStore.clear();
    meetingsByCode.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let meetingServiceInstance: MeetingService | null = null;

export function getMeetingService(): MeetingService {
  if (!meetingServiceInstance) {
    meetingServiceInstance = new MeetingService();
  }
  return meetingServiceInstance;
}

export function resetMeetingService(): void {
  if (meetingServiceInstance) {
    meetingServiceInstance.clearAll();
  }
  meetingServiceInstance = null;
}

export default MeetingService;
