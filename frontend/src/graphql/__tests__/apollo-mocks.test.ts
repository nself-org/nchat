import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  Observable,
} from "@apollo/client";
import { MockLink } from "@apollo/client/testing";
import {
  SEND_MESSAGE,
  UPDATE_MESSAGE,
  DELETE_MESSAGE,
} from "../mutations/messages";
import { CREATE_CHANNEL, JOIN_CHANNEL } from "../mutations/channels";
import { ADD_REACTION, REMOVE_REACTION } from "../mutations/reactions";
import { GET_CHANNELS, GET_USER_CHANNELS } from "../queries/channels";
import { GET_MESSAGES } from "../queries/messages";

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockUser = (overrides = {}) => ({
  id: "user-123",
  username: "testuser",
  display_name: "Test User",
  avatar_url: "https://example.com/avatar.png",
  email: "test@example.com",
  ...overrides,
});

const createMockChannel = (overrides = {}) => ({
  id: "channel-123",
  name: "general",
  slug: "general",
  description: "General discussion",
  type: "public",
  topic: "Welcome to general!",
  is_default: true,
  created_at: "2025-01-01T00:00:00Z",
  creator: createMockUser(),
  members_aggregate: { aggregate: { count: 5 } },
  ...overrides,
});

const createMockMessage = (overrides = {}) => ({
  id: "msg-123",
  content: "Hello, world!",
  type: "text",
  is_edited: false,
  created_at: "2025-01-01T00:00:00Z",
  edited_at: null,
  channel_id: "channel-123",
  user: createMockUser(),
  parent: null,
  reactions_aggregate: { aggregate: { count: 0 } },
  reactions: [],
  attachments: [],
  ...overrides,
});

const createMockReaction = (overrides = {}) => ({
  id: "reaction-123",
  emoji: "👍",
  message_id: "msg-123",
  user_id: "user-123",
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

// ============================================================================
// Apollo Client Mock Setup
// ============================================================================

function createMockClient(mocks: any[]) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new MockLink(mocks),
  });
}

// ============================================================================
// Channel Query Mock Tests
// ============================================================================

describe("Channel Query Mocks", () => {
  describe("GET_CHANNELS mock", () => {
    it("should return mocked channels list", async () => {
      const mockChannels = [
        createMockChannel({ id: "ch-1", name: "general" }),
        createMockChannel({ id: "ch-2", name: "random" }),
      ];

      const mocks = [
        {
          request: {
            query: GET_CHANNELS,
          },
          result: {
            data: {
              nchat_channels: mockChannels,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({ query: GET_CHANNELS });

      expect(result.data.nchat_channels).toHaveLength(2);
      expect(result.data.nchat_channels[0].name).toBe("general");
      expect(result.data.nchat_channels[1].name).toBe("random");
    });

    it("should handle empty channels list", async () => {
      const mocks = [
        {
          request: {
            query: GET_CHANNELS,
          },
          result: {
            data: {
              nchat_channels: [],
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({ query: GET_CHANNELS });

      expect(result.data.nchat_channels).toHaveLength(0);
    });

    it("should handle network error", async () => {
      const mocks = [
        {
          request: {
            query: GET_CHANNELS,
          },
          error: new Error("Network error"),
        },
      ];

      const client = createMockClient(mocks);

      await expect(client.query({ query: GET_CHANNELS })).rejects.toThrow(
        "Network error",
      );
    });

    it("should handle GraphQL errors", async () => {
      const mocks = [
        {
          request: {
            query: GET_CHANNELS,
          },
          result: {
            errors: [{ message: "Permission denied" }],
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_CHANNELS,
        errorPolicy: "all",
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toBe("Permission denied");
    });
  });

  describe("GET_USER_CHANNELS mock", () => {
    it("should return user channels with correct variables", async () => {
      const userId = "user-456";
      const mockChannelMemberships = [
        {
          channel: createMockChannel({ id: "ch-1" }),
          joined_at: "2025-01-01T00:00:00Z",
          last_read_at: "2025-01-01T00:00:00Z",
          notifications_enabled: true,
        },
      ];

      const mocks = [
        {
          request: {
            query: GET_USER_CHANNELS,
            variables: { userId },
          },
          result: {
            data: {
              nchat_channel_members: mockChannelMemberships,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_USER_CHANNELS,
        variables: { userId },
      });

      expect(result.data.nchat_channel_members).toHaveLength(1);
      expect(result.data.nchat_channel_members[0].channel.id).toBe("ch-1");
    });
  });
});

// ============================================================================
// Message Query Mock Tests
// ============================================================================

describe("Message Query Mocks", () => {
  describe("GET_MESSAGES mock", () => {
    it("should return mocked messages with default pagination", async () => {
      const channelId = "channel-123";
      const mockMessages = [
        createMockMessage({ id: "msg-1", content: "First message" }),
        createMockMessage({ id: "msg-2", content: "Second message" }),
      ];

      const mocks = [
        {
          request: {
            query: GET_MESSAGES,
            variables: { channelId, limit: 50, offset: 0 },
          },
          result: {
            data: {
              nchat_messages: mockMessages,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_MESSAGES,
        variables: { channelId, limit: 50, offset: 0 },
      });

      expect(result.data.nchat_messages).toHaveLength(2);
      expect(result.data.nchat_messages[0].content).toBe("First message");
    });

    it("should handle pagination correctly", async () => {
      const channelId = "channel-123";
      const mockMessages = [
        createMockMessage({ id: "msg-51", content: "Message 51" }),
      ];

      const mocks = [
        {
          request: {
            query: GET_MESSAGES,
            variables: { channelId, limit: 50, offset: 50 },
          },
          result: {
            data: {
              nchat_messages: mockMessages,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_MESSAGES,
        variables: { channelId, limit: 50, offset: 50 },
      });

      expect(result.data.nchat_messages).toHaveLength(1);
      expect(result.data.nchat_messages[0].id).toBe("msg-51");
    });

    it("should return messages with reactions", async () => {
      const channelId = "channel-123";
      const mockMessages = [
        createMockMessage({
          id: "msg-1",
          reactions: [{ emoji: "👍", user_id: "user-1" }],
          reactions_aggregate: { aggregate: { count: 1 } },
        }),
      ];

      const mocks = [
        {
          request: {
            query: GET_MESSAGES,
            variables: { channelId, limit: 50, offset: 0 },
          },
          result: {
            data: {
              nchat_messages: mockMessages,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_MESSAGES,
        variables: { channelId, limit: 50, offset: 0 },
      });

      expect(result.data.nchat_messages[0].reactions).toHaveLength(1);
      expect(result.data.nchat_messages[0].reactions[0].emoji).toBe("👍");
    });

    it("should return messages with attachments", async () => {
      const channelId = "channel-123";
      const mockMessages = [
        createMockMessage({
          id: "msg-1",
          attachments: [
            {
              id: "att-1",
              file_name: "image.png",
              file_type: "image/png",
              file_size: 1024,
              file_url: "https://example.com/image.png",
              thumbnail_url: "https://example.com/thumb.png",
            },
          ],
        }),
      ];

      const mocks = [
        {
          request: {
            query: GET_MESSAGES,
            variables: { channelId, limit: 50, offset: 0 },
          },
          result: {
            data: {
              nchat_messages: mockMessages,
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.query({
        query: GET_MESSAGES,
        variables: { channelId, limit: 50, offset: 0 },
      });

      expect(result.data.nchat_messages[0].attachments).toHaveLength(1);
      expect(result.data.nchat_messages[0].attachments[0].file_name).toBe(
        "image.png",
      );
    });
  });
});

// ============================================================================
// Message Mutation Mock Tests
// ============================================================================

describe("Message Mutation Mocks", () => {
  describe("SEND_MESSAGE mock", () => {
    it("should return created message", async () => {
      const variables = {
        channelId: "channel-123",
        content: "Hello, world!",
        replyToId: null,
      };

      const mocks = [
        {
          request: {
            query: SEND_MESSAGE,
            variables,
          },
          result: {
            data: {
              insert_nchat_messages_one: createMockMessage({
                id: "new-msg-123",
                content: "Hello, world!",
                channel_id: "channel-123",
              }),
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: SEND_MESSAGE,
        variables,
      });

      expect(result.data?.insert_nchat_messages_one.id).toBe("new-msg-123");
      expect(result.data?.insert_nchat_messages_one.content).toBe(
        "Hello, world!",
      );
    });

    it("should handle reply to message", async () => {
      const variables = {
        channelId: "channel-123",
        content: "This is a reply",
        replyToId: "parent-msg-123",
      };

      const mocks = [
        {
          request: {
            query: SEND_MESSAGE,
            variables,
          },
          result: {
            data: {
              insert_nchat_messages_one: createMockMessage({
                id: "reply-msg-123",
                content: "This is a reply",
              }),
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: SEND_MESSAGE,
        variables,
      });

      expect(result.data?.insert_nchat_messages_one.id).toBe("reply-msg-123");
    });
  });

  describe("UPDATE_MESSAGE mock", () => {
    it("should return updated message", async () => {
      const variables = {
        messageId: "msg-123",
        content: "Updated content",
      };

      const mocks = [
        {
          request: {
            query: UPDATE_MESSAGE,
            variables,
          },
          result: {
            data: {
              update_nchat_messages_by_pk: {
                id: "msg-123",
                content: "Updated content",
                updated_at: "2025-01-02T00:00:00Z",
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: UPDATE_MESSAGE,
        variables,
      });

      expect(result.data?.update_nchat_messages_by_pk.content).toBe(
        "Updated content",
      );
      expect(result.data?.update_nchat_messages_by_pk.updated_at).toBeDefined();
    });
  });

  describe("DELETE_MESSAGE mock", () => {
    it("should return deleted message id", async () => {
      const variables = {
        messageId: "msg-123",
      };

      const mocks = [
        {
          request: {
            query: DELETE_MESSAGE,
            variables,
          },
          result: {
            data: {
              delete_nchat_messages_by_pk: {
                id: "msg-123",
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: DELETE_MESSAGE,
        variables,
      });

      expect(result.data?.delete_nchat_messages_by_pk.id).toBe("msg-123");
    });
  });
});

// ============================================================================
// Channel Mutation Mock Tests
// ============================================================================

describe("Channel Mutation Mocks", () => {
  describe("CREATE_CHANNEL mock", () => {
    it("should return created channel", async () => {
      const variables = {
        name: "new-channel",
        description: "A new channel",
        type: "public",
        isPrivate: false,
      };

      const mocks = [
        {
          request: {
            query: CREATE_CHANNEL,
            variables,
          },
          result: {
            data: {
              insert_nchat_channels_one: {
                id: "new-channel-123",
                name: "new-channel",
                type: "public",
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: CREATE_CHANNEL,
        variables,
      });

      expect(result.data?.insert_nchat_channels_one.id).toBe("new-channel-123");
      expect(result.data?.insert_nchat_channels_one.name).toBe("new-channel");
    });
  });

  describe("JOIN_CHANNEL mock", () => {
    it("should return membership", async () => {
      const variables = {
        channelId: "channel-123",
        userId: "user-456",
      };

      const mocks = [
        {
          request: {
            query: JOIN_CHANNEL,
            variables,
          },
          result: {
            data: {
              insert_nchat_channel_members_one: {
                channel_id: "channel-123",
                user_id: "user-456",
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: JOIN_CHANNEL,
        variables,
      });

      expect(result.data?.insert_nchat_channel_members_one.channel_id).toBe(
        "channel-123",
      );
      expect(result.data?.insert_nchat_channel_members_one.user_id).toBe(
        "user-456",
      );
    });
  });
});

// ============================================================================
// Reaction Mutation Mock Tests
// ============================================================================

describe("Reaction Mutation Mocks", () => {
  describe("ADD_REACTION mock", () => {
    it("should return added reaction", async () => {
      const variables = {
        messageId: "msg-123",
        emoji: "👍",
      };

      const mocks = [
        {
          request: {
            query: ADD_REACTION,
            variables,
          },
          result: {
            data: {
              insert_nchat_reactions_one: createMockReaction({
                message_id: "msg-123",
                emoji: "👍",
              }),
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: ADD_REACTION,
        variables,
      });

      expect(result.data?.insert_nchat_reactions_one.emoji).toBe("👍");
      expect(result.data?.insert_nchat_reactions_one.message_id).toBe(
        "msg-123",
      );
    });
  });

  describe("REMOVE_REACTION mock", () => {
    it("should return affected rows", async () => {
      const variables = {
        messageId: "msg-123",
        emoji: "👍",
      };

      const mocks = [
        {
          request: {
            query: REMOVE_REACTION,
            variables,
          },
          result: {
            data: {
              delete_nchat_reactions: {
                affected_rows: 1,
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: REMOVE_REACTION,
        variables,
      });

      expect(result.data?.delete_nchat_reactions.affected_rows).toBe(1);
    });

    it("should return 0 affected rows when reaction not found", async () => {
      const variables = {
        messageId: "msg-123",
        emoji: "❤️",
      };

      const mocks = [
        {
          request: {
            query: REMOVE_REACTION,
            variables,
          },
          result: {
            data: {
              delete_nchat_reactions: {
                affected_rows: 0,
              },
            },
          },
        },
      ];

      const client = createMockClient(mocks);
      const result = await client.mutate({
        mutation: REMOVE_REACTION,
        variables,
      });

      expect(result.data?.delete_nchat_reactions.affected_rows).toBe(0);
    });
  });
});

// ============================================================================
// Error Handling Mock Tests
// ============================================================================

describe("Error Handling Mocks", () => {
  it("should handle authentication error", async () => {
    const mocks = [
      {
        request: {
          query: GET_CHANNELS,
        },
        result: {
          errors: [
            {
              message: "Authentication required",
              extensions: { code: "UNAUTHENTICATED" },
            },
          ],
        },
      },
    ];

    const client = createMockClient(mocks);
    const result = await client.query({
      query: GET_CHANNELS,
      errorPolicy: "all",
    });

    expect(result.errors?.[0].message).toBe("Authentication required");
  });

  it("should handle permission error", async () => {
    const variables = {
      channelId: "private-channel",
      content: "test",
      replyToId: null,
    };

    const mocks = [
      {
        request: {
          query: SEND_MESSAGE,
          variables,
        },
        result: {
          errors: [
            {
              message: "You do not have permission to post in this channel",
              extensions: { code: "FORBIDDEN" },
            },
          ],
        },
      },
    ];

    const client = createMockClient(mocks);
    const result = await client.mutate({
      mutation: SEND_MESSAGE,
      variables,
      errorPolicy: "all",
    });

    expect(result.errors?.[0].message).toBe(
      "You do not have permission to post in this channel",
    );
  });

  it("should handle validation error", async () => {
    const variables = {
      name: "",
      description: null,
      type: "public",
      isPrivate: false,
    };

    const mocks = [
      {
        request: {
          query: CREATE_CHANNEL,
          variables,
        },
        result: {
          errors: [
            {
              message: "Channel name is required",
              extensions: { code: "BAD_USER_INPUT" },
            },
          ],
        },
      },
    ];

    const client = createMockClient(mocks);
    const result = await client.mutate({
      mutation: CREATE_CHANNEL,
      variables,
      errorPolicy: "all",
    });

    expect(result.errors?.[0].message).toBe("Channel name is required");
  });
});

// ============================================================================
// Loading State Mock Tests
// ============================================================================

describe("Loading State Mocks", () => {
  it("should simulate delayed response", async () => {
    const delay = 100;
    const mockChannels = [createMockChannel()];

    const mocks = [
      {
        request: {
          query: GET_CHANNELS,
        },
        result: {
          data: {
            nchat_channels: mockChannels,
          },
        },
        delay,
      },
    ];

    const client = createMockClient(mocks);

    const startTime = Date.now();
    await client.query({ query: GET_CHANNELS });
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(delay - 10);
  });
});
