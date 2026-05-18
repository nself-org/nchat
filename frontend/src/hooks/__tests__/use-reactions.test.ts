/**
 * useMessageReactions Hook Tests
 *
 * Tests for the useMessageReactions hook which provides real-time
 * reaction subscription and mutation functions for message reactions.
 */

import { renderHook, act } from "@testing-library/react";
import { useSubscription, useMutation } from "@apollo/client";
import { useMessageReactions } from "../use-reactions";
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

const createMockReaction = (
  id: string,
  emoji: string,
  userId: string,
  displayName: string,
) => ({
  id,
  emoji,
  user_id: userId,
  created_at: new Date().toISOString(),
  user: {
    id: userId,
    display_name: displayName,
  },
});

const mockReactions = [
  createMockReaction("r1", "👍", "user-1", "Alice"),
  createMockReaction("r2", "👍", "user-2", "Bob"),
  createMockReaction("r3", "👍", currentUserId, "Current User"),
  createMockReaction("r4", "❤️", "user-1", "Alice"),
  createMockReaction("r5", "😂", "user-2", "Bob"),
];

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("useMessageReactions", () => {
  let mockAddReaction: jest.Mock;
  let mockRemoveReaction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      user: { id: currentUserId },
    } as ReturnType<typeof useAuth>);

    // Create mutation mocks
    mockAddReaction = jest.fn();
    mockRemoveReaction = jest.fn();

    // Default subscription mock
    mockUseSubscription.mockReturnValue({
      data: null,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useSubscription>);

    // Default mutation mocks - called 2 times for add, remove
    mockUseMutation
      .mockReturnValueOnce([mockAddReaction, { loading: false }] as ReturnType<
        typeof useMutation
      >)
      .mockReturnValueOnce([
        mockRemoveReaction,
        { loading: false },
      ] as ReturnType<typeof useMutation>);
  });

  // ==========================================================================
  // Grouped Reactions Tests
  // ==========================================================================

  describe("grouped reactions", () => {
    it("should return grouped reactions with correct counts", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(3); // 👍, ❤️, 😂

      const thumbsUp = result.current.reactions.find((r) => r.emoji === "👍");
      expect(thumbsUp?.count).toBe(3);
      expect(thumbsUp?.users).toEqual(["Alice", "Bob", "Current User"]);

      const heart = result.current.reactions.find((r) => r.emoji === "❤️");
      expect(heart?.count).toBe(1);
      expect(heart?.users).toEqual(["Alice"]);

      const laughing = result.current.reactions.find((r) => r.emoji === "😂");
      expect(laughing?.count).toBe(1);
      expect(laughing?.users).toEqual(["Bob"]);
    });

    it("should return empty array when no reactions", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: [] },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(0);
    });

    it("should return empty array when data is null", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(0);
    });

    it("should handle reactions without user display name", () => {
      const reactionsWithoutUser = [
        {
          id: "r1",
          emoji: "👍",
          user_id: "user-1",
          created_at: new Date().toISOString(),
          user: undefined,
        },
      ];

      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: reactionsWithoutUser },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions[0].users).toEqual(["Unknown"]);
    });
  });

  // ==========================================================================
  // userReacted Tests
  // ==========================================================================

  describe("userReacted", () => {
    it("should correctly determine when current user has reacted", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      // Current user reacted to 👍
      const thumbsUp = result.current.reactions.find((r) => r.emoji === "👍");
      expect(thumbsUp?.userReacted).toBe(true);

      // Current user did not react to ❤️
      const heart = result.current.reactions.find((r) => r.emoji === "❤️");
      expect(heart?.userReacted).toBe(false);

      // Current user did not react to 😂
      const laughing = result.current.reactions.find((r) => r.emoji === "😂");
      expect(laughing?.userReacted).toBe(false);
    });

    it("should return userReacted false when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
      } as ReturnType<typeof useAuth>);

      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      // All reactions should show userReacted as false
      result.current.reactions.forEach((reaction) => {
        expect(reaction.userReacted).toBe(false);
      });
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

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.loading).toBe(true);
    });

    it("should return loading false when subscription is complete", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.loading).toBe(false);
    });
  });

  // ==========================================================================
  // Subscription Skip Tests
  // ==========================================================================

  describe("subscription skip", () => {
    it("should skip subscription when messageId is null", () => {
      renderHook(() => useMessageReactions(null));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true }),
      );
    });

    it("should not skip subscription when messageId is provided", () => {
      renderHook(() => useMessageReactions("msg-1"));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          skip: false,
          variables: { messageId: "msg-1" },
        }),
      );
    });
  });

  // ==========================================================================
  // addReaction Tests
  // ==========================================================================

  describe("addReaction", () => {
    it("should call mutation with correct variables", async () => {
      mockAddReaction.mockResolvedValue({
        data: {
          insert_nchat_reactions_one: { id: "new-reaction", emoji: "🎉" },
        },
      });

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      await act(async () => {
        await result.current.addReaction("🎉");
      });

      expect(mockAddReaction).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          emoji: "🎉",
        },
      });
    });

    it("should not call mutation when messageId is null", async () => {
      const { result } = renderHook(() => useMessageReactions(null));

      await act(async () => {
        await result.current.addReaction("🎉");
      });

      expect(mockAddReaction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // removeReaction Tests
  // ==========================================================================

  describe("removeReaction", () => {
    it("should call mutation with correct variables", async () => {
      mockRemoveReaction.mockResolvedValue({
        data: { delete_nchat_reactions: { affected_rows: 1 } },
      });

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      await act(async () => {
        await result.current.removeReaction("👍");
      });

      expect(mockRemoveReaction).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          emoji: "👍",
        },
      });
    });

    it("should not call mutation when messageId is null", async () => {
      const { result } = renderHook(() => useMessageReactions(null));

      await act(async () => {
        await result.current.removeReaction("👍");
      });

      expect(mockRemoveReaction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // toggleReaction Tests
  // ==========================================================================

  describe("toggleReaction", () => {
    it("should remove reaction when user has already reacted", async () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      mockRemoveReaction.mockResolvedValue({
        data: { delete_nchat_reactions: { affected_rows: 1 } },
      });

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      // Current user has reacted to 👍
      await act(async () => {
        await result.current.toggleReaction("👍");
      });

      expect(mockRemoveReaction).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          emoji: "👍",
        },
      });
      expect(mockAddReaction).not.toHaveBeenCalled();
    });

    it("should add reaction when user has not reacted", async () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      mockAddReaction.mockResolvedValue({
        data: {
          insert_nchat_reactions_one: { id: "new-reaction", emoji: "❤️" },
        },
      });

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      // Current user has not reacted to ❤️
      await act(async () => {
        await result.current.toggleReaction("❤️");
      });

      expect(mockAddReaction).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          emoji: "❤️",
        },
      });
      expect(mockRemoveReaction).not.toHaveBeenCalled();
    });

    it("should add reaction for new emoji that does not exist", async () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: mockReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      mockAddReaction.mockResolvedValue({
        data: {
          insert_nchat_reactions_one: { id: "new-reaction", emoji: "🔥" },
        },
      });

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      // 🔥 does not exist in reactions
      await act(async () => {
        await result.current.toggleReaction("🔥");
      });

      expect(mockAddReaction).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          emoji: "🔥",
        },
      });
      expect(mockRemoveReaction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe("edge cases", () => {
    it("should handle multiple reactions from same user", () => {
      const multipleReactionsFromUser = [
        createMockReaction("r1", "👍", currentUserId, "Current User"),
        createMockReaction("r2", "❤️", currentUserId, "Current User"),
        createMockReaction("r3", "😂", currentUserId, "Current User"),
      ];

      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: multipleReactionsFromUser },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(3);
      result.current.reactions.forEach((reaction) => {
        expect(reaction.userReacted).toBe(true);
        expect(reaction.count).toBe(1);
      });
    });

    it("should handle single reaction", () => {
      const singleReaction = [
        createMockReaction("r1", "👍", "user-1", "Alice"),
      ];

      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: singleReaction },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(1);
      expect(result.current.reactions[0].emoji).toBe("👍");
      expect(result.current.reactions[0].count).toBe(1);
      expect(result.current.reactions[0].userReacted).toBe(false);
    });

    it("should handle many reactions of same emoji", () => {
      const manyReactions = [
        createMockReaction("r1", "👍", "user-1", "Alice"),
        createMockReaction("r2", "👍", "user-2", "Bob"),
        createMockReaction("r3", "👍", "user-3", "Charlie"),
        createMockReaction("r4", "👍", "user-4", "David"),
        createMockReaction("r5", "👍", "user-5", "Eve"),
      ];

      mockUseSubscription.mockReturnValue({
        data: { nchat_reactions: manyReactions },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useMessageReactions("msg-1"));

      expect(result.current.reactions).toHaveLength(1);
      expect(result.current.reactions[0].count).toBe(5);
      expect(result.current.reactions[0].users).toEqual([
        "Alice",
        "Bob",
        "Charlie",
        "David",
        "Eve",
      ]);
    });
  });

  // ==========================================================================
  // Memoization Tests
  // ==========================================================================

  describe("memoization", () => {
    it("should provide stable function references", () => {
      const { result, rerender } = renderHook(() =>
        useMessageReactions("msg-1"),
      );

      const firstAddReaction = result.current.addReaction;
      const firstRemoveReaction = result.current.removeReaction;
      const firstToggleReaction = result.current.toggleReaction;

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockAddReaction,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockRemoveReaction,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender();

      // Same references due to useCallback
      expect(result.current.addReaction).toBe(firstAddReaction);
      expect(result.current.removeReaction).toBe(firstRemoveReaction);
      expect(result.current.toggleReaction).toBe(firstToggleReaction);
    });
  });
});
