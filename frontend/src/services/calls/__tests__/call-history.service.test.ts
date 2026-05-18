/**
 * @fileoverview Tests for CallHistoryService
 */

import {
  CallHistoryService,
  createCallHistoryService,
  formatCallDuration,
  formatCallTime,
  getCallStatusLabel,
  type CallHistoryEntry,
} from "../call-history.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock Apollo Client
jest.mock("@/lib/apollo-client", () => ({
  apolloClient: {
    query: jest.fn(),
    mutate: jest.fn(),
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// =============================================================================
// Test Data
// =============================================================================

const mockCallsData = [
  {
    id: "call-1",
    call_id: "call-abc123",
    type: "voice",
    status: "ended",
    started_at: "2026-02-08T10:00:00Z",
    ended_at: "2026-02-08T10:05:00Z",
    duration: 300,
    caller_id: "user-456",
    channel_id: null,
    caller: {
      id: "user-456",
      username: "johndoe",
      display_name: "John Doe",
      avatar_url: "https://example.com/avatar.jpg",
    },
    participants: [
      {
        user_id: "user-123",
        user: {
          id: "user-123",
          username: "testuser",
          display_name: "Test User",
          avatar_url: null,
        },
      },
      {
        user_id: "user-456",
        user: {
          id: "user-456",
          username: "johndoe",
          display_name: "John Doe",
          avatar_url: null,
        },
      },
    ],
  },
  {
    id: "call-2",
    call_id: "call-def456",
    type: "video",
    status: "missed",
    started_at: "2026-02-08T09:00:00Z",
    ended_at: null,
    duration: 0,
    caller_id: "user-789",
    channel_id: "channel-1",
    caller: {
      id: "user-789",
      username: "janedoe",
      display_name: "Jane Doe",
      avatar_url: null,
    },
    participants: [
      {
        user_id: "user-123",
        user: {
          id: "user-123",
          username: "testuser",
          display_name: "Test User",
          avatar_url: null,
        },
      },
    ],
  },
];

// =============================================================================
// Tests
// =============================================================================

describe("CallHistoryService", () => {
  let service: CallHistoryService;
  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = createCallHistoryService(userId);
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("Initialization", () => {
    it("should create service instance", () => {
      expect(service).toBeInstanceOf(CallHistoryService);
    });

    it("should create service with factory function", () => {
      const factoryService = createCallHistoryService(userId);
      expect(factoryService).toBeInstanceOf(CallHistoryService);
    });
  });

  // ===========================================================================
  // Fetch History Tests
  // ===========================================================================

  describe("Fetch History", () => {
    it("should fetch call history", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const history = await service.getHistory();

      expect(apolloClient.query).toHaveBeenCalled();
      expect(history).toHaveLength(2);
    });

    it("should transform calls to history entries", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const history = await service.getHistory();

      expect(history[0]).toMatchObject({
        id: "call-1",
        callId: "call-abc123",
        type: "voice",
        direction: "incoming",
        status: "completed",
        duration: 300,
      });
    });

    it("should get recent calls with limit", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData.slice(0, 1) },
      });

      const recent = await service.getRecentCalls(5);

      expect(apolloClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ limit: 5 }),
        }),
      );
    });

    it("should get missed calls", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: [mockCallsData[1]] },
      });

      const missed = await service.getMissedCalls();

      expect(missed.every((c) => c.isMissed)).toBe(true);
    });

    it("should handle fetch error", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.getHistory()).rejects.toThrow("Network error");
    });
  });

  // ===========================================================================
  // Filter Tests
  // ===========================================================================

  describe("Filtering", () => {
    it("should filter by type", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const history = await service.getHistory(50, 0, { type: "voice" });

      expect(history.every((c) => c.type === "voice")).toBe(true);
    });

    it("should filter by direction", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const history = await service.getHistory(50, 0, {
        direction: "incoming",
      });

      expect(history.every((c) => c.direction === "incoming")).toBe(true);
    });

    it("should filter by missed status", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const history = await service.getHistory(50, 0, { isMissed: true });

      expect(history.every((c) => c.isMissed)).toBe(true);
    });
  });

  // ===========================================================================
  // Missed Calls Count Tests
  // ===========================================================================

  describe("Missed Calls Count", () => {
    it("should get missed calls count", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls_aggregate: { aggregate: { count: 5 } } },
      });

      const count = await service.getMissedCallsCount();

      expect(count).toBe(5);
    });

    it("should return 0 on error", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockRejectedValueOnce(new Error("Network error"));

      const count = await service.getMissedCallsCount();

      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // Mark As Read Tests
  // ===========================================================================

  describe("Mark As Read", () => {
    it("should mark call as read", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.mutate.mockResolvedValueOnce({
        data: { update_nchat_call_participants: { affected_rows: 1 } },
      });

      await service.markAsRead("call-1");

      expect(apolloClient.mutate).toHaveBeenCalled();
    });

    it("should update cache when marking as read", async () => {
      const { apolloClient } = require("@/lib/apollo-client");

      // First, populate cache
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });
      await service.getHistory();

      // Then mark as read
      apolloClient.mutate.mockResolvedValueOnce({
        data: { update_nchat_call_participants: { affected_rows: 1 } },
      });
      await service.markAsRead("call-1");

      const cached = service.getCachedHistory();
      const entry = cached.find((c) => c.id === "call-1");
      expect(entry?.isRead).toBe(true);
    });
  });

  // ===========================================================================
  // Delete Entry Tests
  // ===========================================================================

  describe("Delete Entry", () => {
    it("should delete call history entry", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.mutate.mockResolvedValueOnce({
        data: { update_nchat_call_participants: { affected_rows: 1 } },
      });

      await service.deleteEntry("call-1");

      expect(apolloClient.mutate).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Clear History Tests
  // ===========================================================================

  describe("Clear History", () => {
    it("should clear all call history", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.mutate.mockResolvedValueOnce({
        data: { update_nchat_call_participants: { affected_rows: 10 } },
      });

      await service.clearHistory();

      expect(apolloClient.mutate).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Statistics Tests
  // ===========================================================================

  describe("Statistics", () => {
    it("should calculate call statistics", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const stats = await service.getStats();

      expect(stats.totalCalls).toBe(2);
      expect(stats.missedCalls).toBe(1);
      expect(stats.totalDuration).toBeGreaterThan(0);
    });

    it("should calculate average duration", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      const stats = await service.getStats();

      expect(stats.averageDuration).toBe(300); // Only one completed call with 300s
    });
  });

  // ===========================================================================
  // Local Storage Tests
  // ===========================================================================

  describe("Local Storage", () => {
    it("should add local entry", () => {
      const entry = service.addLocalEntry({
        callId: "local-call",
        type: "voice",
        direction: "outgoing",
        status: "completed",
        participantId: "user-456",
        participantName: "John",
        startedAt: new Date(),
        duration: 60,
        isMissed: false,
      });

      expect(entry.id).toBe("local-call");
    });

    it("should load from local storage", () => {
      const storedData: CallHistoryEntry[] = [
        {
          id: "stored-1",
          callId: "stored-call",
          type: "voice",
          direction: "incoming",
          status: "completed",
          participantId: "user-456",
          participantName: "John",
          startedAt: new Date("2026-02-08T10:00:00Z"),
          duration: 120,
          isMissed: false,
          isRead: true,
        },
      ];

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedData));

      service.loadFromLocalStorage();

      const cached = service.getCachedHistory();
      expect(cached).toHaveLength(1);
      expect(cached[0].callId).toBe("stored-call");
    });
  });

  // ===========================================================================
  // Cache Tests
  // ===========================================================================

  describe("Cache Management", () => {
    it("should check cache validity", () => {
      expect(service.isCacheValid()).toBe(false);
    });

    it("should invalidate cache", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      await service.getHistory();
      service.invalidateCache();

      expect(service.isCacheValid()).toBe(false);
    });

    it("should return cached history sorted by date", async () => {
      const { apolloClient } = require("@/lib/apollo-client");
      apolloClient.query.mockResolvedValueOnce({
        data: { nchat_calls: mockCallsData },
      });

      await service.getHistory();
      const cached = service.getCachedHistory();

      expect(cached[0].startedAt.getTime()).toBeGreaterThanOrEqual(
        cached[1].startedAt.getTime(),
      );
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe("Utility Functions", () => {
  describe("formatCallDuration", () => {
    it("should format zero duration", () => {
      expect(formatCallDuration(0)).toBe("0:00");
    });

    it("should format seconds only", () => {
      expect(formatCallDuration(45)).toBe("0:45");
    });

    it("should format minutes and seconds", () => {
      expect(formatCallDuration(125)).toBe("2:05");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatCallDuration(3725)).toBe("1:02:05");
    });
  });

  describe("formatCallTime", () => {
    it("should format today time", () => {
      const now = new Date();
      const result = formatCallTime(now);
      expect(result).toMatch(/^\d{1,2}:\d{2}/);
    });

    it("should format yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatCallTime(yesterday);
      expect(result).toBe("Yesterday");
    });

    it("should format day of week for recent dates", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = formatCallTime(threeDaysAgo);
      expect(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).toContain(
        result,
      );
    });
  });

  describe("getCallStatusLabel", () => {
    it("should return outgoing call label", () => {
      expect(getCallStatusLabel("completed", "outgoing")).toBe("Outgoing call");
    });

    it("should return incoming call label", () => {
      expect(getCallStatusLabel("completed", "incoming")).toBe("Incoming call");
    });

    it("should return missed call label", () => {
      expect(getCallStatusLabel("missed", "incoming")).toBe("Missed call");
    });

    it("should return declined label for outgoing", () => {
      expect(getCallStatusLabel("declined", "outgoing")).toBe("Not answered");
    });

    it("should return declined label for incoming", () => {
      expect(getCallStatusLabel("declined", "incoming")).toBe("Declined");
    });

    it("should return cancelled label", () => {
      expect(getCallStatusLabel("cancelled", "outgoing")).toBe("Cancelled");
    });

    it("should return failed label", () => {
      expect(getCallStatusLabel("failed", "outgoing")).toBe("Failed");
    });
  });
});
