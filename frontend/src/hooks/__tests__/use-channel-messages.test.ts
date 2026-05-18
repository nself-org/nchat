/**
 * useChannelMessages Hook Tests
 *
 * Tests for the useChannelMessages hook which provides real-time
 * message subscription and mutation functions for channel messages.
 */

import { renderHook, act } from "@testing-library/react";
import { useSubscription, useMutation } from "@apollo/client";
import { useChannelMessages } from "../use-channel-messages";

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

const mockUseSubscription = useSubscription as jest.MockedFunction<
  typeof useSubscription
>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// ============================================================================
// Test Data
// ============================================================================

const createMockMessage = (
  id: string,
  content: string,
  authorId: string = "user-1",
) => ({
  id,
  content,
  channel_id: "channel-1",
  author_id: authorId,
  created_at: new Date().toISOString(),
  updated_at: undefined,
  reply_to_id: undefined,
  author: {
    id: authorId,
    display_name: "Test User",
    avatar_url: "https://example.com/avatar.png",
  },
});

const mockMessages = [
  createMockMessage("msg-1", "Hello"),
  createMockMessage("msg-2", "World"),
  createMockMessage("msg-3", "Test"),
];

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("useChannelMessages", () => {
  let mockSendMessage: jest.Mock;
  let mockUpdateMessage: jest.Mock;
  let mockDeleteMessage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mutation mocks
    mockSendMessage = jest.fn();
    mockUpdateMessage = jest.fn();
    mockDeleteMessage = jest.fn();

    // Default subscription mock
    mockUseSubscription.mockReturnValue({
      data: null,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useSubscription>);

    // Default mutation mocks - called 3 times for send, update, delete
    mockUseMutation
      .mockReturnValueOnce([mockSendMessage, { loading: false }] as ReturnType<
        typeof useMutation
      >)
      .mockReturnValueOnce([
        mockUpdateMessage,
        { loading: false },
      ] as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        mockDeleteMessage,
        { loading: false },
      ] as ReturnType<typeof useMutation>);
  });

  // ==========================================================================
  // Subscription Tests
  // ==========================================================================

  describe("subscription", () => {
    it("should return messages from subscription", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_messages: mockMessages },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0].content).toBe("Hello");
      expect(result.current.messages[1].content).toBe("World");
      expect(result.current.messages[2].content).toBe("Test");
    });

    it("should return empty array when no messages", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_messages: [] },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.messages).toHaveLength(0);
    });

    it("should return empty array when data is null", () => {
      mockUseSubscription.mockReturnValue({
        data: null,
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.messages).toHaveLength(0);
    });

    it("should return empty array when nchat_messages is undefined", () => {
      mockUseSubscription.mockReturnValue({
        data: {},
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.messages).toHaveLength(0);
    });

    it("should skip subscription when channelId is null", () => {
      renderHook(() => useChannelMessages(null));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true }),
      );
    });

    it("should pass correct variables to subscription", () => {
      renderHook(() => useChannelMessages("channel-123"));

      expect(mockUseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { channelId: "channel-123", limit: 50 },
        }),
      );
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

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.loading).toBe(true);
    });

    it("should return loading false when subscription is complete", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_messages: mockMessages },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.loading).toBe(false);
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe("error state", () => {
    it("should return error when subscription fails", () => {
      const subscriptionError = new Error("Subscription connection failed");
      mockUseSubscription.mockReturnValue({
        data: undefined,
        loading: false,
        error: subscriptionError,
      } as unknown as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.error).toBe(subscriptionError);
    });

    it("should return undefined error when subscription succeeds", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_messages: mockMessages },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      expect(result.current.error).toBeUndefined();
    });
  });

  // ==========================================================================
  // sendMessage Tests
  // ==========================================================================

  describe("sendMessage", () => {
    it("should call mutation with correct variables", async () => {
      mockSendMessage.mockResolvedValue({
        data: {
          insert_nchat_messages_one: createMockMessage(
            "new-msg",
            "Hello World",
          ),
        },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      await act(async () => {
        await result.current.sendMessage("Hello World");
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        variables: {
          channelId: "channel-1",
          content: "Hello World",
          replyToId: undefined,
        },
      });
    });

    it("should call mutation with replyToId when provided", async () => {
      mockSendMessage.mockResolvedValue({
        data: {
          insert_nchat_messages_one: createMockMessage(
            "reply-msg",
            "Reply content",
          ),
        },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      await act(async () => {
        await result.current.sendMessage("Reply content", "parent-msg-id");
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        variables: {
          channelId: "channel-1",
          content: "Reply content",
          replyToId: "parent-msg-id",
        },
      });
    });

    it("should return the created message on success", async () => {
      const newMessage = createMockMessage("new-msg", "Hello World");
      mockSendMessage.mockResolvedValue({
        data: { insert_nchat_messages_one: newMessage },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      let returnedMessage;
      await act(async () => {
        returnedMessage = await result.current.sendMessage("Hello World");
      });

      expect(returnedMessage).toEqual(newMessage);
    });

    it("should return null when channelId is null", async () => {
      const { result } = renderHook(() => useChannelMessages(null));

      let returnedMessage;
      await act(async () => {
        returnedMessage = await result.current.sendMessage("Hello World");
      });

      expect(returnedMessage).toBeNull();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // updateMessage Tests
  // ==========================================================================

  describe("updateMessage", () => {
    it("should call mutation with correct variables", async () => {
      const updatedMessage = {
        ...createMockMessage("msg-1", "Updated content"),
        updated_at: new Date().toISOString(),
      };
      mockUpdateMessage.mockResolvedValue({
        data: { update_nchat_messages_by_pk: updatedMessage },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      await act(async () => {
        await result.current.updateMessage("msg-1", "Updated content");
      });

      expect(mockUpdateMessage).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          content: "Updated content",
        },
      });
    });

    it("should return the updated message on success", async () => {
      const updatedMessage = {
        ...createMockMessage("msg-1", "Updated content"),
        updated_at: new Date().toISOString(),
      };
      mockUpdateMessage.mockResolvedValue({
        data: { update_nchat_messages_by_pk: updatedMessage },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      let returnedMessage;
      await act(async () => {
        returnedMessage = await result.current.updateMessage(
          "msg-1",
          "Updated content",
        );
      });

      expect(returnedMessage).toEqual(updatedMessage);
    });

    it("should work even when channelId is null", async () => {
      const updatedMessage = {
        ...createMockMessage("msg-1", "Updated content"),
        updated_at: new Date().toISOString(),
      };
      mockUpdateMessage.mockResolvedValue({
        data: { update_nchat_messages_by_pk: updatedMessage },
      });

      const { result } = renderHook(() => useChannelMessages(null));

      await act(async () => {
        await result.current.updateMessage("msg-1", "Updated content");
      });

      expect(mockUpdateMessage).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
          content: "Updated content",
        },
      });
    });
  });

  // ==========================================================================
  // deleteMessage Tests
  // ==========================================================================

  describe("deleteMessage", () => {
    it("should call mutation with correct variables", async () => {
      mockDeleteMessage.mockResolvedValue({
        data: { delete_nchat_messages_by_pk: { id: "msg-1" } },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      await act(async () => {
        await result.current.deleteMessage("msg-1");
      });

      expect(mockDeleteMessage).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
        },
      });
    });

    it("should not return any value", async () => {
      mockDeleteMessage.mockResolvedValue({
        data: { delete_nchat_messages_by_pk: { id: "msg-1" } },
      });

      const { result } = renderHook(() => useChannelMessages("channel-1"));

      let returnedValue;
      await act(async () => {
        returnedValue = await result.current.deleteMessage("msg-1");
      });

      expect(returnedValue).toBeUndefined();
    });

    it("should work even when channelId is null", async () => {
      mockDeleteMessage.mockResolvedValue({
        data: { delete_nchat_messages_by_pk: { id: "msg-1" } },
      });

      const { result } = renderHook(() => useChannelMessages(null));

      await act(async () => {
        await result.current.deleteMessage("msg-1");
      });

      expect(mockDeleteMessage).toHaveBeenCalledWith({
        variables: {
          messageId: "msg-1",
        },
      });
    });
  });

  // ==========================================================================
  // Channel Change Tests
  // ==========================================================================

  describe("channel changes", () => {
    it("should resubscribe when channelId changes", () => {
      const { rerender } = renderHook(
        ({ channelId }) => useChannelMessages(channelId),
        {
          initialProps: { channelId: "channel-1" as string | null },
        },
      );

      expect(mockUseSubscription).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { channelId: "channel-1", limit: 50 },
        }),
      );

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockSendMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockDeleteMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender({ channelId: "channel-2" });

      expect(mockUseSubscription).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          variables: { channelId: "channel-2", limit: 50 },
        }),
      );
    });

    it("should skip subscription when channelId becomes null", () => {
      const { rerender } = renderHook(
        ({ channelId }) => useChannelMessages(channelId),
        {
          initialProps: { channelId: "channel-1" as string | null },
        },
      );

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockSendMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockDeleteMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender({ channelId: null });

      expect(mockUseSubscription).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true }),
      );
    });
  });

  // ==========================================================================
  // Memoization Tests
  // ==========================================================================

  describe("memoization", () => {
    it("should memoize messages array", () => {
      mockUseSubscription.mockReturnValue({
        data: { nchat_messages: mockMessages },
        loading: false,
        error: undefined,
      } as ReturnType<typeof useSubscription>);

      const { result, rerender } = renderHook(() =>
        useChannelMessages("channel-1"),
      );

      const firstMessages = result.current.messages;

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockSendMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockDeleteMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender();

      // Same reference if data hasn't changed
      expect(result.current.messages).toBe(firstMessages);
    });

    it("should provide stable function references", () => {
      const { result, rerender } = renderHook(() =>
        useChannelMessages("channel-1"),
      );

      const firstSendMessage = result.current.sendMessage;
      const firstUpdateMessage = result.current.updateMessage;
      const firstDeleteMessage = result.current.deleteMessage;

      // Reset mocks for rerender
      mockUseMutation
        .mockReturnValueOnce([
          mockSendMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockUpdateMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>)
        .mockReturnValueOnce([
          mockDeleteMessage,
          { loading: false },
        ] as ReturnType<typeof useMutation>);

      rerender();

      // Same references due to useCallback
      expect(result.current.sendMessage).toBe(firstSendMessage);
      expect(result.current.updateMessage).toBe(firstUpdateMessage);
      expect(result.current.deleteMessage).toBe(firstDeleteMessage);
    });
  });
});
