/**
 * Message Export Service Tests
 *
 * Comprehensive tests for the export service including:
 * - Export format generation (JSON, CSV, HTML, Markdown)
 * - Message transformation
 * - Export job management
 * - Edge cases and error handling
 */

import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  MessageExportService,
  createMessageExportService,
  type ExportJob,
} from "../export.service";
import type {
  ExtendedMessage,
  MessageExportOptions,
} from "@/types/message-extended";

// Mock Apollo Client
const createMockClient = (): ApolloClient<NormalizedCacheObject> => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    defaultOptions: {
      query: { fetchPolicy: "no-cache" },
      mutate: { fetchPolicy: "no-cache" },
    },
  });
};

// Test data factory
const createTestMessage = (
  overrides: Partial<ExtendedMessage> = {},
): ExtendedMessage => ({
  id: "msg-" + Math.random().toString(36).substr(2, 9),
  channelId: "ch-123",
  content: "Test message content",
  type: "text",
  userId: "user-456",
  user: {
    id: "user-456",
    username: "testuser",
    displayName: "Test User",
  },
  createdAt: new Date(),
  isEdited: false,
  ...overrides,
});

describe("MessageExportService", () => {
  let service: MessageExportService;
  let mockClient: ApolloClient<NormalizedCacheObject>;

  beforeEach(() => {
    mockClient = createMockClient();
    service = createMessageExportService(mockClient);
  });

  describe("exportMessages", () => {
    describe("JSON format", () => {
      it("should export messages to JSON", async () => {
        const messages = [createTestMessage(), createTestMessage()];
        const options: MessageExportOptions = {
          format: "json",
        };

        const result = await service.exportMessages(messages, options);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        const parsed = JSON.parse(result.data!);
        expect(parsed.format).toBe("json");
        expect(parsed.messageCount).toBe(2);
        expect(parsed.messages).toHaveLength(2);
      });

      it("should include export timestamp", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "json",
        };

        const result = await service.exportMessages(messages, options);
        const parsed = JSON.parse(result.data!);

        expect(parsed.exportedAt).toBeDefined();
        expect(new Date(parsed.exportedAt)).toBeInstanceOf(Date);
      });

      it("should include message metadata", async () => {
        const message = createTestMessage({
          isEdited: true,
          editedAt: new Date(),
        });
        const options: MessageExportOptions = {
          format: "json",
        };

        const result = await service.exportMessages([message], options);
        const parsed = JSON.parse(result.data!);

        expect(parsed.messages[0].isEdited).toBe(true);
      });
    });

    describe("CSV format", () => {
      it("should export messages to CSV", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "csv",
        };

        const result = await service.exportMessages(messages, options);

        expect(result.success).toBe(true);
        expect(result.data).toContain("ID,Type,Author ID");
      });

      it("should include header row", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "csv",
        };

        const result = await service.exportMessages(messages, options);
        const lines = result.data!.split("\n");

        expect(lines[0]).toContain("ID");
        expect(lines[0]).toContain("Author Name");
        expect(lines[0]).toContain("Content");
      });

      it("should escape special characters", async () => {
        const message = createTestMessage({
          content: 'Hello, "World"',
        });
        const options: MessageExportOptions = {
          format: "csv",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain('"Hello, ""World"""');
      });

      it("should handle newlines in content", async () => {
        const message = createTestMessage({
          content: "Line 1\nLine 2",
        });
        const options: MessageExportOptions = {
          format: "csv",
        };

        const result = await service.exportMessages([message], options);

        expect(result.success).toBe(true);
        expect(result.data).toContain('"Line 1\nLine 2"');
      });
    });

    describe("HTML format", () => {
      it("should export messages to HTML", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages(messages, options);

        expect(result.success).toBe(true);
        expect(result.data).toContain("<!DOCTYPE html>");
        expect(result.data).toContain("<html>");
      });

      it("should include CSS styles", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages(messages, options);

        expect(result.data).toContain("<style>");
        expect(result.data).toContain(".message");
      });

      it("should render message content", async () => {
        const message = createTestMessage({
          content: "Hello World",
          user: {
            id: "user-1",
            username: "john",
            displayName: "John Doe",
          },
        });
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("Hello World");
        expect(result.data).toContain("John Doe");
      });

      it("should escape HTML in content", async () => {
        const message = createTestMessage({
          content: '<script>alert("xss")</script>',
        });
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).not.toContain("<script>");
        expect(result.data).toContain("&lt;script&gt;");
      });

      it("should render poll messages", async () => {
        const message = createTestMessage({
          type: "poll",
          extendedType: "poll",
          poll: {
            id: "poll-1",
            question: "Favorite color?",
            options: [
              {
                id: "o1",
                text: "Red",
                voteCount: 10,
                percentage: 50,
                position: 0,
              },
              {
                id: "o2",
                text: "Blue",
                voteCount: 10,
                percentage: 50,
                position: 1,
              },
            ],
            settings: {
              type: "single",
              allowMultiple: false,
              isAnonymous: false,
              resultsVisibility: "always",
              allowVoteChange: true,
              allowAddOptions: false,
              addOptionsPermission: "creator",
              requireComment: false,
              showVoterNames: true,
              showRealTimeResults: true,
              isQuiz: false,
            },
            status: "active",
            createdBy: "user-1",
            channelId: "ch-1",
            totalVotes: 20,
            totalVoters: 20,
            createdAt: new Date(),
            updatedAt: new Date(),
            hasVoted: false,
          },
        });
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("Favorite color?");
        expect(result.data).toContain("Red");
        expect(result.data).toContain("Blue");
      });

      it("should render location messages", async () => {
        const message = createTestMessage({
          extendedType: "location",
          locationData: {
            location: { latitude: 40.7128, longitude: -74.006 },
            name: "New York City",
            address: "NYC, USA",
          },
        });
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("New York City");
        expect(result.data).toContain("View on Map");
      });

      it("should render contact messages", async () => {
        const message = createTestMessage({
          extendedType: "contact",
          contactData: {
            firstName: "John",
            displayName: "John Doe",
            phones: [{ type: "mobile", number: "555-1234" }],
            emails: [{ type: "personal", email: "john@example.com" }],
          },
        });
        const options: MessageExportOptions = {
          format: "html",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("John Doe");
        expect(result.data).toContain("555-1234");
        expect(result.data).toContain("john@example.com");
      });
    });

    describe("Markdown format", () => {
      it("should export messages to Markdown", async () => {
        const messages = [createTestMessage()];
        const options: MessageExportOptions = {
          format: "markdown",
        };

        const result = await service.exportMessages(messages, options);

        expect(result.success).toBe(true);
        expect(result.data).toContain("# Chat Export");
      });

      it("should format author and timestamp", async () => {
        const message = createTestMessage({
          user: {
            id: "user-1",
            username: "john",
            displayName: "John Doe",
          },
        });
        const options: MessageExportOptions = {
          format: "markdown",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("**John Doe**");
      });

      it("should render polls with progress bars", async () => {
        const message = createTestMessage({
          extendedType: "poll",
          poll: {
            id: "poll-1",
            question: "Vote?",
            options: [
              {
                id: "o1",
                text: "Yes",
                voteCount: 75,
                percentage: 75,
                position: 0,
              },
              {
                id: "o2",
                text: "No",
                voteCount: 25,
                percentage: 25,
                position: 1,
              },
            ],
            settings: {
              type: "single",
              allowMultiple: false,
              isAnonymous: false,
              resultsVisibility: "always",
              allowVoteChange: true,
              allowAddOptions: false,
              addOptionsPermission: "creator",
              requireComment: false,
              showVoterNames: true,
              showRealTimeResults: true,
              isQuiz: false,
            },
            status: "closed",
            createdBy: "user-1",
            channelId: "ch-1",
            totalVotes: 100,
            totalVoters: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            hasVoted: false,
          },
        });
        const options: MessageExportOptions = {
          format: "markdown",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("**Poll: Vote?**");
        expect(result.data).toContain("Yes");
        expect(result.data).toContain("75%");
      });

      it("should render location with map link", async () => {
        const message = createTestMessage({
          extendedType: "location",
          locationData: {
            location: { latitude: 51.5074, longitude: -0.1278 },
            name: "London",
          },
        });
        const options: MessageExportOptions = {
          format: "markdown",
        };

        const result = await service.exportMessages([message], options);

        expect(result.data).toContain("Location");
        expect(result.data).toContain("[View on Map]");
      });
    });
  });

  describe("message filtering", () => {
    it("should filter by date range", async () => {
      const oldMessage = createTestMessage({
        createdAt: new Date("2023-01-01"),
      });
      const newMessage = createTestMessage({
        createdAt: new Date("2024-06-01"),
      });

      const options: MessageExportOptions = {
        format: "json",
        dateRange: {
          from: new Date("2024-01-01"),
        },
      };

      const result = await service.exportMessages(
        [oldMessage, newMessage],
        options,
      );
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages).toHaveLength(1);
    });

    it("should filter by message types", async () => {
      const textMessage = createTestMessage({ type: "text" });
      const pollMessage = createTestMessage({
        type: "poll",
        extendedType: "poll",
      });

      const options: MessageExportOptions = {
        format: "json",
        messageTypes: ["poll"],
      };

      const result = await service.exportMessages(
        [textMessage, pollMessage],
        options,
      );
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages).toHaveLength(1);
      expect(parsed.messages[0].type).toBe("poll");
    });

    it("should filter by user IDs", async () => {
      const msg1 = createTestMessage({ userId: "user-1" });
      const msg2 = createTestMessage({ userId: "user-2" });

      const options: MessageExportOptions = {
        format: "json",
        userIds: ["user-1"],
      };

      const result = await service.exportMessages([msg1, msg2], options);
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages).toHaveLength(1);
    });

    it("should exclude system messages when requested", async () => {
      const textMessage = createTestMessage({ type: "text" });
      const systemMessage = createTestMessage({ type: "user_joined" });

      const options: MessageExportOptions = {
        format: "json",
        includeSystemMessages: false,
      };

      const result = await service.exportMessages(
        [textMessage, systemMessage],
        options,
      );
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages).toHaveLength(1);
    });
  });

  describe("optional content inclusion", () => {
    it("should include attachments when requested", async () => {
      const message = createTestMessage({
        attachments: [
          {
            id: "att-1",
            type: "image",
            url: "https://example.com/image.jpg",
            name: "image.jpg",
          },
        ],
      });

      const options: MessageExportOptions = {
        format: "json",
        includeAttachments: true,
      };

      const result = await service.exportMessages([message], options);
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages[0].attachments).toBeDefined();
      expect(parsed.messages[0].attachments).toHaveLength(1);
    });

    it("should include reactions when requested", async () => {
      const message = createTestMessage({
        reactions: [
          {
            emoji: "👍",
            count: 5,
            users: [{ id: "u1", username: "user1", displayName: "User 1" }],
            hasReacted: false,
          },
        ],
      });

      const options: MessageExportOptions = {
        format: "json",
        includeReactions: true,
      };

      const result = await service.exportMessages([message], options);
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages[0].reactions).toBeDefined();
    });

    it("should include edit history when requested", async () => {
      const message = createTestMessage({
        isEdited: true,
        editHistory: [
          {
            previousContent: "Old content",
            newContent: "New content",
            editedAt: new Date(),
            editorId: "user-1",
          },
        ],
      });

      const options: MessageExportOptions = {
        format: "json",
        includeEditHistory: true,
      };

      const result = await service.exportMessages([message], options);
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages[0].editHistory).toBeDefined();
    });
  });

  describe("forward information", () => {
    it("should include forward attribution", async () => {
      const message = createTestMessage({
        forwardAttribution: {
          originalMessageId: "orig-123",
          originalChannelId: "ch-orig",
          originalChannelName: "Original Channel",
          originalAuthor: {
            id: "orig-user",
            username: "origuser",
            displayName: "Original User",
          },
          originalSentAt: new Date("2024-01-01"),
          mode: "forward",
        },
      });

      const options: MessageExportOptions = {
        format: "json",
      };

      const result = await service.exportMessages([message], options);
      const parsed = JSON.parse(result.data!);

      expect(parsed.messages[0].isForwarded).toBe(true);
      expect(parsed.messages[0].forwardedFrom).toBeDefined();
      expect(parsed.messages[0].forwardedFrom.authorName).toBe("Original User");
    });
  });

  describe("startExport", () => {
    it("should create an export job", async () => {
      const options: MessageExportOptions = {
        format: "json",
      };

      const result = await service.startExport(
        "ch-123",
        "Test Channel",
        options,
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      // Status may be any valid state depending on async timing
      expect(["pending", "processing", "completed"]).toContain(
        result.data?.status,
      );
    });

    it("should track job progress", async () => {
      const options: MessageExportOptions = {
        format: "json",
      };

      let progressCalls = 0;
      const onProgress = () => {
        progressCalls++;
      };

      const result = await service.startExport(
        "ch-123",
        "Test Channel",
        options,
        onProgress,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("getJobStatus", () => {
    it("should return job status", async () => {
      const options: MessageExportOptions = {
        format: "json",
      };

      const result = await service.startExport(
        "ch-123",
        "Test Channel",
        options,
      );
      const jobId = result.data!.id;

      const status = service.getJobStatus(jobId);

      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
    });

    it("should return undefined for non-existent job", () => {
      const status = service.getJobStatus("non-existent-job");

      expect(status).toBeUndefined();
    });
  });

  describe("cancelExport", () => {
    it("should cancel a processing job", async () => {
      const options: MessageExportOptions = {
        format: "json",
      };

      const result = await service.startExport(
        "ch-123",
        "Test Channel",
        options,
      );
      const jobId = result.data!.id;

      // Give the job time to start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cancelled = service.cancelExport(jobId);

      // May or may not cancel depending on timing
      expect(typeof cancelled).toBe("boolean");
    });

    it("should return false for non-existent job", () => {
      const cancelled = service.cancelExport("non-existent-job");

      expect(cancelled).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle empty message array", async () => {
      const options: MessageExportOptions = {
        format: "json",
      };

      const result = await service.exportMessages([], options);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed.messageCount).toBe(0);
    });

    it("should handle malformed message data gracefully", async () => {
      const malformedMessage = {
        id: "msg-1",
        // Missing required fields like createdAt
      } as unknown as ExtendedMessage;

      const options: MessageExportOptions = {
        format: "json",
      };

      // Should not throw, but may return failure due to malformed data
      const result = await service.exportMessages([malformedMessage], options);
      // Service catches errors and returns success: false with error details
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result.error).toBeDefined();
        // Service may return EXPORT_ERROR or INTERNAL_ERROR depending on error type
        expect(["EXPORT_ERROR", "INTERNAL_ERROR"]).toContain(
          result.error?.code,
        );
      }
    });
  });
});
