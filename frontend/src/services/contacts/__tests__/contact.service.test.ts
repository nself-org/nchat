/**
 * Contact Service Tests
 *
 * Comprehensive tests for contact management, discovery, invites, and blocking
 */

import {
  // Phone/Email hashing
  hashPhoneNumber,
  verifyPhoneHash,
  normalizePhoneNumber,
  hashEmail,

  // Invite code generation
  generateInviteCode,
  buildInviteLink,
  parseInviteLink,
  isValidInviteCode,

  // QR code operations
  generateQRCodeData,
  verifyQRCodeData,
  parseQRCodeData,

  // Invite lifecycle
  createContactInvite,
  isInviteExpired,
  canAcceptInvite,
  getInviteStatusText,

  // Relationship management
  determineRelationshipStatus,
  getMutualContacts,
  areMutualContacts,

  // Privacy-preserving discovery
  filterDiscoveryResults,
  checkDiscoveryRateLimit,
  checkSyncRateLimit,

  // Contact sync
  hashDeviceContacts,

  // Block management
  createBlock,
  isActionBlockedByUser,
  filterBlockedContent,

  // Validation
  validateContactLimits,
  validatePendingInviteLimits,

  // Types
  type Contact,
  type ContactInvite,
  type BlockedContact,
  type DiscoveryResult,
  type QRCodeData,
} from "../contact.service";

// ============================================================================
// Phone Number Hashing Tests
// ============================================================================

describe("Phone Number Hashing", () => {
  describe("normalizePhoneNumber", () => {
    it("should normalize a 10-digit US number", () => {
      expect(normalizePhoneNumber("5551234567")).toBe("+15551234567");
    });

    it("should normalize an 11-digit US number starting with 1", () => {
      expect(normalizePhoneNumber("15551234567")).toBe("+15551234567");
    });

    it("should keep existing + prefix", () => {
      expect(normalizePhoneNumber("+15551234567")).toBe("+15551234567");
    });

    it("should remove non-digit characters", () => {
      expect(normalizePhoneNumber("(555) 123-4567")).toBe("+15551234567");
    });

    it("should handle international numbers", () => {
      expect(normalizePhoneNumber("+44 20 7123 4567")).toBe("+442071234567");
    });
  });

  describe("hashPhoneNumber", () => {
    it("should produce a consistent hash with the same salt", () => {
      const phone = "+15551234567";
      const result1 = hashPhoneNumber(phone, "test-salt");
      const result2 = hashPhoneNumber(phone, "test-salt");
      expect(result1.hash).toBe(result2.hash);
    });

    it("should produce different hashes with different salts", () => {
      const phone = "+15551234567";
      const result1 = hashPhoneNumber(phone, "salt1");
      const result2 = hashPhoneNumber(phone, "salt2");
      expect(result1.hash).not.toBe(result2.hash);
    });

    it("should generate a salt if none provided", () => {
      const result = hashPhoneNumber("+15551234567");
      expect(result.salt).toBeDefined();
      expect(result.salt.length).toBeGreaterThan(0);
    });
  });

  describe("verifyPhoneHash", () => {
    it("should verify a correct phone hash", () => {
      const phone = "+15551234567";
      const { hash, salt } = hashPhoneNumber(phone);
      expect(verifyPhoneHash(phone, hash, salt)).toBe(true);
    });

    it("should reject an incorrect phone number", () => {
      const { hash, salt } = hashPhoneNumber("+15551234567");
      expect(verifyPhoneHash("+15559999999", hash, salt)).toBe(false);
    });
  });

  describe("hashEmail", () => {
    it("should produce a consistent hash for the same email", () => {
      const email = "test@example.com";
      expect(hashEmail(email)).toBe(hashEmail(email));
    });

    it("should be case-insensitive", () => {
      expect(hashEmail("Test@Example.COM")).toBe(hashEmail("test@example.com"));
    });

    it("should trim whitespace", () => {
      expect(hashEmail("  test@example.com  ")).toBe(
        hashEmail("test@example.com"),
      );
    });
  });
});

// ============================================================================
// Invite Code Tests
// ============================================================================

describe("Invite Code Generation", () => {
  describe("generateInviteCode", () => {
    it("should generate a 12-character code", () => {
      const code = generateInviteCode();
      expect(code.length).toBe(12);
    });

    it("should generate unique codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100);
    });

    it("should only contain valid characters", () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  describe("isValidInviteCode", () => {
    it("should validate a correct code", () => {
      const code = generateInviteCode();
      expect(isValidInviteCode(code)).toBe(true);
    });

    it("should reject codes that are too short", () => {
      expect(isValidInviteCode("abc")).toBe(false);
    });

    it("should reject codes that are too long", () => {
      expect(isValidInviteCode("a".repeat(20))).toBe(false);
    });

    it("should reject codes with invalid characters", () => {
      expect(isValidInviteCode("abc!@#$%^&*()")).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidInviteCode(null as any)).toBe(false);
      expect(isValidInviteCode(undefined as any)).toBe(false);
      expect(isValidInviteCode(123 as any)).toBe(false);
    });
  });

  describe("buildInviteLink", () => {
    it("should build a valid invite link", () => {
      const code = "testcode1234";
      const link = buildInviteLink(code, "https://example.com");
      expect(link).toBe("https://example.com/contacts/invite/testcode1234");
    });
  });

  describe("parseInviteLink", () => {
    it("should parse a valid invite link", () => {
      const code = parseInviteLink(
        "https://example.com/contacts/invite/testcode1234",
      );
      expect(code).toBe("testcode1234");
    });

    it("should parse a bare code", () => {
      const code = "Ab12Cd34Ef56";
      expect(parseInviteLink(code)).toBe(code);
    });

    it("should return null for invalid URLs", () => {
      expect(parseInviteLink("not-a-valid-url")).toBeNull();
    });
  });
});

// ============================================================================
// QR Code Tests
// ============================================================================

describe("QR Code Operations", () => {
  const secretKey = "test-secret-key-12345";

  describe("generateQRCodeData", () => {
    it("should generate valid QR code data", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );

      expect(data.type).toBe("contact_exchange");
      expect(data.userId).toBe("user-1");
      expect(data.username).toBe("testuser");
      expect(data.displayName).toBe("Test User");
      expect(data.code).toBeDefined();
      expect(data.expiresAt).toBeGreaterThan(Date.now());
      expect(data.signature).toBeDefined();
    });
  });

  describe("verifyQRCodeData", () => {
    it("should verify valid QR code data", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );
      expect(verifyQRCodeData(data, secretKey)).toBe(true);
    });

    it("should reject expired QR code data", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );
      data.expiresAt = Date.now() - 1000; // Expired
      expect(verifyQRCodeData(data, secretKey)).toBe(false);
    });

    it("should reject tampered QR code data", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );
      data.userId = "tampered-user-id";
      expect(verifyQRCodeData(data, secretKey)).toBe(false);
    });

    it("should reject with wrong secret key", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );
      expect(verifyQRCodeData(data, "wrong-secret")).toBe(false);
    });
  });

  describe("parseQRCodeData", () => {
    it("should parse valid QR code JSON", () => {
      const data = generateQRCodeData(
        "user-1",
        "testuser",
        "Test User",
        secretKey,
      );
      const json = JSON.stringify(data);
      const parsed = parseQRCodeData(json);

      expect(parsed).not.toBeNull();
      expect(parsed?.userId).toBe("user-1");
    });

    it("should return null for invalid JSON", () => {
      expect(parseQRCodeData("not json")).toBeNull();
    });

    it("should return null for wrong type", () => {
      expect(parseQRCodeData(JSON.stringify({ type: "other" }))).toBeNull();
    });
  });
});

// ============================================================================
// Contact Invite Lifecycle Tests
// ============================================================================

describe("Contact Invite Lifecycle", () => {
  describe("createContactInvite", () => {
    it("should create a valid invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
        message: "Hello!",
      });

      expect(invite.id).toBeDefined();
      expect(invite.senderId).toBe("sender-1");
      expect(invite.recipientId).toBe("recipient-1");
      expect(invite.code).toBeDefined();
      expect(invite.message).toBe("Hello!");
      expect(invite.status).toBe("pending");
      expect(invite.expiresAt).toBeInstanceOf(Date);
      expect(invite.createdAt).toBeInstanceOf(Date);
    });

    it("should allow email-based invites", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientEmail: "test@example.com",
      });

      expect(invite.recipientEmail).toBe("test@example.com");
      expect(invite.recipientId).toBeUndefined();
    });

    it("should allow phone-based invites", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientPhone: "+15551234567",
      });

      expect(invite.recipientPhone).toBe("+15551234567");
    });

    it("should respect custom expiry", () => {
      const expiresInMs = 60000; // 1 minute
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
        expiresInMs,
      });

      const expectedExpiry = Date.now() + expiresInMs;
      expect(invite.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);
    });
  });

  describe("isInviteExpired", () => {
    it("should return false for non-expired invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
      });
      expect(isInviteExpired(invite)).toBe(false);
    });

    it("should return true for expired invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
        expiresInMs: -1000, // Already expired
      });
      expect(isInviteExpired(invite)).toBe(true);
    });
  });

  describe("canAcceptInvite", () => {
    it("should allow accepting a valid pending invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
      });
      const result = canAcceptInvite(invite, "recipient-1");
      expect(result.allowed).toBe(true);
    });

    it("should reject already accepted invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
      });
      invite.status = "accepted";
      const result = canAcceptInvite(invite, "recipient-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("accepted");
    });

    it("should reject expired invite", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
        expiresInMs: -1000,
      });
      const result = canAcceptInvite(invite, "recipient-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should reject if recipient does not match", () => {
      const invite = createContactInvite({
        senderId: "sender-1",
        recipientId: "recipient-1",
      });
      const result = canAcceptInvite(invite, "wrong-recipient");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("different user");
    });

    it("should reject self-acceptance", () => {
      const invite = createContactInvite({
        senderId: "user-1",
      });
      const result = canAcceptInvite(invite, "user-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("own invite");
    });
  });

  describe("getInviteStatusText", () => {
    it("should return correct text for each status", () => {
      expect(getInviteStatusText("pending")).toBe("Pending");
      expect(getInviteStatusText("accepted")).toBe("Accepted");
      expect(getInviteStatusText("rejected")).toBe("Declined");
      expect(getInviteStatusText("expired")).toBe("Expired");
      expect(getInviteStatusText("cancelled")).toBe("Cancelled");
    });
  });
});

// ============================================================================
// Relationship Status Tests
// ============================================================================

describe("Relationship Status", () => {
  const mockContacts: Contact[] = [
    {
      id: "c1",
      userId: "user-1",
      contactUserId: "user-2",
      isFavorite: false,
      discoveryMethod: "username",
      addedAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockBlocked: BlockedContact[] = [
    {
      id: "b1",
      userId: "user-1",
      blockedUserId: "user-3",
      blockedAt: new Date(),
    },
  ];

  const mockPendingSent: ContactInvite[] = [
    createContactInvite({
      senderId: "user-1",
      recipientId: "user-4",
    }),
  ];

  const mockPendingReceived: ContactInvite[] = [
    createContactInvite({
      senderId: "user-5",
      recipientId: "user-1",
    }),
  ];

  describe("determineRelationshipStatus", () => {
    it('should return "blocked" if user is blocked', () => {
      const status = determineRelationshipStatus(
        "user-1",
        "user-3",
        mockContacts,
        mockBlocked,
        mockPendingSent,
        mockPendingReceived,
      );
      expect(status).toBe("blocked");
    });

    it('should return "accepted" if user is a contact', () => {
      const status = determineRelationshipStatus(
        "user-1",
        "user-2",
        mockContacts,
        mockBlocked,
        mockPendingSent,
        mockPendingReceived,
      );
      expect(status).toBe("accepted");
    });

    it('should return "pending_sent" for outgoing invite', () => {
      const status = determineRelationshipStatus(
        "user-1",
        "user-4",
        mockContacts,
        mockBlocked,
        mockPendingSent,
        mockPendingReceived,
      );
      expect(status).toBe("pending_sent");
    });

    it('should return "pending_received" for incoming invite', () => {
      const status = determineRelationshipStatus(
        "user-1",
        "user-5",
        mockContacts,
        mockBlocked,
        mockPendingSent,
        mockPendingReceived,
      );
      expect(status).toBe("pending_received");
    });

    it('should return "none" for no relationship', () => {
      const status = determineRelationshipStatus(
        "user-1",
        "user-99",
        mockContacts,
        mockBlocked,
        mockPendingSent,
        mockPendingReceived,
      );
      expect(status).toBe("none");
    });
  });

  describe("getMutualContacts", () => {
    it("should find mutual contacts", () => {
      const userContacts: Contact[] = [
        {
          id: "1",
          userId: "a",
          contactUserId: "x",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "a",
          contactUserId: "y",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const otherContacts: Contact[] = [
        {
          id: "3",
          userId: "b",
          contactUserId: "x",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "4",
          userId: "b",
          contactUserId: "z",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mutual = getMutualContacts(userContacts, otherContacts);
      expect(mutual).toEqual(["x"]);
    });

    it("should return empty array when no mutual contacts", () => {
      const userContacts: Contact[] = [
        {
          id: "1",
          userId: "a",
          contactUserId: "x",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const otherContacts: Contact[] = [
        {
          id: "2",
          userId: "b",
          contactUserId: "y",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mutual = getMutualContacts(userContacts, otherContacts);
      expect(mutual).toEqual([]);
    });
  });

  describe("areMutualContacts", () => {
    it("should return true when both users have each other as contacts", () => {
      const userContacts: Contact[] = [
        {
          id: "1",
          userId: "a",
          contactUserId: "b",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const otherContacts: Contact[] = [
        {
          id: "2",
          userId: "b",
          contactUserId: "a",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      expect(areMutualContacts(userContacts, otherContacts, "a", "b")).toBe(
        true,
      );
    });

    it("should return false when only one has the other as contact", () => {
      const userContacts: Contact[] = [
        {
          id: "1",
          userId: "a",
          contactUserId: "b",
          isFavorite: false,
          discoveryMethod: "username",
          addedAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const otherContacts: Contact[] = [];

      expect(areMutualContacts(userContacts, otherContacts, "a", "b")).toBe(
        false,
      );
    });
  });
});

// ============================================================================
// Privacy-Preserving Discovery Tests
// ============================================================================

describe("Privacy-Preserving Discovery", () => {
  describe("filterDiscoveryResults", () => {
    const mockResults: DiscoveryResult[] = [
      {
        userId: "u1",
        username: "user1",
        displayName: "User 1",
        mutualContacts: 0,
        isBlocked: false,
        relationshipStatus: "none",
      },
      {
        userId: "u2",
        username: "user2",
        displayName: "User 2",
        mutualContacts: 2,
        isBlocked: false,
        relationshipStatus: "none",
      },
      {
        userId: "u3",
        username: "user3",
        displayName: "User 3",
        mutualContacts: 0,
        isBlocked: false,
        relationshipStatus: "none",
      },
    ];

    it("should filter out blocked users", () => {
      const filtered = filterDiscoveryResults(mockResults, {
        userId: "me",
        method: "username",
        blockedUserIds: new Set(["u1"]),
      });

      expect(filtered.length).toBe(2);
      expect(filtered.some((r) => r.userId === "u1")).toBe(false);
    });

    it("should respect privacy settings", () => {
      const privacySettings = new Map([
        [
          "u1",
          {
            allowSearchDiscovery: false,
            showInDirectory: true,
            allowContactRequests: "everyone" as const,
            showMutualContacts: true,
          },
        ],
      ]);

      const filtered = filterDiscoveryResults(mockResults, {
        userId: "me",
        method: "username",
        blockedUserIds: new Set(),
        userPrivacySettings: privacySettings,
      });

      expect(filtered.some((r) => r.userId === "u1")).toBe(false);
    });

    it("should filter by contact request settings", () => {
      const privacySettings = new Map([
        [
          "u3",
          {
            allowSearchDiscovery: true,
            showInDirectory: true,
            allowContactRequests: "contacts_of_contacts" as const,
            showMutualContacts: true,
          },
        ],
      ]);

      const filtered = filterDiscoveryResults(mockResults, {
        userId: "me",
        method: "username",
        blockedUserIds: new Set(),
        userPrivacySettings: privacySettings,
      });

      // u3 has no mutual contacts and requires contacts_of_contacts
      expect(filtered.some((r) => r.userId === "u3")).toBe(false);
      // u2 has mutual contacts so should pass
      expect(filtered.some((r) => r.userId === "u2")).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should allow requests within limit", () => {
      const userId = `test-user-${Date.now()}`;
      const result = checkDiscoveryRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should track remaining requests", () => {
      const userId = `test-user-${Date.now()}-remaining`;
      const result1 = checkDiscoveryRateLimit(userId);
      const result2 = checkDiscoveryRateLimit(userId);

      expect(result2.remaining).toBe(result1.remaining - 1);
    });
  });
});

// ============================================================================
// Contact Sync Tests
// ============================================================================

describe("Contact Sync", () => {
  describe("hashDeviceContacts", () => {
    it("should hash phone numbers and emails", () => {
      const contacts = [
        {
          name: "Alice",
          phoneNumbers: ["+15551234567"],
          emails: ["alice@example.com"],
        },
        { name: "Bob", phoneNumbers: [], emails: ["bob@example.com"] },
      ];

      const result = hashDeviceContacts(contacts, "test-salt");

      expect(result.phoneHashes.length).toBe(1);
      expect(result.emailHashes.length).toBe(2);
    });

    it("should handle contacts with multiple identifiers", () => {
      const contacts = [
        {
          name: "Alice",
          phoneNumbers: ["+15551111111", "+15552222222"],
          emails: ["alice@work.com", "alice@home.com"],
        },
      ];

      const result = hashDeviceContacts(contacts, "test-salt");

      expect(result.phoneHashes.length).toBe(2);
      expect(result.emailHashes.length).toBe(2);
    });
  });
});

// ============================================================================
// Block Management Tests
// ============================================================================

describe("Block Management", () => {
  describe("createBlock", () => {
    it("should create a valid block entry", () => {
      const block = createBlock("user-1", "user-2", "spam");

      expect(block.id).toBeDefined();
      expect(block.userId).toBe("user-1");
      expect(block.blockedUserId).toBe("user-2");
      expect(block.reason).toBe("spam");
      expect(block.blockedAt).toBeInstanceOf(Date);
    });

    it("should allow blocks without reason", () => {
      const block = createBlock("user-1", "user-2");
      expect(block.reason).toBeUndefined();
    });
  });

  describe("isActionBlockedByUser", () => {
    const blocks: BlockedContact[] = [
      {
        id: "b1",
        userId: "user-1",
        blockedUserId: "user-2",
        blockedAt: new Date(),
      },
      {
        id: "b2",
        userId: "user-3",
        blockedUserId: "user-1",
        blockedAt: new Date(),
      },
    ];

    it("should detect when actor has blocked target", () => {
      const result = isActionBlockedByUser("user-1", "user-2", blocks);
      expect(result.blocked).toBe(true);
      expect(result.direction).toBe("actor_blocked");
    });

    it("should detect when target has blocked actor", () => {
      const result = isActionBlockedByUser("user-1", "user-3", blocks);
      expect(result.blocked).toBe(true);
      expect(result.direction).toBe("blocked_by_target");
    });

    it("should return false when no block exists", () => {
      const result = isActionBlockedByUser("user-1", "user-99", blocks);
      expect(result.blocked).toBe(false);
      expect(result.direction).toBeNull();
    });
  });

  describe("filterBlockedContent", () => {
    it("should filter out content from blocked users", () => {
      const items = [
        { userId: "user-1", content: "Hello" },
        { userId: "user-2", content: "World" },
        { userId: "user-3", content: "Test" },
      ];

      const blockedIds = new Set(["user-2"]);
      const filtered = filterBlockedContent(items, blockedIds);

      expect(filtered.length).toBe(2);
      expect(filtered.some((i) => i.userId === "user-2")).toBe(false);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("Validation", () => {
  describe("validateContactLimits", () => {
    it("should allow adding contacts under limit", () => {
      const result = validateContactLimits(100);
      expect(result.allowed).toBe(true);
    });

    it("should reject when at limit", () => {
      const result = validateContactLimits(10000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Maximum contact limit");
    });
  });

  describe("validatePendingInviteLimits", () => {
    it("should allow sending invites under limit", () => {
      const result = validatePendingInviteLimits(50);
      expect(result.allowed).toBe(true);
    });

    it("should reject when at limit", () => {
      const result = validatePendingInviteLimits(100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Maximum pending invite limit");
    });
  });
});
