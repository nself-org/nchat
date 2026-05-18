/**
 * useMeetingScheduler Hook - Meeting scheduling and management hook
 *
 * Provides comprehensive meeting scheduling functionality including:
 * - Create, update, delete meetings
 * - Recurring meetings
 * - RSVP management
 * - Calendar exports
 * - Reminder configuration
 *
 * @module hooks/use-meeting-scheduler
 * @version 1.0.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import type {
  Meeting,
  CreateMeetingInput,
  UpdateMeetingInput,
  MeetingParticipant,
  MeetingStatus,
  MeetingType,
  ParticipantRole,
  ReminderTiming,
} from "@/lib/meetings/meeting-types";

// ============================================================================
// Types
// ============================================================================

export interface MeetingFilters {
  status?: MeetingStatus[];
  type?: MeetingType[];
  channelId?: string;
  hostId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CalendarLinks {
  googleCalendarUrl: string;
  outlookUrl: string;
  icsContent: string;
  icsFilename: string;
}

export interface ScheduledReminder {
  id: string;
  meetingId: string;
  timing: ReminderTiming;
  scheduledFor: string;
  sent: boolean;
}

export interface UseMeetingSchedulerOptions {
  autoLoad?: boolean;
  userId?: string;
  channelId?: string;
  limit?: number;
}

export interface UseMeetingSchedulerReturn {
  // Data
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  total: number;

  // Loading/Error states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;

  // Meeting CRUD
  createMeeting: (input: CreateMeetingInput) => Promise<Meeting | null>;
  updateMeeting: (
    meetingId: string,
    updates: UpdateMeetingInput,
  ) => Promise<Meeting | null>;
  deleteMeeting: (meetingId: string) => Promise<boolean>;
  cloneMeeting: (
    meetingId: string,
    overrides?: Partial<CreateMeetingInput>,
  ) => Promise<Meeting | null>;

  // Meeting Actions
  startMeeting: (meetingId: string) => Promise<Meeting | null>;
  endMeeting: (meetingId: string) => Promise<boolean>;
  cancelMeeting: (meetingId: string, reason?: string) => Promise<boolean>;
  rescheduleMeeting: (
    meetingId: string,
    newStartTime: string,
    newEndTime: string,
    reason?: string,
  ) => Promise<Meeting | null>;

  // Join/Leave
  joinMeeting: (
    meetingId: string,
    password?: string,
  ) => Promise<Meeting | null>;
  leaveMeeting: (meetingId: string) => Promise<boolean>;

  // RSVP
  respondToInvitation: (
    meetingId: string,
    response: "accepted" | "declined" | "tentative",
  ) => Promise<boolean>;

  // Participants
  inviteParticipants: (
    meetingId: string,
    userIds: string[],
    role?: ParticipantRole,
  ) => Promise<MeetingParticipant[] | null>;
  removeParticipant: (
    meetingId: string,
    participantUserId: string,
  ) => Promise<boolean>;
  updateParticipantRole: (
    meetingId: string,
    participantUserId: string,
    role: ParticipantRole,
  ) => Promise<boolean>;

  // Calendar
  getCalendarLinks: (meetingId: string) => Promise<CalendarLinks | null>;
  downloadICS: (meetingId: string) => Promise<void>;

  // Reminders
  scheduleReminders: (
    meetingId: string,
    timings?: ReminderTiming[],
  ) => Promise<ScheduledReminder[] | null>;
  cancelReminders: (meetingId: string) => Promise<boolean>;
  getReminders: (meetingId: string) => Promise<ScheduledReminder[] | null>;

  // Query
  fetchMeetings: (filters?: MeetingFilters) => Promise<void>;
  getMeetingById: (meetingId: string) => Promise<Meeting | null>;
  getMeetingByCode: (code: string) => Promise<Meeting | null>;
  setCurrentMeeting: (meeting: Meeting | null) => void;

  // Utility
  refreshMeetings: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMeetingScheduler(
  options: UseMeetingSchedulerOptions = {},
): UseMeetingSchedulerReturn {
  const {
    autoLoad = true,
    userId: optionUserId,
    channelId,
    limit = 50,
  } = options;
  const { user, isAuthenticated } = useAuth();

  const userId = optionUserId || user?.id;

  // State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // Fetch Meetings
  // ==========================================================================

  const fetchMeetings = useCallback(
    async (filters?: MeetingFilters) => {
      if (!isAuthenticated || !userId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("userId", userId);
        if (channelId) params.set("channelId", channelId);
        if (limit) params.set("limit", String(limit));

        if (filters?.status?.length)
          params.set("status", filters.status.join(","));
        if (filters?.type?.length) params.set("type", filters.type.join(","));
        if (filters?.channelId) params.set("channelId", filters.channelId);
        if (filters?.hostId) params.set("hostId", filters.hostId);
        if (filters?.startDate) params.set("startDate", filters.startDate);
        if (filters?.endDate) params.set("endDate", filters.endDate);

        const meetingsUrl = `/api/meetings?${params.toString()}`;
        const response = await fetch(meetingsUrl);
        const data = await response.json();

        if (data.success) {
          setMeetings(data.data.meetings || []);
          setTotal(data.data.total || 0);
        } else {
          throw new Error(data.error || "Failed to fetch meetings");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch meetings";
        setError(message);
        logger.error("Failed to fetch meetings:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, userId, channelId, limit],
  );

  // ==========================================================================
  // Create Meeting
  // ==========================================================================

  const createMeeting = useCallback(
    async (input: CreateMeetingInput): Promise<Meeting | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            hostId: userId,
            hostInfo: user
              ? {
                  displayName: user.displayName,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                }
              : undefined,
          }),
        });

        const data = await response.json();

        if (data.success && data.data?.meeting) {
          setMeetings((prev) => [data.data.meeting, ...prev]);
          setTotal((prev) => prev + 1);
          return data.data.meeting;
        }

        throw new Error(data.error || "Failed to create meeting");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create meeting";
        setError(message);
        logger.error("Failed to create meeting:", err);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [isAuthenticated, userId, user],
  );

  // ==========================================================================
  // Update Meeting
  // ==========================================================================

  const updateMeeting = useCallback(
    async (
      meetingId: string,
      updates: UpdateMeetingInput,
    ): Promise<Meeting | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...updates, userId }),
        });

        const data = await response.json();

        if (data.success && data.data?.meeting) {
          const updatedMeeting = data.data.meeting;
          setMeetings((prev) =>
            prev.map((m) => (m.id === meetingId ? updatedMeeting : m)),
          );
          if (currentMeeting?.id === meetingId) {
            setCurrentMeeting(updatedMeeting);
          }
          return updatedMeeting;
        }

        throw new Error(data.error || "Failed to update meeting");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update meeting";
        setError(message);
        logger.error("Failed to update meeting:", err);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [isAuthenticated, userId, currentMeeting],
  );

  // ==========================================================================
  // Delete Meeting
  // ==========================================================================

  const deleteMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return false;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}?userId=${userId}`,
          {
            method: "DELETE",
          },
        );

        const data = await response.json();

        if (data.success) {
          setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
          setTotal((prev) => Math.max(0, prev - 1));
          if (currentMeeting?.id === meetingId) {
            setCurrentMeeting(null);
          }
          return true;
        }

        throw new Error(data.error || "Failed to delete meeting");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete meeting";
        setError(message);
        logger.error("Failed to delete meeting:", err);
        return false;
      }
    },
    [isAuthenticated, userId, currentMeeting],
  );

  // ==========================================================================
  // Clone Meeting
  // ==========================================================================

  const cloneMeeting = useCallback(
    async (
      meetingId: string,
      overrides?: Partial<CreateMeetingInput>,
    ): Promise<Meeting | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "clone",
            userId,
            overrides,
          }),
        });

        const data = await response.json();

        if (data.success && data.data?.meeting) {
          setMeetings((prev) => [data.data.meeting, ...prev]);
          setTotal((prev) => prev + 1);
          return data.data.meeting;
        }

        throw new Error(data.error || "Failed to clone meeting");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to clone meeting";
        setError(message);
        logger.error("Failed to clone meeting:", err);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [isAuthenticated, userId],
  );

  // ==========================================================================
  // Meeting Actions
  // ==========================================================================

  const performMeetingAction = useCallback(
    async (
      meetingId: string,
      action: string,
      payload: Record<string, unknown> = {},
    ): Promise<{ success: boolean; meeting?: Meeting; error?: string }> => {
      if (!isAuthenticated || !userId) {
        return { success: false, error: "Not authenticated" };
      }

      try {
        const response = await fetch(`/api/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, userId, ...payload }),
        });

        const data = await response.json();

        if (data.success) {
          if (data.data?.meeting) {
            setMeetings((prev) =>
              prev.map((m) => (m.id === meetingId ? data.data.meeting : m)),
            );
            if (currentMeeting?.id === meetingId) {
              setCurrentMeeting(data.data.meeting);
            }
          }
          return { success: true, meeting: data.data?.meeting };
        }

        return { success: false, error: data.error || `Failed to ${action}` };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : `Failed to ${action}`;
        return { success: false, error: message };
      }
    },
    [isAuthenticated, userId, currentMeeting],
  );

  const startMeeting = useCallback(
    async (meetingId: string): Promise<Meeting | null> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "start");
      if (!result.success) setError(result.error || "Failed to start meeting");
      return result.meeting || null;
    },
    [performMeetingAction],
  );

  const endMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "end");
      if (!result.success) setError(result.error || "Failed to end meeting");
      return result.success;
    },
    [performMeetingAction],
  );

  const cancelMeeting = useCallback(
    async (meetingId: string, reason?: string): Promise<boolean> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "cancel", {
        reason,
        notifyParticipants: true,
      });
      if (!result.success) setError(result.error || "Failed to cancel meeting");
      return result.success;
    },
    [performMeetingAction],
  );

  const rescheduleMeeting = useCallback(
    async (
      meetingId: string,
      newStartTime: string,
      newEndTime: string,
      reason?: string,
    ): Promise<Meeting | null> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "reschedule", {
        newStartTime,
        newEndTime,
        reason,
        notifyParticipants: true,
      });
      if (!result.success)
        setError(result.error || "Failed to reschedule meeting");
      return result.meeting || null;
    },
    [performMeetingAction],
  );

  const joinMeeting = useCallback(
    async (meetingId: string, password?: string): Promise<Meeting | null> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "join", {
        password,
      });
      if (!result.success) setError(result.error || "Failed to join meeting");
      return result.meeting || null;
    },
    [performMeetingAction],
  );

  const leaveMeeting = useCallback(
    async (meetingId: string): Promise<boolean> => {
      setError(null);
      const result = await performMeetingAction(meetingId, "leave");
      if (!result.success) setError(result.error || "Failed to leave meeting");
      return result.success;
    },
    [performMeetingAction],
  );

  // ==========================================================================
  // RSVP
  // ==========================================================================

  const respondToInvitation = useCallback(
    async (
      meetingId: string,
      response: "accepted" | "declined" | "tentative",
    ): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return false;
      }

      setError(null);

      try {
        const apiResponse = await fetch(`/api/meetings/${meetingId}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, response }),
        });

        const data = await apiResponse.json();

        if (data.success) {
          // Refresh meeting to get updated participant status
          await fetchMeetings();
          return true;
        }

        throw new Error(data.error || "Failed to respond to invitation");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to respond to invitation";
        setError(message);
        logger.error("Failed to respond to invitation:", err);
        return false;
      }
    },
    [isAuthenticated, userId, fetchMeetings],
  );

  // ==========================================================================
  // Participants
  // ==========================================================================

  const inviteParticipants = useCallback(
    async (
      meetingId: string,
      userIds: string[],
      role: ParticipantRole = "participant",
    ): Promise<MeetingParticipant[] | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/participants`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviterId: userId, userIds, role }),
          },
        );

        const data = await response.json();

        if (data.success && data.data?.participants) {
          await fetchMeetings();
          return data.data.participants;
        }

        throw new Error(data.error || "Failed to invite participants");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to invite participants";
        setError(message);
        logger.error("Failed to invite participants:", err);
        return null;
      }
    },
    [isAuthenticated, userId, fetchMeetings],
  );

  const removeParticipant = useCallback(
    async (meetingId: string, participantUserId: string): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return false;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/participants/${participantUserId}?userId=${userId}`,
          { method: "DELETE" },
        );

        const data = await response.json();

        if (data.success) {
          await fetchMeetings();
          return true;
        }

        throw new Error(data.error || "Failed to remove participant");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to remove participant";
        setError(message);
        logger.error("Failed to remove participant:", err);
        return false;
      }
    },
    [isAuthenticated, userId, fetchMeetings],
  );

  const updateParticipantRole = useCallback(
    async (
      meetingId: string,
      participantUserId: string,
      role: ParticipantRole,
    ): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return false;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/participants/${participantUserId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, role }),
          },
        );

        const data = await response.json();

        if (data.success) {
          await fetchMeetings();
          return true;
        }

        throw new Error(data.error || "Failed to update participant role");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update participant role";
        setError(message);
        logger.error("Failed to update participant role:", err);
        return false;
      }
    },
    [isAuthenticated, userId, fetchMeetings],
  );

  // ==========================================================================
  // Calendar
  // ==========================================================================

  const getCalendarLinks = useCallback(
    async (meetingId: string): Promise<CalendarLinks | null> => {
      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/calendar?format=all`,
        );
        const data = await response.json();

        if (data.success && data.data) {
          return data.data;
        }

        throw new Error(data.error || "Failed to get calendar links");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get calendar links";
        setError(message);
        logger.error("Failed to get calendar links:", err);
        return null;
      }
    },
    [],
  );

  const downloadICS = useCallback(async (meetingId: string): Promise<void> => {
    setError(null);

    try {
      const response = await fetch(
        `/api/meetings/${meetingId}/calendar?format=ics&download=true`,
      );

      if (!response.ok) {
        throw new Error("Failed to download ICS file");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to download ICS file";
      setError(message);
      logger.error("Failed to download ICS file:", err);
    }
  }, []);

  // ==========================================================================
  // Reminders
  // ==========================================================================

  const scheduleReminders = useCallback(
    async (
      meetingId: string,
      timings?: ReminderTiming[],
    ): Promise<ScheduledReminder[] | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}/reminders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, timings }),
        });

        const data = await response.json();

        if (data.success && data.data?.reminders) {
          return data.data.reminders;
        }

        throw new Error(data.error || "Failed to schedule reminders");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to schedule reminders";
        setError(message);
        logger.error("Failed to schedule reminders:", err);
        return null;
      }
    },
    [isAuthenticated, userId],
  );

  const cancelReminders = useCallback(
    async (meetingId: string): Promise<boolean> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return false;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/reminders?userId=${userId}`,
          {
            method: "DELETE",
          },
        );

        const data = await response.json();

        if (data.success) {
          return true;
        }

        throw new Error(data.error || "Failed to cancel reminders");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to cancel reminders";
        setError(message);
        logger.error("Failed to cancel reminders:", err);
        return false;
      }
    },
    [isAuthenticated, userId],
  );

  const getReminders = useCallback(
    async (meetingId: string): Promise<ScheduledReminder[] | null> => {
      if (!isAuthenticated || !userId) {
        setError("Not authenticated");
        return null;
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/meetings/${meetingId}/reminders?userId=${userId}`,
        );
        const data = await response.json();

        if (data.success && data.data?.reminders) {
          return data.data.reminders;
        }

        throw new Error(data.error || "Failed to get reminders");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get reminders";
        setError(message);
        logger.error("Failed to get reminders:", err);
        return null;
      }
    },
    [isAuthenticated, userId],
  );

  // ==========================================================================
  // Query Helpers
  // ==========================================================================

  const getMeetingById = useCallback(
    async (meetingId: string): Promise<Meeting | null> => {
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${meetingId}`);
        const data = await response.json();

        if (data.success && data.data?.meeting) {
          return data.data.meeting;
        }

        return null;
      } catch (err) {
        logger.error("Failed to get meeting:", err);
        return null;
      }
    },
    [],
  );

  const getMeetingByCode = useCallback(
    async (code: string): Promise<Meeting | null> => {
      setError(null);

      try {
        const response = await fetch(`/api/meetings/${code}`);
        const data = await response.json();

        if (data.success && data.data?.meeting) {
          return data.data.meeting;
        }

        return null;
      } catch (err) {
        logger.error("Failed to get meeting by code:", err);
        return null;
      }
    },
    [],
  );

  const refreshMeetings = useCallback(async () => {
    await fetchMeetings();
  }, [fetchMeetings]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================================================
  // Auto-load on mount
  // ==========================================================================

  useEffect(() => {
    if (autoLoad && isAuthenticated && userId) {
      fetchMeetings();
    }
  }, [autoLoad, isAuthenticated, userId]); // Intentionally not including fetchMeetings

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Data
    meetings,
    currentMeeting,
    total,

    // Loading/Error states
    isLoading,
    isCreating,
    isUpdating,
    error,

    // Meeting CRUD
    createMeeting,
    updateMeeting,
    deleteMeeting,
    cloneMeeting,

    // Meeting Actions
    startMeeting,
    endMeeting,
    cancelMeeting,
    rescheduleMeeting,

    // Join/Leave
    joinMeeting,
    leaveMeeting,

    // RSVP
    respondToInvitation,

    // Participants
    inviteParticipants,
    removeParticipant,
    updateParticipantRole,

    // Calendar
    getCalendarLinks,
    downloadICS,

    // Reminders
    scheduleReminders,
    cancelReminders,
    getReminders,

    // Query
    fetchMeetings,
    getMeetingById,
    getMeetingByCode,
    setCurrentMeeting,

    // Utility
    refreshMeetings,
    clearError,
  };
}

export default useMeetingScheduler;
