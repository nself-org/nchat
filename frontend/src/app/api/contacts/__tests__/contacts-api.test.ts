/**
 * @jest-environment node
 */

/**
 * Contacts API Tests
 *
 * Tests for contact management, invites, blocking, and discovery API routes
 */

import { NextRequest } from "next/server";

// Mock the contact service
jest.mock("@/services/contacts/contact.service", () => ({
  generateInviteCode: jest.fn(() => "mock-invite-code"),
  isInviteExpired: jest.fn(() => false),
  canAcceptInvite: jest.fn(() => ({ allowed: true })),
  DEFAULT_INVITE_EXPIRY_MS: 604800000,
  MAX_PENDING_INVITES: 100,
  checkDiscoveryRateLimit: jest.fn(() => ({
    allowed: true,
    remaining: 99,
    resetAt: new Date(),
  })),
  checkSyncRateLimit: jest.fn(() => ({
    allowed: true,
    remaining: 9,
    resetAt: new Date(),
  })),
  hashEmail: jest.fn((email) => `hash_${email}`),
  hashPhoneNumber: jest.fn((phone, salt) => ({
    hash: `hash_${phone}`,
    salt: salt || "salt",
  })),
}));

// Import after mocking
import { GET, POST, DELETE, PATCH } from "../route";
import {
  GET as GET_INVITES,
  POST as POST_INVITE,
  PATCH as PATCH_INVITE,
} from "../invites/route";
import {
  GET as GET_BLOCKED,
  POST as POST_BLOCK,
  DELETE as DELETE_BLOCK,
} from "../blocked/route";

// ============================================================================
// Helper Functions
// ============================================================================

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), options);
}

// ============================================================================
// Contacts API Tests
// ============================================================================

describe("Contacts API", () => {
  describe("GET /api/contacts", () => {
    it("should require userId parameter", async () => {
      const request = createRequest("/api/contacts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return empty contacts for new user", async () => {
      const request = createRequest("/api/contacts?userId=new-user");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.contacts).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should support pagination", async () => {
      const request = createRequest(
        "/api/contacts?userId=user-1&limit=10&offset=0",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(0);
    });
  });

  describe("POST /api/contacts", () => {
    it("should require userId and contactUserId", async () => {
      const request = createRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject adding self as contact", async () => {
      const request = createRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          contactUserId: "user-1",
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("yourself");
    });

    it("should add a valid contact", async () => {
      const userId = `test-user-${Date.now()}`;
      const contactUserId = `contact-${Date.now()}`;

      const request = createRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          userId,
          contactUserId,
          discoveryMethod: "username",
          contactUser: {
            id: contactUserId,
            username: "testcontact",
            displayName: "Test Contact",
          },
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.contact).toBeDefined();
      expect(data.contact.userId).toBe(userId);
      expect(data.contact.contactUserId).toBe(contactUserId);
    });
  });

  describe("PATCH /api/contacts", () => {
    it("should require userId and contactId", async () => {
      const request = createRequest("/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should update contact fields", async () => {
      // First create a contact
      const userId = `patch-user-${Date.now()}`;
      const contactUserId = `patch-contact-${Date.now()}`;

      const createReq = createRequest("/api/contacts", {
        method: "POST",
        body: JSON.stringify({
          userId,
          contactUserId,
          contactUser: {
            id: contactUserId,
            username: "test",
            displayName: "Test",
          },
        }),
      });
      const createResponse = await POST(createReq);
      const createData = await createResponse.json();
      const contactId = createData.contact.id;

      // Now update it
      const updateRequest = createRequest("/api/contacts", {
        method: "PATCH",
        body: JSON.stringify({
          userId,
          contactId,
          nickname: "Best Friend",
          isFavorite: true,
        }),
      });
      const updateResponse = await PATCH(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.contact.nickname).toBe("Best Friend");
      expect(updateData.contact.isFavorite).toBe(true);
    });
  });

  describe("DELETE /api/contacts", () => {
    it("should require userId and contactId", async () => {
      const request = createRequest("/api/contacts?userId=user-1");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });
});

// ============================================================================
// Contact Invites API Tests
// ============================================================================

describe("Contact Invites API", () => {
  describe("GET /api/contacts/invites", () => {
    it("should require userId parameter", async () => {
      const request = createRequest("/api/contacts/invites");
      const response = await GET_INVITES(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return empty invites for new user", async () => {
      const request = createRequest(
        "/api/contacts/invites?userId=new-invite-user&type=received",
      );
      const response = await GET_INVITES(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invites).toEqual([]);
    });
  });

  describe("POST /api/contacts/invites", () => {
    it("should require senderId", async () => {
      const request = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST_INVITE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("senderId");
    });

    it("should require a recipient identifier", async () => {
      const request = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({ senderId: "user-1" }),
      });
      const response = await POST_INVITE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("recipientId");
    });

    it("should reject self-invite", async () => {
      const request = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({
          senderId: "user-1",
          recipientId: "user-1",
        }),
      });
      const response = await POST_INVITE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("yourself");
    });

    it("should create a valid invite", async () => {
      const senderId = `sender-${Date.now()}`;
      const recipientId = `recipient-${Date.now()}`;

      const request = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({
          senderId,
          recipientId,
          message: "Hello!",
        }),
      });
      const response = await POST_INVITE(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invite).toBeDefined();
      expect(data.invite.senderId).toBe(senderId);
      expect(data.invite.recipientId).toBe(recipientId);
      expect(data.invite.status).toBe("pending");
      expect(data.inviteLink).toContain("/contacts/invite/");
    });
  });

  describe("PATCH /api/contacts/invites", () => {
    it("should accept a valid invite", async () => {
      // Create an invite first
      const senderId = `accept-sender-${Date.now()}`;
      const recipientId = `accept-recipient-${Date.now()}`;

      const createReq = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({ senderId, recipientId }),
      });
      const createRes = await POST_INVITE(createReq);
      const createData = await createRes.json();
      const inviteId = createData.invite.id;

      // Accept the invite
      const acceptReq = createRequest("/api/contacts/invites", {
        method: "PATCH",
        body: JSON.stringify({
          inviteId,
          userId: recipientId,
          action: "accept",
        }),
      });
      const acceptRes = await PATCH_INVITE(acceptReq);
      const acceptData = await acceptRes.json();

      expect(acceptRes.status).toBe(200);
      expect(acceptData.invite.status).toBe("accepted");
    });

    it("should reject an invite", async () => {
      const senderId = `reject-sender-${Date.now()}`;
      const recipientId = `reject-recipient-${Date.now()}`;

      const createReq = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({ senderId, recipientId }),
      });
      const createRes = await POST_INVITE(createReq);
      const createData = await createRes.json();
      const inviteId = createData.invite.id;

      const rejectReq = createRequest("/api/contacts/invites", {
        method: "PATCH",
        body: JSON.stringify({
          inviteId,
          userId: recipientId,
          action: "reject",
        }),
      });
      const rejectRes = await PATCH_INVITE(rejectReq);
      const rejectData = await rejectRes.json();

      expect(rejectRes.status).toBe(200);
      expect(rejectData.invite.status).toBe("rejected");
    });

    it("should cancel an invite by sender", async () => {
      const senderId = `cancel-sender-${Date.now()}`;
      const recipientId = `cancel-recipient-${Date.now()}`;

      const createReq = createRequest("/api/contacts/invites", {
        method: "POST",
        body: JSON.stringify({ senderId, recipientId }),
      });
      const createRes = await POST_INVITE(createReq);
      const createData = await createRes.json();
      const inviteId = createData.invite.id;

      const cancelReq = createRequest("/api/contacts/invites", {
        method: "PATCH",
        body: JSON.stringify({
          inviteId,
          userId: senderId,
          action: "cancel",
        }),
      });
      const cancelRes = await PATCH_INVITE(cancelReq);
      const cancelData = await cancelRes.json();

      expect(cancelRes.status).toBe(200);
      expect(cancelData.invite.status).toBe("cancelled");
    });
  });
});

// ============================================================================
// Blocked Contacts API Tests
// ============================================================================

describe("Blocked Contacts API", () => {
  describe("GET /api/contacts/blocked", () => {
    it("should require userId parameter", async () => {
      const request = createRequest("/api/contacts/blocked");
      const response = await GET_BLOCKED(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("userId is required");
    });

    it("should return empty blocked list for new user", async () => {
      const request = createRequest(
        "/api/contacts/blocked?userId=new-block-user",
      );
      const response = await GET_BLOCKED(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.blocked).toEqual([]);
    });

    it("should check block status for specific user", async () => {
      const request = createRequest(
        "/api/contacts/blocked?userId=user-1&check=user-2",
      );
      const response = await GET_BLOCKED(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("isBlocked");
      expect(data).toHaveProperty("isBlockedBy");
    });
  });

  describe("POST /api/contacts/blocked", () => {
    it("should require userId and blockedUserId", async () => {
      const request = createRequest("/api/contacts/blocked", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await POST_BLOCK(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject blocking self", async () => {
      const request = createRequest("/api/contacts/blocked", {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          blockedUserId: "user-1",
        }),
      });
      const response = await POST_BLOCK(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("yourself");
    });

    it("should block a user", async () => {
      const userId = `blocker-${Date.now()}`;
      const blockedUserId = `blocked-${Date.now()}`;

      const request = createRequest("/api/contacts/blocked", {
        method: "POST",
        body: JSON.stringify({
          userId,
          blockedUserId,
          reason: "spam",
        }),
      });
      const response = await POST_BLOCK(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.block).toBeDefined();
      expect(data.block.userId).toBe(userId);
      expect(data.block.blockedUserId).toBe(blockedUserId);
      expect(data.block.reason).toBe("spam");
    });
  });

  describe("DELETE /api/contacts/blocked", () => {
    it("should require userId and blockedUserId", async () => {
      const request = createRequest("/api/contacts/blocked?userId=user-1");
      const response = await DELETE_BLOCK(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should unblock a user", async () => {
      // First block a user
      const userId = `unblocker-${Date.now()}`;
      const blockedUserId = `tounblock-${Date.now()}`;

      const blockReq = createRequest("/api/contacts/blocked", {
        method: "POST",
        body: JSON.stringify({ userId, blockedUserId }),
      });
      await POST_BLOCK(blockReq);

      // Now unblock
      const unblockReq = createRequest(
        `/api/contacts/blocked?userId=${userId}&blockedUserId=${blockedUserId}`,
      );
      const response = await DELETE_BLOCK(unblockReq);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
