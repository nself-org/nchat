/**
 * Read Receipts Store Tests
 *
 * Tests for the useReadReceiptsStore which manages read receipt state,
 * delivery status tracking, and channel read status.
 */

import { act } from "@testing-library/react";
import {
  useReadReceiptsStore,
  type ReadReceipt,
  type ChannelReadStatus,
  type DeliveryStatus,
} from "../read-receipts-store";

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset store to initial state before each test
 */
const resetStore = () => {
  useReadReceiptsStore.getState().reset();
};

/**
 * Create a mock read receipt
 */
const createMockReceipt = (
  userId: string,
  messageId: string,
  displayName: string = "Test User",
): ReadReceipt => ({
  userId,
  messageId,
  readAt: new Date().toISOString(),
  user: {
    id: userId,
    displayName,
    avatarUrl: `https://example.com/avatar/${userId}.png`,
  },
});

/**
 * Create a mock channel read status
 */
const createMockChannelStatus = (
  userId: string,
  channelId: string,
  lastReadMessageId?: string,
): ChannelReadStatus => ({
  userId,
  channelId,
  lastReadMessageId,
  lastReadAt: new Date().toISOString(),
  user: {
    id: userId,
    displayName: `User ${userId}`,
    avatarUrl: `https://example.com/avatar/${userId}.png`,
  },
});

// ============================================================================
// Tests
// ============================================================================

describe("useReadReceiptsStore", () => {
  beforeEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("initial state", () => {
    it("should have empty receipts by default", () => {
      const state = useReadReceiptsStore.getState();
      expect(state.receiptsByMessage).toEqual({});
    });

    it("should have empty channel read status by default", () => {
      const state = useReadReceiptsStore.getState();
      expect(state.channelReadStatus).toEqual({});
    });

    it("should have empty delivery status by default", () => {
      const state = useReadReceiptsStore.getState();
      expect(state.deliveryStatusByMessage).toEqual({});
    });

    it("should have show read receipts enabled by default", () => {
      const state = useReadReceiptsStore.getState();
      expect(state.showReadReceipts).toBe(true);
    });

    it("should have share read receipts enabled by default", () => {
      const state = useReadReceiptsStore.getState();
      expect(state.shareReadReceipts).toBe(true);
    });
  });

  // ==========================================================================
  // Read Receipt Management Tests
  // ==========================================================================

  describe("read receipt management", () => {
    describe("setReadReceipts", () => {
      it("should set receipts for a message", () => {
        const messageId = "msg-1";
        const receipts = [
          createMockReceipt("user-1", messageId, "Alice"),
          createMockReceipt("user-2", messageId, "Bob"),
        ];

        act(() => {
          useReadReceiptsStore.getState().setReadReceipts(messageId, receipts);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage[messageId]).toHaveLength(2);
        expect(state.receiptsByMessage[messageId][0].user?.displayName).toBe(
          "Alice",
        );
      });

      it("should overwrite existing receipts", () => {
        const messageId = "msg-1";
        const initialReceipts = [createMockReceipt("user-1", messageId)];
        const newReceipts = [createMockReceipt("user-2", messageId)];

        act(() => {
          useReadReceiptsStore
            .getState()
            .setReadReceipts(messageId, initialReceipts);
          useReadReceiptsStore
            .getState()
            .setReadReceipts(messageId, newReceipts);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage[messageId]).toHaveLength(1);
        expect(state.receiptsByMessage[messageId][0].userId).toBe("user-2");
      });
    });

    describe("addReadReceipt", () => {
      it("should add a new receipt", () => {
        const receipt = createMockReceipt("user-1", "msg-1");

        act(() => {
          useReadReceiptsStore.getState().addReadReceipt(receipt);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage["msg-1"]).toHaveLength(1);
      });

      it("should not add duplicate receipts for same user and message", () => {
        const receipt = createMockReceipt("user-1", "msg-1");

        act(() => {
          useReadReceiptsStore.getState().addReadReceipt(receipt);
          useReadReceiptsStore.getState().addReadReceipt(receipt);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage["msg-1"]).toHaveLength(1);
      });

      it("should add receipts from different users", () => {
        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", "msg-1"));
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-2", "msg-1"));
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage["msg-1"]).toHaveLength(2);
      });
    });

    describe("removeReadReceipts", () => {
      it("should remove receipts for a message", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
          useReadReceiptsStore.getState().removeReadReceipts(messageId);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.receiptsByMessage[messageId]).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Channel Read Status Tests
  // ==========================================================================

  describe("channel read status", () => {
    describe("setChannelReadStatus", () => {
      it("should set read status for all users in a channel", () => {
        const channelId = "channel-1";
        const statuses = [
          createMockChannelStatus("user-1", channelId, "msg-5"),
          createMockChannelStatus("user-2", channelId, "msg-3"),
        ];

        act(() => {
          useReadReceiptsStore
            .getState()
            .setChannelReadStatus(channelId, statuses);
        });

        const state = useReadReceiptsStore.getState();
        expect(Object.keys(state.channelReadStatus[channelId])).toHaveLength(2);
        expect(
          state.channelReadStatus[channelId]["user-1"].lastReadMessageId,
        ).toBe("msg-5");
      });
    });

    describe("updateUserReadStatus", () => {
      it("should update a single user read status", () => {
        const status = createMockChannelStatus("user-1", "channel-1", "msg-10");

        act(() => {
          useReadReceiptsStore.getState().updateUserReadStatus(status);
        });

        const state = useReadReceiptsStore.getState();
        expect(
          state.channelReadStatus["channel-1"]["user-1"].lastReadMessageId,
        ).toBe("msg-10");
      });

      it("should create channel entry if it does not exist", () => {
        const status = createMockChannelStatus(
          "user-1",
          "new-channel",
          "msg-1",
        );

        act(() => {
          useReadReceiptsStore.getState().updateUserReadStatus(status);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.channelReadStatus["new-channel"]).toBeDefined();
      });
    });

    describe("setMyLastRead", () => {
      it("should set current user last read message", () => {
        act(() => {
          useReadReceiptsStore.getState().setMyLastRead("channel-1", "msg-5");
        });

        const state = useReadReceiptsStore.getState();
        expect(state.myLastReadByChannel["channel-1"]).toBe("msg-5");
      });

      it("should allow setting to null", () => {
        act(() => {
          useReadReceiptsStore.getState().setMyLastRead("channel-1", "msg-5");
          useReadReceiptsStore.getState().setMyLastRead("channel-1", null);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.myLastReadByChannel["channel-1"]).toBeNull();
      });
    });

    describe("getChannelReaders", () => {
      it("should return all readers for a channel", () => {
        const channelId = "channel-1";
        const statuses = [
          createMockChannelStatus("user-1", channelId),
          createMockChannelStatus("user-2", channelId),
        ];

        act(() => {
          useReadReceiptsStore
            .getState()
            .setChannelReadStatus(channelId, statuses);
        });

        const readers = useReadReceiptsStore
          .getState()
          .getChannelReaders(channelId);
        expect(readers).toHaveLength(2);
      });

      it("should return empty array for unknown channel", () => {
        const readers = useReadReceiptsStore
          .getState()
          .getChannelReaders("unknown");
        expect(readers).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // Delivery Status Tests
  // ==========================================================================

  describe("delivery status", () => {
    describe("setDeliveryStatus", () => {
      it("should set delivery status for a message", () => {
        act(() => {
          useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "sent");
        });

        const state = useReadReceiptsStore.getState();
        expect(state.deliveryStatusByMessage["msg-1"]).toBe("sent");
      });

      it("should update existing status", () => {
        act(() => {
          useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "sending");
          useReadReceiptsStore
            .getState()
            .setDeliveryStatus("msg-1", "delivered");
        });

        const state = useReadReceiptsStore.getState();
        expect(state.deliveryStatusByMessage["msg-1"]).toBe("delivered");
      });
    });

    describe("bulkSetDeliveryStatus", () => {
      it("should set multiple delivery statuses at once", () => {
        const updates: Record<string, DeliveryStatus> = {
          "msg-1": "sent",
          "msg-2": "delivered",
          "msg-3": "read",
        };

        act(() => {
          useReadReceiptsStore.getState().bulkSetDeliveryStatus(updates);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.deliveryStatusByMessage["msg-1"]).toBe("sent");
        expect(state.deliveryStatusByMessage["msg-2"]).toBe("delivered");
        expect(state.deliveryStatusByMessage["msg-3"]).toBe("read");
      });
    });
  });

  // ==========================================================================
  // Pending Reads Tests
  // ==========================================================================

  describe("pending reads batching", () => {
    describe("addPendingRead", () => {
      it("should add message to pending reads", () => {
        act(() => {
          useReadReceiptsStore.getState().addPendingRead("msg-1");
        });

        const state = useReadReceiptsStore.getState();
        expect(state.pendingReads.has("msg-1")).toBe(true);
      });

      it("should not duplicate pending reads", () => {
        act(() => {
          useReadReceiptsStore.getState().addPendingRead("msg-1");
          useReadReceiptsStore.getState().addPendingRead("msg-1");
        });

        const state = useReadReceiptsStore.getState();
        expect(state.pendingReads.size).toBe(1);
      });
    });

    describe("flushPendingReads", () => {
      it("should return and clear pending reads", () => {
        act(() => {
          useReadReceiptsStore.getState().addPendingRead("msg-1");
          useReadReceiptsStore.getState().addPendingRead("msg-2");
        });

        let flushed: string[] = [];
        act(() => {
          flushed = useReadReceiptsStore.getState().flushPendingReads();
        });

        expect(flushed).toContain("msg-1");
        expect(flushed).toContain("msg-2");
        expect(useReadReceiptsStore.getState().pendingReads.size).toBe(0);
      });
    });

    describe("clearPendingReads", () => {
      it("should clear all pending reads", () => {
        act(() => {
          useReadReceiptsStore.getState().addPendingRead("msg-1");
          useReadReceiptsStore.getState().addPendingRead("msg-2");
          useReadReceiptsStore.getState().clearPendingReads();
        });

        const state = useReadReceiptsStore.getState();
        expect(state.pendingReads.size).toBe(0);
      });
    });
  });

  // ==========================================================================
  // Query Methods Tests
  // ==========================================================================

  describe("query methods", () => {
    describe("getReadBy", () => {
      it("should return receipts for a message", () => {
        const messageId = "msg-1";
        const receipts = [
          createMockReceipt("user-1", messageId),
          createMockReceipt("user-2", messageId),
        ];

        act(() => {
          useReadReceiptsStore.getState().setReadReceipts(messageId, receipts);
        });

        const readBy = useReadReceiptsStore.getState().getReadBy(messageId);
        expect(readBy).toHaveLength(2);
      });

      it("should return empty array for unknown message", () => {
        const readBy = useReadReceiptsStore.getState().getReadBy("unknown");
        expect(readBy).toEqual([]);
      });
    });

    describe("getReadCount", () => {
      it("should return count of readers", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-2", messageId));
        });

        const count = useReadReceiptsStore.getState().getReadCount(messageId);
        expect(count).toBe(2);
      });

      it("should return 0 for unread message", () => {
        const count = useReadReceiptsStore.getState().getReadCount("unknown");
        expect(count).toBe(0);
      });
    });

    describe("hasUserRead", () => {
      it("should return true if user has read", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
        });

        const hasRead = useReadReceiptsStore
          .getState()
          .hasUserRead(messageId, "user-1");
        expect(hasRead).toBe(true);
      });

      it("should return false if user has not read", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
        });

        const hasRead = useReadReceiptsStore
          .getState()
          .hasUserRead(messageId, "user-2");
        expect(hasRead).toBe(false);
      });
    });

    describe("getMessageStatus", () => {
      it("should return read status when receipts exist", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore.getState().setDeliveryStatus(messageId, "sent");
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
        });

        const status = useReadReceiptsStore
          .getState()
          .getMessageStatus(messageId);
        expect(status.deliveryStatus).toBe("read");
        expect(status.readBy).toHaveLength(1);
      });

      it("should return sent status when no receipts", () => {
        const messageId = "msg-1";

        act(() => {
          useReadReceiptsStore.getState().setDeliveryStatus(messageId, "sent");
        });

        const status = useReadReceiptsStore
          .getState()
          .getMessageStatus(messageId);
        expect(status.deliveryStatus).toBe("sent");
        expect(status.readBy).toHaveLength(0);
      });

      it("should calculate allRead correctly", () => {
        const messageId = "msg-1";
        const totalRecipients = 3;

        act(() => {
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-1", messageId));
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-2", messageId));
          useReadReceiptsStore
            .getState()
            .addReadReceipt(createMockReceipt("user-3", messageId));
        });

        const status = useReadReceiptsStore
          .getState()
          .getMessageStatus(messageId, totalRecipients);
        expect(status.allRead).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Settings Tests
  // ==========================================================================

  describe("settings", () => {
    describe("setShowReadReceipts", () => {
      it("should update show read receipts setting", () => {
        act(() => {
          useReadReceiptsStore.getState().setShowReadReceipts(false);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.showReadReceipts).toBe(false);
      });
    });

    describe("setShareReadReceipts", () => {
      it("should update share read receipts setting", () => {
        act(() => {
          useReadReceiptsStore.getState().setShareReadReceipts(false);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.shareReadReceipts).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should reset store to initial state", () => {
      // Populate store with data
      act(() => {
        useReadReceiptsStore
          .getState()
          .addReadReceipt(createMockReceipt("user-1", "msg-1"));
        useReadReceiptsStore.getState().setDeliveryStatus("msg-1", "read");
        useReadReceiptsStore.getState().setMyLastRead("channel-1", "msg-5");
        useReadReceiptsStore.getState().setShowReadReceipts(false);
      });

      // Reset
      act(() => {
        useReadReceiptsStore.getState().reset();
      });

      const state = useReadReceiptsStore.getState();
      expect(state.receiptsByMessage).toEqual({});
      expect(state.deliveryStatusByMessage).toEqual({});
      expect(state.myLastReadByChannel).toEqual({});
      expect(state.showReadReceipts).toBe(true);
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("loading states", () => {
    describe("setLoadingChannel", () => {
      it("should add channel to loading set", () => {
        act(() => {
          useReadReceiptsStore.getState().setLoadingChannel("channel-1", true);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.loadingChannels.has("channel-1")).toBe(true);
      });

      it("should remove channel from loading set", () => {
        act(() => {
          useReadReceiptsStore.getState().setLoadingChannel("channel-1", true);
          useReadReceiptsStore.getState().setLoadingChannel("channel-1", false);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.loadingChannels.has("channel-1")).toBe(false);
      });
    });

    describe("setLoadingMessage", () => {
      it("should add message to loading set", () => {
        act(() => {
          useReadReceiptsStore.getState().setLoadingMessage("msg-1", true);
        });

        const state = useReadReceiptsStore.getState();
        expect(state.loadingMessages.has("msg-1")).toBe(true);
      });
    });
  });
});
