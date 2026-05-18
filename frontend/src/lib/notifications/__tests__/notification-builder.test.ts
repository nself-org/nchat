/**
 * Notification Builder Tests
 *
 * Comprehensive tests for notification payload building including:
 * - Message notifications
 * - Mention notifications
 * - Call notifications
 * - System notifications
 * - Channel invite notifications
 * - Reaction notifications
 * - Thread reply notifications
 * - Announcement notifications
 * - Fluent builder API
 */

import {
  generateNotificationId,
  truncateText,
  stripHtml,
  extractPlainText,
  formatTimeAgo,
  buildMessageNotification,
  buildMentionNotification,
  buildCallNotification,
  buildSystemNotification,
  buildChannelInviteNotification,
  buildReactionNotification,
  buildThreadReplyNotification,
  buildAnnouncementNotification,
  NotificationBuilder,
  MessageNotificationData,
  MentionNotificationData,
  CallNotificationData,
  SystemNotificationData,
  ChannelInviteNotificationData,
  ReactionNotificationData,
  ThreadReplyNotificationData,
  AnnouncementNotificationData,
} from "../notification-builder";

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("Notification Builder Utilities", () => {
  describe("generateNotificationId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateNotificationId();
      const id2 = generateNotificationId();

      expect(id1).not.toBe(id2);
    });

    it('should start with "notif-"', () => {
      const id = generateNotificationId();

      expect(id.startsWith("notif-")).toBe(true);
    });

    it("should be a string", () => {
      const id = generateNotificationId();

      expect(typeof id).toBe("string");
    });
  });

  describe("truncateText", () => {
    it("should not truncate short text", () => {
      const text = "Hello world";

      expect(truncateText(text, 100)).toBe(text);
    });

    it("should truncate long text", () => {
      const text = "A".repeat(150);

      const result = truncateText(text, 100);

      expect(result.length).toBe(100);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should use default max length", () => {
      const text = "A".repeat(150);

      const result = truncateText(text);

      expect(result.length).toBe(100);
    });

    it("should handle exact length", () => {
      const text = "A".repeat(100);

      expect(truncateText(text, 100)).toBe(text);
    });

    it("should handle empty string", () => {
      expect(truncateText("")).toBe("");
    });
  });

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      const html = "<p>Hello <strong>world</strong></p>";

      expect(stripHtml(html)).toBe("Hello world");
    });

    it("should handle nested tags", () => {
      const html = "<div><p>Hello <span>world</span></p></div>";

      expect(stripHtml(html)).toBe("Hello world");
    });

    it("should handle self-closing tags", () => {
      const html = "Hello<br/>world";

      expect(stripHtml(html)).toBe("Helloworld");
    });

    it("should handle empty string", () => {
      expect(stripHtml("")).toBe("");
    });

    it("should handle plain text", () => {
      const text = "Hello world";

      expect(stripHtml(text)).toBe(text);
    });
  });

  describe("extractPlainText", () => {
    it("should extract plain text from HTML", () => {
      const html = "<p>  Hello <strong>world</strong>  </p>";

      expect(extractPlainText(html)).toBe("Hello world");
    });

    it("should trim whitespace", () => {
      const html = "  Hello world  ";

      expect(extractPlainText(html)).toBe("Hello world");
    });
  });

  describe("formatTimeAgo", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should format seconds ago as just now", () => {
      const date = new Date("2024-01-15T11:59:30Z");

      expect(formatTimeAgo(date)).toBe("just now");
    });

    it("should format minutes ago", () => {
      const date = new Date("2024-01-15T11:30:00Z");

      expect(formatTimeAgo(date)).toBe("30m ago");
    });

    it("should format hours ago", () => {
      const date = new Date("2024-01-15T09:00:00Z");

      expect(formatTimeAgo(date)).toBe("3h ago");
    });

    it("should format days ago", () => {
      const date = new Date("2024-01-13T12:00:00Z");

      expect(formatTimeAgo(date)).toBe("2d ago");
    });

    it("should format older dates with locale date", () => {
      const date = new Date("2024-01-01T12:00:00Z");

      const result = formatTimeAgo(date);

      expect(result).not.toContain("ago");
    });

    it("should accept string dates", () => {
      const dateStr = "2024-01-15T11:30:00Z";

      expect(formatTimeAgo(dateStr)).toBe("30m ago");
    });
  });
});

// ============================================================================
// Message Notification Tests
// ============================================================================

describe("buildMessageNotification", () => {
  const baseData: MessageNotificationData = {
    messageId: "msg-123",
    content: "Hello, this is a test message",
    senderId: "user-1",
    senderName: "John Doe",
    senderAvatarUrl: "/avatars/john.jpg",
    channelId: "channel-1",
    channelName: "general",
  };

  it("should build basic message notification", () => {
    const notification = buildMessageNotification(baseData);

    expect(notification.type).toBe("direct_message");
    expect(notification.priority).toBe("normal");
    expect(notification.title).toBe("John Doe");
    expect(notification.body).toBe("Hello, this is a test message");
  });

  it("should include actor info", () => {
    const notification = buildMessageNotification(baseData);

    expect(notification.actor).toEqual({
      id: "user-1",
      name: "John Doe",
      avatarUrl: "/avatars/john.jpg",
    });
  });

  it("should include channel info", () => {
    const notification = buildMessageNotification(baseData);

    expect(notification.channelId).toBe("channel-1");
    expect(notification.channelName).toBe("general");
  });

  it("should include message ID", () => {
    const notification = buildMessageNotification(baseData);

    expect(notification.messageId).toBe("msg-123");
  });

  it("should build action URL without thread", () => {
    const notification = buildMessageNotification(baseData);

    expect(notification.actionUrl).toBe("/chat/channel-1#msg-123");
  });

  it("should build action URL with thread", () => {
    const data = { ...baseData, threadId: "thread-1" };

    const notification = buildMessageNotification(data);

    expect(notification.actionUrl).toBe(
      "/chat/channel-1?thread=thread-1#msg-123",
    );
  });

  it("should strip HTML from content", () => {
    const data = {
      ...baseData,
      content: "<p>Hello <strong>world</strong></p>",
    };

    const notification = buildMessageNotification(data);

    expect(notification.body).toBe("Hello world");
  });

  it("should truncate long content", () => {
    const data = { ...baseData, content: "A".repeat(200) };

    const notification = buildMessageNotification(data);

    expect(notification.body.length).toBe(100);
  });

  it("should include content length in metadata", () => {
    const notification = buildMessageNotification(baseData);

    // Content is "Hello, this is a test message" (29 or 30 chars depending on whitespace)
    expect(notification.metadata?.contentLength).toBeGreaterThanOrEqual(29);
    expect(notification.metadata?.contentLength).toBeLessThanOrEqual(31);
  });
});

// ============================================================================
// Mention Notification Tests
// ============================================================================

describe("buildMentionNotification", () => {
  const baseData: MentionNotificationData = {
    messageId: "msg-123",
    content: "Hey @john, check this out",
    senderId: "user-2",
    senderName: "Jane Smith",
    senderAvatarUrl: "/avatars/jane.jpg",
    channelId: "channel-1",
    channelName: "general",
    mentionType: "user",
  };

  it("should build mention notification", () => {
    const notification = buildMentionNotification(baseData);

    expect(notification.type).toBe("mention");
    expect(notification.title).toBe("Jane Smith mentioned you");
  });

  it("should set high priority for user mentions", () => {
    const notification = buildMentionNotification(baseData);

    expect(notification.priority).toBe("high");
  });

  it("should set normal priority for @here mentions", () => {
    const data = { ...baseData, mentionType: "here" as const };

    const notification = buildMentionNotification(data);

    expect(notification.priority).toBe("normal");
    expect(notification.title).toBe("Jane Smith mentioned @here");
  });

  it("should handle @channel mentions", () => {
    const data = { ...baseData, mentionType: "channel" as const };

    const notification = buildMentionNotification(data);

    expect(notification.title).toBe("Jane Smith mentioned @channel");
  });

  it("should handle @everyone mentions", () => {
    const data = { ...baseData, mentionType: "everyone" as const };

    const notification = buildMentionNotification(data);

    expect(notification.title).toBe("Jane Smith mentioned @everyone");
  });

  it("should include mention type in metadata", () => {
    const notification = buildMentionNotification(baseData);

    expect(notification.metadata?.mentionType).toBe("user");
  });
});

// ============================================================================
// Call Notification Tests
// ============================================================================

describe("buildCallNotification", () => {
  const baseData: CallNotificationData = {
    callId: "call-123",
    callerId: "user-1",
    callerName: "John Doe",
    callerAvatarUrl: "/avatars/john.jpg",
    callType: "voice",
    isGroupCall: false,
  };

  it("should build call notification", () => {
    const notification = buildCallNotification(baseData);

    expect(notification.type).toBe("system");
    expect(notification.priority).toBe("urgent");
  });

  it("should set title for direct call", () => {
    const notification = buildCallNotification(baseData);

    expect(notification.title).toBe("John Doe is calling");
    expect(notification.body).toBe("Incoming voice call");
  });

  it("should set title for group call", () => {
    const data = {
      ...baseData,
      isGroupCall: true,
      channelId: "channel-1",
      channelName: "team-chat",
    };

    const notification = buildCallNotification(data);

    expect(notification.title).toBe("Voice call in team-chat");
    expect(notification.body).toContain("John Doe started");
  });

  it("should handle video call", () => {
    const data = { ...baseData, callType: "video" as const };

    const notification = buildCallNotification(data);

    expect(notification.body).toBe("Incoming video call");
  });

  it("should build correct action URL", () => {
    const data = { ...baseData, channelId: "channel-1" };

    const notification = buildCallNotification(data);

    expect(notification.actionUrl).toBe("/chat/channel-1/call/call-123");
  });

  it("should build action URL without channel", () => {
    const notification = buildCallNotification(baseData);

    expect(notification.actionUrl).toBe("/call/call-123");
  });

  it("should include call metadata", () => {
    const notification = buildCallNotification(baseData);

    expect(notification.metadata?.callId).toBe("call-123");
    expect(notification.metadata?.callType).toBe("voice");
    expect(notification.metadata?.isGroupCall).toBe(false);
  });
});

// ============================================================================
// System Notification Tests
// ============================================================================

describe("buildSystemNotification", () => {
  const baseData: SystemNotificationData = {
    type: "info",
    title: "System Update",
    message: "A new version is available",
  };

  it("should build system notification", () => {
    const notification = buildSystemNotification(baseData);

    expect(notification.type).toBe("system");
    expect(notification.title).toBe("System Update");
    expect(notification.body).toBe("A new version is available");
  });

  it("should set priority based on type", () => {
    expect(
      buildSystemNotification({ ...baseData, type: "info" }).priority,
    ).toBe("low");
    expect(
      buildSystemNotification({ ...baseData, type: "success" }).priority,
    ).toBe("normal");
    expect(
      buildSystemNotification({ ...baseData, type: "warning" }).priority,
    ).toBe("high");
    expect(
      buildSystemNotification({ ...baseData, type: "error" }).priority,
    ).toBe("urgent");
  });

  it("should include action URL", () => {
    const data = { ...baseData, actionUrl: "/settings" };

    const notification = buildSystemNotification(data);

    expect(notification.actionUrl).toBe("/settings");
  });

  it("should include dismissable in metadata", () => {
    const data = { ...baseData, dismissable: false };

    const notification = buildSystemNotification(data);

    expect(notification.metadata?.dismissable).toBe(false);
  });

  it("should default dismissable to true", () => {
    const notification = buildSystemNotification(baseData);

    expect(notification.metadata?.dismissable).toBe(true);
  });
});

// ============================================================================
// Channel Invite Notification Tests
// ============================================================================

describe("buildChannelInviteNotification", () => {
  const baseData: ChannelInviteNotificationData = {
    channelId: "channel-1",
    channelName: "project-alpha",
    channelType: "public",
    inviterId: "user-1",
    inviterName: "John Doe",
    inviterAvatarUrl: "/avatars/john.jpg",
  };

  it("should build channel invite notification", () => {
    const notification = buildChannelInviteNotification(baseData);

    expect(notification.type).toBe("channel_invite");
    expect(notification.priority).toBe("normal");
    expect(notification.title).toBe("Invited to #project-alpha");
  });

  it("should include channel type in body", () => {
    const notification = buildChannelInviteNotification(baseData);

    expect(notification.body).toContain("channel");
  });

  it("should mention private channel", () => {
    const data = { ...baseData, channelType: "private" as const };

    const notification = buildChannelInviteNotification(data);

    expect(notification.body).toContain("private channel");
  });

  it("should include invite message", () => {
    const data = { ...baseData, message: "Join us for the project!" };

    const notification = buildChannelInviteNotification(data);

    expect(notification.body).toContain("Join us for the project!");
  });

  it("should truncate long invite message", () => {
    const data = { ...baseData, message: "A".repeat(100) };

    const notification = buildChannelInviteNotification(data);

    expect(notification.body).toContain("...");
  });
});

// ============================================================================
// Reaction Notification Tests
// ============================================================================

describe("buildReactionNotification", () => {
  const baseData: ReactionNotificationData = {
    messageId: "msg-123",
    messagePreview: "This is my original message",
    reactorId: "user-2",
    reactorName: "Jane Smith",
    reactorAvatarUrl: "/avatars/jane.jpg",
    emoji: "👍",
    channelId: "channel-1",
    channelName: "general",
  };

  it("should build reaction notification", () => {
    const notification = buildReactionNotification(baseData);

    expect(notification.type).toBe("reaction");
    expect(notification.priority).toBe("low");
    expect(notification.title).toBe("Jane Smith reacted 👍");
  });

  it("should include message preview in body", () => {
    const notification = buildReactionNotification(baseData);

    expect(notification.body).toContain("This is my original message");
  });

  it("should truncate long message preview", () => {
    const data = { ...baseData, messagePreview: "A".repeat(100) };

    const notification = buildReactionNotification(data);

    expect(notification.body.length).toBeLessThan(70);
  });

  it("should include emoji in metadata", () => {
    const notification = buildReactionNotification(baseData);

    expect(notification.metadata?.emoji).toBe("👍");
  });
});

// ============================================================================
// Thread Reply Notification Tests
// ============================================================================

describe("buildThreadReplyNotification", () => {
  const baseData: ThreadReplyNotificationData = {
    threadId: "thread-1",
    messageId: "msg-456",
    content: "This is my reply",
    senderId: "user-2",
    senderName: "Jane Smith",
    senderAvatarUrl: "/avatars/jane.jpg",
    channelId: "channel-1",
    channelName: "general",
  };

  it("should build thread reply notification", () => {
    const notification = buildThreadReplyNotification(baseData);

    expect(notification.type).toBe("thread_reply");
    expect(notification.priority).toBe("normal");
  });

  it("should use sender name in title without thread title", () => {
    const notification = buildThreadReplyNotification(baseData);

    expect(notification.title).toBe("Jane Smith replied in thread");
  });

  it("should use thread title when available", () => {
    const data = { ...baseData, threadTitle: "Project Discussion" };

    const notification = buildThreadReplyNotification(data);

    expect(notification.title).toContain("Project Discussion");
  });

  it("should truncate long thread title", () => {
    const data = { ...baseData, threadTitle: "A".repeat(50) };

    const notification = buildThreadReplyNotification(data);

    expect(notification.title.length).toBeLessThan(60);
  });

  it("should build correct action URL", () => {
    const notification = buildThreadReplyNotification(baseData);

    expect(notification.actionUrl).toBe(
      "/chat/channel-1?thread=thread-1#msg-456",
    );
  });
});

// ============================================================================
// Announcement Notification Tests
// ============================================================================

describe("buildAnnouncementNotification", () => {
  const baseData: AnnouncementNotificationData = {
    announcementId: "ann-123",
    title: "Important Update",
    content: "We have an important announcement to share",
    priority: "high",
  };

  it("should build announcement notification", () => {
    const notification = buildAnnouncementNotification(baseData);

    expect(notification.type).toBe("announcement");
    expect(notification.title).toBe("Important Update");
    expect(notification.priority).toBe("high");
  });

  it("should truncate long content", () => {
    const data = { ...baseData, content: "A".repeat(200) };

    const notification = buildAnnouncementNotification(data);

    expect(notification.body.length).toBe(150);
  });

  it("should include author info when provided", () => {
    const data = {
      ...baseData,
      authorId: "user-1",
      authorName: "Admin",
      authorAvatarUrl: "/avatars/admin.jpg",
    };

    const notification = buildAnnouncementNotification(data);

    expect(notification.actor).toEqual({
      id: "user-1",
      name: "Admin",
      avatarUrl: "/avatars/admin.jpg",
    });
  });

  it("should use custom action URL", () => {
    const data = { ...baseData, actionUrl: "/custom-page" };

    const notification = buildAnnouncementNotification(data);

    expect(notification.actionUrl).toBe("/custom-page");
  });

  it("should use default action URL", () => {
    const notification = buildAnnouncementNotification(baseData);

    expect(notification.actionUrl).toBe("/announcements/ann-123");
  });

  it("should include full content in metadata", () => {
    const notification = buildAnnouncementNotification(baseData);

    expect(notification.metadata?.fullContent).toBe(baseData.content);
  });
});

// ============================================================================
// NotificationBuilder Class Tests
// ============================================================================

describe("NotificationBuilder", () => {
  describe("constructor", () => {
    it("should create builder with default values", () => {
      const builder = new NotificationBuilder();

      expect(builder).toBeInstanceOf(NotificationBuilder);
    });
  });

  describe("static create", () => {
    it("should create new builder instance", () => {
      const builder = NotificationBuilder.create();

      expect(builder).toBeInstanceOf(NotificationBuilder);
    });
  });

  describe("fluent API", () => {
    it("should chain methods", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .priority("high")
        .title("Test Title")
        .body("Test Body")
        .build();

      expect(notification.type).toBe("mention");
      expect(notification.priority).toBe("high");
      expect(notification.title).toBe("Test Title");
      expect(notification.body).toBe("Test Body");
    });

    it("should set actor", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .actor("user-1", "John Doe", "/avatar.jpg")
        .build();

      expect(notification.actor).toEqual({
        id: "user-1",
        name: "John Doe",
        avatarUrl: "/avatar.jpg",
      });
    });

    it("should set channel", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .channel("channel-1", "general")
        .build();

      expect(notification.channelId).toBe("channel-1");
      expect(notification.channelName).toBe("general");
    });

    it("should set message", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .message("msg-123")
        .build();

      expect(notification.messageId).toBe("msg-123");
    });

    it("should set thread", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .thread("thread-1")
        .build();

      expect(notification.threadId).toBe("thread-1");
    });

    it("should set actionUrl", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .actionUrl("/custom-url")
        .build();

      expect(notification.actionUrl).toBe("/custom-url");
    });

    it("should set metadata", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .metadata({ custom: "value" })
        .build();

      expect(notification.metadata).toEqual({ custom: "value" });
    });

    it("should merge metadata", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .metadata({ first: 1 })
        .metadata({ second: 2 })
        .build();

      expect(notification.metadata).toEqual({ first: 1, second: 2 });
    });

    it("should set custom ID", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("Body")
        .id("custom-id")
        .build();

      expect(notification.id).toBe("custom-id");
    });

    it("should strip HTML from body", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .title("Test")
        .body("<p>Hello <strong>world</strong></p>")
        .build();

      expect(notification.body).toBe("Hello world");
    });
  });

  describe("build validation", () => {
    it("should throw when type is missing", () => {
      expect(() => {
        NotificationBuilder.create().title("Test").body("Body").build();
      }).toThrow("Notification type is required");
    });

    it("should throw when title is missing", () => {
      expect(() => {
        NotificationBuilder.create().type("mention").body("Body").build();
      }).toThrow("Notification title is required");
    });

    it("should throw when body is missing", () => {
      expect(() => {
        NotificationBuilder.create().type("mention").title("Test").build();
      }).toThrow("Notification body is required");
    });
  });

  describe("complete notification build", () => {
    it("should build complete notification", () => {
      const notification = NotificationBuilder.create()
        .type("mention")
        .priority("high")
        .title("You were mentioned")
        .body("Hey @user, check this out")
        .actor("user-1", "John Doe", "/avatars/john.jpg")
        .channel("channel-1", "general")
        .message("msg-123")
        .thread("thread-1")
        .actionUrl("/chat/channel-1#msg-123")
        .metadata({ mentionType: "user" })
        .build();

      expect(notification).toMatchObject({
        type: "mention",
        priority: "high",
        title: "You were mentioned",
        body: "Hey @user, check this out",
        actor: { id: "user-1", name: "John Doe" },
        channelId: "channel-1",
        messageId: "msg-123",
        threadId: "thread-1",
        actionUrl: "/chat/channel-1#msg-123",
        metadata: { mentionType: "user" },
      });
    });
  });
});
