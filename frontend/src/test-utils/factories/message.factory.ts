/**
 * Message Factory
 *
 * Factory functions for creating message test data
 */

import type { TestMessage, TestUser } from "../render";
import { predefinedUsers } from "./user.factory";

// ============================================================================
// Counter for unique IDs
// ============================================================================

let messageIdCounter = 0;

function generateMessageId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

// ============================================================================
// Message Factory
// ============================================================================

export interface MessageFactoryOptions extends Partial<TestMessage> {}

/**
 * Create a test message with default values
 */
export function createMessage(
  options: MessageFactoryOptions = {},
): TestMessage {
  const id = options.id || generateMessageId();
  const user = options.user || predefinedUsers.alice;
  const userId = options.userId ?? user.id ?? "user-default";

  return {
    id,
    channelId: options.channelId || "channel-general",
    content: options.content || `Test message ${messageIdCounter}`,
    type: options.type || "text",
    userId,
    user,
    createdAt: options.createdAt || new Date(),
    isEdited: options.isEdited ?? false,
    reactions: options.reactions || [],
  };
}

/**
 * Create multiple test messages
 */
export function createMessages(
  count: number,
  options: MessageFactoryOptions = {},
): TestMessage[] {
  const baseTime = options.createdAt?.getTime() || Date.now();

  return Array.from({ length: count }, (_, i) =>
    createMessage({
      ...options,
      content: options.content || `Message ${i + 1}`,
      createdAt: new Date(baseTime + i * 1000), // 1 second apart
    }),
  );
}

/**
 * Create a text message
 */
export function createTextMessage(
  content: string,
  options: Omit<MessageFactoryOptions, "content" | "type"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content,
    type: "text",
  });
}

/**
 * Create a system message
 */
export function createSystemMessage(
  content: string,
  options: Omit<MessageFactoryOptions, "type" | "user" | "userId"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content,
    type: "system",
    userId: "system",
    user: {
      id: "system",
      username: "system",
      displayName: "System",
      email: "",
      role: "member",
    },
  });
}

/**
 * Create a file message
 */
export function createFileMessage(
  fileName: string,
  options: Omit<MessageFactoryOptions, "type"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content: `Uploaded file: ${fileName}`,
    type: "file",
  });
}

/**
 * Create an image message
 */
export function createImageMessage(
  imageUrl: string,
  options: Omit<MessageFactoryOptions, "type"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content: imageUrl,
    type: "image",
  });
}

/**
 * Create an edited message
 */
export function createEditedMessage(
  options: Omit<MessageFactoryOptions, "isEdited"> = {},
): TestMessage {
  return createMessage({
    content: "This message was edited",
    ...options,
    isEdited: true,
  });
}

/**
 * Create a message with reactions
 */
export function createMessageWithReactions(
  reactions: Array<{ emoji: string; count: number; users: string[] }>,
  options: Omit<MessageFactoryOptions, "reactions"> = {},
): TestMessage {
  return createMessage({
    content: "Message with reactions",
    ...options,
    reactions,
  });
}

/**
 * Create a message with common reactions
 */
export function createPopularMessage(
  options: Omit<MessageFactoryOptions, "reactions"> = {},
): TestMessage {
  return createMessageWithReactions(
    [
      {
        emoji: "👍",
        count: 5,
        users: ["user-1", "user-2", "user-3", "user-4", "user-5"],
      },
      { emoji: "❤️", count: 3, users: ["user-1", "user-2", "user-3"] },
      { emoji: "🎉", count: 2, users: ["user-1", "user-2"] },
    ],
    options,
  );
}

/**
 * Create a message from a specific user
 */
export function createMessageFrom(
  user: TestUser,
  options: Omit<MessageFactoryOptions, "user" | "userId"> = {},
): TestMessage {
  return createMessage({
    ...options,
    user,
    userId: user.id,
  });
}

/**
 * Create a message with a mention
 */
export function createMessageWithMention(
  mentionedUsername: string,
  options: MessageFactoryOptions = {},
): TestMessage {
  return createMessage({
    ...options,
    content: options.content || `Hey @${mentionedUsername}, check this out!`,
  });
}

/**
 * Create a message with code block
 */
export function createCodeMessage(
  code: string,
  language: string = "typescript",
  options: Omit<MessageFactoryOptions, "content"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content: `\`\`\`${language}\n${code}\n\`\`\``,
  });
}

/**
 * Create a message with a link
 */
export function createLinkMessage(
  url: string,
  text: string = url,
  options: Omit<MessageFactoryOptions, "content"> = {},
): TestMessage {
  return createMessage({
    ...options,
    content: `Check this out: [${text}](${url})`,
  });
}

// ============================================================================
// Conversation Builders
// ============================================================================

/**
 * Create a simple conversation
 */
export function createConversation(
  participants: TestUser[] = [predefinedUsers.alice, predefinedUsers.bob],
  messageCount: number = 5,
  channelId: string = "channel-general",
): TestMessage[] {
  const baseTime = Date.now() - messageCount * 60000; // Start from past

  return Array.from({ length: messageCount }, (_, i) => {
    const user = participants[i % participants.length];
    return createMessage({
      channelId,
      user,
      userId: user.id,
      content: `${user.displayName}: Message ${i + 1}`,
      createdAt: new Date(baseTime + i * 60000), // 1 minute apart
    });
  });
}

/**
 * Create a thread conversation (replies)
 */
export function createThread(
  parentMessage: TestMessage,
  replyCount: number = 3,
  participants: TestUser[] = [predefinedUsers.alice, predefinedUsers.bob],
): TestMessage[] {
  const replies = createConversation(
    participants,
    replyCount,
    parentMessage.channelId,
  );
  // In real implementation, these would have parentId set
  return replies;
}

/**
 * Create messages over a time period
 */
export function createMessagesOverTime(
  days: number,
  messagesPerDay: number = 10,
  channelId: string = "channel-general",
  users: TestUser[] = [
    predefinedUsers.alice,
    predefinedUsers.bob,
    predefinedUsers.charlie,
  ],
): TestMessage[] {
  const messages: TestMessage[] = [];
  const now = Date.now();

  for (let d = 0; d < days; d++) {
    const dayStart = now - (days - d) * 24 * 60 * 60 * 1000;

    for (let m = 0; m < messagesPerDay; m++) {
      const user = users[Math.floor(Math.random() * users.length)];
      messages.push(
        createMessage({
          channelId,
          user,
          userId: user.id,
          createdAt: new Date(
            dayStart + m * ((24 * 60 * 60 * 1000) / messagesPerDay),
          ),
        }),
      );
    }
  }

  return messages;
}

// ============================================================================
// Pre-defined Messages
// ============================================================================

export const predefinedMessages = {
  welcome: createSystemMessage("Welcome to the channel!", {
    id: "msg-welcome",
    channelId: "channel-general",
  }),
  greeting: createTextMessage("Hello everyone!", {
    id: "msg-greeting",
    user: predefinedUsers.alice,
    userId: predefinedUsers.alice.id,
    channelId: "channel-general",
  }),
  withReactions: createPopularMessage({
    id: "msg-popular",
    content: "This is a popular message!",
    user: predefinedUsers.bob,
    userId: predefinedUsers.bob.id,
    channelId: "channel-general",
  }),
  edited: createEditedMessage({
    id: "msg-edited",
    user: predefinedUsers.charlie,
    userId: predefinedUsers.charlie.id,
    channelId: "channel-general",
  }),
  code: createCodeMessage('const hello = "world";', "typescript", {
    id: "msg-code",
    user: predefinedUsers.alice,
    userId: predefinedUsers.alice.id,
    channelId: "channel-general",
  }),
};

// ============================================================================
// Reset Counter
// ============================================================================

export function resetMessageIdCounter() {
  messageIdCounter = 0;
}
