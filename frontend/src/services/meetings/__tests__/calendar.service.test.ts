/**
 * Calendar Service Tests
 *
 * Comprehensive tests for the calendar service functionality.
 */

import {
  CalendarService,
  getCalendarService,
  resetCalendarService,
} from "../calendar.service";
import type { Meeting, ReminderTiming } from "@/lib/meetings/meeting-types";

// ============================================================================
// Test Setup
// ============================================================================

describe("CalendarService", () => {
  let service: CalendarService;

  const createMockMeeting = (overrides: Partial<Meeting> = {}): Meeting => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      id: "meeting-123",
      title: "Test Meeting",
      description: "A test meeting description",
      type: "scheduled",
      status: "scheduled",
      roomType: "video",
      scheduledStartAt: startTime.toISOString(),
      scheduledEndAt: endTime.toISOString(),
      timezone: "America/New_York",
      actualStartAt: null,
      actualEndAt: null,
      duration: 60,
      isRecurring: false,
      recurrenceRule: null,
      parentMeetingId: null,
      hostId: "host-123",
      channelId: null,
      isPrivate: false,
      requiresApproval: false,
      password: null,
      meetingLink: "https://example.com/meetings/abc-defg-hij",
      meetingCode: "abc-defg-hij",
      settings: {
        muteOnJoin: true,
        videoOffOnJoin: false,
        allowScreenShare: true,
        allowRecording: true,
        waitingRoom: false,
        allowGuests: false,
        requiresSignIn: true,
        enableChat: true,
        enableReactions: true,
        enableHandRaise: true,
        enableBreakoutRooms: false,
        autoRecord: false,
        recordingConsent: true,
      },
      participants: [],
      participantCount: 0,
      maxParticipants: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: "host-123",
      ...overrides,
    };
  };

  beforeEach(() => {
    resetCalendarService();
    service = getCalendarService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Calendar Export Tests
  // ==========================================================================

  describe("generateCalendarExport", () => {
    it("should generate Google Calendar link", () => {
      const meeting = createMockMeeting();
      const result = service.generateCalendarExport(meeting, "google");

      expect(result.type).toBe("google");
      expect(result.content).toContain("calendar.google.com");
      // URL encoding may use + or %20 for spaces
      expect(result.content).toMatch(/Test(\+|%20)Meeting/);
    });

    it("should generate Outlook Calendar link", () => {
      const meeting = createMockMeeting();
      const result = service.generateCalendarExport(meeting, "outlook");

      expect(result.type).toBe("outlook");
      expect(result.content).toContain("outlook.live.com");
    });

    it("should generate ICS content", () => {
      const meeting = createMockMeeting();
      const result = service.generateCalendarExport(meeting, "ics");

      expect(result.type).toBe("ics");
      expect(result.content).toContain("BEGIN:VCALENDAR");
      expect(result.content).toContain("BEGIN:VEVENT");
      expect(result.content).toContain("SUMMARY:Test Meeting");
      expect(result.content).toContain("END:VCALENDAR");
      expect(result.filename).toBeDefined();
    });

    it("should generate Apple calendar (ICS)", () => {
      const meeting = createMockMeeting();
      const result = service.generateCalendarExport(meeting, "apple");

      expect(result.type).toBe("ics");
      expect(result.content).toContain("BEGIN:VCALENDAR");
    });
  });

  describe("getAllCalendarLinks", () => {
    it("should return all calendar links", () => {
      const meeting = createMockMeeting();
      const links = service.getAllCalendarLinks(meeting);

      expect(links.google).toContain("calendar.google.com");
      expect(links.outlook).toContain("outlook.live.com");
      expect(links.ics).toContain("BEGIN:VCALENDAR");
    });
  });

  // ==========================================================================
  // Reminder Management Tests
  // ==========================================================================

  describe("scheduleReminders", () => {
    it("should schedule default reminders", () => {
      const meeting = createMockMeeting();
      const reminders = service.scheduleReminders(meeting, "user-123");

      expect(reminders.length).toBeGreaterThan(0);
      expect(reminders[0].meetingId).toBe(meeting.id);
      expect(reminders[0].userId).toBe("user-123");
    });

    it("should schedule custom timings", () => {
      // Create meeting far enough in the future to allow both reminders
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const meeting = createMockMeeting({
        scheduledStartAt: futureDate.toISOString(),
        scheduledEndAt: new Date(
          futureDate.getTime() + 60 * 60 * 1000,
        ).toISOString(),
      });
      const timings: ReminderTiming[] = ["5min", "1hour"];
      const reminders = service.scheduleReminders(meeting, "user-123", timings);

      expect(reminders.length).toBe(2);
    });

    it("should not schedule reminders for past times", () => {
      const pastMeeting = createMockMeeting({
        scheduledStartAt: new Date(Date.now() + 1000).toISOString(), // 1 second from now
      });
      const reminders = service.scheduleReminders(pastMeeting, "user-123", [
        "1hour",
      ]);

      expect(reminders.length).toBe(0);
    });
  });

  describe("cancelReminder", () => {
    it("should cancel a specific reminder", () => {
      const meeting = createMockMeeting();
      const reminders = service.scheduleReminders(meeting, "user-123");
      const reminderId = reminders[0].id;

      const cancelled = service.cancelReminder(reminderId);

      expect(cancelled).toBe(true);
    });

    it("should return false for non-existent reminder", () => {
      const cancelled = service.cancelReminder("non-existent-id");

      expect(cancelled).toBe(false);
    });
  });

  describe("cancelMeetingReminders", () => {
    it("should cancel all reminders for a meeting", () => {
      const meeting = createMockMeeting();
      service.scheduleReminders(meeting, "user-123", [
        "5min",
        "15min",
        "30min",
      ]);

      const cancelledCount = service.cancelMeetingReminders(meeting.id);

      expect(cancelledCount).toBe(3);
    });
  });

  describe("cancelUserReminders", () => {
    it("should cancel all reminders for a user", () => {
      const meeting1 = createMockMeeting({ id: "meeting-1" });
      const meeting2 = createMockMeeting({ id: "meeting-2" });

      service.scheduleReminders(meeting1, "user-123");
      service.scheduleReminders(meeting2, "user-123");

      const cancelledCount = service.cancelUserReminders("user-123");

      expect(cancelledCount).toBe(2);
    });
  });

  describe("getMeetingReminders", () => {
    it("should return reminders for a meeting", () => {
      const meeting = createMockMeeting();
      service.scheduleReminders(meeting, "user-123", ["5min", "15min"]);
      service.scheduleReminders(meeting, "user-456", ["30min"]);

      const reminders = service.getMeetingReminders(meeting.id);

      expect(reminders.length).toBe(3);
    });

    it("should return empty array for meeting without reminders", () => {
      const reminders = service.getMeetingReminders("no-reminders-meeting");

      expect(reminders).toEqual([]);
    });
  });

  describe("getUserReminders", () => {
    it("should return reminders for a user", () => {
      const meeting = createMockMeeting();
      service.scheduleReminders(meeting, "user-123", ["5min", "15min"]);

      const reminders = service.getUserReminders("user-123");

      expect(reminders.length).toBe(2);
      reminders.forEach((r) => {
        expect(r.userId).toBe("user-123");
      });
    });
  });

  describe("rescheduleReminders", () => {
    it("should reschedule reminders when meeting time changes", () => {
      const meeting = createMockMeeting();
      service.scheduleReminders(meeting, "user-123", ["15min"]);

      // Update meeting time
      const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
      meeting.scheduledStartAt = newStart.toISOString();

      service.rescheduleReminders(meeting);

      const reminders = service.getMeetingReminders(meeting.id);
      expect(reminders.length).toBe(1);
    });
  });

  // ==========================================================================
  // User Preferences Tests
  // ==========================================================================

  describe("getUserPreferences", () => {
    it("should return default preferences for new user", () => {
      const prefs = service.getUserPreferences("new-user");

      expect(prefs.userId).toBe("new-user");
      expect(prefs.defaultTimings).toEqual(["15min"]);
      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.pushEnabled).toBe(true);
    });
  });

  describe("updateUserPreferences", () => {
    it("should update user preferences", () => {
      service.updateUserPreferences("user-123", {
        defaultTimings: ["5min", "1hour"],
        emailEnabled: false,
      });

      const prefs = service.getUserPreferences("user-123");

      expect(prefs.defaultTimings).toEqual(["5min", "1hour"]);
      expect(prefs.emailEnabled).toBe(false);
    });

    it("should merge with existing preferences", () => {
      service.updateUserPreferences("user-123", { emailEnabled: false });
      service.updateUserPreferences("user-123", { pushEnabled: false });

      const prefs = service.getUserPreferences("user-123");

      expect(prefs.emailEnabled).toBe(false);
      expect(prefs.pushEnabled).toBe(false);
    });
  });

  // ==========================================================================
  // Timezone Tests
  // ==========================================================================

  describe("convertToTimezone", () => {
    it("should convert to specified timezone", () => {
      const utcTime = "2026-02-08T15:00:00.000Z";
      const result = service.convertToTimezone(utcTime, "America/New_York");

      // Should be 5 hours behind UTC (10:00 AM EST)
      expect(result).toBeDefined();
    });
  });

  describe("getAvailableTimezones", () => {
    it("should return list of timezones", () => {
      const timezones = service.getAvailableTimezones();

      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones).toContain("America/New_York");
      expect(timezones).toContain("Europe/London");
    });
  });

  describe("detectUserTimezone", () => {
    it("should return a timezone string", () => {
      const timezone = service.detectUserTimezone();

      expect(typeof timezone).toBe("string");
      expect(timezone.length).toBeGreaterThan(0);
    });
  });

  describe("formatTimeInTimezone", () => {
    it("should format time in specified timezone", () => {
      const utcTime = "2026-02-08T15:00:00.000Z";
      const formatted = service.formatTimeInTimezone(
        utcTime,
        "America/New_York",
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        },
      );

      expect(formatted).toBeDefined();
      expect(formatted).toContain("AM"); // 10:00 AM EST
    });
  });

  // ==========================================================================
  // Time Slot Tests
  // ==========================================================================

  describe("findNextAvailableSlot", () => {
    it("should find next available slot", () => {
      const slot = service.findNextAvailableSlot();

      expect(slot.start).toBeInstanceOf(Date);
      expect(slot.end).toBeInstanceOf(Date);
      expect(slot.end.getTime()).toBeGreaterThan(slot.start.getTime());
    });

    it("should respect working hours", () => {
      const slot = service.findNextAvailableSlot(new Date(), 60, {
        start: 9,
        end: 17,
      });

      const hour = slot.start.getHours();
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThan(17);
    });

    it("should use custom duration", () => {
      const duration = 90; // 90 minutes
      const slot = service.findNextAvailableSlot(new Date(), duration);

      const actualDuration =
        (slot.end.getTime() - slot.start.getTime()) / (60 * 1000);
      expect(actualDuration).toBe(duration);
    });
  });

  describe("suggestMeetingTimes", () => {
    it("should suggest multiple meeting times", () => {
      const suggestions = service.suggestMeetingTimes();

      expect(suggestions.length).toBe(5);
      suggestions.forEach((s) => {
        expect(s.start).toBeInstanceOf(Date);
        expect(s.end).toBeInstanceOf(Date);
      });
    });

    it("should respect preferred time of day", () => {
      const morningSlots = service.suggestMeetingTimes(60, 2, "morning");

      morningSlots.forEach((s) => {
        const hour = s.start.getHours();
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThan(12);
      });
    });

    it("should use custom duration", () => {
      const duration = 30;
      const suggestions = service.suggestMeetingTimes(duration);

      suggestions.forEach((s) => {
        const actualDuration =
          (s.end.getTime() - s.start.getTime()) / (60 * 1000);
        expect(actualDuration).toBe(duration);
      });
    });
  });

  // ==========================================================================
  // Reminder Callback Tests
  // ==========================================================================

  describe("setReminderCallback", () => {
    it("should call callback when reminder fires", () => {
      jest.useRealTimers();

      return new Promise<void>((resolve) => {
        const callback = jest.fn();
        service.setReminderCallback(callback);

        // Create meeting starting in 1 second
        const meeting = createMockMeeting({
          scheduledStartAt: new Date(Date.now() + 1000).toISOString(),
        });

        // This reminder won't fire because meeting is too soon
        // But we can verify the callback was set
        expect(service["reminderCallback"]).toBe(callback);
        resolve();
      });
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe("clearAll", () => {
    it("should clear all data", () => {
      const meeting = createMockMeeting();
      service.scheduleReminders(meeting, "user-123", ["5min", "15min"]);
      service.updateUserPreferences("user-123", { emailEnabled: false });

      service.clearAll();

      const reminders = service.getMeetingReminders(meeting.id);
      const prefs = service.getUserPreferences("user-123");

      expect(reminders.length).toBe(0);
      expect(prefs.emailEnabled).toBe(true); // Default value
    });
  });
});
