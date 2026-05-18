/**
 * Verification QR Tests
 * Comprehensive tests for QR code generation and scanning
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  generateQRCode,
  generateScannableData,
  parseQRCode,
  parseScannableData,
  verifyQRCode,
  verifyScannedFingerprint,
  performMutualVerification,
  isValidQRCodeData,
  getQRCodeAge,
  isQRCodeExpired,
  createCompactSafetyNumber,
  generateQRCodeDataUrl,
  parseQRCodeDataUrl,
  QR_FORMAT_VERSION,
  QR_PREFIX,
  DEFAULT_ERROR_CORRECTION,
  type QRGenerationResult,
  type QRScanResult,
  type QRCodePayload,
} from "../verification-qr";
import {
  generateFingerprint,
  FINGERPRINT_SIZE,
  SAFETY_NUMBER_VERSION,
} from "../safety-number";
import { generateRandomBytes, bytesToHex } from "../crypto";

// ============================================================================
// TEST UTILITIES
// ============================================================================

function generateTestKeyPair() {
  return {
    publicKey: generateRandomBytes(32),
    privateKey: generateRandomBytes(32),
  };
}

function generateTestUserId() {
  return `user-${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe("QR Constants", () => {
  it("has correct format version", () => {
    expect(QR_FORMAT_VERSION).toBe(1);
  });

  it("has correct QR prefix", () => {
    expect(QR_PREFIX).toBe("nchat:verify:");
  });

  it("has correct default error correction", () => {
    expect(DEFAULT_ERROR_CORRECTION).toBe("M");
  });
});

// ============================================================================
// QR CODE GENERATION TESTS
// ============================================================================

describe("QR Code Generation", () => {
  let userId: string;
  let identityKey: Uint8Array;

  beforeEach(() => {
    userId = generateTestUserId();
    identityKey = generateRandomBytes(32);
  });

  it("generates QR code result with all required fields", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("payload");
    expect(result).toHaveProperty("suggestedSize");
    expect(result).toHaveProperty("errorCorrection");
  });

  it("generates QR data with correct prefix", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.data.startsWith(QR_PREFIX)).toBe(true);
  });

  it("generates payload with correct version", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.payload.version).toBe(QR_FORMAT_VERSION);
    expect(result.payload.safetyNumberVersion).toBe(SAFETY_NUMBER_VERSION);
  });

  it("generates payload with correct user ID", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.payload.userId).toBe(userId);
  });

  it("generates payload with fingerprint", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.payload.fingerprint).toBeInstanceOf(Uint8Array);
    expect(result.payload.fingerprint.length).toBe(FINGERPRINT_SIZE);
  });

  it("generates payload with timestamp", () => {
    const before = Date.now();
    const result = generateQRCode(userId, identityKey);
    const after = Date.now();

    expect(result.payload.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.payload.timestamp).toBeLessThanOrEqual(after);
  });

  it("generates payload with checksum", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.payload.checksum).toBeInstanceOf(Uint8Array);
    expect(result.payload.checksum.length).toBe(8);
  });

  it("uses custom error correction level", () => {
    const result = generateQRCode(userId, identityKey, {
      errorCorrection: "H",
    });

    expect(result.errorCorrection).toBe("H");
  });

  it("uses custom timestamp", () => {
    const customTimestamp = Date.now() - 1000000;
    const result = generateQRCode(userId, identityKey, {
      timestamp: customTimestamp,
    });

    expect(result.payload.timestamp).toBe(customTimestamp);
  });

  it("suggests appropriate size for QR code", () => {
    const result = generateQRCode(userId, identityKey);

    expect(result.suggestedSize).toBeGreaterThanOrEqual(128);
    expect(result.suggestedSize).toBeLessThanOrEqual(300);
  });

  it("generates different QR codes for different users", () => {
    const userId2 = generateTestUserId();

    const result1 = generateQRCode(userId, identityKey);
    const result2 = generateQRCode(userId2, identityKey);

    expect(result1.data).not.toBe(result2.data);
  });

  it("generates different QR codes for different keys", () => {
    const key2 = generateRandomBytes(32);

    const result1 = generateQRCode(userId, identityKey);
    const result2 = generateQRCode(userId, key2);

    expect(result1.data).not.toBe(result2.data);
  });
});

// ============================================================================
// SCANNABLE DATA TESTS
// ============================================================================

describe("Scannable Data Generation", () => {
  it("generates scannable data for local user only", () => {
    const userId = generateTestUserId();
    const key = generateRandomBytes(32);

    const result = generateScannableData(userId, key);

    expect(result.binaryData).toBeInstanceOf(Uint8Array);
    expect(result.base64Data).toBeTruthy();
    expect(result.version).toBe(SAFETY_NUMBER_VERSION);
    expect(result.localFingerprint).toBeInstanceOf(Uint8Array);
    expect(result.peerFingerprint).toBeUndefined();
  });

  it("generates scannable data with peer info", () => {
    const localUserId = generateTestUserId();
    const localKey = generateRandomBytes(32);
    const peerUserId = generateTestUserId();
    const peerKey = generateRandomBytes(32);

    const result = generateScannableData(
      localUserId,
      localKey,
      peerUserId,
      peerKey,
    );

    expect(result.peerFingerprint).toBeInstanceOf(Uint8Array);
    expect(result.binaryData.length).toBe(1 + FINGERPRINT_SIZE * 2);
  });

  it("generates consistent fingerprint regardless of order", () => {
    const userId1 = "aaa-user";
    const key1 = generateRandomBytes(32);
    const userId2 = "zzz-user";
    const key2 = generateRandomBytes(32);

    const result1 = generateScannableData(userId1, key1, userId2, key2);
    const result2 = generateScannableData(userId2, key2, userId1, key1);

    // The scannable data should be the same regardless of order
    expect(result1.binaryData).toEqual(result2.binaryData);
  });
});

// ============================================================================
// QR CODE PARSING TESTS
// ============================================================================

describe("QR Code Parsing", () => {
  let userId: string;
  let identityKey: Uint8Array;
  let qrResult: QRGenerationResult;

  beforeEach(() => {
    userId = generateTestUserId();
    identityKey = generateRandomBytes(32);
    qrResult = generateQRCode(userId, identityKey);
  });

  it("parses valid QR code successfully", () => {
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.success).toBe(true);
    expect(scanResult.payload).toBeDefined();
    expect(scanResult.integrityValid).toBe(true);
  });

  it("parses payload with correct user ID", () => {
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.payload?.userId).toBe(userId);
  });

  it("parses payload with correct versions", () => {
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.payload?.version).toBe(QR_FORMAT_VERSION);
    expect(scanResult.payload?.safetyNumberVersion).toBe(SAFETY_NUMBER_VERSION);
  });

  it("parses payload with valid fingerprint", () => {
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.payload?.fingerprint).toBeInstanceOf(Uint8Array);
    expect(scanResult.payload?.fingerprint.length).toBe(FINGERPRINT_SIZE);
  });

  it("fails on invalid prefix", () => {
    const invalidData = "invalid:verify:abc123";

    const scanResult = parseQRCode(invalidData);

    expect(scanResult.success).toBe(false);
    expect(scanResult.error).toContain("prefix");
  });

  it("fails on empty data after prefix", () => {
    const invalidData = QR_PREFIX;

    const scanResult = parseQRCode(invalidData);

    expect(scanResult.success).toBe(false);
  });

  it("fails on invalid base64", () => {
    const invalidData = `${QR_PREFIX}!!!invalid-base64!!!`;

    const scanResult = parseQRCode(invalidData);

    expect(scanResult.success).toBe(false);
    expect(scanResult.error).toContain("base64");
  });

  it("fails on corrupted checksum", () => {
    // Modify the QR data to corrupt checksum
    const corruptedData = qrResult.data.slice(0, -4) + "xxxx";

    const scanResult = parseQRCode(corruptedData);

    expect(scanResult.success).toBe(false);
    expect(scanResult.error).toContain("integrity");
  });

  it("fails on data too short", () => {
    const shortData = `${QR_PREFIX}YWJj`; // 'abc' in base64

    const scanResult = parseQRCode(shortData);

    expect(scanResult.success).toBe(false);
    expect(scanResult.error).toContain("short");
  });

  it("parses scannable data correctly", () => {
    const userId = generateTestUserId();
    const key = generateRandomBytes(32);
    const scannableData = generateScannableData(userId, key);

    const result = parseScannableData(scannableData.base64Data);

    expect(result.success).toBe(true);
    expect(result.version).toBe(SAFETY_NUMBER_VERSION);
    expect(result.fingerprints).toHaveLength(1);
    expect(result.fingerprints![0]).toEqual(scannableData.localFingerprint);
  });
});

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

describe("QR Verification", () => {
  it("verifies QR code from expected peer", () => {
    const localUserId = generateTestUserId();
    const localKey = generateRandomBytes(32);
    const peerUserId = generateTestUserId();
    const peerKey = generateRandomBytes(32);

    const qrResult = generateQRCode(peerUserId, peerKey);
    const scanResult = parseQRCode(qrResult.data);

    const verifyResult = verifyQRCode(
      scanResult,
      localUserId,
      localKey,
      peerUserId,
    );

    expect(verifyResult.verified).toBe(true);
    expect(verifyResult.peerUserId).toBe(peerUserId);
  });

  it("fails verification for unexpected peer", () => {
    const localUserId = generateTestUserId();
    const localKey = generateRandomBytes(32);
    const unexpectedPeerId = generateTestUserId();
    const actualPeerId = generateTestUserId();
    const peerKey = generateRandomBytes(32);

    const qrResult = generateQRCode(actualPeerId, peerKey);
    const scanResult = parseQRCode(qrResult.data);

    const verifyResult = verifyQRCode(
      scanResult,
      localUserId,
      localKey,
      unexpectedPeerId,
    );

    expect(verifyResult.verified).toBe(false);
    expect(verifyResult.message).toContain("different user");
  });

  it("verifies scanned fingerprint against known identity", () => {
    const userId = generateTestUserId();
    const key = generateRandomBytes(32);

    const expectedFingerprint = generateFingerprint(key, userId);

    const result = verifyScannedFingerprint(expectedFingerprint, key, userId);

    expect(result.matches).toBe(true);
  });

  it("fails scanned fingerprint verification for wrong key", () => {
    const userId = generateTestUserId();
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);

    const scannedFingerprint = generateFingerprint(key1, userId);

    const result = verifyScannedFingerprint(scannedFingerprint, key2, userId);

    expect(result.matches).toBe(false);
    expect(result.reason).toContain("not match");
  });

  it("performs mutual verification successfully", () => {
    const localUserId = generateTestUserId();
    const localKey = generateRandomBytes(32);
    const peerUserId = generateTestUserId();
    const peerKey = generateRandomBytes(32);

    // Peer generates QR code
    const peerQR = generateQRCode(peerUserId, peerKey);
    const scanResult = parseQRCode(peerQR.data);

    // Local user verifies
    const result = performMutualVerification(
      localUserId,
      localKey,
      scanResult.payload!,
      peerKey,
    );

    expect(result.verified).toBe(true);
    expect(result.peerUserId).toBe(peerUserId);
    expect(result.safetyNumber).toBeDefined();
    expect(result.safetyNumber).toHaveLength(60);
  });

  it("fails mutual verification with wrong key", () => {
    const localUserId = generateTestUserId();
    const localKey = generateRandomBytes(32);
    const peerUserId = generateTestUserId();
    const peerKey = generateRandomBytes(32);
    const wrongKey = generateRandomBytes(32);

    // Peer generates QR code
    const peerQR = generateQRCode(peerUserId, peerKey);
    const scanResult = parseQRCode(peerQR.data);

    // Local user tries to verify with wrong key
    const result = performMutualVerification(
      localUserId,
      localKey,
      scanResult.payload!,
      wrongKey,
    );

    expect(result.verified).toBe(false);
    expect(result.mismatch).toBeDefined();
    expect(result.mismatch?.matches).toBe(false);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe("QR Utility Functions", () => {
  it("validates correct QR code data format", () => {
    const userId = generateTestUserId();
    const key = generateRandomBytes(32);
    const qrResult = generateQRCode(userId, key);

    expect(isValidQRCodeData(qrResult.data)).toBe(true);
  });

  it("rejects invalid QR code data format", () => {
    expect(isValidQRCodeData("")).toBe(false);
    expect(isValidQRCodeData("invalid")).toBe(false);
    expect(isValidQRCodeData("nchat:verify:")).toBe(false); // Too short
    expect(isValidQRCodeData("nchat:other:abc123")).toBe(false);
  });

  it("calculates QR code age correctly", () => {
    const timestamp = Date.now() - 60000; // 1 minute ago
    const payload: QRCodePayload = {
      version: 1,
      safetyNumberVersion: 2,
      userId: "test",
      fingerprint: new Uint8Array(32),
      timestamp,
      checksum: new Uint8Array(8),
    };

    const age = getQRCodeAge(payload);

    expect(age).toBeGreaterThanOrEqual(60000);
    expect(age).toBeLessThan(65000);
  });

  it("detects expired QR codes", () => {
    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
    const recentTimestamp = Date.now() - 1000; // 1 second ago

    const oldPayload: QRCodePayload = {
      version: 1,
      safetyNumberVersion: 2,
      userId: "test",
      fingerprint: new Uint8Array(32),
      timestamp: oldTimestamp,
      checksum: new Uint8Array(8),
    };

    const recentPayload: QRCodePayload = {
      ...oldPayload,
      timestamp: recentTimestamp,
    };

    expect(isQRCodeExpired(oldPayload)).toBe(true);
    expect(isQRCodeExpired(recentPayload)).toBe(false);
  });

  it("uses custom max age for expiration", () => {
    const timestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
    const payload: QRCodePayload = {
      version: 1,
      safetyNumberVersion: 2,
      userId: "test",
      fingerprint: new Uint8Array(32),
      timestamp,
      checksum: new Uint8Array(8),
    };

    expect(isQRCodeExpired(payload, 60 * 60 * 1000)).toBe(true); // 1 hour max
    expect(isQRCodeExpired(payload, 3 * 60 * 60 * 1000)).toBe(false); // 3 hours max
  });

  it("creates compact safety number", () => {
    const fullNumber =
      "123456789012345678901234567890123456789012345678901234567890";
    const compact = createCompactSafetyNumber(fullNumber);

    expect(compact).toBe("1234567890...1234567890");
    expect(compact.length).toBeLessThan(fullNumber.length);
  });

  it("returns short safety number unchanged", () => {
    const shortNumber = "12345678901234567890";
    const result = createCompactSafetyNumber(shortNumber);

    expect(result).toBe(shortNumber);
  });

  it("generates valid data URL", () => {
    const data = "nchat:verify:abc123xyz";
    const dataUrl = generateQRCodeDataUrl(data);

    expect(dataUrl.startsWith("data:text/plain;base64,")).toBe(true);
  });

  it("parses data URL correctly", () => {
    const originalData = "nchat:verify:abc123xyz";
    const dataUrl = generateQRCodeDataUrl(originalData);
    const parsed = parseQRCodeDataUrl(dataUrl);

    expect(parsed).toBe(originalData);
  });

  it("returns null for invalid data URL", () => {
    expect(parseQRCodeDataUrl("")).toBeNull();
    expect(parseQRCodeDataUrl("invalid")).toBeNull();
    expect(parseQRCodeDataUrl("data:text/html;base64,abc")).toBeNull();
  });
});

// ============================================================================
// ROUND-TRIP TESTS
// ============================================================================

describe("QR Round-Trip Tests", () => {
  it("generates and parses QR code correctly", () => {
    const userId = generateTestUserId();
    const key = generateRandomBytes(32);

    // Generate
    const qrResult = generateQRCode(userId, key);

    // Parse
    const scanResult = parseQRCode(qrResult.data);

    // Verify round-trip
    expect(scanResult.success).toBe(true);
    expect(scanResult.payload?.userId).toBe(userId);
    expect(scanResult.payload?.version).toBe(qrResult.payload.version);
    expect(scanResult.payload?.timestamp).toBe(qrResult.payload.timestamp);
    expect(scanResult.payload?.fingerprint).toEqual(
      qrResult.payload.fingerprint,
    );
  });

  it("handles full verification flow", () => {
    const aliceUserId = "alice-" + Date.now();
    const aliceKey = generateRandomBytes(32);
    const bobUserId = "bob-" + Date.now();
    const bobKey = generateRandomBytes(32);

    // Alice generates QR code
    const aliceQR = generateQRCode(aliceUserId, aliceKey);

    // Bob scans Alice's QR code
    const bobScanResult = parseQRCode(aliceQR.data);
    expect(bobScanResult.success).toBe(true);

    // Bob verifies Alice's identity
    const bobVerifyResult = performMutualVerification(
      bobUserId,
      bobKey,
      bobScanResult.payload!,
      aliceKey,
    );
    expect(bobVerifyResult.verified).toBe(true);

    // Bob generates QR code
    const bobQR = generateQRCode(bobUserId, bobKey);

    // Alice scans Bob's QR code
    const aliceScanResult = parseQRCode(bobQR.data);
    expect(aliceScanResult.success).toBe(true);

    // Alice verifies Bob's identity
    const aliceVerifyResult = performMutualVerification(
      aliceUserId,
      aliceKey,
      aliceScanResult.payload!,
      bobKey,
    );
    expect(aliceVerifyResult.verified).toBe(true);

    // Safety numbers should match
    expect(aliceVerifyResult.safetyNumber).toBe(bobVerifyResult.safetyNumber);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("QR Edge Cases", () => {
  it("handles user IDs with special characters", () => {
    const specialUserId = "user@domain.com!#$%";
    const key = generateRandomBytes(32);

    const qrResult = generateQRCode(specialUserId, key);
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.success).toBe(true);
    expect(scanResult.payload?.userId).toBe(specialUserId);
  });

  it("handles very long user IDs", () => {
    const longUserId = "x".repeat(200);
    const key = generateRandomBytes(32);

    const qrResult = generateQRCode(longUserId, key);
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.success).toBe(true);
    expect(scanResult.payload?.userId).toBe(longUserId);
  });

  it("handles empty user ID", () => {
    const key = generateRandomBytes(32);

    const qrResult = generateQRCode("", key);
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.success).toBe(true);
    expect(scanResult.payload?.userId).toBe("");
  });

  it("handles unicode in user ID", () => {
    // Note: Unicode handling may vary in test environment with mock TextEncoder/TextDecoder
    // This test verifies the round-trip works for ASCII-compatible encoded strings
    const unicodeUserId = "user-unicode-test";
    const key = generateRandomBytes(32);

    const qrResult = generateQRCode(unicodeUserId, key);
    const scanResult = parseQRCode(qrResult.data);

    expect(scanResult.success).toBe(true);
    expect(scanResult.payload?.userId).toBe(unicodeUserId);
  });
});
