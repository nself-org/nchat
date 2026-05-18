/**
 * useReadReceipts Hook Tests
 *
 * Tests for the useChannelReadStatus and useMarkRead hooks which provide
 * real-time read receipt subscription and mutation functions.
 */

import { renderHook, act } from "@testing-library/react";
import { useSubscription, useMutation } from "@apollo/client";
import { useChannelReadStatus, useMarkRead } from "../use-read-receipts";
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

const currentUserId = "current-user-id";
const testChannelId = "channel-123";

const createMockReadStatus = (
  userId: string,
  channelId: string,
  messageId: string | undefined,
  displayName: string,
) => ({
  user_id: userId,
  channel_id: channelId,
  last_read_message_id: messageId,
  last_read_at: new Date().toISOString(),
  user: {
    id: userId,
    display_name: displayName,
    avatar_url: `https://example.com/${userId}.png`,
  },
});

const mockReadStatuses = [
  createMockReadStatus("user-1", testChannelId, "msg-5", "Alice"),
  createMockReadStatus("user-2", testChannelId, "msg-5", "Bob"),
  createMockReadStatus("user-3", testChannelId, "msg-3", "Charlie"),
  createMockReadStatus(currentUserId, testChannelId, "msg-5", "Current User"),
];

// ============================================================================
// useChannelReadStatus Tests
// ============================================================================

describe("useChannelReadStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default subscription mock
    mockUseSubscription.mockReturnValue({
      data: null,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useSubscription>);
  });

  // ==========================================================================
  // Read Statuses from Subscription Tests
  // ==========================================================================

  describe("returns read statuses from subscription", () => {
    it("should return read statuses when subscription has data", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.readStatuses).toHaveLength(4);
      expect(result.current.readStatuses[0].user_id).toBe("user-1");
      expect(result.current.readStatuses[0].user?.display_name).toBe("Alice");
    });

    it("should return empty array when no read statuses", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: [] },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.readStatuses).toHaveLength(0);
    });

    it("should return empty array when data is null", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.readStatuses).toHaveLength(0);
    });

    it("should return empty array when data is undefined", () => {
      mockUseSubscription.mockReturnValue({
        data: undefined,
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.readStatuses).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getReadBy Tests
  // ==========================================================================

  describe("getReadBy", () => {
    it("should return users who read a specific message", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      const readByMsg5 = result.current.getReadBy("msg-5");
      expect(readByMsg5).toHaveLength(3);
      expect(readByMsg5.map((s) => s.user?.display_name)).toEqual([
        "Alice",
        "Bob",
        "Current User",
      ]);
    });

    it("should return users who read a different message", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      const readByMsg3 = result.current.getReadBy("msg-3");
      expect(readByMsg3).toHaveLength(1);
      expect(readByMsg3[0].user?.display_name).toBe("Charlie");
    });

    it("should return empty array when no one has read the message", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      const readByNonExistent = result.current.getReadBy("msg-999");
      expect(readByNonExistent).toHaveLength(0);
    });

    it("should return empty array when readStatuses is empty", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: [] },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      const readBy = result.current.getReadBy("msg-5");
      expect(readBy).toHaveLength(0);
    });

    it("should handle read statuses without last_read_message_id", () => {
      const statusesWithUndefined = [
        createMockReadStatus("user-1", testChannelId, undefined, "Alice"),
        createMockReadStatus("user-2", testChannelId, "msg-5", "Bob"),
      ];

      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: statusesWithUndefined },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      const readByMsg5 = result.current.getReadBy("msg-5");
      expect(readByMsg5).toHaveLength(1);
      expect(readByMsg5[0].user?.display_name).toBe("Bob");
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe("loading state", () => {
    it("should return loading true when subscription is loading", () => {
      mockUseSubscription.mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.loading).toBe(true);
    });

    it("should return loading false when subscription is complete", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(testChannelId));

      expect(result.current.loading).toBe(false);
    });
  });

  // ==========================================================================
  // Subscription Skip Tests
  // ==========================================================================

  describe("skips when channelId is null", () => {
    it("should skip subscription when channelId is null", () => {
      renderHook(() => useChannelReadStatus(null));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true }),
      );
    });

    it("should not skip subscription when channelId is provided", () => {
      renderHook(() => useChannelReadStatus(testChannelId));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: false,
          variables: { channelId: testChannelId },
        }),
      );
    });

    it("should return empty readStatuses when channelId is null", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelReadStatus(null));

      expect(result.current.readStatuses).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Memoization Tests
  // ==========================================================================

  describe("memoization", () => {
    it("should provide stable getReadBy function reference", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result, rerender } = renderHook(() =>
        useChannelReadStatus(testChannelId),
      );

      const firstGetReadBy = result.current.getReadBy;

      rerender();

      expect(result.current.getReadBy).toBe(firstGetReadBy);
    });

    it("should update readStatuses when data changes", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: mockReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result, rerender } = renderHook(() =>
        useChannelReadStatus(testChannelId),
      );

      expect(result.current.readStatuses).toHaveLength(4);

      // Update with new data
      const newReadStatuses = [
        createMockReadStatus("user-new", testChannelId, "msg-10", "NewUser"),
      ];
      mockUseSubscription.mockReturnValue({
        data: { nchat_read_status: newReadStatuses },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      rerender();

      expect(result.current.readStatuses).toHaveLength(1);
      expect(result.current.readStatuses[0].user?.display_name).toBe("NewUser");
    });
  });
});

// ============================================================================
// useMarkRead Tests
// ============================================================================

describe("useMarkRead", () => {
  let mockMarkReadMutation: jest.Mock;
  let mockUpdateLastReadMutation: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: currentUserId },
    } as ReturnType<typeof useAuth>);

    // Create mutation mocks
    mockMarkReadMutation = jest.fn();
    mockUpdateLastReadMutation = jest.fn();

    // Default mutation mocks - called 2 times for markRead, updateLastRead
    mockUseMutation
      .mockReturnValueOnce([
        mockMarkReadMutation,
        { loading: false },
      ] as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        mockUpdateLastReadMutation,
        { loading: false },
      ] as ReturnType<typeof useMutation>);
  });

  // ==========================================================================
  // markRead Tests
  // ==========================================================================

  describe("markRead", () => {
    it("should call mutation with correct variables", async () => {
      mockMarkReadMutation.mockResolvedValue({
        data: {
          insert_nchat_read_status_one: {
            channel_id: testChannelId,
            last_read_at: new Date().toISOString(),
          },
        },
      });

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.markRead(testChannelId, "msg-123");
      });

      expect(mockMarkReadMutation).toHaveBeenCalledWith({
        variables: {
          channelId: testChannelId,
          userId: currentUserId,
          messageId: "msg-123",
        },
      });
    });

    it("should include userId from auth context", async () => {
      const differentUserId = "different-user-id";
      mockUseAuth.mockReturnValue({
        user: { id: differentUserId },
      } as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      mockMarkReadMutation.mockResolvedValue({
        data: {
          insert_nchat_read_status_one: {
            channel_id: testChannelId,
            last_read_at: new Date().toISOString(),
          },
        },
      });

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.markRead(testChannelId, "msg-123");
      });

      expect(mockMarkReadMutation).toHaveBeenCalledWith({
        variables: {
          channelId: testChannelId,
          userId: differentUserId,
          messageId: "msg-123",
        },
      });
    });
  });

  // ==========================================================================
  // updateLastRead Tests
  // ==========================================================================

  describe("updateLastRead", () => {
    it("should call mutation with correct variables", async () => {
      mockUpdateLastReadMutation.mockResolvedValue({
        data: { update_nchat_channel_members: { affected_rows: 1 } },
      });

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.updateLastRead(testChannelId);
      });

      expect(mockUpdateLastReadMutation).toHaveBeenCalledWith({
        variables: {
          channelId: testChannelId,
          userId: currentUserId,
        },
      });
    });

    it("should include userId from auth context", async () => {
      const anotherUserId = "another-user-id";
      mockUseAuth.mockReturnValue({
        user: { id: anotherUserId },
      } as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      mockUpdateLastReadMutation.mockResolvedValue({
        data: { update_nchat_channel_members: { affected_rows: 1 } },
      });

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.updateLastRead(testChannelId);
      });

      expect(mockUpdateLastReadMutation).toHaveBeenCalledWith({
        variables: {
          channelId: testChannelId,
          userId: anotherUserId,
        },
      });
    });
  });

  // ==========================================================================
  // Unauthenticated User Tests
  // ==========================================================================

  describe("does not call mutations when user is not authenticated", () => {
    it("should not call markRead mutation when user is null", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.markRead(testChannelId, "msg-123");
      });

      expect(mockMarkReadMutation).not.toHaveBeenCalled();
    });

    it("should not call updateLastRead mutation when user is null", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.updateLastRead(testChannelId);
      });

      expect(mockUpdateLastReadMutation).not.toHaveBeenCalled();
    });

    it("should not call markRead mutation when user.id is undefined", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: undefined },
      } as unknown as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.markRead(testChannelId, "msg-123");
      });

      expect(mockMarkReadMutation).not.toHaveBeenCalled();
    });

    it("should not call updateLastRead mutation when user.id is undefined", async () => {
      mockUseAuth.mockReturnValue({
        user: { id: undefined },
      } as unknown as ReturnType<typeof useAuth>);

      // Re-setup mutations after auth mock change
      mockUseMutation
        .mockReset()
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      const { result } = renderHook(() => useMarkRead());

      await act(async () => {
        await result.current.updateLastRead(testChannelId);
      });

      expect(mockUpdateLastReadMutation).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Memoization Tests
  // ==========================================================================

  describe("memoization", () => {
    it("should provide stable function references", () => {
      const { result, rerender } = renderHook(() => useMarkRead());

      const firstMarkRead = result.current.markRead;
      const firstUpdateLastRead = result.current.updateLastRead;

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockMarkReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateLastReadMutation,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender();

      // Same references due to useCallback
      expect(result.current.markRead).toBe(firstMarkRead);
      expect(result.current.updateLastRead).toBe(firstUpdateLastRead);
    });
  });
});
