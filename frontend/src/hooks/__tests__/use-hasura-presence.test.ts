/**
 * useHasuraPresence Hook Tests
 *
 * Tests for the useHasuraPresence and useMyPresence hooks that manage
 * real-time presence state via Hasura GraphQL subscriptions and mutations.
 */

import { renderHook, act } from "@testing-library/react";
import { useSubscription, useMutation } from "@apollo/client";
import { useHasuraPresence, useMyPresence } from "../use-hasura-presence";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Mock Apollo Client
// ============================================================================

jest.mock("@apollo/client", () => {
  const actual = jest.requireActual("@apollo/client");
  return {
    ...actual,
    useSubscription: jest.fn(),
    useMutation: jest.fn(),
  };
});

// ============================================================================
// Mock Auth Context
// ============================================================================

jest.mock("@/contexts/auth-context", () => ({
  useAuth: jest.fn(),
}));

const mockUseSubscription = useSubscription as jest.MockedFunction<
  typeof useSubscription
>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ============================================================================
// Test Data
// ============================================================================

const createMockPresence = (
  userId: string,
  status: string,
  lastSeenOffset = 0,
) => ({
  user_id: userId,
  status,
  last_seen: new Date(Date.now() - lastSeenOffset).toISOString(),
  custom_status: null,
  custom_status_emoji: null,
});

const mockPresenceData = [
  createMockPresence("user-1", "online", 0),
  createMockPresence("user-2", "away", 60000), // 1 minute ago
  createMockPresence("user-3", "dnd", 120000), // 2 minutes ago
];

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("useHasuraPresence Hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockUseSubscription.mockReturnValue({
      data: null,
      loading: false,
      error: undefined,
    } as any);

    mockUseAuth.mockReturnValue({
      user: { id: "current-user-id", email: "test@example.com" },
      isAuthenticated: true,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // useHasuraPresence Tests
  // ==========================================================================

  describe("useHasuraPresence", () => {
    it("should return presence map from subscription", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() =>
        useHasuraPresence(["user-1", "user-2", "user-3"]),
      );

      expect(result.current.presenceMap.size).toBe(3);
      expect(result.current.presenceMap.get("user-1")?.status).toBe("online");
      expect(result.current.presenceMap.get("user-2")?.status).toBe("away");
      expect(result.current.presenceMap.get("user-3")?.status).toBe("dnd");
    });

    it("should return loading state", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: true,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-1"]));

      expect(result.current.loading).toBe(true);
    });

    it("getPresence returns correct presence for user", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() =>
        useHasuraPresence(["user-1", "user-2", "user-3"]),
      );

      const presence = result.current.getPresence("user-1");

      expect(presence.user_id).toBe("user-1");
      expect(presence.status).toBe("online");
    });

    it("getPresence returns offline default for unknown user", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() =>
        useHasuraPresence(["user-1", "user-2", "user-3"]),
      );

      const presence = result.current.getPresence("unknown-user");

      expect(presence.user_id).toBe("unknown-user");
      expect(presence.status).toBe("offline");
      expect(presence.last_seen).toBe("");
    });

    it("isOnline correctly determines online status based on last_seen", () => {
      // Create presence data with specific timestamps
      const recentPresence = createMockPresence("user-recent", "online", 60000); // 1 minute ago
      const stalePresence = createMockPresence(
        "user-stale",
        "online",
        10 * 60 * 1000,
      ); // 10 minutes ago

      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: [recentPresence, stalePresence] },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() =>
        useHasuraPresence(["user-recent", "user-stale"]),
      );

      // User seen 1 minute ago should be online (within 5 minute threshold)
      expect(result.current.isOnline("user-recent")).toBe(true);

      // User seen 10 minutes ago should be offline (beyond 5 minute threshold)
      expect(result.current.isOnline("user-stale")).toBe(false);
    });

    it("isOnline returns false for unknown user", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-1"]));

      expect(result.current.isOnline("unknown-user")).toBe(false);
    });

    it("skips subscription when userIds is empty", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as any);

      renderHook(() => useHasuraPresence([]));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true }),
      );
    });

    it("should call subscription with correct variables", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const userIds = ["user-1", "user-2"];
      renderHook(() => useHasuraPresence(userIds));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { userIds },
          skip: false,
        }),
      );
    });

    it("should handle null data gracefully", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-1"]));

      expect(result.current.presenceMap.size).toBe(0);
      expect(result.current.getPresence("user-1").status).toBe("offline");
    });

    it("should handle undefined nchat_presence gracefully", () => {
      mockUseSubscription.mockReturnValue({
        data: {},
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-1"]));

      expect(result.current.presenceMap.size).toBe(0);
    });

    it("should update presenceMap when subscription data changes", () => {
      const initialData = {
        nchat_presence: [createMockPresence("user-1", "online", 0)],
      };

      mockUseSubscription.mockReturnValue({
        data: initialData,
        loading: false,
        error: undefined,
      } as any);

      const { result, rerender } = renderHook(() =>
        useHasuraPresence(["user-1"]),
      );

      expect(result.current.presenceMap.get("user-1")?.status).toBe("online");

      // Simulate subscription update
      const updatedData = {
        nchat_presence: [createMockPresence("user-1", "away", 0)],
      };
      mockUseSubscription.mockReturnValue({
        data: updatedData,
        loading: false,
        error: undefined,
      } as any);

      rerender();

      expect(result.current.presenceMap.get("user-1")?.status).toBe("away");
    });
  });

  // ==========================================================================
  // useMyPresence Tests
  // ==========================================================================

  describe("useMyPresence", () => {
    let mockUpdatePresenceMutation: jest.Mock;
    let mockHeartbeatMutation: jest.Mock;

    beforeEach(() => {
      mockUpdatePresenceMutation = jest.fn().mockResolvedValue({
        data: {
          insert_nchat_presence_one: {
            user_id: "current-user-id",
            status: "online",
          },
        },
      });

      mockHeartbeatMutation = jest.fn().mockResolvedValue({
        data: { update_nchat_presence_by_pk: { user_id: "current-user-id" } },
      });

      mockUseMutation
        .mockReturnValueOnce([
          mockUpdatePresenceMutation,
          { data: null, loading: false },
        ] as any)
        .mockReturnValueOnce([
          mockHeartbeatMutation,
          { data: null, loading: false },
        ] as any);
    });

    it("setStatus calls mutation correctly", async () => {
      const { result } = renderHook(() => useMyPresence());

      // Clear the initial 'online' call from mount
      mockUpdatePresenceMutation.mockClear();

      await act(async () => {
        await result.current.setStatus("dnd", "Focusing", "🎯");
      });

      expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({
        variables: {
          userId: "current-user-id",
          status: "dnd",
          customStatus: "Focusing",
          customStatusEmoji: "🎯",
        },
      });
    });

    it("setStatus calls mutation with away status", async () => {
      const { result } = renderHook(() => useMyPresence());

      mockUpdatePresenceMutation.mockClear();

      await act(async () => {
        await result.current.setStatus("away");
      });

      expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({
        variables: {
          userId: "current-user-id",
          status: "away",
          customStatus: undefined,
          customStatusEmoji: undefined,
        },
      });
    });

    it("heartbeat is sent periodically", async () => {
      renderHook(() => useMyPresence());

      // Initial state - no heartbeats yet (only setStatus('online') called)
      expect(mockHeartbeatMutation).not.toHaveBeenCalled();

      // Advance by 30 seconds (HEARTBEAT_INTERVAL)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockHeartbeatMutation).toHaveBeenCalledTimes(1);
      expect(mockHeartbeatMutation).toHaveBeenCalledWith({
        variables: { userId: "current-user-id" },
      });

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockHeartbeatMutation).toHaveBeenCalledTimes(2);
    });

    it("sets online on mount", () => {
      renderHook(() => useMyPresence());

      expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({
        variables: {
          userId: "current-user-id",
          status: "online",
          customStatus: undefined,
          customStatusEmoji: undefined,
        },
      });
    });

    it("sets offline on unmount", () => {
      const { unmount } = renderHook(() => useMyPresence());

      mockUpdatePresenceMutation.mockClear();

      unmount();

      expect(mockUpdatePresenceMutation).toHaveBeenCalledWith({
        variables: {
          userId: "current-user-id",
          status: "offline",
          customStatus: undefined,
          customStatusEmoji: undefined,
        },
      });
    });

    it("clears heartbeat interval on unmount", () => {
      const { unmount } = renderHook(() => useMyPresence());

      // Advance time to ensure heartbeat would fire
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockHeartbeatMutation).toHaveBeenCalledTimes(1);

      unmount();

      // Advance time again - no more heartbeats should be sent
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Still only 1 call (the one before unmount)
      expect(mockHeartbeatMutation).toHaveBeenCalledTimes(1);
    });

    it("does not call mutations when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      // Reset mutation mocks
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockUpdatePresenceMutation,
          { data: null, loading: false },
        ] as any)
        .mockReturnValueOnce([
          mockHeartbeatMutation,
          { data: null, loading: false },
        ] as any);

      renderHook(() => useMyPresence());

      // setStatus should not be called when there's no user
      expect(mockUpdatePresenceMutation).not.toHaveBeenCalled();

      // Heartbeat should not be set up
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockHeartbeatMutation).not.toHaveBeenCalled();
    });

    it("setStatus does nothing when user id is not available", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      } as any);

      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockUpdatePresenceMutation,
          { data: null, loading: false },
        ] as any)
        .mockReturnValueOnce([
          mockHeartbeatMutation,
          { data: null, loading: false },
        ] as any);

      const { result } = renderHook(() => useMyPresence());

      await act(async () => {
        await result.current.setStatus("online");
      });

      expect(mockUpdatePresenceMutation).not.toHaveBeenCalled();
    });

    it("returns setStatus function", () => {
      const { result } = renderHook(() => useMyPresence());

      expect(result.current.setStatus).toBeDefined();
      expect(typeof result.current.setStatus).toBe("function");
    });

    it("handles multiple status changes", async () => {
      const { result } = renderHook(() => useMyPresence());

      // Clear the initial mount call
      mockUpdatePresenceMutation.mockClear();

      await act(async () => {
        await result.current.setStatus("away");
      });

      await act(async () => {
        await result.current.setStatus("dnd", "In a meeting", "📅");
      });

      await act(async () => {
        await result.current.setStatus("online");
      });

      expect(mockUpdatePresenceMutation).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("useHasuraPresence handles presence with custom status", () => {
      const presenceWithCustom = {
        user_id: "user-custom",
        status: "dnd",
        last_seen: new Date().toISOString(),
        custom_status: "In a meeting",
        custom_status_emoji: "📅",
      };

      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: [presenceWithCustom] },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-custom"]));

      const presence = result.current.getPresence("user-custom");

      expect(presence.custom_status).toBe("In a meeting");
      expect(presence.custom_status_emoji).toBe("📅");
    });

    it("isOnline handles exactly at threshold boundary", () => {
      // Create presence exactly at 5 minute threshold
      const AWAY_THRESHOLD = 5 * 60 * 1000;
      const boundaryPresence = createMockPresence(
        "user-boundary",
        "online",
        AWAY_THRESHOLD,
      );

      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: [boundaryPresence] },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() => useHasuraPresence(["user-boundary"]));

      // At exactly the threshold, should be offline (not less than threshold)
      expect(result.current.isOnline("user-boundary")).toBe(false);
    });

    it("isOnline handles just under threshold", () => {
      // Create presence just under 5 minute threshold
      const AWAY_THRESHOLD = 5 * 60 * 1000;
      const justUnderPresence = createMockPresence(
        "user-just-under",
        "online",
        AWAY_THRESHOLD - 1,
      );

      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: [justUnderPresence] },
        loading: false,
        error: undefined,
      } as any);

      const { result } = renderHook(() =>
        useHasuraPresence(["user-just-under"]),
      );

      // Just under threshold should still be online
      expect(result.current.isOnline("user-just-under")).toBe(true);
    });

    it("useHasuraPresence handles user id changes", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_presence: mockPresenceData },
        loading: false,
        error: undefined,
      } as any);

      const { rerender } = renderHook(
        ({ userIds }) => useHasuraPresence(userIds),
        {
          initialProps: { userIds: ["user-1"] },
        },
      );

      expect(mockUseSubscription).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { userIds: ["user-1"] },
        }),
      );

      rerender({ userIds: ["user-1", "user-2", "user-3"] });

      expect(mockUseSubscription).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { userIds: ["user-1", "user-2", "user-3"] },
        }),
      );
    });
  });
});
