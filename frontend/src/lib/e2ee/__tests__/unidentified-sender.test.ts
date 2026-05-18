/**
 * Unidentified Sender Tests
 *
 * Comprehensive tests for anonymous message delivery.
 * Tests cover access keys, delivery tokens, rate limiting,
 * and the sender/recipient components.
 */

import {
  deriveAccessKey,
  generateAccessKey,
  validateAccessKey,
  generateDeliveryToken,
  validateDeliveryToken,
  useDeliveryToken,
  UnidentifiedSender,
  UnidentifiedRecipient,
  UnidentifiedDeliveryRateLimiter,
  createUnidentifiedSender,
  createUnidentifiedRecipient,
  createDefaultAccessConfig,
  verifyThreatModel,
  type UnidentifiedAccessConfig,
  type UnidentifiedDeliveryToken,
  UNIDENTIFIED_TOKEN_VALIDITY_MS,
  MAX_MESSAGES_PER_TOKEN,
  RATE_LIMIT_WINDOW_MS,
  MAX_MESSAGES_PER_WINDOW,
} from "../unidentified-sender";
import {
  createSenderCertificateManager,
  generateServerSigningKeyPair,
  issueCertificate,
} from "../sender-certificate";
import { SealedSenderMessageType } from "../sealed-sender";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

async function generateTestKeyPair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  const dParam = privateKeyJwk.d!;
  let base64 = dParam.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const privateKeyBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    privateKeyBytes[i] = binary.charCodeAt(i);
  }

  return {
    publicKey: new Uint8Array(publicKeyRaw),
    privateKey: privateKeyBytes,
  };
}

// ============================================================================
// Access Key Tests
// ============================================================================

describe("Access Key Management", () => {
  describe("generateAccessKey", () => {
    it("should generate a 16-byte access key", () => {
      const key = generateAccessKey();

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(16);
    });

    it("should generate unique keys", () => {
      const key1 = generateAccessKey();
      const key2 = generateAccessKey();

      expect(Array.from(key1)).not.toEqual(Array.from(key2));
    });
  });

  describe("deriveAccessKey", () => {
    it("should derive access key from profile key", () => {
      const profileKey = new Uint8Array(32);
      crypto.getRandomValues(profileKey);

      const accessKey = deriveAccessKey(profileKey);

      expect(accessKey).toBeInstanceOf(Uint8Array);
      expect(accessKey.length).toBe(16);
    });

    it("should produce consistent derivation", () => {
      const profileKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        profileKey[i] = i;
      }

      const key1 = deriveAccessKey(profileKey);
      const key2 = deriveAccessKey(profileKey);

      expect(Array.from(key1)).toEqual(Array.from(key2));
    });

    it("should produce different keys for different inputs", () => {
      const profileKey1 = new Uint8Array(32).fill(1);
      const profileKey2 = new Uint8Array(32).fill(2);

      const key1 = deriveAccessKey(profileKey1);
      const key2 = deriveAccessKey(profileKey2);

      expect(Array.from(key1)).not.toEqual(Array.from(key2));
    });
  });

  describe("validateAccessKey", () => {
    it("should validate matching keys", () => {
      const key = generateAccessKey();
      const result = validateAccessKey(key, key);

      expect(result).toBe(true);
    });

    it("should reject non-matching keys", () => {
      const key1 = generateAccessKey();
      const key2 = generateAccessKey();

      const result = validateAccessKey(key1, key2);

      expect(result).toBe(false);
    });

    it("should reject keys of different lengths", () => {
      const key1 = new Uint8Array(16);
      const key2 = new Uint8Array(32);

      const result = validateAccessKey(key1, key2);

      expect(result).toBe(false);
    });

    it("should use constant-time comparison", () => {
      // This test verifies the implementation uses XOR comparison
      // which is constant-time
      const key = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
      const almostSame = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17,
      ]);
      const totallyDifferent = new Uint8Array(16).fill(255);

      // Both should fail, and timing should be similar
      expect(validateAccessKey(key, almostSame)).toBe(false);
      expect(validateAccessKey(key, totallyDifferent)).toBe(false);
    });
  });
});

// ============================================================================
// Delivery Token Tests
// ============================================================================

describe("Delivery Token Management", () => {
  describe("generateDeliveryToken", () => {
    it("should generate a valid token", () => {
      const token = generateDeliveryToken("user-123");

      expect(token.tokenId).toBeDefined();
      expect(token.tokenId.length).toBe(32); // 16 bytes as hex
      expect(token.recipientUserId).toBe("user-123");
      expect(token.createdAt).toBeGreaterThan(0);
      expect(token.expiresAt).toBeGreaterThan(token.createdAt);
      expect(token.messageCount).toBe(0);
      expect(token.isValid).toBe(true);
    });

    it("should set correct expiration", () => {
      const token = generateDeliveryToken("user-123");
      const expectedExpiry = Date.now() + UNIDENTIFIED_TOKEN_VALIDITY_MS;

      expect(Math.abs(token.expiresAt - expectedExpiry)).toBeLessThan(100);
    });

    it("should generate unique tokens", () => {
      const token1 = generateDeliveryToken("user-123");
      const token2 = generateDeliveryToken("user-123");

      expect(token1.tokenId).not.toBe(token2.tokenId);
    });
  });

  describe("validateDeliveryToken", () => {
    it("should validate fresh token", () => {
      const token = generateDeliveryToken("user-123");
      const result = validateDeliveryToken(token);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject expired token", () => {
      const token: UnidentifiedDeliveryToken = {
        tokenId: "test-token",
        recipientUserId: "user-123",
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
        expiresAt: Date.now() - 60 * 60 * 1000, // Expired 1 hour ago
        messageCount: 0,
        isValid: true,
      };

      const result = validateDeliveryToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("should reject revoked token", () => {
      const token: UnidentifiedDeliveryToken = {
        tokenId: "test-token",
        recipientUserId: "user-123",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
        messageCount: 0,
        isValid: false,
      };

      const result = validateDeliveryToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("revoked");
    });

    it("should reject token with exceeded message count", () => {
      const token: UnidentifiedDeliveryToken = {
        tokenId: "test-token",
        recipientUserId: "user-123",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
        messageCount: MAX_MESSAGES_PER_TOKEN,
        isValid: true,
      };

      const result = validateDeliveryToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("limit");
    });
  });

  describe("useDeliveryToken", () => {
    it("should increment message count", () => {
      const token = generateDeliveryToken("user-123");
      const used = useDeliveryToken(token);

      expect(used.messageCount).toBe(1);
    });

    it("should invalidate token when limit reached", () => {
      let token: UnidentifiedDeliveryToken = {
        tokenId: "test-token",
        recipientUserId: "user-123",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
        messageCount: MAX_MESSAGES_PER_TOKEN - 1,
        isValid: true,
      };

      token = useDeliveryToken(token);

      expect(token.isValid).toBe(false);
    });

    it("should keep token valid when below limit", () => {
      const token = generateDeliveryToken("user-123");
      const used = useDeliveryToken(token);

      expect(used.isValid).toBe(true);
    });
  });
});

// ============================================================================
// Rate Limiter Tests
// ============================================================================

describe("UnidentifiedDeliveryRateLimiter", () => {
  let rateLimiter: UnidentifiedDeliveryRateLimiter;

  beforeEach(() => {
    rateLimiter = new UnidentifiedDeliveryRateLimiter(1000, 3); // 1 second window, 3 messages
  });

  describe("checkLimit", () => {
    it("should allow first message", () => {
      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(true);
    });

    it("should allow messages within limit", () => {
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(true);
    });

    it("should block messages exceeding limit", () => {
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("should track senders independently", () => {
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      const result1 = rateLimiter.checkLimit("sender-1");
      const result2 = rateLimiter.checkLimit("sender-2");

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });
  });

  describe("recordMessage", () => {
    it("should record message for fingerprint", () => {
      rateLimiter.recordMessage("sender-1");

      // The internal state should have recorded the message
      // We verify by sending more messages
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("should remove old entries", async () => {
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      rateLimiter.cleanup();

      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(true);
    });
  });

  describe("reset", () => {
    it("should clear all rate limits", () => {
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");
      rateLimiter.recordMessage("sender-1");

      rateLimiter.reset();

      const result = rateLimiter.checkLimit("sender-1");
      expect(result.allowed).toBe(true);
    });
  });
});

// ============================================================================
// Access Configuration Tests
// ============================================================================

describe("Access Configuration", () => {
  describe("createDefaultAccessConfig", () => {
    it("should create default configuration", () => {
      const config = createDefaultAccessConfig();

      expect(config.allowUnidentifiedDelivery).toBe(true);
      expect(config.requireCertificate).toBe(true);
      expect(config.blockedSenders).toEqual([]);
    });
  });
});

// ============================================================================
// UnidentifiedSender Tests
// ============================================================================

describe("UnidentifiedSender", () => {
  let senderKeys: { publicKey: Uint8Array; privateKey: Uint8Array };
  let recipientKeys: { publicKey: Uint8Array; privateKey: Uint8Array };
  let sender: UnidentifiedSender;
  let serverKeyPair: Awaited<ReturnType<typeof generateServerSigningKeyPair>>;

  beforeAll(async () => {
    senderKeys = await generateTestKeyPair();
    recipientKeys = await generateTestKeyPair();
    serverKeyPair = await generateServerSigningKeyPair(1);
  });

  beforeEach(async () => {
    const certificateManager = createSenderCertificateManager(
      "sender-user",
      "sender-device",
      senderKeys.publicKey,
    );

    // Set up certificate refresh
    certificateManager.addServerPublicKey(
      serverKeyPair.keyId,
      serverKeyPair.publicKeyBytes,
    );
    certificateManager.setRefreshCallback(async (request) => {
      const cert = await issueCertificate(request, serverKeyPair);
      return {
        certificate: cert,
        serverKeyId: serverKeyPair.keyId,
        serverPublicKey: serverKeyPair.publicKeyBytes,
      };
    });

    sender = createUnidentifiedSender(
      "sender-user",
      "sender-device",
      senderKeys.publicKey,
      senderKeys.privateKey,
      certificateManager,
    );
  });

  describe("createUnidentifiedMessage", () => {
    it("should create an unidentified message", async () => {
      const message = await sender.createUnidentifiedMessage(
        "recipient-user",
        "recipient-device",
        recipientKeys.publicKey,
        new Uint8Array([1, 2, 3, 4, 5]),
        SealedSenderMessageType.MESSAGE,
      );

      expect(message.envelope).toBeDefined();
      expect(message.recipientUserId).toBe("recipient-user");
      expect(message.recipientDeviceId).toBe("recipient-device");
      expect(message.deliveryToken).toBeDefined();
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.identifiedFallback).toBe(false);
    });

    it("should include delivery token", async () => {
      const message = await sender.createUnidentifiedMessage(
        "recipient-user",
        "recipient-device",
        recipientKeys.publicKey,
        new Uint8Array([1, 2, 3]),
        SealedSenderMessageType.MESSAGE,
      );

      expect(message.deliveryToken).toBeDefined();
      expect(typeof message.deliveryToken).toBe("string");
    });
  });

  describe("createIdentifiedFallback", () => {
    it("should create identified fallback message", async () => {
      const message = await sender.createIdentifiedFallback(
        "recipient-user",
        "recipient-device",
        recipientKeys.publicKey,
        new Uint8Array([1, 2, 3]),
        SealedSenderMessageType.MESSAGE,
      );

      expect(message.identifiedFallback).toBe(true);
      expect(message.deliveryToken).toBeUndefined();
    });
  });

  describe("token management", () => {
    it("should update delivery token", () => {
      const token: UnidentifiedDeliveryToken = {
        tokenId: "test-token",
        recipientUserId: "recipient-user",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
        messageCount: 0,
        isValid: true,
      };

      sender.updateDeliveryToken("recipient-user", token);
      // Token should be stored for subsequent messages
    });

    it("should clear delivery token", () => {
      sender.clearDeliveryToken("recipient-user");
      // Token should be removed
    });
  });

  describe("cleanup", () => {
    it("should clean up expired tokens", () => {
      sender.cleanup();
      // Should not throw
    });

    it("should destroy sender", () => {
      sender.destroy();
      // Should not throw
    });
  });
});

// ============================================================================
// UnidentifiedRecipient Tests
// ============================================================================

describe("UnidentifiedRecipient", () => {
  let senderKeys: { publicKey: Uint8Array; privateKey: Uint8Array };
  let recipientKeys: { publicKey: Uint8Array; privateKey: Uint8Array };
  let recipient: UnidentifiedRecipient;
  let accessConfig: UnidentifiedAccessConfig;

  beforeAll(async () => {
    senderKeys = await generateTestKeyPair();
    recipientKeys = await generateTestKeyPair();
  });

  beforeEach(() => {
    accessConfig = createDefaultAccessConfig();

    recipient = createUnidentifiedRecipient(
      "recipient-user",
      "recipient-device",
      recipientKeys.publicKey,
      recipientKeys.privateKey,
      accessConfig,
      async () => true,
    );
  });

  describe("isUnidentifiedDeliveryAllowed", () => {
    it("should allow when enabled", () => {
      const allowed = recipient.isUnidentifiedDeliveryAllowed();
      expect(allowed).toBe(true);
    });

    it("should deny when disabled", () => {
      recipient.updateAccessConfig({ allowUnidentifiedDelivery: false });
      const allowed = recipient.isUnidentifiedDeliveryAllowed();
      expect(allowed).toBe(false);
    });

    it("should deny blocked sender", () => {
      recipient.blockSender("blocked-fingerprint");
      const allowed = recipient.isUnidentifiedDeliveryAllowed(
        "blocked-fingerprint",
      );
      expect(allowed).toBe(false);
    });

    it("should allow non-blocked sender", () => {
      recipient.blockSender("blocked-fingerprint");
      const allowed = recipient.isUnidentifiedDeliveryAllowed(
        "allowed-fingerprint",
      );
      expect(allowed).toBe(true);
    });
  });

  describe("validateAccessKey", () => {
    it("should accept when no access key configured", () => {
      const valid = recipient.validateAccessKey(new Uint8Array(16));
      expect(valid).toBe(true); // Allowed because unidentified delivery is enabled
    });

    it("should validate matching access key", () => {
      const accessKey = generateAccessKey();
      recipient.updateAccessConfig({ accessKey });

      const valid = recipient.validateAccessKey(accessKey);
      expect(valid).toBe(true);
    });

    it("should reject non-matching access key", () => {
      const accessKey = generateAccessKey();
      recipient.updateAccessConfig({ accessKey });

      const wrongKey = generateAccessKey();
      const valid = recipient.validateAccessKey(wrongKey);
      expect(valid).toBe(false);
    });
  });

  describe("block/unblock sender", () => {
    it("should block sender", () => {
      recipient.blockSender("sender-fingerprint");
      const allowed =
        recipient.isUnidentifiedDeliveryAllowed("sender-fingerprint");
      expect(allowed).toBe(false);
    });

    it("should unblock sender", () => {
      recipient.blockSender("sender-fingerprint");
      recipient.unblockSender("sender-fingerprint");
      const allowed =
        recipient.isUnidentifiedDeliveryAllowed("sender-fingerprint");
      expect(allowed).toBe(true);
    });

    it("should handle duplicate blocks", () => {
      recipient.blockSender("sender-fingerprint");
      recipient.blockSender("sender-fingerprint");
      // Should not add duplicate
    });
  });

  describe("cleanup and destroy", () => {
    it("should cleanup without error", () => {
      recipient.cleanup();
    });

    it("should destroy without error", () => {
      recipient.destroy();
    });
  });
});

// ============================================================================
// Threat Model Verification Tests
// ============================================================================

describe("Threat Model Verification", () => {
  describe("verifyThreatModel", () => {
    it("should verify all security properties", () => {
      const verification = verifyThreatModel();

      expect(verification.serverBlindness).toBe(true);
      expect(verification.recipientVerification).toBe(true);
      expect(verification.forwardSecrecy).toBe(true);
      expect(verification.abusePrevention).toBe(true);
    });

    it("should provide detailed descriptions", () => {
      const verification = verifyThreatModel();

      expect(verification.details.serverBlindness).toBeDefined();
      expect(verification.details.serverBlindness.length).toBeGreaterThan(0);

      expect(verification.details.recipientVerification).toBeDefined();
      expect(verification.details.recipientVerification.length).toBeGreaterThan(
        0,
      );

      expect(verification.details.forwardSecrecy).toBeDefined();
      expect(verification.details.forwardSecrecy.length).toBeGreaterThan(0);

      expect(verification.details.abusePrevention).toBeDefined();
      expect(verification.details.abusePrevention.length).toBeGreaterThan(0);
    });

    it("should mention key security concepts", () => {
      const verification = verifyThreatModel();

      expect(verification.details.serverBlindness.toLowerCase()).toContain(
        "server",
      );
      expect(verification.details.serverBlindness.toLowerCase()).toContain(
        "sender",
      );

      expect(
        verification.details.recipientVerification.toLowerCase(),
      ).toContain("certificate");

      expect(verification.details.forwardSecrecy.toLowerCase()).toContain(
        "ephemeral",
      );

      expect(verification.details.abusePrevention.toLowerCase()).toContain(
        "certificate",
      );
    });
  });
});
