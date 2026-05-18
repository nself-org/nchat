/**
 * Delivery Status Store Unit Tests
 *
 * Tests for message delivery status tracking including:
 * - Status transitions (sending -> sent -> delivered -> read)
 * - Failed message handling
 * - Read receipts
 * - Retry mechanism
 */

import { act } from "@testing-library/react";
import {
  useDeliveryStatusStore,
  handleMessageSent,
  handleMessageDelivered,
  handleMessageRead,
  handleMessageFailed,
  handleRetryAttempt,
  shouldShowDeliveryStatus,
  getStatusDescription,
  calculateReadPercentage,
  type DeliveryStatus,
} from "../delivery-status";

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Delivery Status Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useDeliveryStatusStore.getState().clearAllStatuses();
    });
  });

  // ==========================================================================
  // Basic Status Operations
  // ==========================================================================

  describe("Basic Status Operations", () => {
    describe("setStatus", () => {
      it("should set status for a message", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sending");
        });

        const state = useDeliveryStatusStore.getState();
        expect(state.statuses["msg-1"]).toBeDefined();
        expect(state.statuses["msg-1"].status).toBe("sending");
        expect(state.statuses["msg-1"].messageId).toBe("msg-1");
        expect(state.statuses["msg-1"].updatedAt).toBeInstanceOf(Date);
      });

      it("should set status with extra fields", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "delivered", {
            deliveredCount: 5,
            totalRecipients: 10,
          });
        });

        const state = useDeliveryStatusStore.getState();
        expect(state.statuses["msg-1"].deliveredCount).toBe(5);
        expect(state.statuses["msg-1"].totalRecipients).toBe(10);
      });

      it("should overwrite existing status", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sending");
          useDeliveryStatusStore.getState().setStatus("msg-1", "sent");
        });

        const state = useDeliveryStatusStore.getState();
        expect(state.statuses["msg-1"].status).toBe("sent");
      });
    });

    describe("getStatus", () => {
      it("should return status for existing message", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sent");
        });

        const status = useDeliveryStatusStore.getState().getStatus("msg-1");
        expect(status).toBe("sent");
      });

      it("should return null for non-existent message", () => {
        const status = useDeliveryStatusStore
          .getState()
          .getStatus("non-existent");
        expect(status).toBeNull();
      });
    });

    describe("getStatusEntry", () => {
      it("should return full status entry for existing message", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "delivered", {
            deliveredCount: 3,
          });
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry).not.toBeNull();
        expect(entry?.status).toBe("delivered");
        expect(entry?.deliveredCount).toBe(3);
      });

      it("should return null for non-existent message", () => {
        const entry = useDeliveryStatusStore
          .getState()
          .getStatusEntry("non-existent");
        expect(entry).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Status Convenience Methods
  // ==========================================================================

  describe("Status Convenience Methods", () => {
    describe("markSending", () => {
      it("should mark message as sending", () => {
        act(() => {
          useDeliveryStatusStore.getState().markSending("msg-1");
        });

        expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
          "sending",
        );
      });
    });

    describe("markSent", () => {
      it("should mark message as sent", () => {
        act(() => {
          useDeliveryStatusStore.getState().markSent("msg-1");
        });

        expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
          "sent",
        );
      });
    });

    describe("markDelivered", () => {
      it("should mark message as delivered", () => {
        act(() => {
          useDeliveryStatusStore.getState().markDelivered("msg-1");
        });

        expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
          "delivered",
        );
      });

      it("should include delivery counts", () => {
        act(() => {
          useDeliveryStatusStore.getState().markDelivered("msg-1", 5, 10);
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.deliveredCount).toBe(5);
        expect(entry?.totalRecipients).toBe(10);
      });
    });

    describe("markRead", () => {
      it("should mark message as read", () => {
        act(() => {
          useDeliveryStatusStore.getState().markRead("msg-1");
        });

        expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
          "read",
        );
      });

      it("should include read counts", () => {
        act(() => {
          useDeliveryStatusStore.getState().markRead("msg-1", 8, 10);
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.readCount).toBe(8);
        expect(entry?.totalRecipients).toBe(10);
      });
    });

    describe("markFailed", () => {
      it("should mark message as failed with error", () => {
        act(() => {
          useDeliveryStatusStore
            .getState()
            .markFailed("msg-1", "Network error");
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.status).toBe("failed");
        expect(entry?.error).toBe("Network error");
        expect(entry?.retryCount).toBe(0);
      });

      it("should include retry count", () => {
        act(() => {
          useDeliveryStatusStore
            .getState()
            .markFailed("msg-1", "Network error", 2);
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.retryCount).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Read Receipts
  // ==========================================================================

  describe("Read Receipts", () => {
    describe("addReadReceipt", () => {
      it("should add a read receipt", () => {
        const readAt = new Date();

        act(() => {
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt,
          });
        });

        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(receipts).toHaveLength(1);
        expect(receipts[0].userId).toBe("user-1");
        expect(receipts[0].readAt).toBe(readAt);
      });

      it("should not add duplicate read receipts", () => {
        const readAt = new Date();

        act(() => {
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt,
          });
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt: new Date(),
          });
        });

        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(receipts).toHaveLength(1);
      });

      it("should add multiple different users", () => {
        act(() => {
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt: new Date(),
          });
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-2",
            readAt: new Date(),
          });
        });

        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(receipts).toHaveLength(2);
      });
    });

    describe("setReadReceipts", () => {
      it("should set all read receipts at once", () => {
        const receipts = [
          { userId: "user-1", readAt: new Date() },
          { userId: "user-2", readAt: new Date() },
          { userId: "user-3", readAt: new Date() },
        ];

        act(() => {
          useDeliveryStatusStore.getState().setReadReceipts("msg-1", receipts);
        });

        const result = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(result).toHaveLength(3);
      });

      it("should overwrite existing receipts", () => {
        act(() => {
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt: new Date(),
          });
          useDeliveryStatusStore
            .getState()
            .setReadReceipts("msg-1", [
              { userId: "user-2", readAt: new Date() },
            ]);
        });

        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(receipts).toHaveLength(1);
        expect(receipts[0].userId).toBe("user-2");
      });
    });

    describe("getReadReceipts", () => {
      it("should return empty array for non-existent message", () => {
        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("non-existent");
        expect(receipts).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Clear Operations
  // ==========================================================================

  describe("Clear Operations", () => {
    describe("clearStatus", () => {
      it("should clear status for a message", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sent");
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt: new Date(),
          });
          useDeliveryStatusStore.getState().clearStatus("msg-1");
        });

        const state = useDeliveryStatusStore.getState();
        expect(state.statuses["msg-1"]).toBeUndefined();
        expect(state.readReceipts["msg-1"]).toBeUndefined();
      });

      it("should not affect other messages", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sent");
          useDeliveryStatusStore.getState().setStatus("msg-2", "delivered");
          useDeliveryStatusStore.getState().clearStatus("msg-1");
        });

        const state = useDeliveryStatusStore.getState();
        expect(state.statuses["msg-1"]).toBeUndefined();
        expect(state.statuses["msg-2"]).toBeDefined();
      });
    });

    describe("clearAllStatuses", () => {
      it("should clear all statuses and receipts", () => {
        act(() => {
          useDeliveryStatusStore.getState().setStatus("msg-1", "sent");
          useDeliveryStatusStore.getState().setStatus("msg-2", "delivered");
          useDeliveryStatusStore.getState().addReadReceipt("msg-1", {
            userId: "user-1",
            readAt: new Date(),
          });
          useDeliveryStatusStore.getState().clearAllStatuses();
        });

        const state = useDeliveryStatusStore.getState();
        expect(Object.keys(state.statuses)).toHaveLength(0);
        expect(Object.keys(state.readReceipts)).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Failed Messages
  // ==========================================================================

  describe("Failed Messages", () => {
    describe("getFailedMessages", () => {
      it("should return all failed messages", () => {
        act(() => {
          useDeliveryStatusStore.getState().markFailed("msg-1", "Error 1");
          useDeliveryStatusStore.getState().markSent("msg-2");
          useDeliveryStatusStore.getState().markFailed("msg-3", "Error 3");
        });

        const failed = useDeliveryStatusStore.getState().getFailedMessages();
        expect(failed).toHaveLength(2);
        expect(failed.map((f) => f.messageId).sort()).toEqual([
          "msg-1",
          "msg-3",
        ]);
      });

      it("should return empty array when no failed messages", () => {
        act(() => {
          useDeliveryStatusStore.getState().markSent("msg-1");
          useDeliveryStatusStore.getState().markDelivered("msg-2");
        });

        const failed = useDeliveryStatusStore.getState().getFailedMessages();
        expect(failed).toHaveLength(0);
      });
    });

    describe("incrementRetryCount", () => {
      it("should increment retry count", () => {
        act(() => {
          useDeliveryStatusStore.getState().markFailed("msg-1", "Error", 0);
          useDeliveryStatusStore.getState().incrementRetryCount("msg-1");
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.retryCount).toBe(1);
      });

      it("should update timestamp when incrementing", () => {
        const before = new Date();

        act(() => {
          useDeliveryStatusStore.getState().markFailed("msg-1", "Error");
        });

        const entryBefore = useDeliveryStatusStore
          .getState()
          .getStatusEntry("msg-1");
        const timeBefore = entryBefore?.updatedAt;

        // Small delay to ensure different timestamp
        act(() => {
          useDeliveryStatusStore.getState().incrementRetryCount("msg-1");
        });

        const entryAfter = useDeliveryStatusStore
          .getState()
          .getStatusEntry("msg-1");
        expect(entryAfter?.updatedAt.getTime()).toBeGreaterThanOrEqual(
          timeBefore?.getTime() ?? 0,
        );
      });

      it("should do nothing for non-existent message", () => {
        act(() => {
          useDeliveryStatusStore.getState().incrementRetryCount("non-existent");
        });

        expect(
          useDeliveryStatusStore.getState().getStatusEntry("non-existent"),
        ).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  describe("Event Handlers", () => {
    describe("handleMessageSent", () => {
      it("should mark message as sent", () => {
        act(() => {
          handleMessageSent("msg-1");
        });

        expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
          "sent",
        );
      });
    });

    describe("handleMessageDelivered", () => {
      it("should mark message as delivered", () => {
        act(() => {
          handleMessageDelivered("msg-1", 5, 10);
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.status).toBe("delivered");
        expect(entry?.deliveredCount).toBe(5);
        expect(entry?.totalRecipients).toBe(10);
      });
    });

    describe("handleMessageRead", () => {
      it("should mark message as read and add receipt", () => {
        const readAt = new Date();

        act(() => {
          handleMessageRead("msg-1", "user-1", readAt, 3, 10);
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.status).toBe("read");
        expect(entry?.readCount).toBe(3);

        const receipts = useDeliveryStatusStore
          .getState()
          .getReadReceipts("msg-1");
        expect(receipts).toHaveLength(1);
        expect(receipts[0].userId).toBe("user-1");
      });
    });

    describe("handleMessageFailed", () => {
      it("should mark message as failed", () => {
        act(() => {
          handleMessageFailed("msg-1", "Network error");
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.status).toBe("failed");
        expect(entry?.error).toBe("Network error");
      });

      it("should preserve retry count", () => {
        act(() => {
          useDeliveryStatusStore
            .getState()
            .markFailed("msg-1", "First error", 2);
          handleMessageFailed("msg-1", "Second error");
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.retryCount).toBe(2);
      });
    });

    describe("handleRetryAttempt", () => {
      it("should increment retry count and mark as sending", () => {
        act(() => {
          useDeliveryStatusStore.getState().markFailed("msg-1", "Error", 0);
          handleRetryAttempt("msg-1");
        });

        const entry = useDeliveryStatusStore.getState().getStatusEntry("msg-1");
        expect(entry?.status).toBe("sending");
        expect(entry?.retryCount).toBe(1);
      });
    });
  });

  // ==========================================================================
  // Utility Functions
  // ==========================================================================

  describe("Utility Functions", () => {
    describe("shouldShowDeliveryStatus", () => {
      it("should return true for own messages within 24 hours", () => {
        const now = new Date();
        const result = shouldShowDeliveryStatus("user-1", "user-1", now);
        expect(result).toBe(true);
      });

      it("should return false for other users messages", () => {
        const now = new Date();
        const result = shouldShowDeliveryStatus("user-1", "user-2", now);
        expect(result).toBe(false);
      });

      it("should return false for messages older than 24 hours", () => {
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
        const result = shouldShowDeliveryStatus("user-1", "user-1", oldDate);
        expect(result).toBe(false);
      });

      it("should respect custom maxAgeMs", () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const twoHoursMs = 2 * 60 * 60 * 1000;

        const result = shouldShowDeliveryStatus(
          "user-1",
          "user-1",
          oneHourAgo,
          twoHoursMs,
        );
        expect(result).toBe(true);
      });
    });

    describe("getStatusDescription", () => {
      it("should return correct descriptions", () => {
        expect(getStatusDescription("sending")).toBe("Sending...");
        expect(getStatusDescription("sent")).toBe("Sent");
        expect(getStatusDescription("delivered")).toBe("Delivered");
        expect(getStatusDescription("read")).toBe("Read");
        expect(getStatusDescription("failed")).toBe("Failed to send");
      });
    });

    describe("calculateReadPercentage", () => {
      it("should calculate correct percentage", () => {
        expect(calculateReadPercentage(5, 10)).toBe(50);
        expect(calculateReadPercentage(3, 10)).toBe(30);
        expect(calculateReadPercentage(10, 10)).toBe(100);
      });

      it("should return 0 for zero total", () => {
        expect(calculateReadPercentage(0, 0)).toBe(0);
      });

      it("should round to nearest integer", () => {
        expect(calculateReadPercentage(1, 3)).toBe(33);
        expect(calculateReadPercentage(2, 3)).toBe(67);
      });
    });
  });

  // ==========================================================================
  // Status Flow Tests
  // ==========================================================================

  describe("Status Flow", () => {
    it("should follow complete status flow: sending -> sent -> delivered -> read", () => {
      // Start sending
      act(() => {
        useDeliveryStatusStore.getState().markSending("msg-1");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
        "sending",
      );

      // Message sent
      act(() => {
        handleMessageSent("msg-1");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe("sent");

      // Message delivered
      act(() => {
        handleMessageDelivered("msg-1", 5, 10);
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
        "delivered",
      );

      // Message read
      act(() => {
        handleMessageRead("msg-1", "user-2", new Date(), 5, 10);
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe("read");
    });

    it("should handle retry flow: sending -> failed -> retry -> sending -> sent", () => {
      // Start sending
      act(() => {
        useDeliveryStatusStore.getState().markSending("msg-1");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
        "sending",
      );

      // Message failed
      act(() => {
        handleMessageFailed("msg-1", "Network error");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
        "failed",
      );

      // Retry attempt
      act(() => {
        handleRetryAttempt("msg-1");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe(
        "sending",
      );
      expect(
        useDeliveryStatusStore.getState().getStatusEntry("msg-1")?.retryCount,
      ).toBe(1);

      // Message finally sent
      act(() => {
        handleMessageSent("msg-1");
      });
      expect(useDeliveryStatusStore.getState().getStatus("msg-1")).toBe("sent");
    });
  });
});
