/**
 * Forum Service Tests
 *
 * Tests for Discord-style forum channel management including posts,
 * tags, sorting, and moderation.
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import {
  ForumService,
  getForumService,
  createForumService,
} from "../forum.service";

// Mock fetch
global.fetch = jest.fn();

describe("ForumService", () => {
  let service: ForumService;
  const mockUserId = "user-123";

  beforeEach(() => {
    service = new ForumService(mockUserId);
    jest.clearAllMocks();
  });

  // ===========================================================================
  // FORUM CHANNEL TESTS
  // ===========================================================================

  describe("getForumChannel", () => {
    it("should fetch forum channel details", async () => {
      const mockForum = {
        id: "forum-1",
        channelId: "ch-1",
        defaultSortOrder: "latest",
        requireTag: false,
        tags: [],
        postCount: 10,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ forum: mockForum }),
      });

      const result = await service.getForumChannel("forum-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("forum-1");
      expect(result?.postCount).toBe(10);
    });

    it("should return null for non-existent forum", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.getForumChannel("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateForumSettings", () => {
    it("should update forum settings", async () => {
      const settings = {
        defaultSortOrder: "hot" as const,
        requireTag: true,
        guidelines: "Please be respectful",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ forum: { id: "forum-1", ...settings } }),
      });

      const result = await service.updateForumSettings("forum-1", settings);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/forum-1/settings",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        },
      );
      expect(result.defaultSortOrder).toBe("hot");
    });
  });

  // ===========================================================================
  // POST OPERATIONS TESTS
  // ===========================================================================

  describe("createPost", () => {
    it("should create a forum post", async () => {
      const input = {
        forumId: "forum-1",
        title: "How to use React hooks?",
        content: "I need help understanding hooks...",
        tagIds: ["tag-1", "tag-2"],
      };

      const mockPost = {
        id: "post-1",
        ...input,
        authorId: mockUserId,
        replyCount: 0,
        viewCount: 0,
        isPinned: false,
        isLocked: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: mockPost }),
      });

      const result = await service.createPost(input);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/forum-1/posts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, authorId: mockUserId }),
        },
      );
      expect(result.title).toBe("How to use React hooks?");
    });

    it("should throw error on creation failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Tag required" }),
      });

      await expect(
        service.createPost({
          forumId: "forum-1",
          title: "Test",
          content: "Content",
        }),
      ).rejects.toThrow("Tag required");
    });
  });

  describe("getPost", () => {
    it("should fetch a post by ID", async () => {
      const mockPost = { id: "post-1", title: "Test Post" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: mockPost }),
      });

      const result = await service.getPost("post-1");

      expect(result?.id).toBe("post-1");
    });

    it("should return null for non-existent post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.getPost("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getPosts", () => {
    it("should fetch posts list", async () => {
      const mockPosts = [{ id: "post-1" }, { id: "post-2" }];
      const mockPinnedPosts = [{ id: "post-3", isPinned: true }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: mockPosts,
          pinnedPosts: mockPinnedPosts,
          total: 3,
          hasMore: false,
        }),
      });

      const result = await service.getPosts({ forumId: "forum-1" });

      expect(result.posts).toHaveLength(2);
      expect(result.pinnedPosts).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it("should pass filter options", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [],
          pinnedPosts: [],
          total: 0,
          hasMore: false,
        }),
      });

      await service.getPosts({
        forumId: "forum-1",
        sortBy: "hot",
        tagIds: ["tag-1", "tag-2"],
        includeArchived: true,
        limit: 20,
      });

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("sortBy=hot");
      expect(url).toContain("tagIds=tag-1%2Ctag-2");
      expect(url).toContain("includeArchived=true");
      expect(url).toContain("limit=20");
    });
  });

  describe("updatePost", () => {
    it("should update a post", async () => {
      const updates = { title: "Updated Title", content: "Updated content" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", ...updates } }),
      });

      const result = await service.updatePost("post-1", updates);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      expect(result.title).toBe("Updated Title");
    });
  });

  describe("deletePost", () => {
    it("should delete a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deletePost("post-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1",
        {
          method: "DELETE",
        },
      );
    });
  });

  // ===========================================================================
  // POST MODERATION TESTS
  // ===========================================================================

  describe("pinPost", () => {
    it("should pin a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isPinned: true } }),
      });

      const result = await service.pinPost("post-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/pin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId }),
        },
      );
      expect(result.isPinned).toBe(true);
    });
  });

  describe("unpinPost", () => {
    it("should unpin a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isPinned: false } }),
      });

      const result = await service.unpinPost("post-1");

      expect(result.isPinned).toBe(false);
    });
  });

  describe("lockPost", () => {
    it("should lock a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isLocked: true } }),
      });

      const result = await service.lockPost("post-1");

      expect(result.isLocked).toBe(true);
    });
  });

  describe("unlockPost", () => {
    it("should unlock a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isLocked: false } }),
      });

      const result = await service.unlockPost("post-1");

      expect(result.isLocked).toBe(false);
    });
  });

  describe("archivePost", () => {
    it("should archive a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isArchived: true } }),
      });

      const result = await service.archivePost("post-1");

      expect(result.isArchived).toBe(true);
    });
  });

  describe("unarchivePost", () => {
    it("should unarchive a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", isArchived: false } }),
      });

      const result = await service.unarchivePost("post-1");

      expect(result.isArchived).toBe(false);
    });
  });

  // ===========================================================================
  // TAG OPERATIONS TESTS
  // ===========================================================================

  describe("getTags", () => {
    it("should fetch forum tags", async () => {
      const mockTags = [
        { id: "tag-1", name: "Question", emoji: "❓" },
        { id: "tag-2", name: "Discussion", emoji: "💬" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      const result = await service.getTags("forum-1");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Question");
    });
  });

  describe("createTag", () => {
    it("should create a tag", async () => {
      const input = {
        forumId: "forum-1",
        name: "Bug Report",
        emoji: "🐛",
        color: "#ef4444",
      };

      const mockTag = {
        id: "tag-1",
        ...input,
        position: 0,
        isModerated: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag: mockTag }),
      });

      const result = await service.createTag(input);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/forum-1/tags",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      expect(result.name).toBe("Bug Report");
    });
  });

  describe("updateTag", () => {
    it("should update a tag", async () => {
      const updates = { name: "Updated Name", color: "#3b82f6" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag: { id: "tag-1", ...updates } }),
      });

      const result = await service.updateTag("tag-1", updates);

      expect(result.name).toBe("Updated Name");
    });
  });

  describe("deleteTag", () => {
    it("should delete a tag", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteTag("tag-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/tags/tag-1",
        {
          method: "DELETE",
        },
      );
    });
  });

  describe("reorderTags", () => {
    it("should reorder tags", async () => {
      const tagIds = ["tag-3", "tag-1", "tag-2"];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.reorderTags("forum-1", tagIds);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/forum-1/tags/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds }),
        },
      );
    });
  });

  describe("addTagsToPost", () => {
    it("should add tags to a post", async () => {
      const tagIds = ["tag-1", "tag-2"];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", tags: tagIds } }),
      });

      const result = await service.addTagsToPost("post-1", tagIds);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/tags",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds }),
        },
      );
      expect(result).toBeDefined();
    });
  });

  describe("removeTagsFromPost", () => {
    it("should remove tags from a post", async () => {
      const tagIds = ["tag-1"];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ post: { id: "post-1", tags: [] } }),
      });

      await service.removeTagsFromPost("post-1", tagIds);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/tags",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds }),
        },
      );
    });
  });

  // ===========================================================================
  // REACTION TESTS
  // ===========================================================================

  describe("addReaction", () => {
    it("should add a reaction to a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.addReaction("post-1", "👍");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/reactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId, emoji: "👍" }),
        },
      );
    });
  });

  describe("removeReaction", () => {
    it("should remove a reaction from a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.removeReaction("post-1", "👍");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/reactions",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId, emoji: "👍" }),
        },
      );
    });
  });

  // ===========================================================================
  // VIEW TRACKING TESTS
  // ===========================================================================

  describe("recordView", () => {
    it("should record a view on a post", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.recordView("post-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/forums/posts/post-1/view",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mockUserId }),
        },
      );
    });

    it("should not throw on view tracking failure", async () => {
      // Mock console.warn to suppress output
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(service.recordView("post-1")).resolves.toBeUndefined();

      warnSpy.mockRestore();
    });
  });

  // ===========================================================================
  // SORTING HELPER TESTS
  // ===========================================================================

  describe("getSortedPosts", () => {
    it("should get posts sorted by specified order", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [{ id: "post-1" }],
          pinnedPosts: [],
          total: 1,
          hasMore: false,
        }),
      });

      await service.getSortedPosts("forum-1", "hot");

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("sortBy=hot");
    });
  });

  describe("getLatestPosts", () => {
    it("should get latest posts", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [],
          pinnedPosts: [],
          total: 0,
          hasMore: false,
        }),
      });

      await service.getLatestPosts("forum-1", 10);

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("sortBy=latest");
      expect(url).toContain("limit=10");
    });
  });

  describe("getHotPosts", () => {
    it("should get hot posts", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [],
          pinnedPosts: [],
          total: 0,
          hasMore: false,
        }),
      });

      await service.getHotPosts("forum-1");

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("sortBy=hot");
    });
  });

  describe("getTopPosts", () => {
    it("should get top posts", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [],
          pinnedPosts: [],
          total: 0,
          hasMore: false,
        }),
      });

      await service.getTopPosts("forum-1");

      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain("sortBy=top");
    });
  });

  // ===========================================================================
  // SINGLETON FACTORY TESTS
  // ===========================================================================

  describe("getForumService", () => {
    it("should return same instance for same user", () => {
      const service1 = getForumService("user-1");
      const service2 = getForumService("user-1");

      expect(service1).toBe(service2);
    });

    it("should return different instances for different users", () => {
      const service1 = getForumService("user-1");
      const service2 = getForumService("user-2");

      expect(service1).not.toBe(service2);
    });
  });

  describe("createForumService", () => {
    it("should always create new instance", () => {
      const service1 = createForumService("user-1");
      const service2 = createForumService("user-1");

      expect(service1).not.toBe(service2);
    });
  });
});
