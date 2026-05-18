/**
 * Meeting Service Tests
 *
 * Comprehensive tests for the meeting service functionality.
 */

import {
  MeetingService,
  getMeetingService,
  resetMeetingService,
} from "../meeting.service";
import type {
  CreateMeetingInput,
  ParticipantRole,
} from "@/lib/meetings/meeting-types";

// ============================================================================
// Test Setup
// ============================================================================

describe("MeetingService", () => {
  let service: MeetingService;

  const mockHostId = "host-user-123";
  const mockHostInfo = {
    displayName: "Test Host",
    email: "host@test.com",
    avatarUrl: "https://example.com/avatar.png",
  };

  const createValidInput = (
    overrides: Partial<CreateMeetingInput> = {},
  ): CreateMeetingInput => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      title: "Test Meeting",
      description: "A test meeting description",
      roomType: "video",
      scheduledStartAt: startTime.toISOString(),
      scheduledEndAt: endTime.toISOString(),
      timezone: "America/New_York",
      isPrivate: false,
      ...overrides,
    };
  };

  beforeEach(() => {
    resetMeetingService();
    service = getMeetingService();
  });

  // ==========================================================================
  // Meeting Creation Tests
  // ==========================================================================

  describe("createMeeting", () => {
    it("should create a meeting with valid input", async () => {
      const input = createValidInput();
      const result = await service.createMeeting(
        input,
        mockHostId,
        mockHostInfo,
      );

      expect(result.success).toBe(true);
      expect(result.meeting).toBeDefined();
      expect(result.meeting?.title).toBe("Test Meeting");
      expect(result.meeting?.hostId).toBe(mockHostId);
      expect(result.meeting?.status).toBe("scheduled");
    });

    it("should generate unique meeting code", async () => {
      const input = createValidInput();
      const result1 = await service.createMeeting(input, mockHostId);
      const result2 = await service.createMeeting(input, mockHostId);

      expect(result1.meeting?.meetingCode).not.toBe(
        result2.meeting?.meetingCode,
      );
    });

    it("should include host as first participant", async () => {
      const input = createValidInput();
      const result = await service.createMeeting(
        input,
        mockHostId,
        mockHostInfo,
      );

      expect(result.meeting?.participants.length).toBeGreaterThan(0);
      expect(result.meeting?.participants[0].userId).toBe(mockHostId);
      expect(result.meeting?.participants[0].role).toBe("host");
      expect(result.meeting?.participants[0].status).toBe("accepted");
    });

    it("should fail with missing title", async () => {
      const input = createValidInput({ title: "" });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Title");
    });

    it("should fail with past start time", async () => {
      const pastTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const input = createValidInput({
        scheduledStartAt: pastTime.toISOString(),
        scheduledEndAt: new Date(
          pastTime.getTime() + 60 * 60 * 1000,
        ).toISOString(),
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(false);
    });

    it("should fail when end time is before start time", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const input = createValidInput({
        scheduledStartAt: startTime.toISOString(),
        scheduledEndAt: new Date(
          startTime.getTime() - 30 * 60 * 1000,
        ).toISOString(),
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(false);
    });

    it("should create meeting with password", async () => {
      const input = createValidInput({
        password: "secret123",
        isPrivate: true,
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(true);
      expect(result.meeting?.password).toBe("secret123");
      expect(result.meeting?.isPrivate).toBe(true);
    });

    it("should create recurring meeting", async () => {
      const input = createValidInput({
        isRecurring: true,
        recurrenceRule: {
          pattern: "weekly",
          interval: 1,
        },
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(true);
      expect(result.meeting?.isRecurring).toBe(true);
      expect(result.meeting?.recurrenceRule?.pattern).toBe("weekly");
    });

    it("should create meeting with initial participants", async () => {
      const input = createValidInput({
        participantIds: ["user-1", "user-2", "user-3"],
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(true);
      // Host + 3 participants
      expect(result.meeting?.participants.length).toBe(4);
    });

    it("should not duplicate host in participants", async () => {
      const input = createValidInput({
        participantIds: [mockHostId, "user-1", "user-2"],
      });
      const result = await service.createMeeting(input, mockHostId);

      expect(result.success).toBe(true);
      const hostParticipants = result.meeting?.participants.filter(
        (p) => p.userId === mockHostId,
      );
      expect(hostParticipants?.length).toBe(1);
    });
  });

  // ==========================================================================
  // Meeting Retrieval Tests
  // ==========================================================================

  describe("getMeeting", () => {
    it("should retrieve meeting by ID", async () => {
      const createResult = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      const meetingId = createResult.meeting!.id;

      const meeting = await service.getMeeting(meetingId);

      expect(meeting).toBeDefined();
      expect(meeting?.id).toBe(meetingId);
    });

    it("should return null for non-existent meeting", async () => {
      const meeting = await service.getMeeting("non-existent-id");

      expect(meeting).toBeNull();
    });
  });

  describe("getMeetingByCode", () => {
    it("should retrieve meeting by code", async () => {
      const createResult = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      const meetingCode = createResult.meeting!.meetingCode;

      const meeting = await service.getMeetingByCode(meetingCode);

      expect(meeting).toBeDefined();
      expect(meeting?.meetingCode).toBe(meetingCode);
    });

    it("should handle code without hyphens", async () => {
      const createResult = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      const meetingCode = createResult.meeting!.meetingCode;
      const codeWithoutHyphens = meetingCode.replace(/-/g, "");

      const meeting = await service.getMeetingByCode(codeWithoutHyphens);

      expect(meeting).toBeDefined();
    });
  });

  describe("queryMeetings", () => {
    beforeEach(async () => {
      // Create multiple meetings
      await service.createMeeting(
        createValidInput({ title: "Meeting 1" }),
        "user-1",
      );
      await service.createMeeting(
        createValidInput({ title: "Meeting 2" }),
        "user-2",
      );
      await service.createMeeting(
        createValidInput({ title: "Meeting 3", channelId: "channel-1" }),
        mockHostId,
      );
    });

    it("should return all meetings without filters", async () => {
      const result = await service.queryMeetings();

      expect(result.meetings.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it("should filter by host ID", async () => {
      const result = await service.queryMeetings({ hostId: mockHostId });

      expect(result.meetings.length).toBe(1);
      expect(result.meetings[0].hostId).toBe(mockHostId);
    });

    it("should filter by channel ID", async () => {
      const result = await service.queryMeetings({ channelId: "channel-1" });

      expect(result.meetings.length).toBe(1);
      expect(result.meetings[0].channelId).toBe("channel-1");
    });

    it("should apply pagination", async () => {
      const result = await service.queryMeetings({ limit: 2, offset: 1 });

      expect(result.meetings.length).toBe(2);
      expect(result.total).toBe(3);
    });
  });

  // ==========================================================================
  // Meeting Update Tests
  // ==========================================================================

  describe("updateMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should update meeting title", async () => {
      const result = await service.updateMeeting(
        meetingId,
        { title: "Updated Title" },
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.meeting?.title).toBe("Updated Title");
      expect(result.changedFields).toContain("title");
    });

    it("should update meeting description", async () => {
      const result = await service.updateMeeting(
        meetingId,
        { description: "New description" },
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.meeting?.description).toBe("New description");
    });

    it("should fail for non-existent meeting", async () => {
      const result = await service.updateMeeting(
        "non-existent-id",
        { title: "Updated" },
        mockHostId,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail for unauthorized user", async () => {
      const result = await service.updateMeeting(
        meetingId,
        { title: "Updated" },
        "other-user-id",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("authorized");
    });
  });

  // ==========================================================================
  // Meeting Actions Tests
  // ==========================================================================

  describe("rescheduleMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should reschedule meeting", async () => {
      const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const newEnd = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

      const result = await service.rescheduleMeeting(
        meetingId,
        { newStartTime: newStart, newEndTime: newEnd },
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.meeting?.scheduledStartAt).toBe(newStart);
      expect(result.meeting?.scheduledEndAt).toBe(newEnd);
    });
  });

  describe("cancelMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should cancel meeting", async () => {
      const result = await service.cancelMeeting(meetingId, mockHostId, {
        reason: "Test cancellation",
      });

      expect(result.success).toBe(true);

      const meeting = await service.getMeeting(meetingId);
      expect(meeting?.status).toBe("cancelled");
    });

    it("should fail for non-host user", async () => {
      const result = await service.cancelMeeting(meetingId, "other-user");

      expect(result.success).toBe(false);
    });
  });

  describe("deleteMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should delete meeting", async () => {
      const result = await service.deleteMeeting(meetingId, mockHostId);

      expect(result.success).toBe(true);

      const meeting = await service.getMeeting(meetingId);
      expect(meeting).toBeNull();
    });
  });

  describe("cloneMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should clone meeting with new ID", async () => {
      const result = await service.cloneMeeting(meetingId, mockHostId);

      expect(result.success).toBe(true);
      expect(result.meeting?.id).not.toBe(meetingId);
      expect(result.meeting?.title).toContain("(Copy)");
    });

    it("should clone with overrides", async () => {
      const result = await service.cloneMeeting(meetingId, mockHostId, {
        title: "Cloned Meeting",
      });

      expect(result.success).toBe(true);
      expect(result.meeting?.title).toBe("Cloned Meeting");
    });
  });

  // ==========================================================================
  // Participant Management Tests
  // ==========================================================================

  describe("inviteParticipants", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should invite participants", async () => {
      const result = await service.inviteParticipants(
        meetingId,
        ["user-1", "user-2"],
        "participant",
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.participants?.length).toBe(2);
    });

    it("should set correct role", async () => {
      const result = await service.inviteParticipants(
        meetingId,
        ["user-1"],
        "co-host",
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.participants?.[0].role).toBe("co-host");
    });

    it("should not duplicate existing participants", async () => {
      await service.inviteParticipants(
        meetingId,
        ["user-1"],
        "participant",
        mockHostId,
      );
      const result = await service.inviteParticipants(
        meetingId,
        ["user-1", "user-2"],
        "participant",
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.participants?.length).toBe(1); // Only user-2 is new
    });
  });

  describe("rsvp", () => {
    let meetingId: string;
    const participantId = "participant-user-1";

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        [participantId],
        "participant",
        mockHostId,
      );
    });

    it("should accept invitation", async () => {
      const result = await service.rsvp(meetingId, participantId, "accepted");

      expect(result.success).toBe(true);
      expect(result.participant?.status).toBe("accepted");
    });

    it("should decline invitation", async () => {
      const result = await service.rsvp(meetingId, participantId, "declined");

      expect(result.success).toBe(true);
      expect(result.participant?.status).toBe("declined");
    });

    it("should set tentative status", async () => {
      const result = await service.rsvp(meetingId, participantId, "tentative");

      expect(result.success).toBe(true);
      expect(result.participant?.status).toBe("tentative");
    });

    it("should fail for non-participant", async () => {
      const result = await service.rsvp(meetingId, "random-user", "accepted");

      expect(result.success).toBe(false);
    });
  });

  describe("removeParticipant", () => {
    let meetingId: string;
    const participantId = "participant-user-1";

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        [participantId],
        "participant",
        mockHostId,
      );
    });

    it("should remove participant", async () => {
      const result = await service.removeParticipant(
        meetingId,
        participantId,
        mockHostId,
      );

      expect(result.success).toBe(true);

      const meeting = await service.getMeeting(meetingId);
      const participant = meeting?.participants.find(
        (p) => p.userId === participantId,
      );
      expect(participant).toBeUndefined();
    });

    it("should not allow removing host", async () => {
      const result = await service.removeParticipant(
        meetingId,
        mockHostId,
        mockHostId,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("updateParticipantRole", () => {
    let meetingId: string;
    const participantId = "participant-user-1";

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        [participantId],
        "participant",
        mockHostId,
      );
    });

    it("should update participant role", async () => {
      const result = await service.updateParticipantRole(
        meetingId,
        participantId,
        "co-host",
        mockHostId,
      );

      expect(result.success).toBe(true);
      expect(result.participant?.role).toBe("co-host");
    });
  });

  // ==========================================================================
  // Meeting State Management Tests
  // ==========================================================================

  describe("startMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
    });

    it("should start meeting", async () => {
      const result = await service.startMeeting(meetingId, mockHostId);

      expect(result.success).toBe(true);
      expect(result.meeting?.status).toBe("live");
      expect(result.meeting?.actualStartAt).toBeDefined();
    });

    it("should fail for already live meeting", async () => {
      await service.startMeeting(meetingId, mockHostId);
      const result = await service.startMeeting(meetingId, mockHostId);

      expect(result.success).toBe(false);
    });
  });

  describe("endMeeting", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.startMeeting(meetingId, mockHostId);
    });

    it("should end meeting", async () => {
      const result = await service.endMeeting(meetingId, mockHostId);

      expect(result.success).toBe(true);
      expect(result.meeting?.status).toBe("ended");
      expect(result.meeting?.actualEndAt).toBeDefined();
    });
  });

  describe("joinMeeting", () => {
    let meetingId: string;
    const participantId = "participant-user-1";

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        [participantId],
        "participant",
        mockHostId,
      );
    });

    it("should join meeting", async () => {
      const result = await service.joinMeeting(meetingId, participantId);

      expect(result.success).toBe(true);
    });

    it("should fail with wrong password", async () => {
      // Create meeting with password
      const pwdResult = await service.createMeeting(
        createValidInput({ password: "secret123", isPrivate: true }),
        mockHostId,
      );
      const pwdMeetingId = pwdResult.meeting!.id;

      const result = await service.joinMeeting(
        pwdMeetingId,
        participantId,
        "wrongpassword",
      );

      expect(result.success).toBe(false);
    });

    it("should join with correct password", async () => {
      const pwdResult = await service.createMeeting(
        createValidInput({ password: "secret123", isPrivate: true }),
        mockHostId,
      );
      const pwdMeetingId = pwdResult.meeting!.id;
      await service.inviteParticipants(
        pwdMeetingId,
        [participantId],
        "participant",
        mockHostId,
      );

      const result = await service.joinMeeting(
        pwdMeetingId,
        participantId,
        "secret123",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("leaveMeeting", () => {
    let meetingId: string;
    const participantId = "participant-user-1";

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        [participantId],
        "participant",
        mockHostId,
      );
      await service.joinMeeting(meetingId, participantId);
    });

    it("should leave meeting", async () => {
      const result = await service.leaveMeeting(meetingId, participantId);

      expect(result.success).toBe(true);

      const meeting = await service.getMeeting(meetingId);
      const participant = meeting?.participants.find(
        (p) => p.userId === participantId,
      );
      expect(participant?.status).toBe("left");
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("getUpcomingMeetings", () => {
    beforeEach(async () => {
      // Create multiple meetings
      await service.createMeeting(
        createValidInput({ title: "Future 1" }),
        mockHostId,
      );
      await service.createMeeting(
        createValidInput({ title: "Future 2" }),
        mockHostId,
      );
    });

    it("should return upcoming meetings", async () => {
      const meetings = await service.getUpcomingMeetings(mockHostId);

      expect(meetings.length).toBeGreaterThan(0);
      meetings.forEach((m) => {
        expect(new Date(m.scheduledStartAt).getTime()).toBeGreaterThan(
          Date.now(),
        );
      });
    });
  });

  describe("getMeetingStats", () => {
    let meetingId: string;

    beforeEach(async () => {
      const result = await service.createMeeting(
        createValidInput(),
        mockHostId,
      );
      meetingId = result.meeting!.id;
      await service.inviteParticipants(
        meetingId,
        ["user-1", "user-2", "user-3"],
        "participant",
        mockHostId,
      );
      await service.rsvp(meetingId, "user-1", "accepted");
      await service.rsvp(meetingId, "user-2", "declined");
    });

    it("should return correct stats", async () => {
      const stats = await service.getMeetingStats(meetingId);

      expect(stats.totalInvited).toBe(4); // host + 3 participants
      expect(stats.accepted).toBe(2); // host is auto-accepted + user-1
      expect(stats.declined).toBe(1);
      expect(stats.pending).toBe(1);
    });
  });
});
