/**
 * Test Fixtures
 *
 * Pre-built test data for common testing scenarios
 */

import {
  predefinedUsers,
  createOwner,
  createAdmin,
  createMember,
} from "../factories/user.factory";
import {
  predefinedChannels,
  createWorkspaceChannels,
  createPrivateChannel,
  createDirectChannel,
} from "../factories/channel.factory";
import {
  predefinedMessages,
  createConversation,
  createMessages,
  createSystemMessage,
} from "../factories/message.factory";
import type { TestUser, TestChannel, TestMessage } from "../render";

// ============================================================================
// User Fixtures
// ============================================================================

export const fixtures = {
  // Pre-defined users
  users: predefinedUsers,

  // Pre-defined channels
  channels: predefinedChannels,

  // Pre-defined messages
  messages: predefinedMessages,
};

// ============================================================================
// Scenario-based Fixtures
// ============================================================================

/**
 * Empty workspace - just after setup
 */
export function createEmptyWorkspaceFixture(): {
  users: TestUser[];
  channels: TestChannel[];
  messages: Record<string, TestMessage[]>;
} {
  const owner = createOwner();

  return {
    users: [owner],
    channels: [predefinedChannels.general],
    messages: {
      [predefinedChannels.general.id]: [
        createSystemMessage("Workspace created! Welcome to nchat.", {
          channelId: predefinedChannels.general.id,
        }),
      ],
    },
  };
}

/**
 * Active workspace with several users and conversations
 */
export function createActiveWorkspaceFixture(): {
  users: TestUser[];
  channels: TestChannel[];
  messages: Record<string, TestMessage[]>;
} {
  const users = [
    predefinedUsers.owner,
    predefinedUsers.admin,
    predefinedUsers.alice,
    predefinedUsers.bob,
    predefinedUsers.charlie,
  ];

  const channels = createWorkspaceChannels();

  const messages: Record<string, TestMessage[]> = {};

  // General channel conversation
  messages[predefinedChannels.general.id] = createConversation(
    [predefinedUsers.alice, predefinedUsers.bob, predefinedUsers.charlie],
    10,
    predefinedChannels.general.id,
  );

  // Random channel conversation
  messages[predefinedChannels.random.id] = createConversation(
    [predefinedUsers.alice, predefinedUsers.bob],
    5,
    predefinedChannels.random.id,
  );

  return { users, channels, messages };
}

/**
 * Workspace with direct messages
 */
export function createWorkspaceWithDMsFixture(): {
  users: TestUser[];
  channels: TestChannel[];
  messages: Record<string, TestMessage[]>;
} {
  const users = [
    predefinedUsers.alice,
    predefinedUsers.bob,
    predefinedUsers.charlie,
  ];

  const dmAliceBob = createDirectChannel(
    predefinedUsers.alice.id,
    predefinedUsers.bob.id,
  );
  const dmAliceCharlie = createDirectChannel(
    predefinedUsers.alice.id,
    predefinedUsers.charlie.id,
  );

  const channels = [predefinedChannels.general, dmAliceBob, dmAliceCharlie];

  const messages: Record<string, TestMessage[]> = {
    [dmAliceBob.id]: createConversation(
      [predefinedUsers.alice, predefinedUsers.bob],
      5,
      dmAliceBob.id,
    ),
    [dmAliceCharlie.id]: createConversation(
      [predefinedUsers.alice, predefinedUsers.charlie],
      3,
      dmAliceCharlie.id,
    ),
  };

  return { users, channels, messages };
}

/**
 * Workspace with private channels
 */
export function createWorkspaceWithPrivateChannelsFixture(): {
  users: TestUser[];
  channels: TestChannel[];
  messages: Record<string, TestMessage[]>;
  userChannelAccess: Record<string, string[]>;
} {
  const users = [
    predefinedUsers.owner,
    predefinedUsers.admin,
    predefinedUsers.alice,
    predefinedUsers.bob,
  ];

  const engineeringChannel = createPrivateChannel({
    id: "channel-eng",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team only",
  });

  const hrChannel = createPrivateChannel({
    id: "channel-hr",
    name: "hr-private",
    slug: "hr-private",
    description: "HR confidential",
  });

  const channels = [predefinedChannels.general, engineeringChannel, hrChannel];

  // Define who can access which channels
  const userChannelAccess: Record<string, string[]> = {
    [predefinedUsers.owner.id]: [
      predefinedChannels.general.id,
      engineeringChannel.id,
      hrChannel.id,
    ],
    [predefinedUsers.admin.id]: [predefinedChannels.general.id, hrChannel.id],
    [predefinedUsers.alice.id]: [
      predefinedChannels.general.id,
      engineeringChannel.id,
    ],
    [predefinedUsers.bob.id]: [predefinedChannels.general.id],
  };

  return { users, channels, messages: {}, userChannelAccess };
}

// ============================================================================
// Auth Scenario Fixtures
// ============================================================================

export const authFixtures = {
  /**
   * Valid login credentials
   */
  validCredentials: {
    email: "alice@nself.org",
    password: "password123",
  },

  /**
   * Invalid login credentials
   */
  invalidCredentials: {
    email: "invalid@test.com",
    password: "wrongpassword",
  },

  /**
   * New user signup data
   */
  newUserSignup: {
    email: "newuser@example.com",
    password: "SecurePass123!",
    username: "newuser",
    displayName: "New User",
  },

  /**
   * Existing email for signup error testing
   */
  existingEmail: {
    email: "alice@nself.org",
    password: "password123",
    username: "alicedupe",
    displayName: "Alice Duplicate",
  },
};

// ============================================================================
// Form Data Fixtures
// ============================================================================

export const formFixtures = {
  /**
   * Channel creation form data
   */
  createChannel: {
    name: "new-project",
    description: "Discussion for the new project",
    type: "public" as const,
    isPrivate: false,
  },

  /**
   * User profile update data
   */
  updateProfile: {
    displayName: "Updated Name",
    bio: "This is my updated bio",
    avatarUrl: "https://example.com/new-avatar.png",
  },

  /**
   * Message with formatting
   */
  formattedMessage: {
    bold: "**bold text**",
    italic: "*italic text*",
    code: "`inline code`",
    codeBlock: "```typescript\nconst x = 1;\n```",
    link: "[link text](https://example.com)",
    mention: "@alice",
  },
};

// ============================================================================
// Error Scenario Fixtures
// ============================================================================

export const errorFixtures = {
  networkError: new Error("Network error: Failed to fetch"),
  unauthorized: { status: 401, message: "Unauthorized" },
  forbidden: { status: 403, message: "Forbidden: Insufficient permissions" },
  notFound: { status: 404, message: "Resource not found" },
  serverError: { status: 500, message: "Internal server error" },
  rateLimit: { status: 429, message: "Too many requests" },
  validationError: {
    status: 400,
    message: "Validation failed",
    errors: {
      email: "Invalid email format",
      password: "Password must be at least 8 characters",
    },
  },
};

// ============================================================================
// Config Fixtures
// ============================================================================

export const configFixtures = {
  /**
   * Minimal config (just after setup)
   */
  minimal: {
    setup: {
      isCompleted: true,
      currentStep: 9,
      visitedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    owner: {
      name: "Test",
      email: "test@example.com",
      company: "",
      role: "developer",
    },
    branding: {
      appName: "nchat",
      logo: null,
      favicon: null,
      tagline: "",
      logoScale: 1,
    },
  },

  /**
   * Full config with all features enabled
   */
  fullFeatures: {
    setup: {
      isCompleted: true,
      currentStep: 9,
      visitedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    owner: {
      name: "Admin",
      email: "admin@example.com",
      company: "Test Co",
      role: "developer",
    },
    branding: {
      appName: "Team Chat",
      logo: "https://example.com/logo.png",
      favicon: "https://example.com/favicon.ico",
      tagline: "Communication made easy",
      logoScale: 1,
    },
    features: {
      publicChannels: true,
      privateChannels: true,
      directMessages: true,
      threads: true,
      reactions: true,
      fileSharing: true,
      voiceCalls: true,
      videoCalls: true,
      screenShare: true,
      search: true,
      mentions: true,
      markdown: true,
      codeBlocks: true,
      embedLinks: true,
      customEmoji: true,
      messageEditing: true,
      messageDeleting: true,
      readReceipts: true,
      typingIndicators: true,
    },
  },

  /**
   * Config with features disabled
   */
  limitedFeatures: {
    setup: {
      isCompleted: true,
      currentStep: 9,
      visitedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    owner: {
      name: "Admin",
      email: "admin@example.com",
      company: "Test Co",
      role: "developer",
    },
    branding: {
      appName: "Simple Chat",
      logo: null,
      favicon: null,
      tagline: "",
      logoScale: 1,
    },
    features: {
      publicChannels: true,
      privateChannels: false,
      directMessages: false,
      threads: false,
      reactions: true,
      fileSharing: false,
      voiceCalls: false,
      videoCalls: false,
      screenShare: false,
      search: true,
      mentions: true,
      markdown: false,
      codeBlocks: false,
      embedLinks: false,
      customEmoji: false,
      messageEditing: false,
      messageDeleting: false,
      readReceipts: false,
      typingIndicators: false,
    },
  },
};
