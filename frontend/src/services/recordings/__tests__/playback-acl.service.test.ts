/**
 * @jest-environment node
 */

/**
 * Playback ACL Service Tests
 *
 * Comprehensive test suite for PlaybackACLService:
 * - Access control
 * - Visibility management
 * - Share links
 * - Access requests
 */

import {
  PlaybackACLService,
  createPlaybackACLService,
} from "../playback-acl.service";
import { createRecordingPipeline } from "../recording-pipeline.service";
import { RecordingAccessDeniedError, ShareLinkError } from "../types";

// Mock dependencies
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com"),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/services/files/config", () => ({
  getStorageConfig: jest.fn().mockReturnValue({
    endpoint: "http://localhost:9000",
    bucket: "test-bucket",
    region: "us-east-1",
    accessKey: "test-key",
    secretKey: "test-secret",
    provider: "minio",
  }),
}));

describe("PlaybackACLService", () => {
  let service: PlaybackACLService;
  let pipeline: ReturnType<typeof createRecordingPipeline>;

  const userId = "user-123";
  const channelId = "channel-456";

  beforeEach(() => {
    pipeline = createRecordingPipeline({ encryptionEnabled: false });
    service = createPlaybackACLService(undefined, pipeline);
  });

  afterEach(() => {
    service.clearAll();
    pipeline.clearAll();
  });

  // ==========================================================================
  // Access Control Tests
  // ==========================================================================

  describe("Access Control", () => {
    it("should allow owner to access recording", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const hasAccess = await service.checkAccess(recording.id, userId, "view");

      expect(hasAccess).toBe(true);
    });

    it("should deny access to non-owner by default", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const hasAccess = await service.checkAccess(
        recording.id,
        "other-user",
        "view",
      );

      expect(hasAccess).toBe(false);
    });

    it("should return false for non-existent recording", async () => {
      const hasAccess = await service.checkAccess(
        "non-existent",
        userId,
        "view",
      );

      expect(hasAccess).toBe(false);
    });

    it("should get permissions for owner", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const permissions = await service.getPermissions(recording.id, userId);

      expect(permissions).toContain("view");
      expect(permissions).toContain("download");
      expect(permissions).toContain("share");
      expect(permissions).toContain("edit");
      expect(permissions).toContain("delete");
    });

    it("should throw RecordingAccessDeniedError when access denied", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await expect(
        service.requireAccess(recording.id, "other-user", "view"),
      ).rejects.toThrow(RecordingAccessDeniedError);
    });
  });

  // ==========================================================================
  // Visibility Tests
  // ==========================================================================

  describe("Visibility", () => {
    it("should set recording visibility", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.setVisibility(recording.id, "public", userId);

      const updated = await pipeline.getRecording(recording.id);
      expect(updated.visibility).toBe("public");
    });

    it("should allow public access for public recordings", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.setVisibility(recording.id, "public", userId);

      const hasAccess = await service.checkAccess(
        recording.id,
        "any-user",
        "view",
      );

      expect(hasAccess).toBe(true);
    });

    it("should deny access for private recordings", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.setVisibility(recording.id, "private", userId);

      const hasAccess = await service.checkAccess(
        recording.id,
        "other-user",
        "view",
      );

      expect(hasAccess).toBe(false);
    });
  });

  // ==========================================================================
  // ACL Management Tests
  // ==========================================================================

  describe("ACL Management", () => {
    it("should grant access to a user", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const acl = await service.grantAccess(
        recording.id,
        "other-user",
        ["view", "download"],
        userId,
      );

      expect(acl.id).toBeDefined();
      expect(acl.userId).toBe("other-user");
      expect(acl.permissions).toContain("view");
      expect(acl.permissions).toContain("download");

      const hasAccess = await service.checkAccess(
        recording.id,
        "other-user",
        "view",
      );
      expect(hasAccess).toBe(true);
    });

    it("should grant access with expiry", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const acl = await service.grantAccess(
        recording.id,
        "other-user",
        ["view"],
        userId,
        { expiresAt },
      );

      expect(acl.expiresAt).toBe(expiresAt);
    });

    it("should revoke access from a user", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.grantAccess(recording.id, "other-user", ["view"], userId);
      await service.revokeAccess(recording.id, "other-user", userId);

      const hasAccess = await service.checkAccess(
        recording.id,
        "other-user",
        "view",
      );
      expect(hasAccess).toBe(false);
    });

    it("should get all ACLs for a recording", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.grantAccess(recording.id, "user-1", ["view"], userId);
      await service.grantAccess(
        recording.id,
        "user-2",
        ["view", "download"],
        userId,
      );

      const acls = await service.getACLs(recording.id);

      expect(acls).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Share Link Tests
  // ==========================================================================

  describe("Share Links", () => {
    it("should create a share link", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId, {
        permissions: ["view", "download"],
      });

      expect(link.id).toBeDefined();
      expect(link.token).toBeDefined();
      expect(link.token.length).toBeGreaterThanOrEqual(32);
      expect(link.permissions).toContain("view");
      expect(link.permissions).toContain("download");
    });

    it("should create share link with expiry", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();

      const link = await service.createShareLink(recording.id, userId, {
        expiresAt,
      });

      expect(link.expiresAt).toBe(expiresAt);
    });

    it("should create share link with max views", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId, {
        maxViews: 10,
      });

      expect(link.maxViews).toBe(10);
    });

    it("should create share link with password", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId, {
        password: "secret123",
      });

      expect(link.password).toBeDefined();
      expect(link.password).not.toBe("secret123"); // Should be hashed
    });

    it("should get share link by token", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const created = await service.createShareLink(recording.id, userId);
      const link = await service.getShareLinkByToken(created.token);

      expect(link).not.toBeNull();
      expect(link!.id).toBe(created.id);
    });

    it("should validate share link successfully", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId);

      const result = await service.validateShareLink(link.token);

      expect(result.valid).toBe(true);
      expect(result.link).toBeDefined();
    });

    it("should reject expired share link", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const expiresAt = new Date(Date.now() - 1000).toISOString(); // Already expired

      const link = await service.createShareLink(recording.id, userId, {
        expiresAt,
      });

      const result = await service.validateShareLink(link.token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should reject share link with exceeded views", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId, {
        maxViews: 1,
      });

      // First view
      await service.validateShareLink(link.token);

      // Second view should fail
      const result = await service.validateShareLink(link.token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("limit");
    });

    it("should require password for protected links", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId, {
        password: "secret123",
      });

      const resultWithoutPassword = await service.validateShareLink(link.token);
      expect(resultWithoutPassword.valid).toBe(false);
      expect(resultWithoutPassword.error).toContain("Password");

      const resultWithWrongPassword = await service.validateShareLink(
        link.token,
        {
          password: "wrong",
        },
      );
      expect(resultWithWrongPassword.valid).toBe(false);
      expect(resultWithWrongPassword.error).toContain("Invalid");

      const resultWithCorrectPassword = await service.validateShareLink(
        link.token,
        {
          password: "secret123",
        },
      );
      expect(resultWithCorrectPassword.valid).toBe(true);
    });

    it("should generate share URL", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId);
      const url = service.generateShareUrl(link, "https://app.example.com");

      expect(url).toContain("https://app.example.com");
      expect(url).toContain(link.token);
    });

    it("should delete share link", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const link = await service.createShareLink(recording.id, userId);
      await service.deleteShareLink(link.id, userId);

      const result = await service.getShareLink(link.id);
      expect(result).toBeNull();
    });

    it("should enforce max share links per recording", async () => {
      const limitedService = createPlaybackACLService(
        {
          maxShareLinksPerRecording: 2,
        },
        pipeline,
      );

      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await limitedService.createShareLink(recording.id, userId);
      await limitedService.createShareLink(recording.id, userId);

      await expect(
        limitedService.createShareLink(recording.id, userId),
      ).rejects.toThrow("Maximum share links");

      limitedService.clearAll();
    });
  });

  // ==========================================================================
  // Access Request Tests
  // ==========================================================================

  describe("Access Requests", () => {
    it("should create access request", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const request = await service.requestAccess(
        recording.id,
        "requester-123",
        "requester@example.com",
        "John Requester",
        "Need access for review",
      );

      expect(request.id).toBeDefined();
      expect(request.requesterId).toBe("requester-123");
      expect(request.requesterEmail).toBe("requester@example.com");
      expect(request.status).toBe("pending");
    });

    it("should prevent duplicate pending requests", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.requestAccess(
        recording.id,
        "requester-123",
        "requester@example.com",
        "John Requester",
      );

      await expect(
        service.requestAccess(
          recording.id,
          "requester-123",
          "requester@example.com",
          "John Requester",
        ),
      ).rejects.toThrow("pending access request");
    });

    it("should prevent request when already has access", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await expect(
        service.requestAccess(
          recording.id,
          userId, // Owner already has access
          "owner@example.com",
          "Owner",
        ),
      ).rejects.toThrow("already have access");
    });

    it("should approve access request", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const request = await service.requestAccess(
        recording.id,
        "requester-123",
        "requester@example.com",
        "John Requester",
      );

      const approved = await service.respondToAccessRequest(
        request.id,
        true,
        userId,
        {
          permissions: ["view", "download"],
        },
      );

      expect(approved.status).toBe("approved");
      expect(approved.grantedPermissions).toContain("view");

      // Check access was granted
      const hasAccess = await service.checkAccess(
        recording.id,
        "requester-123",
        "view",
      );
      expect(hasAccess).toBe(true);
    });

    it("should deny access request", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const request = await service.requestAccess(
        recording.id,
        "requester-123",
        "requester@example.com",
        "John Requester",
      );

      const denied = await service.respondToAccessRequest(
        request.id,
        false,
        userId,
      );

      expect(denied.status).toBe("denied");

      // Check access was NOT granted
      const hasAccess = await service.checkAccess(
        recording.id,
        "requester-123",
        "view",
      );
      expect(hasAccess).toBe(false);
    });

    it("should get pending access requests", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.requestAccess(recording.id, "r1", "r1@example.com", "R1");
      await service.requestAccess(recording.id, "r2", "r2@example.com", "R2");

      const pending = await service.getAccessRequests(recording.id, "pending");

      expect(pending).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Access Logging Tests
  // ==========================================================================

  describe("Access Logging", () => {
    it("should log recording access", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.grantAccess(recording.id, "viewer", ["view"], userId);

      // Should not throw
      await expect(
        service.logRecordingAccess(recording.id, "viewer", "view"),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    it("should clear all data", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.grantAccess(recording.id, "user-1", ["view"], userId);
      await service.createShareLink(recording.id, userId);

      service.clearAll();

      expect(service.getAllACLs()).toHaveLength(0);
      expect(service.getAllShareLinks()).toHaveLength(0);
    });
  });
});
