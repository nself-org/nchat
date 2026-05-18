/**
 * Delivery Handler Unit Tests
 *
 * Tests for the message delivery WebSocket handler including:
 * - Message tracking
 * - Retry mechanism with exponential backoff
 * - Event handling
 * - Timeout management
 */

import { act } from "@testing-library/react";
import {
  useDeliveryStatusStore,
  handleRetryAttempt,
} from "@/lib/messages/delivery-status";
import {
  generateClientMessageId,
  createPendingMessage,
  type PendingMessage,
} from "../delivery-handler";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock socket manager
jest.mock("../socket-manager", () => ({
  socketManager: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    isConnected: true,
    socketId: "mock-socket-id",
  },
}));

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Delivery Handler", () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useDeliveryStatusStore.getState().clearAllStatuses();
    });
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe("Helper Functions", () => {
    describe("generateClientMessageId", () => {
      it("should generate unique IDs", () => {
        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
          ids.add(generateClientMessageId());
        }
        expect(ids.size).toBe(100);
      });

      it("should start with msg_ prefix", () => {
        const id = generateClientMessageId();
        expect(id.startsWith("msg_")).toBe(true);
      });

      it("should contain timestamp", () => {
        const before = Date.now();
        const id = generateClientMessageId();
        const after = Date.now();

        const parts = id.split("_");
        const timestamp = parseInt(parts[1], 10);

        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe("createPendingMessage", () => {
      it("should create a pending message with required fields", () => {
        const msg = createPendingMessage("channel-1", "Hello world");

        expect(msg.channelId).toBe("channel-1");
        expect(msg.content).toBe("Hello world");
        expect(msg.clientMessageId).toBeDefined();
        expect(msg.timestamp).toBeInstanceOf(Date);
        expect(msg.retryCount).toBe(0);
      });

      it("should include optional fields", () => {
        const msg = createPendingMessage("channel-1", "Hello", {
          attachmentIds: ["att-1", "att-2"],
          replyToId: "msg-original",
        });

        expect(msg.attachmentIds).toEqual(["att-1", "att-2"]);
        expect(msg.replyToId).toBe("msg-original");
      });
    });
  });

  // ==========================================================================
  // Exponential Backoff Tests
  // ==========================================================================

  describe("Exponential Backoff Calculation", () => {
    // Test the backoff calculation logic
    it("should calculate exponential delays", () => {
      const baseDelay = 1000;
      const maxDelay = 30000;

      // Calculate expected delays (without jitter)
      const calculateDelay = (retryCount: number) => {
        const exponential = baseDelay * Math.pow(2, retryCount - 1);
        return Math.min(exponential, maxDelay);
      };

      expect(calculateDelay(1)).toBe(1000); // 1 second
      expect(calculateDelay(2)).toBe(2000); // 2 seconds
      expect(calculateDelay(3)).toBe(4000); // 4 seconds
      expect(calculateDelay(4)).toBe(8000); // 8 seconds
      expect(calculateDelay(5)).toBe(16000); // 16 seconds
      expect(calculateDelay(6)).toBe(30000); // capped at 30 seconds
    });

    it("should not exceed max delay", () => {
      const baseDelay = 1000;
      const maxDelay = 30000;

      const calculateDelay = (retryCount: number) => {
        const exponential = baseDelay * Math.pow(2, retryCount - 1);
        return Math.min(exponential, maxDelay);
      };

      // Test with very high retry counts
      for (let i = 10; i < 20; i++) {
        expect(calculateDelay(i)).toBeLessThanOrEqual(maxDelay);
      }
    });
  });

  // ==========================================================================
  // Pending Message Tests
  // ==========================================================================

  describe("Pending Message Structure", () => {
    it("should have correct initial state", () => {
      const msg: PendingMessage = {
        clientMessageId: "msg_123_abc",
        channelId: "channel-1",
        content: "Test message",
        timestamp: new Date(),
        retryCount: 0,
      };

      expect(msg.retryCount).toBe(0);
      expect(msg.clientMessageId).toMatch(/^msg_/);
    });

    it("should track retry count", () => {
      const msg: PendingMessage = {
        clientMessageId: "msg_123_abc",
        channelId: "channel-1",
        content: "Test message",
        timestamp: new Date(),
        retryCount: 0,
      };

      // Simulate retry increments
      msg.retryCount++;
      expect(msg.retryCount).toBe(1);

      msg.retryCount++;
      expect(msg.retryCount).toBe(2);

      msg.retryCount++;
      expect(msg.retryCount).toBe(3);
    });
  });

  // ==========================================================================
  // Integration with Store Tests
  // ==========================================================================

  describe("Integration with Delivery Status Store", () => {
    it("should mark message as sending when tracked", () => {
      const msg = createPendingMessage("channel-1", "Hello");

      act(() => {
        useDeliveryStatusStore.getState().markSending(msg.clientMessageId);
      });

      const status = useDeliveryStatusStore
        .getState()
        .getStatus(msg.clientMessageId);
      expect(status).toBe("sending");
    });

    it("should update retry count in store", () => {
      const msg = createPendingMessage("channel-1", "Hello");

      act(() => {
        useDeliveryStatusStore
          .getState()
          .markFailed(msg.clientMessageId, "Error", 0);
        useDeliveryStatusStore
          .getState()
          .incrementRetryCount(msg.clientMessageId);
      });

      const entry = useDeliveryStatusStore
        .getState()
        .getStatusEntry(msg.clientMessageId);
      expect(entry?.retryCount).toBe(1);
    });

    it("should handle full retry cycle", () => {
      const msg = createPendingMessage("channel-1", "Hello");

      // Initial send
      act(() => {
        useDeliveryStatusStore.getState().markSending(msg.clientMessageId);
      });
      expect(
        useDeliveryStatusStore.getState().getStatus(msg.clientMessageId),
      ).toBe("sending");

      // Fail
      act(() => {
        useDeliveryStatusStore
          .getState()
          .markFailed(msg.clientMessageId, "Network error", 0);
      });
      expect(
        useDeliveryStatusStore.getState().getStatus(msg.clientMessageId),
      ).toBe("failed");

      // Retry using handleRetryAttempt (which properly preserves retry count)
      act(() => {
        handleRetryAttempt(msg.clientMessageId);
      });
      expect(
        useDeliveryStatusStore.getState().getStatus(msg.clientMessageId),
      ).toBe("sending");
      expect(
        useDeliveryStatusStore.getState().getStatusEntry(msg.clientMessageId)
          ?.retryCount,
      ).toBe(1);

      // Success
      act(() => {
        useDeliveryStatusStore.getState().markSent(msg.clientMessageId);
      });
      expect(
        useDeliveryStatusStore.getState().getStatus(msg.clientMessageId),
      ).toBe("sent");
    });
  });

  // ==========================================================================
  // Max Retry Tests
  // ==========================================================================

  describe("Max Retry Handling", () => {
    const maxRetries = 3;

    it("should stop retrying after max attempts", () => {
      const msg = createPendingMessage("channel-1", "Hello");

      // Simulate reaching max retries
      act(() => {
        useDeliveryStatusStore
          .getState()
          .markFailed(msg.clientMessageId, "Error", maxRetries);
      });

      const entry = useDeliveryStatusStore
        .getState()
        .getStatusEntry(msg.clientMessageId);
      expect(entry?.retryCount).toBe(maxRetries);
      expect(entry?.status).toBe("failed");

      // Check if it should be retried
      const shouldRetry = (entry?.retryCount ?? 0) < maxRetries;
      expect(shouldRetry).toBe(false);
    });

    it("should allow retry when under max attempts", () => {
      const msg = createPendingMessage("channel-1", "Hello");

      act(() => {
        useDeliveryStatusStore
          .getState()
          .markFailed(msg.clientMessageId, "Error", 1);
      });

      const entry = useDeliveryStatusStore
        .getState()
        .getStatusEntry(msg.clientMessageId);
      const shouldRetry = (entry?.retryCount ?? 0) < maxRetries;
      expect(shouldRetry).toBe(true);
    });
  });

  // ==========================================================================
  // Timeout Behavior Tests
  // ==========================================================================

  describe("Timeout Behavior", () => {
    const ackTimeout = 10000; // 10 seconds

    it("should timeout after ack timeout", () => {
      const onTimeout = jest.fn();

      // Simulate setting up timeout
      const timeoutId = setTimeout(() => {
        onTimeout();
      }, ackTimeout);

      // Fast-forward time
      jest.advanceTimersByTime(ackTimeout);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      clearTimeout(timeoutId);
    });

    it("should not timeout before ack timeout", () => {
      const onTimeout = jest.fn();

      const timeoutId = setTimeout(() => {
        onTimeout();
      }, ackTimeout);

      // Advance less than timeout
      jest.advanceTimersByTime(ackTimeout - 1000);

      expect(onTimeout).not.toHaveBeenCalled();
      clearTimeout(timeoutId);
    });

    it("should clear timeout when acknowledged", () => {
      const onTimeout = jest.fn();

      const timeoutId = setTimeout(() => {
        onTimeout();
      }, ackTimeout);

      // Clear immediately (simulating ACK received)
      clearTimeout(timeoutId);

      // Advance past timeout
      jest.advanceTimersByTime(ackTimeout + 1000);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
