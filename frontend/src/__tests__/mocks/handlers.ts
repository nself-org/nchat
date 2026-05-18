/**
 * MSW Handlers for nself-chat tests
 *
 * Mock Service Worker handlers for GraphQL operations and API routes.
 * These handlers intercept network requests and provide mock responses.
 */

import { graphql, http, HttpResponse, delay } from "msw";

// ============================================================================
// Test Data Factory
// ============================================================================

export const createMockUser = (overrides?: Partial<MockUser>): MockUser => ({
  id: overrides?.id || "user-1",
  username: overrides?.username || "testuser",
  displayName: overrides?.displayName || "Test User",
  email: overrides?.email || "test@example.com",
  avatarUrl: overrides?.avatarUrl || "https://example.com/avatar.png",
  role: overrides?.role || "member",
  status: overrides?.status || "online",
  ...overrides,
});

export const createMockChannel = (
  overrides?: Partial<MockChannel>,
): MockChannel => ({
  id: overrides?.id || "channel-1",
  name: overrides?.name || "general",
  slug: overrides?.slug || "general",
  description: overrides?.description || "General discussion",
  type: overrides?.type || "public",
  topic: overrides?.topic || "",
  is_default: overrides?.is_default ?? true,
  is_archived: overrides?.is_archived ?? false,
  created_at: overrides?.created_at || new Date().toISOString(),
  creator: overrides?.creator || createMockUser(),
  members_aggregate: overrides?.members_aggregate || {
    aggregate: { count: 5 },
  },
  ...overrides,
});

export const createMockMessage = (
  overrides?: Partial<MockMessage>,
): MockMessage => ({
  id: overrides?.id || "message-1",
  content: overrides?.content || "Hello, world!",
  type: overrides?.type || "text",
  is_edited: overrides?.is_edited ?? false,
  is_deleted: overrides?.is_deleted ?? false,
  created_at: overrides?.created_at || new Date().toISOString(),
  edited_at: overrides?.edited_at || null,
  user: overrides?.user || createMockUser(),
  parent: overrides?.parent || null,
  reactions: overrides?.reactions || [],
  reactions_aggregate: overrides?.reactions_aggregate || {
    aggregate: { count: 0 },
  },
  attachments: overrides?.attachments || [],
  ...overrides,
});

export const createMockReaction = (
  overrides?: Partial<MockReaction>,
): MockReaction => ({
  emoji: overrides?.emoji || "👍",
  user_id: overrides?.user_id || "user-1",
  ...overrides,
});

// ============================================================================
// Types
// ============================================================================

interface MockUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  status?: string;
}

interface MockChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "public" | "private" | "direct" | "group";
  topic?: string;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  creator: MockUser;
  members_aggregate: { aggregate: { count: number } };
}

interface MockMessage {
  id: string;
  content: string;
  type: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at: string | null;
  user: MockUser;
  parent: MockMessage | null;
  reactions: MockReaction[];
  reactions_aggregate: { aggregate: { count: number } };
  attachments: MockAttachment[];
}

interface MockReaction {
  emoji: string;
  user_id: string;
}

interface MockAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
}

// ============================================================================
// Mock Data Store
// ============================================================================

let mockChannels: MockChannel[] = [
  createMockChannel({ id: "channel-1", name: "general", slug: "general" }),
  createMockChannel({
    id: "channel-2",
    name: "random",
    slug: "random",
    is_default: false,
  }),
  createMockChannel({
    id: "channel-3",
    name: "private",
    slug: "private",
    type: "private",
    is_default: false,
  }),
];

let mockMessages: Record<string, MockMessage[]> = {
  "channel-1": [
    createMockMessage({ id: "msg-1", content: "Welcome to the channel!" }),
    createMockMessage({
      id: "msg-2",
      content: "Hello everyone!",
      user: createMockUser({
        id: "user-2",
        username: "alice",
        displayName: "Alice",
      }),
    }),
    createMockMessage({
      id: "msg-3",
      content: "Great to be here",
      reactions: [createMockReaction({ emoji: "👍", user_id: "user-2" })],
    }),
  ],
  "channel-2": [
    createMockMessage({ id: "msg-4", content: "Random message 1" }),
    createMockMessage({ id: "msg-5", content: "Random message 2" }),
  ],
};

let mockUsers: MockUser[] = [
  createMockUser({
    id: "user-1",
    username: "owner",
    displayName: "Owner",
    role: "owner",
  }),
  createMockUser({ id: "user-2", username: "alice", displayName: "Alice" }),
  createMockUser({ id: "user-3", username: "bob", displayName: "Bob" }),
];

// ============================================================================
// GraphQL Handlers
// ============================================================================

const graphqlUrl = "http://localhost:1337/v1/graphql";

export const graphqlHandlers = [
  // Get Channels
  graphql.query("GetChannels", () => {
    return HttpResponse.json({
      data: {
        nchat_channels: mockChannels.filter((c) => !c.is_archived),
      },
    });
  }),

  // Get Channel by Slug
  graphql.query("GetChannelBySlug", ({ variables }) => {
    const channel = mockChannels.find((c) => c.slug === variables.slug);
    return HttpResponse.json({
      data: {
        nchat_channels: channel ? [channel] : [],
      },
    });
  }),

  // Get Messages
  graphql.query("GetMessages", ({ variables }) => {
    const channelMessages = mockMessages[variables.channelId] || [];
    const { limit = 50, offset = 0 } = variables;
    return HttpResponse.json({
      data: {
        nchat_messages: channelMessages.slice(offset, offset + limit),
      },
    });
  }),

  // Send Message
  graphql.mutation("SendMessage", async ({ variables }) => {
    await delay(100); // Simulate network delay
    const newMessage = createMockMessage({
      id: `msg-${Date.now()}`,
      content: variables.content,
      user:
        mockUsers.find((u) => u.id === variables.userId) || createMockUser(),
    });

    if (!mockMessages[variables.channelId]) {
      mockMessages[variables.channelId] = [];
    }
    mockMessages[variables.channelId].push(newMessage);

    return HttpResponse.json({
      data: {
        insert_nchat_messages_one: newMessage,
      },
    });
  }),

  // Update Message
  graphql.mutation("UpdateMessage", async ({ variables }) => {
    await delay(100);
    const channelId = Object.keys(mockMessages).find((cid) =>
      mockMessages[cid].some((m) => m.id === variables.id),
    );

    if (channelId) {
      const messageIndex = mockMessages[channelId].findIndex(
        (m) => m.id === variables.id,
      );
      if (messageIndex !== -1) {
        mockMessages[channelId][messageIndex] = {
          ...mockMessages[channelId][messageIndex],
          content: variables.content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        };
        return HttpResponse.json({
          data: {
            update_nchat_messages_by_pk: mockMessages[channelId][messageIndex],
          },
        });
      }
    }

    return HttpResponse.json({
      errors: [{ message: "Message not found" }],
    });
  }),

  // Delete Message
  graphql.mutation("DeleteMessage", async ({ variables }) => {
    await delay(100);
    const channelId = Object.keys(mockMessages).find((cid) =>
      mockMessages[cid].some((m) => m.id === variables.id),
    );

    if (channelId) {
      const messageIndex = mockMessages[channelId].findIndex(
        (m) => m.id === variables.id,
      );
      if (messageIndex !== -1) {
        mockMessages[channelId][messageIndex] = {
          ...mockMessages[channelId][messageIndex],
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        };
        return HttpResponse.json({
          data: {
            update_nchat_messages_by_pk: mockMessages[channelId][messageIndex],
          },
        });
      }
    }

    return HttpResponse.json({
      errors: [{ message: "Message not found" }],
    });
  }),

  // Add Reaction
  graphql.mutation("AddReaction", async ({ variables }) => {
    await delay(100);
    return HttpResponse.json({
      data: {
        insert_nchat_reactions_one: {
          id: `reaction-${Date.now()}`,
          emoji: variables.emoji,
          created_at: new Date().toISOString(),
        },
      },
    });
  }),

  // Remove Reaction
  graphql.mutation("RemoveReaction", async ({ variables }) => {
    await delay(100);
    return HttpResponse.json({
      data: {
        delete_nchat_reactions: {
          affected_rows: 1,
        },
      },
    });
  }),

  // Create Channel
  graphql.mutation("CreateChannel", async ({ variables }) => {
    await delay(100);
    const newChannel = createMockChannel({
      id: `channel-${Date.now()}`,
      name: variables.name,
      slug: variables.slug,
      description: variables.description,
      type: variables.type,
    });
    mockChannels.push(newChannel);
    return HttpResponse.json({
      data: {
        insert_nchat_channels_one: newChannel,
      },
    });
  }),

  // Message Subscription (for completeness, though MSW doesn't handle WebSocket)
  graphql.query("MessageSubscription", ({ variables }) => {
    const channelMessages = mockMessages[variables.channelId] || [];
    return HttpResponse.json({
      data: {
        nchat_messages: channelMessages.slice(-1),
      },
    });
  }),
];

// ============================================================================
// REST API Handlers
// ============================================================================

export const restHandlers = [
  // Get App Config
  http.get("/api/config", async () => {
    await delay(50);
    return HttpResponse.json({
      setup: {
        completed: true,
        completedSteps: ["welcome", "owner-info", "auth-methods"],
        currentStep: 3,
      },
      owner: {
        name: "Test Owner",
        email: "owner@test.com",
        company: "Test Company",
      },
      branding: {
        appName: "nchat",
        logo: null,
        favicon: null,
        tagline: "Team Communication Platform",
      },
      auth: {
        methods: { email: true, google: false, github: false },
        permissions: "allow-all",
      },
      features: {
        channels: true,
        directMessages: true,
        threads: true,
        reactions: true,
        fileUploads: true,
      },
      theme: {
        mode: "system",
        preset: "default",
        colors: {},
      },
    });
  }),

  // Save App Config
  http.post("/api/config", async ({ request }) => {
    await delay(50);
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  // Sign In
  http.post("/api/auth/signin", async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === "invalid@test.com") {
      return HttpResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const user =
      mockUsers.find((u) => u.email === body.email) ||
      createMockUser({
        email: body.email,
        username: body.email.split("@")[0],
        displayName: body.email.split("@")[0],
      });

    return HttpResponse.json({
      user,
      session: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  }),

  // Sign Up
  http.post("/api/auth/signup", async ({ request }) => {
    await delay(100);
    const body = (await request.json()) as {
      email: string;
      password: string;
      username: string;
      displayName: string;
    };

    if (body.email === "existing@test.com") {
      return HttpResponse.json(
        { error: "Email already exists" },
        { status: 400 },
      );
    }

    const newUser = createMockUser({
      id: `user-${Date.now()}`,
      email: body.email,
      username: body.username,
      displayName: body.displayName,
    });
    mockUsers.push(newUser);

    return HttpResponse.json({
      user: newUser,
      session: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  }),

  // File Upload
  http.post("/api/upload", async ({ request }) => {
    await delay(200);
    return HttpResponse.json({
      id: `file-${Date.now()}`,
      url: "https://example.com/uploaded-file.png",
      name: "uploaded-file.png",
      size: 1024,
      type: "image/png",
    });
  }),

  // Health Check
  http.get("/api/health", async () => {
    return HttpResponse.json({ status: "ok" });
  }),
];

// ============================================================================
// Combined Handlers
// ============================================================================

export const handlers = [...graphqlHandlers, ...restHandlers];

// ============================================================================
// Utilities for Tests
// ============================================================================

export const mockDataStore = {
  getChannels: () => mockChannels,
  getMessages: (channelId: string) => mockMessages[channelId] || [],
  getUsers: () => mockUsers,

  addChannel: (channel: MockChannel) => {
    mockChannels.push(channel);
  },

  addMessage: (channelId: string, message: MockMessage) => {
    if (!mockMessages[channelId]) {
      mockMessages[channelId] = [];
    }
    mockMessages[channelId].push(message);
  },

  addUser: (user: MockUser) => {
    mockUsers.push(user);
  },

  reset: () => {
    mockChannels = [
      createMockChannel({ id: "channel-1", name: "general", slug: "general" }),
      createMockChannel({
        id: "channel-2",
        name: "random",
        slug: "random",
        is_default: false,
      }),
    ];
    mockMessages = {
      "channel-1": [
        createMockMessage({ id: "msg-1", content: "Welcome to the channel!" }),
        createMockMessage({
          id: "msg-2",
          content: "Hello everyone!",
          user: createMockUser({
            id: "user-2",
            username: "alice",
            displayName: "Alice",
          }),
        }),
      ],
      "channel-2": [],
    };
    mockUsers = [
      createMockUser({
        id: "user-1",
        username: "owner",
        displayName: "Owner",
        role: "owner",
      }),
      createMockUser({ id: "user-2", username: "alice", displayName: "Alice" }),
    ];
  },
};

export {
  createMockUser,
  createMockChannel,
  createMockMessage,
  createMockReaction,
};

export type {
  MockUser,
  MockChannel,
  MockMessage,
  MockReaction,
  MockAttachment,
};
