/**
 * Thread Service
 *
 * Complete thread lifecycle management including:
 * - Thread creation from messages
 * - Thread participants tracking
 * - Auto-archive after inactivity
 * - Thread follow/unfollow
 * - Thread-only channels support
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ThreadParticipant {
  id: string;
  userId: string;
  threadId: string;
  joinedAt: string;
  lastReadAt: string | null;
  notificationsEnabled: boolean;
  replyCount: number;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status?: string;
  };
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  channelId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  attachments: ThreadAttachment[];
  reactions: ThreadReaction[];
  mentions: ThreadMention[];
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ThreadAttachment {
  id: string;
  type: string;
  name: string;
  url: string;
  size: number;
  thumbnailUrl?: string;
}

export interface ThreadReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface ThreadMention {
  type: "user" | "channel" | "everyone";
  id?: string;
  name: string;
}

export interface Thread {
  id: string;
  channelId: string;
  parentMessageId: string;
  creatorId: string;
  messageCount: number;
  participantCount: number;
  lastReplyAt: string | null;
  isArchived: boolean;
  isLocked: boolean;
  autoArchiveMinutes: number;
  archivedAt: string | null;
  archivedBy: string | null;
  archiveReason: string | null;
  createdAt: string;
  updatedAt: string;
  parentMessage?: ThreadMessage;
  latestReplies?: ThreadMessage[];
  participants?: ThreadParticipant[];
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateThreadInput {
  channelId: string;
  parentMessageId: string;
  content: string;
  type?: string;
}

export interface ReplyToThreadInput {
  threadId: string;
  content: string;
  type?: string;
  attachments?: Array<{
    type: string;
    name: string;
    url: string;
    size: number;
    thumbnailUrl?: string;
  }>;
}

export interface ThreadListOptions {
  channelId?: string;
  userId?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface ThreadListResult {
  threads: Thread[];
  total: number;
  hasMore: boolean;
}

export interface ThreadArchiveOptions {
  reason?: string;
  autoArchive?: boolean;
}

export type AutoArchiveDuration = 60 | 1440 | 4320 | 10080 | "never";

// =============================================================================
// THREAD SERVICE
// =============================================================================

export class ThreadService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ===========================================================================
  // THREAD CRUD OPERATIONS
  // ===========================================================================

  /**
   * Create a new thread from a message
   */
  async createThread(input: CreateThreadInput): Promise<Thread> {
    const response = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        userId: this.userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create thread");
    }

    const data = await response.json();
    return data.thread;
  }

  /**
   * Get a thread by ID
   */
  async getThread(
    threadId: string,
    includeMessages = false,
  ): Promise<Thread | null> {
    const params = new URLSearchParams({
      includeMessages: includeMessages.toString(),
    });

    const response = await fetch(`/api/threads/${threadId}?${params}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch thread");
    }

    const data = await response.json();
    return data.thread;
  }

  /**
   * Get threads list
   */
  async getThreads(options: ThreadListOptions = {}): Promise<ThreadListResult> {
    const params = new URLSearchParams();

    if (options.channelId) params.set("channelId", options.channelId);
    if (options.userId) params.set("userId", options.userId);
    if (options.includeArchived) params.set("includeArchived", "true");
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.offset) params.set("offset", options.offset.toString());

    const response = await fetch(`/api/threads?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch threads");
    }

    const data = await response.json();

    return {
      threads: data.threads || [],
      total: data.total || 0,
      hasMore: data.hasMore || false,
    };
  }

  /**
   * Get threads user is participating in
   */
  async getMyThreads(
    options: Omit<ThreadListOptions, "userId"> = {},
  ): Promise<ThreadListResult> {
    return this.getThreads({ ...options, userId: this.userId });
  }

  /**
   * Get unread thread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await fetch(`/api/threads/unread?userId=${this.userId}`);

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  }

  // ===========================================================================
  // THREAD MESSAGES
  // ===========================================================================

  /**
   * Reply to a thread
   */
  async replyToThread(input: ReplyToThreadInput): Promise<ThreadMessage> {
    const response = await fetch(`/api/threads/${input.threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.content,
        type: input.type || "text",
        attachments: input.attachments,
        userId: this.userId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reply to thread");
    }

    const data = await response.json();
    return data.message;
  }

  /**
   * Get messages in a thread
   */
  async getThreadMessages(
    threadId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<{ messages: ThreadMessage[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.before) params.set("before", options.before);

    const response = await fetch(`/api/threads/${threadId}/messages?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch thread messages");
    }

    const data = await response.json();
    return {
      messages: data.messages || [],
      hasMore: data.hasMore || false,
    };
  }

  // ===========================================================================
  // THREAD PARTICIPANTS
  // ===========================================================================

  /**
   * Get thread participants
   */
  async getParticipants(threadId: string): Promise<ThreadParticipant[]> {
    const response = await fetch(`/api/threads/${threadId}/participants`);

    if (!response.ok) {
      throw new Error("Failed to fetch thread participants");
    }

    const data = await response.json();
    return data.participants || [];
  }

  /**
   * Follow a thread (join as participant)
   */
  async followThread(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/follow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to follow thread");
    }
  }

  /**
   * Unfollow a thread (leave as participant)
   */
  async unfollowThread(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/follow`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unfollow thread");
    }
  }

  /**
   * Check if user is following a thread
   */
  async isFollowing(threadId: string): Promise<boolean> {
    const participants = await this.getParticipants(threadId);
    return participants.some((p) => p.userId === this.userId);
  }

  // ===========================================================================
  // THREAD NOTIFICATIONS
  // ===========================================================================

  /**
   * Update thread notification settings
   */
  async updateNotifications(threadId: string, enabled: boolean): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.userId,
        enabled,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update notifications");
    }
  }

  /**
   * Mute thread notifications
   */
  async muteThread(threadId: string): Promise<void> {
    return this.updateNotifications(threadId, false);
  }

  /**
   * Unmute thread notifications
   */
  async unmuteThread(threadId: string): Promise<void> {
    return this.updateNotifications(threadId, true);
  }

  // ===========================================================================
  // READ STATUS
  // ===========================================================================

  /**
   * Mark thread as read
   */
  async markAsRead(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark thread as read");
    }
  }

  /**
   * Get unread message count for a thread
   */
  async getThreadUnreadCount(threadId: string): Promise<number> {
    const response = await fetch(
      `/api/threads/${threadId}/unread?userId=${this.userId}`,
    );

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  }

  // ===========================================================================
  // ARCHIVE MANAGEMENT
  // ===========================================================================

  /**
   * Archive a thread
   */
  async archiveThread(
    threadId: string,
    options: ThreadArchiveOptions = {},
  ): Promise<Thread> {
    const response = await fetch(`/api/threads/${threadId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: this.userId,
        reason: options.reason,
        autoArchive: options.autoArchive || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive thread");
    }

    const data = await response.json();
    return data.thread;
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string): Promise<Thread> {
    const response = await fetch(`/api/threads/${threadId}/archive`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unarchive thread");
    }

    const data = await response.json();
    return data.thread;
  }

  /**
   * Set auto-archive duration
   */
  async setAutoArchiveDuration(
    threadId: string,
    duration: AutoArchiveDuration,
  ): Promise<void> {
    const minutes = duration === "never" ? 0 : duration;

    const response = await fetch(`/api/threads/${threadId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        autoArchiveMinutes: minutes,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update auto-archive settings");
    }
  }

  // ===========================================================================
  // THREAD LOCK
  // ===========================================================================

  /**
   * Lock a thread (prevent new replies)
   */
  async lockThread(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to lock thread");
    }
  }

  /**
   * Unlock a thread
   */
  async unlockThread(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}/lock`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      throw new Error("Failed to unlock thread");
    }
  }

  // ===========================================================================
  // THREAD DELETION
  // ===========================================================================

  /**
   * Delete a thread (admin only)
   */
  async deleteThread(threadId: string): Promise<void> {
    const response = await fetch(`/api/threads/${threadId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete thread");
    }
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

const threadServices = new Map<string, ThreadService>();

export function getThreadService(userId: string): ThreadService {
  if (!threadServices.has(userId)) {
    threadServices.set(userId, new ThreadService(userId));
  }
  return threadServices.get(userId)!;
}

export function createThreadService(userId: string): ThreadService {
  return new ThreadService(userId);
}
