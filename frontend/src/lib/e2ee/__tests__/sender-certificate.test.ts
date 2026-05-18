/**
 * Sender Certificate Tests
 *
 * Comprehensive tests for sender certificate generation and validation.
 * Tests cover issuance, verification, expiration, and the certificate manager.
 */

import {
  generateServerSigningKeyPair,
  exportServerPublicKey,
  importServerPublicKey,
  issueCertificate,
  verifyCertificateSignature,
  validateCertificate,
  shouldRenewCertificate,
  SenderCertificateManager,
  createSenderCertificateManager,
  certificateToBase64,
  certificateFromBase64,
  type ServerSigningKeyPair,
  type CertificateRequest,
  type CertificateResponse,
  DEFAULT_CERTIFICATE_VALIDITY_MS,
  MAX_CERTIFICATE_VALIDITY_MS,
  MIN_CERTIFICATE_VALIDITY_MS,
  CERTIFICATE_RENEWAL_THRESHOLD_MS,
} from "../sender-certificate";
import {
  type SenderCertificate,
  SEALED_SENDER_VERSION,
} from "../sealed-sender";

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

async function generateTestIdentityKey(): Promise<Uint8Array> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  return new Uint8Array(publicKeyRaw);
}

function createTestRequest(
  overrides?: Partial<CertificateRequest>,
): CertificateRequest {
  const identityKey = new Uint8Array(65);
  identityKey[0] = 0x04;
  crypto.getRandomValues(identityKey.subarray(1));

  return {
    userId: "test-user",
    deviceId: "test-device",
    identityKey,
    ...overrides,
  };
}

// ============================================================================
// Server Key Management Tests
// ============================================================================

describe("Server Key Management", () => {
  describe("generateServerSigningKeyPair", () => {
    it("should generate a valid signing key pair", async () => {
      const keyPair = await generateServerSigningKeyPair(1);

      expect(keyPair.keyId).toBe(1);
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.publicKeyBytes).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKeyBytes.length).toBe(65); // P-256 uncompressed
      expect(keyPair.createdAt).toBeInstanceOf(Date);
      expect(keyPair.expiresAt).toBeInstanceOf(Date);
    });

    it("should set correct expiration time", async () => {
      const validityMs = 24 * 60 * 60 * 1000; // 24 hours
      const keyPair = await generateServerSigningKeyPair(1, validityMs);

      const expectedExpiry = Date.now() + validityMs;
      const actualExpiry = keyPair.expiresAt.getTime();

      // Allow 1 second tolerance
      expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(1000);
    });

    it("should generate unique key pairs", async () => {
      const keyPair1 = await generateServerSigningKeyPair(1);
      const keyPair2 = await generateServerSigningKeyPair(2);

      expect(Array.from(keyPair1.publicKeyBytes)).not.toEqual(
        Array.from(keyPair2.publicKeyBytes),
      );
    });
  });

  describe("exportServerPublicKey", () => {
    it("should export server public key for distribution", async () => {
      const keyPair = await generateServerSigningKeyPair(1);
      const exported = await exportServerPublicKey(keyPair);

      expect(exported.keyId).toBe(1);
      expect(typeof exported.publicKey).toBe("string");
      expect(exported.expiresAt).toBe(keyPair.expiresAt.getTime());
    });
  });

  describe("importServerPublicKey", () => {
    it("should import server public key for verification", async () => {
      const keyPair = await generateServerSigningKeyPair(1);
      const imported = await importServerPublicKey(keyPair.publicKeyBytes);

      expect(imported).toBeDefined();
      expect(imported.type).toBe("public");
    });
  });
});

// ============================================================================
// Certificate Issuance Tests
// ============================================================================

describe("Certificate Issuance", () => {
  let serverKeyPair: ServerSigningKeyPair;

  beforeAll(async () => {
    serverKeyPair = await generateServerSigningKeyPair(1);
  });

  describe("issueCertificate", () => {
    it("should issue a valid certificate", async () => {
      const request = createTestRequest();
      const certificate = await issueCertificate(request, serverKeyPair);

      expect(certificate.version).toBe(SEALED_SENDER_VERSION);
      expect(certificate.senderUserId).toBe(request.userId);
      expect(certificate.senderDeviceId).toBe(request.deviceId);
      expect(certificate.senderIdentityKey).toEqual(request.identityKey);
      expect(certificate.serverKeyId).toBe(serverKeyPair.keyId);
      expect(certificate.signature).toBeInstanceOf(Uint8Array);
      expect(certificate.signature.length).toBeGreaterThan(0);
    });

    it("should set default validity period", async () => {
      const request = createTestRequest();
      const certificate = await issueCertificate(request, serverKeyPair);

      const expectedExpiry = Date.now() + DEFAULT_CERTIFICATE_VALIDITY_MS;
      expect(Math.abs(certificate.expiresAt - expectedExpiry)).toBeLessThan(
        1000,
      );
    });

    it("should respect custom validity period", async () => {
      const validityMs = 60 * 60 * 1000; // 1 hour
      const request = createTestRequest({ validityMs });
      const certificate = await issueCertificate(request, serverKeyPair);

      const expectedExpiry = Date.now() + validityMs;
      expect(Math.abs(certificate.expiresAt - expectedExpiry)).toBeLessThan(
        1000,
      );
    });

    it("should clamp validity to minimum", async () => {
      const validityMs = 1000; // 1 second (below minimum)
      const request = createTestRequest({ validityMs });
      const certificate = await issueCertificate(request, serverKeyPair);

      const expectedExpiry = Date.now() + MIN_CERTIFICATE_VALIDITY_MS;
      expect(Math.abs(certificate.expiresAt - expectedExpiry)).toBeLessThan(
        1000,
      );
    });

    it("should clamp validity to maximum", async () => {
      const validityMs = 30 * 24 * 60 * 60 * 1000; // 30 days (above maximum)
      const request = createTestRequest({ validityMs });
      const certificate = await issueCertificate(request, serverKeyPair);

      const expectedExpiry = Date.now() + MAX_CERTIFICATE_VALIDITY_MS;
      expect(Math.abs(certificate.expiresAt - expectedExpiry)).toBeLessThan(
        1000,
      );
    });

    it("should reject invalid user ID", async () => {
      const request = createTestRequest({ userId: "" });
      await expect(issueCertificate(request, serverKeyPair)).rejects.toThrow(
        "Invalid user ID",
      );
    });

    it("should reject invalid device ID", async () => {
      const request = createTestRequest({ deviceId: "" });
      await expect(issueCertificate(request, serverKeyPair)).rejects.toThrow(
        "Invalid device ID",
      );
    });

    it("should reject invalid identity key", async () => {
      const request = createTestRequest({ identityKey: new Uint8Array(32) });
      await expect(issueCertificate(request, serverKeyPair)).rejects.toThrow(
        "Invalid identity key",
      );
    });
  });
});

// ============================================================================
// Certificate Verification Tests
// ============================================================================

describe("Certificate Verification", () => {
  let serverKeyPair: ServerSigningKeyPair;
  let certificate: SenderCertificate;

  beforeAll(async () => {
    serverKeyPair = await generateServerSigningKeyPair(1);
    const request = createTestRequest();
    certificate = await issueCertificate(request, serverKeyPair);
  });

  describe("verifyCertificateSignature", () => {
    it("should verify valid signature", async () => {
      const isValid = await verifyCertificateSignature(
        certificate,
        serverKeyPair.publicKeyBytes,
      );
      expect(isValid).toBe(true);
    });

    it("should reject tampered user ID", async () => {
      const tampered = { ...certificate, senderUserId: "tampered" };
      const isValid = await verifyCertificateSignature(
        tampered,
        serverKeyPair.publicKeyBytes,
      );
      expect(isValid).toBe(false);
    });

    it("should reject tampered device ID", async () => {
      const tampered = { ...certificate, senderDeviceId: "tampered" };
      const isValid = await verifyCertificateSignature(
        tampered,
        serverKeyPair.publicKeyBytes,
      );
      expect(isValid).toBe(false);
    });

    it("should reject tampered expiration", async () => {
      const tampered = {
        ...certificate,
        expiresAt: certificate.expiresAt + 86400000,
      };
      const isValid = await verifyCertificateSignature(
        tampered,
        serverKeyPair.publicKeyBytes,
      );
      expect(isValid).toBe(false);
    });

    it("should reject wrong server key", async () => {
      const otherKey = await generateServerSigningKeyPair(2);
      const isValid = await verifyCertificateSignature(
        certificate,
        otherKey.publicKeyBytes,
      );
      expect(isValid).toBe(false);
    });
  });

  describe("validateCertificate", () => {
    it("should validate valid certificate", async () => {
      const result = await validateCertificate(
        certificate,
        serverKeyPair.publicKeyBytes,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.expired).toBe(false);
      expect(result.needsRenewal).toBe(false);
      expect(result.remainingValidityMs).toBeGreaterThan(0);
    });

    it("should detect expired certificate", async () => {
      const expiredCert = { ...certificate, expiresAt: Date.now() - 1000 };
      const result = await validateCertificate(
        expiredCert,
        serverKeyPair.publicKeyBytes,
      );

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.errors.some((e) => e.includes("expired"))).toBe(true);
    });

    it("should allow expired certificate with flag", async () => {
      const expiredCert = { ...certificate, expiresAt: Date.now() - 1000 };
      const result = await validateCertificate(
        expiredCert,
        serverKeyPair.publicKeyBytes,
        {
          allowExpired: true,
        },
      );

      expect(result.expired).toBe(true);
      // Should not include expiration in errors when allowed
      expect(result.errors.filter((e) => e.includes("expired"))).toHaveLength(
        0,
      );
    });

    it("should detect need for renewal", async () => {
      const soonExpiring = {
        ...certificate,
        expiresAt: Date.now() + CERTIFICATE_RENEWAL_THRESHOLD_MS / 2,
      };
      const result = await validateCertificate(
        soonExpiring,
        serverKeyPair.publicKeyBytes,
      );

      expect(result.needsRenewal).toBe(true);
    });

    it("should calculate remaining validity", async () => {
      const result = await validateCertificate(
        certificate,
        serverKeyPair.publicKeyBytes,
      );
      const expectedRemaining = certificate.expiresAt - Date.now();

      expect(
        Math.abs(result.remainingValidityMs - expectedRemaining),
      ).toBeLessThan(100);
    });
  });
});

// ============================================================================
// Certificate Serialization Tests
// ============================================================================

describe("Certificate Serialization", () => {
  let serverKeyPair: ServerSigningKeyPair;
  let certificate: SenderCertificate;

  beforeAll(async () => {
    serverKeyPair = await generateServerSigningKeyPair(1);
    const request = createTestRequest();
    certificate = await issueCertificate(request, serverKeyPair);
  });

  describe("certificateToBase64 / certificateFromBase64", () => {
    it("should serialize and deserialize certificate", () => {
      const base64 = certificateToBase64(certificate);
      const restored = certificateFromBase64(base64);

      expect(restored.version).toBe(certificate.version);
      expect(restored.senderUserId).toBe(certificate.senderUserId);
      expect(restored.senderDeviceId).toBe(certificate.senderDeviceId);
      expect(restored.expiresAt).toBe(certificate.expiresAt);
      expect(restored.serverKeyId).toBe(certificate.serverKeyId);
    });

    it("should preserve identity key", () => {
      const base64 = certificateToBase64(certificate);
      const restored = certificateFromBase64(base64);

      expect(Array.from(restored.senderIdentityKey)).toEqual(
        Array.from(certificate.senderIdentityKey),
      );
    });

    it("should preserve signature", () => {
      const base64 = certificateToBase64(certificate);
      const restored = certificateFromBase64(base64);

      expect(Array.from(restored.signature)).toEqual(
        Array.from(certificate.signature),
      );
    });

    it("should produce valid Base64", () => {
      const base64 = certificateToBase64(certificate);
      expect(() => atob(base64)).not.toThrow();
    });
  });
});

// ============================================================================
// Renewal Logic Tests
// ============================================================================

describe("Certificate Renewal", () => {
  describe("shouldRenewCertificate", () => {
    it("should return true for null certificate", () => {
      expect(shouldRenewCertificate(null)).toBe(true);
    });

    it("should return true for expired certificate", () => {
      const expired: SenderCertificate = {
        version: SEALED_SENDER_VERSION,
        senderUserId: "user",
        senderDeviceId: "device",
        senderIdentityKey: new Uint8Array(65),
        expiresAt: Date.now() - 1000,
        signature: new Uint8Array(64),
        serverKeyId: 1,
      };
      expect(shouldRenewCertificate(expired)).toBe(true);
    });

    it("should return true when below renewal threshold", () => {
      const soonExpiring: SenderCertificate = {
        version: SEALED_SENDER_VERSION,
        senderUserId: "user",
        senderDeviceId: "device",
        senderIdentityKey: new Uint8Array(65),
        expiresAt: Date.now() + CERTIFICATE_RENEWAL_THRESHOLD_MS / 2,
        signature: new Uint8Array(64),
        serverKeyId: 1,
      };
      expect(shouldRenewCertificate(soonExpiring)).toBe(true);
    });

    it("should return false for valid certificate", () => {
      const valid: SenderCertificate = {
        version: SEALED_SENDER_VERSION,
        senderUserId: "user",
        senderDeviceId: "device",
        senderIdentityKey: new Uint8Array(65),
        expiresAt: Date.now() + DEFAULT_CERTIFICATE_VALIDITY_MS,
        signature: new Uint8Array(64),
        serverKeyId: 1,
      };
      expect(shouldRenewCertificate(valid)).toBe(false);
    });
  });
});

// ============================================================================
// Certificate Manager Tests
// ============================================================================

describe("SenderCertificateManager", () => {
  let identityKey: Uint8Array;
  let serverKeyPair: ServerSigningKeyPair;
  let manager: SenderCertificateManager;

  beforeAll(async () => {
    identityKey = await generateTestIdentityKey();
    serverKeyPair = await generateServerSigningKeyPair(1);
  });

  beforeEach(() => {
    manager = createSenderCertificateManager("user-1", "device-1", identityKey);
    manager.addServerPublicKey(
      serverKeyPair.keyId,
      serverKeyPair.publicKeyBytes,
    );
  });

  describe("initialization", () => {
    it("should create manager with correct parameters", () => {
      expect(manager.getCertificate()).toBeNull();
    });
  });

  describe("setCertificate", () => {
    it("should set and retrieve certificate", async () => {
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );

      manager.setCertificate(cert);
      expect(manager.getCertificate()).toEqual(cert);
    });
  });

  describe("verifyCertificate", () => {
    it("should verify valid certificate", async () => {
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );

      const isValid = await manager.verifyCertificate(cert);
      expect(isValid).toBe(true);
    });

    it("should reject certificate with unknown server key", async () => {
      const otherKeyPair = await generateServerSigningKeyPair(2);
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        otherKeyPair,
      );

      const isValid = await manager.verifyCertificate(cert);
      expect(isValid).toBe(false);
    });
  });

  describe("setRefreshCallback", () => {
    it("should call refresh callback when getting valid certificate", async () => {
      const refreshCallback = jest
        .fn()
        .mockImplementation(async (request: CertificateRequest) => {
          const cert = await issueCertificate(request, serverKeyPair);
          return {
            certificate: cert,
            serverKeyId: serverKeyPair.keyId,
            serverPublicKey: serverKeyPair.publicKeyBytes,
          };
        });

      manager.setRefreshCallback(refreshCallback);

      // Should trigger refresh since no certificate exists
      await manager.getValidCertificate();

      expect(refreshCallback).toHaveBeenCalled();
    });

    it("should not refresh if certificate is valid", async () => {
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );
      manager.setCertificate(cert);

      const refreshCallback = jest.fn();
      manager.setRefreshCallback(refreshCallback);

      await manager.getValidCertificate();

      expect(refreshCallback).not.toHaveBeenCalled();
    });
  });

  describe("server key management", () => {
    it("should add and use server public key", async () => {
      const newKeyPair = await generateServerSigningKeyPair(2);
      manager.addServerPublicKey(newKeyPair.keyId, newKeyPair.publicKeyBytes);

      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        newKeyPair,
      );

      const isValid = await manager.verifyCertificate(cert);
      expect(isValid).toBe(true);
    });

    it("should remove server public key", async () => {
      manager.removeServerPublicKey(serverKeyPair.keyId);

      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );

      const isValid = await manager.verifyCertificate(cert);
      expect(isValid).toBe(false);
    });
  });

  describe("state persistence", () => {
    it("should export and restore state", async () => {
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );
      manager.setCertificate(cert);

      const state = manager.getState();

      const newManager = createSenderCertificateManager(
        "user-1",
        "device-1",
        identityKey,
      );
      newManager.restoreState(state);

      expect(newManager.getCertificate()?.senderUserId).toBe(cert.senderUserId);
    });

    it("should clear state", async () => {
      const cert = await issueCertificate(
        { userId: "user-1", deviceId: "device-1", identityKey },
        serverKeyPair,
      );
      manager.setCertificate(cert);

      manager.clear();

      expect(manager.getCertificate()).toBeNull();
    });
  });
});
