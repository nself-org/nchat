/**
 * SyncService Tests
 *
 * Tests for the search sync service functionality.
 */

import { SyncService, createSyncService } from "../sync.service";
import type { Message } from "@/types/message";

// Mock MeiliSearch
const mockAddDocuments = jest.fn().mockResolvedValue({ taskUid: 1 });
const mockDeleteDocument = jest.fn().mockResolvedValue({ taskUid: 2 });
const mockDeleteDocuments = jest.fn().mockResolvedValue({ taskUid: 3 });

jest.mock("@/lib/search/meilisearch-config", () => ({
  getMeiliClient: jest.fn(() => ({
    index: jest.fn(() => ({
      addDocuments: mockAddDocuments,
      deleteDocument: mockDeleteDocument,
      deleteDocuments: mockDeleteDocuments,
    })),
  })),
  getMessagesIndex: jest.fn(() => ({
    addDocuments: mockAddDocuments,
    deleteDocument: mockDeleteDocument,
    deleteDocuments: mockDeleteDocuments,
  })),
  getFilesIndex: jest.fn(() => ({
    addDocuments: mockAddDocuments,
    deleteDocument: mockDeleteDocument,
    deleteDocuments: mockDeleteDocuments,
  })),
  getUsersIndex: jest.fn(() => ({
    addDocuments: mockAddDocuments,
    deleteDocument: mockDeleteDocument,
    deleteDocuments: mockDeleteDocuments,
  })),
  getChannelsIndex: jest.fn(() => ({
    addDocuments: mockAddDocuments,
    deleteDocument: mockDeleteDocument,
    deleteDocuments: mockDeleteDocuments,
  })),
  INDEXES: {
    MESSAGES: "nchat_messages",
    FILES: "nchat_files",
    USERS: "nchat_users",
    CHANNELS: "nchat_channels",
  },
}));

jest.mock("../message-indexer", () => ({
  getMessageIndexer: jest.fn(() => ({
    indexMessage: jest.fn().mockResolvedValue({ success: true, taskId: 1 }),
    updateMessage: jest.fn().mockResolvedValue({ success: true, taskId: 2 }),
    removeMessage: jest.fn().mockResolvedValue({ success: true, taskId: 3 }),
    indexMessages: jest.fn().mockResolvedValue({
      total: 2,
      successful: 2,
      failed: 0,
      errors: [],
      taskIds: [4, 5],
    }),
    reindexAll: jest.fn().mockResolvedValue({
      total: 10,
      successful: 10,
      failed: 0,
      errors: [],
      taskIds: [6],
    }),
    destroy: jest.fn(),
  })),
}));

describe("SyncService", () => {
  let syncService: SyncService;

  const mockMessage: Message = {
    id: "msg-1",
    channelId: "channel-1",
    content: "Test message",
    type: "text",
    userId: "user-1",
    user: {
      id: "user-1",
      username: "testuser",
      displayName: "Test User",
    },
    createdAt: new Date(),
    isEdited: false,
  };

  const mockChannel = {
    id: "channel-1",
    name: "general",
  };

  const mockAuthor = {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
  };

  beforeEach(() => {
    syncService = createSyncService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncService.destroy();
  });

  describe("indexMessage", () => {
    it("should index a message successfully", async () => {
      const result = await syncService.indexMessage(
        mockMessage,
        mockChannel,
        mockAuthor,
      );

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should track duration", async () => {
      const result = await syncService.indexMessage(mockMessage);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("updateMessage", () => {
    it("should update a message successfully", async () => {
      const result = await syncService.updateMessage(
        mockMessage,
        mockChannel,
        mockAuthor,
      );

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(1);
    });
  });

  describe("removeMessage", () => {
    it("should remove a message successfully", async () => {
      const result = await syncService.removeMessage("msg-1");

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("indexFile", () => {
    it("should index a file successfully", async () => {
      const file = {
        id: "file-1",
        name: "document.pdf",
        mimeType: "application/pdf",
        size: 1024,
        url: "https://example.com/file.pdf",
        channelId: "channel-1",
        messageId: "msg-1",
        uploaderId: "user-1",
        createdAt: new Date(),
      };

      const result = await syncService.indexFile(file);

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(1);
    });
  });

  describe("indexUser", () => {
    it("should index a user successfully", async () => {
      const user = {
        id: "user-1",
        username: "testuser",
        displayName: "Test User",
        email: "test@example.com",
        role: "member",
        isActive: true,
        isBot: false,
        createdAt: new Date(),
      };

      const result = await syncService.indexUser(user);

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(1);
    });
  });

  describe("indexChannel", () => {
    it("should index a channel successfully", async () => {
      const channel = {
        id: "channel-1",
        name: "general",
        description: "General discussion",
        type: "public",
        createdBy: "user-1",
        createdAt: new Date(),
        memberCount: 50,
      };

      const result = await syncService.indexChannel(channel);

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(1);
    });
  });

  describe("batchIndexMessages", () => {
    it("should batch index messages", async () => {
      const messages = [
        { message: mockMessage, channel: mockChannel, author: mockAuthor },
        {
          message: { ...mockMessage, id: "msg-2" },
          channel: mockChannel,
          author: mockAuthor,
        },
      ];

      const result = await syncService.batchIndexMessages(messages);

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe("getSyncStatus", () => {
    it("should return sync status for an index", () => {
      const status = syncService.getSyncStatus("nchat_messages");

      expect(status).toBeDefined();
      expect(status?.indexName).toBe("nchat_messages");
      expect(status?.isRunning).toBe(false);
    });
  });

  describe("getAllSyncStatus", () => {
    it("should return status for all indexes", () => {
      const statusMap = syncService.getAllSyncStatus();

      expect(statusMap.size).toBeGreaterThan(0);
      expect(statusMap.has("nchat_messages")).toBe(true);
      expect(statusMap.has("nchat_files")).toBe(true);
      expect(statusMap.has("nchat_users")).toBe(true);
      expect(statusMap.has("nchat_channels")).toBe(true);
    });
  });

  describe("onSyncEvent", () => {
    it("should subscribe to sync events", async () => {
      const handler = jest.fn();
      const unsubscribe = syncService.onSyncEvent(handler);

      await syncService.indexMessage(mockMessage);

      expect(handler).toHaveBeenCalled();
      // Handler receives the event object with type 'create'
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "create" }),
      );

      unsubscribe();
    });

    it("should unsubscribe from sync events", async () => {
      const handler = jest.fn();
      const unsubscribe = syncService.onSyncEvent(handler);

      unsubscribe();

      await syncService.indexMessage(mockMessage);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
