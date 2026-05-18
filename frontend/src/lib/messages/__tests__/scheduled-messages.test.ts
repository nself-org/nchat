/**
 * Scheduled Messages Module Tests
 *
 * Comprehensive tests for message scheduling functionality.
 */

import { act } from "@testing-library/react";
import {
  // Types
  type ScheduledMessage,
  type ScheduledMessageStatus,
  type RecurrencePattern,
  type CreateScheduledMessageOptions,
  type UpdateScheduledMessageOptions,
  type ScheduledMessageFilter,
  // Constants
  MIN_SCHEDULE_DELAY_MS,
  MAX_SCHEDULE_DELAY_MS,
  MAX_SCHEDULED_MESSAGES_PER_USER,
  MAX_RETRY_ATTEMPTS,
  DEFAULT_POLL_INTERVAL_MS,
  // Utilities
  generateMessageId,
  validateScheduledTime,
  validateMessageContent,
  formatScheduledTime,
  getRelativeTime,
  isMessageDue,
  canEditMessage,
  canCancelMessage,
  canRetryMessage,
  calculateNextOccurrence,
  sortByScheduledTime,
  groupByDate,
  // Store
  useScheduledMessagesStore,
  // Selectors
  selectScheduledMessage,
  selectAllScheduledMessages,
  selectPendingMessages,
  selectScheduledMessagesForChannel,
  selectScheduledMessagesForUser,
  selectScheduledMessagesCount,
  selectPendingMessagesCount,
  selectIsLoading,
  selectError,
} from "../scheduled-messages";

// ============================================================================
// Test Setup
// ============================================================================

describe("Scheduled Messages Module", () => {
  const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
  const pastTime = Date.now() - 60 * 60 * 1000; // 1 hour ago

  beforeEach(() => {
    act(() => {
      useScheduledMessagesStore.getState().reset();
    });
  });

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe("generateMessageId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "sched_"', () => {
      const id = generateMessageId();
      expect(id.startsWith("sched_")).toBe(true);
    });

    it("should contain timestamp", () => {
      const before = Date.now();
      const id = generateMessageId();
      const after = Date.now();
      const parts = id.split("_");
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("validateScheduledTime", () => {
    it("should return valid for time in acceptable range", () => {
      const scheduledAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const result = validateScheduledTime(scheduledAt);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for time too soon", () => {
      const scheduledAt = Date.now() + 1 * 60 * 1000; // 1 minute
      const result = validateScheduledTime(scheduledAt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least");
    });

    it("should return invalid for time too far", () => {
      const scheduledAt = Date.now() + 400 * 24 * 60 * 60 * 1000; // 400 days
      const result = validateScheduledTime(scheduledAt);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("more than");
    });

    it("should accept Date object", () => {
      const scheduledAt = new Date(Date.now() + 10 * 60 * 1000);
      const result = validateScheduledTime(scheduledAt);
      expect(result.valid).toBe(true);
    });

    it("should respect custom minDelay", () => {
      const scheduledAt = Date.now() + 1 * 60 * 1000;
      const result = validateScheduledTime(scheduledAt, {
        minDelay: 30 * 1000,
      }); // 30 seconds
      expect(result.valid).toBe(true);
    });

    it("should respect custom maxDelay", () => {
      const scheduledAt = Date.now() + 2 * 24 * 60 * 60 * 1000; // 2 days
      const result = validateScheduledTime(scheduledAt, {
        maxDelay: 24 * 60 * 60 * 1000,
      }); // 1 day max
      expect(result.valid).toBe(false);
    });
  });

  describe("validateMessageContent", () => {
    it("should return valid for normal content", () => {
      const result = validateMessageContent("Hello world");
      expect(result.valid).toBe(true);
    });

    it("should return invalid for empty content", () => {
      const result = validateMessageContent("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should return invalid for whitespace only", () => {
      const result = validateMessageContent("   \n\t  ");
      expect(result.valid).toBe(false);
    });

    it("should return invalid for content exceeding limit", () => {
      const longContent = "a".repeat(4001);
      const result = validateMessageContent(longContent);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("4000");
    });

    it("should return valid for content at limit", () => {
      const maxContent = "a".repeat(4000);
      const result = validateMessageContent(maxContent);
      expect(result.valid).toBe(true);
    });
  });

  describe("formatScheduledTime", () => {
    it("should format time correctly", () => {
      const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024, 2:30 PM
      const formatted = formatScheduledTime(date.getTime());
      expect(formatted).toContain("Jun");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2:30");
    });

    it("should include year for different year", () => {
      const date = new Date(2030, 5, 15, 14, 30);
      const formatted = formatScheduledTime(date.getTime());
      expect(formatted).toContain("2030");
    });

    it("should respect timezone parameter", () => {
      const timestamp = Date.now();
      const formatted = formatScheduledTime(timestamp, "America/New_York");
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe("getRelativeTime", () => {
    it('should return "overdue" for past time', () => {
      expect(getRelativeTime(pastTime)).toBe("overdue");
    });

    it('should return "less than a minute" for imminent time', () => {
      expect(getRelativeTime(Date.now() + 30 * 1000)).toBe(
        "less than a minute",
      );
    });

    it("should return minutes for time within an hour", () => {
      expect(getRelativeTime(Date.now() + 30 * 60 * 1000)).toBe("30 minutes");
    });

    it("should return singular minute", () => {
      expect(getRelativeTime(Date.now() + 1 * 60 * 1000 + 5000)).toBe(
        "1 minute",
      );
    });

    it("should return hours for time within a day", () => {
      expect(getRelativeTime(Date.now() + 5 * 60 * 60 * 1000)).toBe("5 hours");
    });

    it("should return singular hour", () => {
      expect(getRelativeTime(Date.now() + 1 * 60 * 60 * 1000 + 60000)).toBe(
        "1 hour",
      );
    });

    it("should return days for time beyond a day", () => {
      expect(getRelativeTime(Date.now() + 3 * 24 * 60 * 60 * 1000)).toBe(
        "3 days",
      );
    });
  });

  describe("isMessageDue", () => {
    it("should return true for pending message past scheduled time", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: pastTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "pending",
      };
      expect(isMessageDue(message)).toBe(true);
    });

    it("should return false for pending message in future", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "pending",
      };
      expect(isMessageDue(message)).toBe(false);
    });

    it("should return false for non-pending message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: pastTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "sent",
      };
      expect(isMessageDue(message)).toBe(false);
    });
  });

  describe("canEditMessage", () => {
    it("should return true for pending message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "pending",
      };
      expect(canEditMessage(message)).toBe(true);
    });

    it("should return true for failed message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "failed",
      };
      expect(canEditMessage(message)).toBe(true);
    });

    it("should return false for sent message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: pastTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "sent",
      };
      expect(canEditMessage(message)).toBe(false);
    });

    it("should return false for cancelled message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "cancelled",
      };
      expect(canEditMessage(message)).toBe(false);
    });
  });

  describe("canCancelMessage", () => {
    it("should return true for pending message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "pending",
      };
      expect(canCancelMessage(message)).toBe(true);
    });

    it("should return true for failed message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "failed",
      };
      expect(canCancelMessage(message)).toBe(true);
    });

    it("should return false for sent message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: pastTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "sent",
      };
      expect(canCancelMessage(message)).toBe(false);
    });
  });

  describe("canRetryMessage", () => {
    it("should return true for failed message with no retries", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "failed",
        retryCount: 0,
      };
      expect(canRetryMessage(message)).toBe(true);
    });

    it("should return true for failed message below max retries", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "failed",
        retryCount: MAX_RETRY_ATTEMPTS - 1,
      };
      expect(canRetryMessage(message)).toBe(true);
    });

    it("should return false for failed message at max retries", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "failed",
        retryCount: MAX_RETRY_ATTEMPTS,
      };
      expect(canRetryMessage(message)).toBe(false);
    });

    it("should return false for non-failed message", () => {
      const message: ScheduledMessage = {
        id: "1",
        channelId: "ch1",
        content: "Test",
        scheduledAt: futureTime,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: "u1",
        status: "pending",
      };
      expect(canRetryMessage(message)).toBe(false);
    });
  });

  describe("calculateNextOccurrence", () => {
    const baseMessage: ScheduledMessage = {
      id: "1",
      channelId: "ch1",
      content: "Test",
      scheduledAt: new Date(2024, 5, 15, 10, 0).getTime(), // June 15, 2024
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: "u1",
      status: "sent",
    };

    it("should return null for non-recurring message", () => {
      expect(calculateNextOccurrence(baseMessage)).toBeNull();
    });

    it("should calculate daily recurrence", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: { frequency: "daily", interval: 1 },
      };
      const next = calculateNextOccurrence(message);
      expect(next).toBe(new Date(2024, 5, 16, 10, 0).getTime());
    });

    it("should calculate daily recurrence with interval", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: { frequency: "daily", interval: 3 },
      };
      const next = calculateNextOccurrence(message);
      expect(next).toBe(new Date(2024, 5, 18, 10, 0).getTime());
    });

    it("should calculate weekly recurrence", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: { frequency: "weekly", interval: 1 },
      };
      const next = calculateNextOccurrence(message);
      expect(next).toBe(new Date(2024, 5, 22, 10, 0).getTime());
    });

    it("should calculate monthly recurrence", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: { frequency: "monthly", interval: 1 },
      };
      const next = calculateNextOccurrence(message);
      expect(next).toBe(new Date(2024, 6, 15, 10, 0).getTime());
    });

    it("should calculate yearly recurrence", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: { frequency: "yearly", interval: 1 },
      };
      const next = calculateNextOccurrence(message);
      expect(next).toBe(new Date(2025, 5, 15, 10, 0).getTime());
    });

    it("should return null when max occurrences reached", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: {
          frequency: "daily",
          interval: 1,
          maxOccurrences: 5,
          sentCount: 5,
        },
      };
      expect(calculateNextOccurrence(message)).toBeNull();
    });

    it("should return null when past end date", () => {
      const message: ScheduledMessage = {
        ...baseMessage,
        recurrence: {
          frequency: "daily",
          interval: 1,
          endDate: new Date(2024, 5, 15, 12, 0).getTime(),
        },
      };
      expect(calculateNextOccurrence(message)).toBeNull();
    });
  });

  describe("sortByScheduledTime", () => {
    it("should sort ascending by default", () => {
      const messages: ScheduledMessage[] = [
        { id: "3", scheduledAt: 3000 } as ScheduledMessage,
        { id: "1", scheduledAt: 1000 } as ScheduledMessage,
        { id: "2", scheduledAt: 2000 } as ScheduledMessage,
      ];
      const sorted = sortByScheduledTime(messages);
      expect(sorted.map((m) => m.id)).toEqual(["1", "2", "3"]);
    });

    it("should sort descending when requested", () => {
      const messages: ScheduledMessage[] = [
        { id: "1", scheduledAt: 1000 } as ScheduledMessage,
        { id: "3", scheduledAt: 3000 } as ScheduledMessage,
        { id: "2", scheduledAt: 2000 } as ScheduledMessage,
      ];
      const sorted = sortByScheduledTime(messages, false);
      expect(sorted.map((m) => m.id)).toEqual(["3", "2", "1"]);
    });

    it("should not mutate original array", () => {
      const messages: ScheduledMessage[] = [
        { id: "2", scheduledAt: 2000 } as ScheduledMessage,
        { id: "1", scheduledAt: 1000 } as ScheduledMessage,
      ];
      sortByScheduledTime(messages);
      expect(messages.map((m) => m.id)).toEqual(["2", "1"]);
    });
  });

  describe("groupByDate", () => {
    it("should group messages by date", () => {
      const messages: ScheduledMessage[] = [
        {
          id: "1",
          scheduledAt: new Date(2024, 5, 15, 10, 0).getTime(),
        } as ScheduledMessage,
        {
          id: "2",
          scheduledAt: new Date(2024, 5, 15, 14, 0).getTime(),
        } as ScheduledMessage,
        {
          id: "3",
          scheduledAt: new Date(2024, 5, 16, 10, 0).getTime(),
        } as ScheduledMessage,
      ];
      const grouped = groupByDate(messages);
      expect(grouped.size).toBe(2);
      expect(grouped.get("2024-06-15")?.length).toBe(2);
      expect(grouped.get("2024-06-16")?.length).toBe(1);
    });

    it("should return empty map for empty array", () => {
      const grouped = groupByDate([]);
      expect(grouped.size).toBe(0);
    });
  });

  // ==========================================================================
  // Store Tests
  // ==========================================================================

  describe("Store: addMessage", () => {
    it("should add a message", () => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test message",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });

      const state = useScheduledMessagesStore.getState();
      expect(state.messages.size).toBe(1);
    });

    it("should set correct initial status", () => {
      let message: ScheduledMessage;
      act(() => {
        message = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });

      expect(message!.status).toBe("pending");
    });

    it("should set timestamps", () => {
      const before = Date.now();
      let message: ScheduledMessage;
      act(() => {
        message = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });
      const after = Date.now();

      expect(message!.createdAt).toBeGreaterThanOrEqual(before);
      expect(message!.createdAt).toBeLessThanOrEqual(after);
      expect(message!.updatedAt).toBe(message!.createdAt);
    });

    it("should accept Date object for scheduledAt", () => {
      const scheduledDate = new Date(futureTime);
      let message: ScheduledMessage;
      act(() => {
        message = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: scheduledDate,
          userId: "u1",
        });
      });

      expect(message!.scheduledAt).toBe(scheduledDate.getTime());
    });

    it("should add to channel index", () => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });

      const state = useScheduledMessagesStore.getState();
      const channelMessages = state.messagesByChannel.get("ch1");
      expect(channelMessages?.size).toBe(1);
    });

    it("should add to user index", () => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });

      const state = useScheduledMessagesStore.getState();
      const userMessages = state.messagesByUser.get("u1");
      expect(userMessages?.size).toBe(1);
    });

    it("should include optional fields", () => {
      let message: ScheduledMessage;
      act(() => {
        message = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
          replyToId: "msg123",
          threadId: "thread456",
          timezone: "America/New_York",
        });
      });

      expect(message!.replyToId).toBe("msg123");
      expect(message!.threadId).toBe("thread456");
      expect(message!.timezone).toBe("America/New_York");
    });
  });

  describe("Store: updateMessage", () => {
    it("should update content", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Original",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
      });

      act(() => {
        useScheduledMessagesStore
          .getState()
          .updateMessage(id!, { content: "Updated" });
      });

      expect(
        useScheduledMessagesStore.getState().getMessage(id!)?.content,
      ).toBe("Updated");
    });

    it("should update scheduledAt", () => {
      let id: string;
      const newTime = futureTime + 60 * 60 * 1000;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
      });

      act(() => {
        useScheduledMessagesStore
          .getState()
          .updateMessage(id!, { scheduledAt: newTime });
      });

      expect(
        useScheduledMessagesStore.getState().getMessage(id!)?.scheduledAt,
      ).toBe(newTime);
    });

    it("should update updatedAt timestamp", () => {
      let id: string;
      let originalUpdatedAt: number;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
        originalUpdatedAt = msg.updatedAt;
      });

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime?.(10) ||
        (async () => await new Promise((r) => setTimeout(r, 10)))();

      act(() => {
        useScheduledMessagesStore
          .getState()
          .updateMessage(id!, { content: "New" });
      });

      expect(
        useScheduledMessagesStore.getState().getMessage(id!)?.updatedAt,
      ).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it("should return null for non-existent message", () => {
      let result: ScheduledMessage | null = null;
      act(() => {
        result = useScheduledMessagesStore
          .getState()
          .updateMessage("non-existent", { content: "Test" });
      });

      expect(result).toBeNull();
    });

    it("should return null for non-editable message", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
        useScheduledMessagesStore.getState().markSent(id);
      });

      let result: ScheduledMessage | null = null;
      act(() => {
        result = useScheduledMessagesStore
          .getState()
          .updateMessage(id!, { content: "New" });
      });

      expect(result).toBeNull();
    });

    it("should reset failed status to pending on update", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
        useScheduledMessagesStore.getState().markFailed(id, "Error");
      });

      act(() => {
        useScheduledMessagesStore
          .getState()
          .updateMessage(id!, { content: "Retry" });
      });

      const message = useScheduledMessagesStore.getState().getMessage(id!);
      expect(message?.status).toBe("pending");
      expect(message?.error).toBeUndefined();
    });
  });

  describe("Store: cancelMessage", () => {
    it("should cancel pending message", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
      });

      let result: boolean = false;
      act(() => {
        result = useScheduledMessagesStore.getState().cancelMessage(id!);
      });

      expect(result).toBe(true);
      expect(useScheduledMessagesStore.getState().getMessage(id!)?.status).toBe(
        "cancelled",
      );
    });

    it("should return false for non-cancellable message", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
        useScheduledMessagesStore.getState().markSent(id);
      });

      let result: boolean = true;
      act(() => {
        result = useScheduledMessagesStore.getState().cancelMessage(id!);
      });

      expect(result).toBe(false);
    });
  });

  describe("Store: deleteMessage", () => {
    it("should delete message", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
      });

      let result: boolean = false;
      act(() => {
        result = useScheduledMessagesStore.getState().deleteMessage(id!);
      });

      expect(result).toBe(true);
      expect(
        useScheduledMessagesStore.getState().getMessage(id!),
      ).toBeUndefined();
    });

    it("should remove from channel index", () => {
      let id: string;
      act(() => {
        const msg = useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        id = msg.id;
        useScheduledMessagesStore.getState().deleteMessage(id);
      });

      const channelMessages = useScheduledMessagesStore
        .getState()
        .messagesByChannel.get("ch1");
      expect(channelMessages?.has(id!)).toBe(false);
    });

    it("should return false for non-existent message", () => {
      let result: boolean = true;
      act(() => {
        result = useScheduledMessagesStore
          .getState()
          .deleteMessage("non-existent");
      });

      expect(result).toBe(false);
    });
  });

  describe("Store: Status Updates", () => {
    describe("markSending", () => {
      it("should update status to sending", () => {
        let id: string;
        act(() => {
          const msg = useScheduledMessagesStore.getState().addMessage({
            channelId: "ch1",
            content: "Test",
            scheduledAt: futureTime,
            userId: "u1",
          });
          id = msg.id;
          useScheduledMessagesStore.getState().markSending(id);
        });

        expect(
          useScheduledMessagesStore.getState().getMessage(id!)?.status,
        ).toBe("sending");
      });
    });

    describe("markSent", () => {
      it("should update status to sent", () => {
        let id: string;
        act(() => {
          const msg = useScheduledMessagesStore.getState().addMessage({
            channelId: "ch1",
            content: "Test",
            scheduledAt: futureTime,
            userId: "u1",
          });
          id = msg.id;
          useScheduledMessagesStore.getState().markSent(id);
        });

        expect(
          useScheduledMessagesStore.getState().getMessage(id!)?.status,
        ).toBe("sent");
      });
    });

    describe("markFailed", () => {
      it("should update status to failed with error", () => {
        let id: string;
        act(() => {
          const msg = useScheduledMessagesStore.getState().addMessage({
            channelId: "ch1",
            content: "Test",
            scheduledAt: futureTime,
            userId: "u1",
          });
          id = msg.id;
          useScheduledMessagesStore.getState().markFailed(id, "Network error");
        });

        const message = useScheduledMessagesStore.getState().getMessage(id!);
        expect(message?.status).toBe("failed");
        expect(message?.error).toBe("Network error");
      });

      it("should increment retry count", () => {
        let id: string;
        act(() => {
          const msg = useScheduledMessagesStore.getState().addMessage({
            channelId: "ch1",
            content: "Test",
            scheduledAt: futureTime,
            userId: "u1",
          });
          id = msg.id;
          useScheduledMessagesStore.getState().markFailed(id, "Error 1");
          useScheduledMessagesStore.getState().markFailed(id, "Error 2");
        });

        expect(
          useScheduledMessagesStore.getState().getMessage(id!)?.retryCount,
        ).toBe(2);
      });
    });

    describe("retry", () => {
      it("should reset status to pending", () => {
        let id: string;
        act(() => {
          const msg = useScheduledMessagesStore.getState().addMessage({
            channelId: "ch1",
            content: "Test",
            scheduledAt: futureTime,
            userId: "u1",
          });
          id = msg.id;
          useScheduledMessagesStore.getState().markFailed(id, "Error");
          useScheduledMessagesStore.getState().retry(id);
        });

        const message = useScheduledMessagesStore.getState().getMessage(id!);
        expect(message?.status).toBe("pending");
        expect(message?.error).toBeUndefined();
      });
    });
  });

  describe("Store: Queries", () => {
    beforeEach(() => {
      act(() => {
        const store = useScheduledMessagesStore.getState();
        store.addMessage({
          channelId: "ch1",
          content: "Message 1",
          scheduledAt: futureTime,
          userId: "u1",
        });
        store.addMessage({
          channelId: "ch1",
          content: "Message 2",
          scheduledAt: futureTime + 1000,
          userId: "u2",
        });
        store.addMessage({
          channelId: "ch2",
          content: "Message 3",
          scheduledAt: futureTime + 2000,
          userId: "u1",
        });
      });
    });

    describe("getMessages", () => {
      it("should return all messages without filter", () => {
        const messages = useScheduledMessagesStore.getState().getMessages();
        expect(messages.length).toBe(3);
      });

      it("should filter by channelId", () => {
        const messages = useScheduledMessagesStore
          .getState()
          .getMessages({ channelId: "ch1" });
        expect(messages.length).toBe(2);
      });

      it("should filter by userId", () => {
        const messages = useScheduledMessagesStore
          .getState()
          .getMessages({ userId: "u1" });
        expect(messages.length).toBe(2);
      });

      it("should return sorted by scheduledAt", () => {
        const messages = useScheduledMessagesStore.getState().getMessages();
        expect(messages[0].scheduledAt).toBeLessThan(messages[1].scheduledAt);
      });
    });

    describe("getMessagesByChannel", () => {
      it("should return messages for specific channel", () => {
        const messages = useScheduledMessagesStore
          .getState()
          .getMessagesByChannel("ch1");
        expect(messages.length).toBe(2);
        expect(messages.every((m) => m.channelId === "ch1")).toBe(true);
      });
    });

    describe("getMessagesByUser", () => {
      it("should return messages for specific user", () => {
        const messages = useScheduledMessagesStore
          .getState()
          .getMessagesByUser("u1");
        expect(messages.length).toBe(2);
        expect(messages.every((m) => m.userId === "u1")).toBe(true);
      });
    });

    describe("getPendingMessages", () => {
      it("should return only pending messages", () => {
        act(() => {
          const messages = useScheduledMessagesStore.getState().getMessages();
          useScheduledMessagesStore.getState().markSent(messages[0].id);
        });

        const pending = useScheduledMessagesStore
          .getState()
          .getPendingMessages();
        expect(pending.length).toBe(2);
        expect(pending.every((m) => m.status === "pending")).toBe(true);
      });
    });
  });

  describe("Store: Bulk Operations", () => {
    beforeEach(() => {
      act(() => {
        const store = useScheduledMessagesStore.getState();
        store.addMessage({
          channelId: "ch1",
          content: "Message 1",
          scheduledAt: futureTime,
          userId: "u1",
        });
        store.addMessage({
          channelId: "ch1",
          content: "Message 2",
          scheduledAt: futureTime,
          userId: "u1",
        });
        store.addMessage({
          channelId: "ch2",
          content: "Message 3",
          scheduledAt: futureTime,
          userId: "u2",
        });
      });
    });

    describe("cancelAllForChannel", () => {
      it("should cancel all messages for a channel", () => {
        let count: number = 0;
        act(() => {
          count = useScheduledMessagesStore
            .getState()
            .cancelAllForChannel("ch1");
        });

        expect(count).toBe(2);
        const messages = useScheduledMessagesStore
          .getState()
          .getMessagesByChannel("ch1");
        expect(messages.every((m) => m.status === "cancelled")).toBe(true);
      });
    });

    describe("cancelAllForUser", () => {
      it("should cancel all messages for a user", () => {
        let count: number = 0;
        act(() => {
          count = useScheduledMessagesStore.getState().cancelAllForUser("u1");
        });

        expect(count).toBe(2);
        const messages = useScheduledMessagesStore
          .getState()
          .getMessagesByUser("u1");
        expect(messages.every((m) => m.status === "cancelled")).toBe(true);
      });
    });
  });

  describe("Store: reset", () => {
    it("should clear all messages", () => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        useScheduledMessagesStore.getState().reset();
      });

      expect(useScheduledMessagesStore.getState().messages.size).toBe(0);
    });

    it("should clear indexes", () => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
        useScheduledMessagesStore.getState().reset();
      });

      expect(useScheduledMessagesStore.getState().messagesByChannel.size).toBe(
        0,
      );
      expect(useScheduledMessagesStore.getState().messagesByUser.size).toBe(0);
    });
  });

  // ==========================================================================
  // Selectors Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      act(() => {
        useScheduledMessagesStore.getState().addMessage({
          channelId: "ch1",
          content: "Test",
          scheduledAt: futureTime,
          userId: "u1",
        });
      });
    });

    it("selectScheduledMessage should return message by id", () => {
      const state = useScheduledMessagesStore.getState();
      const messages = selectAllScheduledMessages(state);
      const selector = selectScheduledMessage(messages[0].id);
      expect(selector(state)?.content).toBe("Test");
    });

    it("selectAllScheduledMessages should return all messages", () => {
      const state = useScheduledMessagesStore.getState();
      expect(selectAllScheduledMessages(state).length).toBe(1);
    });

    it("selectPendingMessages should return pending only", () => {
      const state = useScheduledMessagesStore.getState();
      expect(selectPendingMessages(state).length).toBe(1);
    });

    it("selectScheduledMessagesCount should return count", () => {
      const state = useScheduledMessagesStore.getState();
      expect(selectScheduledMessagesCount(state)).toBe(1);
    });

    it("selectPendingMessagesCount should return pending count", () => {
      const state = useScheduledMessagesStore.getState();
      expect(selectPendingMessagesCount(state)).toBe(1);
    });

    it("selectIsLoading should return loading state", () => {
      act(() => {
        useScheduledMessagesStore.getState().setLoading(true);
      });
      expect(selectIsLoading(useScheduledMessagesStore.getState())).toBe(true);
    });

    it("selectError should return error state", () => {
      act(() => {
        useScheduledMessagesStore.getState().setError("Test error");
      });
      expect(selectError(useScheduledMessagesStore.getState())).toBe(
        "Test error",
      );
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have valid MIN_SCHEDULE_DELAY_MS", () => {
      expect(MIN_SCHEDULE_DELAY_MS).toBe(5 * 60 * 1000);
    });

    it("should have valid MAX_SCHEDULE_DELAY_MS", () => {
      expect(MAX_SCHEDULE_DELAY_MS).toBe(365 * 24 * 60 * 60 * 1000);
    });

    it("should have valid MAX_SCHEDULED_MESSAGES_PER_USER", () => {
      expect(MAX_SCHEDULED_MESSAGES_PER_USER).toBe(100);
    });

    it("should have valid MAX_RETRY_ATTEMPTS", () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it("should have valid DEFAULT_POLL_INTERVAL_MS", () => {
      expect(DEFAULT_POLL_INTERVAL_MS).toBe(60 * 1000);
    });
  });
});
