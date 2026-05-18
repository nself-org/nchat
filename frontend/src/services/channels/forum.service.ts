/**
 * Forum Service
 *
 * Discord-style forum channel management including:
 * - Post creation with titles
 * - Tags for posts
 * - Sorting (Latest, Hot, Top)
 * - Post locking by moderators
 * - Pinned posts
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ForumTag {
  id: string;
  forumId: string;
  name: string;
  emoji?: string;
  color?: string;
  position: number;
  isModerated: boolean;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  forumId: string;
  threadId: string;
  title: string;
  content: string;
  authorId: string;
  tags: ForumTag[];
  isPinned: boolean;
  isLocked: boolean;
  isArchived: boolean;
  replyCount: number;
  viewCount: number;
  reactionCount: number;
  lastReplyAt: string | null;
  lastReplyBy: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  latestReplies?: ForumPostReply[];
}

export interface ForumPostReply {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ForumChannel {
  id: string;
  channelId: string;
  workspaceId: string;
  defaultReactionEmoji?: string;
  defaultSortOrder: ForumSortOrder;
  defaultAutoArchiveMinutes: number;
  requireTag: boolean;
  tags: ForumTag[];
  guidelines?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    topic?: string;
  };
}

export type ForumSortOrder = "latest" | "hot" | "top" | "oldest";

export interface CreateForumPostInput {
  forumId: string;
  title: string;
  content: string;
  tagIds?: string[];
  autoArchiveMinutes?: number;
}

export interface UpdateForumPostInput {
  title?: string;
  content?: string;
  tagIds?: string[];
}

export interface CreateForumTagInput {
  forumId: string;
  name: string;
  emoji?: string;
  color?: string;
  isModerated?: boolean;
}

export interface UpdateForumTagInput {
  name?: string;
  emoji?: string;
  color?: string;
  position?: number;
  isModerated?: boolean;
}

export interface ForumListOptions {
  forumId: string;
  sortBy?: ForumSortOrder;
  tagIds?: string[];
  authorId?: string;
  includeArchived?: boolean;
  includePinned?: boolean;
  limit?: number;
  offset?: number;
}

export interface ForumListResult {
  posts: ForumPost[];
  total: number;
  hasMore: boolean;
  pinnedPosts: ForumPost[];
}

export interface ForumSettings {
  defaultReactionEmoji?: string;
  defaultSortOrder: ForumSortOrder;
  defaultAutoArchiveMinutes: number;
  requireTag: boolean;
  guidelines?: string;
}

// =============================================================================
// FORUM SERVICE
// =============================================================================

export class ForumService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ===========================================================================
  // FORUM CHANNEL OPERATIONS
  // ===========================================================================

  /**
   * Get forum channel details
   */
  async getForumChannel(forumId: string): Promise<ForumChannel | null> {
    const response = await fetch(`/api/channels/forums/${forumId}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch forum channel");
    }

    const data = await response.json();
    return data.forum;
  }

  /**
   * Update forum channel settings
   */
  async updateForumSettings(
    forumId: string,
    settings: Partial<ForumSettings>,
  ): Promise<ForumChannel> {
    const response = await fetch(`/api/channels/forums/${forumId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update forum settings");
    }

    const data = await response.json();
    return data.forum;
  }

  // ===========================================================================
  // POST OPERATIONS
  // ===========================================================================

  /**
   * Create a new forum post
   */
  async createPost(input: CreateForumPostInput): Promise<ForumPost> {
    const response = await fetch(
      `/api/channels/forums/${input.forumId}/posts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          authorId: this.userId,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Get a forum post by ID
   */
  async getPost(postId: string): Promise<ForumPost | null> {
    const response = await fetch(`/api/channels/forums/posts/${postId}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error("Failed to fetch post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Get posts in a forum
   */
  async getPosts(options: ForumListOptions): Promise<ForumListResult> {
    const params = new URLSearchParams();
    params.set("forumId", options.forumId);

    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.tagIds?.length) params.set("tagIds", options.tagIds.join(","));
    if (options.authorId) params.set("authorId", options.authorId);
    if (options.includeArchived) params.set("includeArchived", "true");
    if (options.includePinned !== false) params.set("includePinned", "true");
    if (options.limit) params.set("limit", options.limit.toString());
    if (options.offset) params.set("offset", options.offset.toString());

    const response = await fetch(
      `/api/channels/forums/${options.forumId}/posts?${params}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }

    const data = await response.json();

    return {
      posts: data.posts || [],
      total: data.total || 0,
      hasMore: data.hasMore || false,
      pinnedPosts: data.pinnedPosts || [],
    };
  }

  /**
   * Update a forum post
   */
  async updatePost(
    postId: string,
    input: UpdateForumPostInput,
  ): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Delete a forum post
   */
  async deletePost(postId: string): Promise<void> {
    const response = await fetch(`/api/channels/forums/posts/${postId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete post");
    }
  }

  // ===========================================================================
  // POST MODERATION
  // ===========================================================================

  /**
   * Pin a post
   */
  async pinPost(postId: string): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to pin post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Unpin a post
   */
  async unpinPost(postId: string): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/pin`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unpin post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Lock a post (prevent new replies)
   */
  async lockPost(postId: string): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to lock post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Unlock a post
   */
  async unlockPost(postId: string): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/lock`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unlock post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Archive a post
   */
  async archivePost(postId: string): Promise<ForumPost> {
    const response = await fetch(
      `/api/channels/forums/posts/${postId}/archive`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: this.userId }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to archive post");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Unarchive a post
   */
  async unarchivePost(postId: string): Promise<ForumPost> {
    const response = await fetch(
      `/api/channels/forums/posts/${postId}/archive`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: this.userId }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unarchive post");
    }

    const data = await response.json();
    return data.post;
  }

  // ===========================================================================
  // TAG OPERATIONS
  // ===========================================================================

  /**
   * Get all tags for a forum
   */
  async getTags(forumId: string): Promise<ForumTag[]> {
    const response = await fetch(`/api/channels/forums/${forumId}/tags`);

    if (!response.ok) {
      throw new Error("Failed to fetch tags");
    }

    const data = await response.json();
    return data.tags || [];
  }

  /**
   * Create a new tag
   */
  async createTag(input: CreateForumTagInput): Promise<ForumTag> {
    const response = await fetch(`/api/channels/forums/${input.forumId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create tag");
    }

    const data = await response.json();
    return data.tag;
  }

  /**
   * Update a tag
   */
  async updateTag(
    tagId: string,
    input: UpdateForumTagInput,
  ): Promise<ForumTag> {
    const response = await fetch(`/api/channels/forums/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update tag");
    }

    const data = await response.json();
    return data.tag;
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagId: string): Promise<void> {
    const response = await fetch(`/api/channels/forums/tags/${tagId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete tag");
    }
  }

  /**
   * Reorder tags
   */
  async reorderTags(forumId: string, tagIds: string[]): Promise<void> {
    const response = await fetch(
      `/api/channels/forums/${forumId}/tags/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to reorder tags");
    }
  }

  /**
   * Add tags to a post
   */
  async addTagsToPost(postId: string, tagIds: string[]): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add tags");
    }

    const data = await response.json();
    return data.post;
  }

  /**
   * Remove tags from a post
   */
  async removeTagsFromPost(
    postId: string,
    tagIds: string[],
  ): Promise<ForumPost> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove tags");
    }

    const data = await response.json();
    return data.post;
  }

  // ===========================================================================
  // POST REACTIONS
  // ===========================================================================

  /**
   * React to a post
   */
  async addReaction(postId: string, emoji: string): Promise<void> {
    const response = await fetch(
      `/api/channels/forums/posts/${postId}/reactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          emoji,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to add reaction");
    }
  }

  /**
   * Remove reaction from a post
   */
  async removeReaction(postId: string, emoji: string): Promise<void> {
    const response = await fetch(
      `/api/channels/forums/posts/${postId}/reactions`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          emoji,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to remove reaction");
    }
  }

  // ===========================================================================
  // VIEW TRACKING
  // ===========================================================================

  /**
   * Record a view on a post
   */
  async recordView(postId: string): Promise<void> {
    const response = await fetch(`/api/channels/forums/posts/${postId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: this.userId }),
    });

    // Silently fail on view tracking
    if (!response.ok) {
      console.warn("Failed to record post view");
    }
  }

  // ===========================================================================
  // SORTING HELPERS
  // ===========================================================================

  /**
   * Get sorted posts using different algorithms
   */
  async getSortedPosts(
    forumId: string,
    sortOrder: ForumSortOrder,
  ): Promise<ForumPost[]> {
    const result = await this.getPosts({
      forumId,
      sortBy: sortOrder,
      limit: 50,
    });
    return result.posts;
  }

  /**
   * Get latest posts
   */
  async getLatestPosts(forumId: string, limit = 20): Promise<ForumPost[]> {
    const result = await this.getPosts({ forumId, sortBy: "latest", limit });
    return result.posts;
  }

  /**
   * Get hot posts (based on recent activity and engagement)
   */
  async getHotPosts(forumId: string, limit = 20): Promise<ForumPost[]> {
    const result = await this.getPosts({ forumId, sortBy: "hot", limit });
    return result.posts;
  }

  /**
   * Get top posts (based on total engagement)
   */
  async getTopPosts(forumId: string, limit = 20): Promise<ForumPost[]> {
    const result = await this.getPosts({ forumId, sortBy: "top", limit });
    return result.posts;
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

const forumServices = new Map<string, ForumService>();

export function getForumService(userId: string): ForumService {
  if (!forumServices.has(userId)) {
    forumServices.set(userId, new ForumService(userId));
  }
  return forumServices.get(userId)!;
}

export function createForumService(userId: string): ForumService {
  return new ForumService(userId);
}
