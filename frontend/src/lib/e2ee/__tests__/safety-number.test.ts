/**
 * Safety Number Tests
 * Comprehensive tests for safety number generation and verification
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  generateSafetyNumber,
  generateSafetyNumberSimple,
  generateFingerprint,
  generateScannableFingerprint,
  formatSafetyNumber,
  createDisplayGrid,
  parseSafetyNumber,
  validateSafetyNumberFormat,
  compareSafetyNumbers,
  verifySafetyNumber,
  verifyFingerprint,
  detectKeyChange,
  createKeyChangeEvent,
  createVerificationRecord,
  invalidateVerification,
  createVerificationState,
  updateVerificationState,
  handleKeyChangeInState,
  serializeVerificationRecord,
  deserializeVerificationRecord,
  serializeVerificationState,
  deserializeVerificationState,
  formatFingerprintHex,
  getShortFingerprint,
  SAFETY_NUMBER_VERSION,
  SAFETY_NUMBER_LENGTH,
  SAFETY_NUMBER_GROUP_SIZE,
  SAFETY_NUMBER_GROUP_COUNT,
  FINGERPRINT_SIZE,
  type SafetyNumberInput,
  type VerificationMethod,
} from "../safety-number";
import { generateRandomBytes } from "../crypto";

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

describe("Safety Number Constants", () => {
  it("has correct safety number version", () => {
    expect(SAFETY_NUMBER_VERSION).toBe(2);
  });

  it("has correct safety number length", () => {
    expect(SAFETY_NUMBER_LENGTH).toBe(60);
  });

  it("has correct group size", () => {
    expect(SAFETY_NUMBER_GROUP_SIZE).toBe(5);
  });

  it("has correct group count", () => {
    expect(SAFETY_NUMBER_GROUP_COUNT).toBe(12);
  });

  it("has correct fingerprint size", () => {
    expect(FINGERPRINT_SIZE).toBe(32);
  });
});

// ============================================================================
// FINGERPRINT GENERATION TESTS
// ============================================================================

describe("Fingerprint Generation", () => {
  it("generates fingerprint of correct size", () => {
    const key = generateRandomBytes(32);
    const userId = "test-user-123";

    const fingerprint = generateFingerprint(key, userId);

    expect(fingerprint).toBeInstanceOf(Uint8Array);
    expect(fingerprint.length).toBe(FINGERPRINT_SIZE);
  });

  it("generates consistent fingerprints for same input", () => {
    const key = generateRandomBytes(32);
    const userId = "test-user-123";

    const fp1 = generateFingerprint(key, userId);
    const fp2 = generateFingerprint(key, userId);

    expect(fp1).toEqual(fp2);
  });

  it("generates different fingerprints for different keys", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const userId = "test-user-123";

    const fp1 = generateFingerprint(key1, userId);
    const fp2 = generateFingerprint(key2, userId);

    expect(fp1).not.toEqual(fp2);
  });

  it("generates different fingerprints for different user IDs", () => {
    const key = generateRandomBytes(32);

    const fp1 = generateFingerprint(key, "user-1");
    const fp2 = generateFingerprint(key, "user-2");

    expect(fp1).not.toEqual(fp2);
  });

  it("generates different fingerprints for different versions", () => {
    const key = generateRandomBytes(32);
    const userId = "test-user-123";

    const fp1 = generateFingerprint(key, userId, 1);
    const fp2 = generateFingerprint(key, userId, 2);

    expect(fp1).not.toEqual(fp2);
  });

  it("generates scannable fingerprint with correct size", () => {
    const fp1 = generateRandomBytes(FINGERPRINT_SIZE);
    const fp2 = generateRandomBytes(FINGERPRINT_SIZE);

    const scannable = generateScannableFingerprint(fp1, fp2);

    expect(scannable.length).toBe(1 + FINGERPRINT_SIZE * 2);
    expect(scannable[0]).toBe(SAFETY_NUMBER_VERSION);
  });

  it("generates consistent scannable fingerprint regardless of order", () => {
    const fp1 = generateRandomBytes(FINGERPRINT_SIZE);
    const fp2 = generateRandomBytes(FINGERPRINT_SIZE);

    const scannable1 = generateScannableFingerprint(fp1, fp2);
    const scannable2 = generateScannableFingerprint(fp2, fp1);

    expect(scannable1).toEqual(scannable2);
  });
});

// ============================================================================
// SAFETY NUMBER GENERATION TESTS
// ============================================================================

describe("Safety Number Generation", () => {
  let localKey: Uint8Array;
  let peerKey: Uint8Array;
  let localUserId: string;
  let peerUserId: string;

  beforeEach(() => {
    localKey = generateRandomBytes(32);
    peerKey = generateRandomBytes(32);
    localUserId = generateTestUserId();
    peerUserId = generateTestUserId();
  });

  it("generates safety number result with all required fields", () => {
    const result = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    expect(result).toHaveProperty("raw");
    expect(result).toHaveProperty("formatted");
    expect(result).toHaveProperty("displayGrid");
    expect(result).toHaveProperty("localFingerprint");
    expect(result).toHaveProperty("peerFingerprint");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("generatedAt");
  });

  it("generates 60-digit safety number", () => {
    const result = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    expect(result.raw).toHaveLength(SAFETY_NUMBER_LENGTH);
    expect(result.raw).toMatch(/^\d{60}$/);
  });

  it("generates same safety number regardless of party order", () => {
    const sn1 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    const sn2 = generateSafetyNumber({
      localIdentityKey: peerKey,
      localUserId: peerUserId,
      peerIdentityKey: localKey,
      peerUserId: localUserId,
    });

    expect(sn1.raw).toBe(sn2.raw);
  });

  it("generates different safety numbers for different key pairs", () => {
    const key3 = generateRandomBytes(32);

    const sn1 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    const sn2 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: key3,
      peerUserId,
    });

    expect(sn1.raw).not.toBe(sn2.raw);
  });

  it("generates correct display grid (6x2)", () => {
    const result = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    expect(result.displayGrid).toHaveLength(2);
    expect(result.displayGrid[0]).toHaveLength(6);
    expect(result.displayGrid[1]).toHaveLength(6);

    // Each group should be 5 digits
    result.displayGrid.flat().forEach((group) => {
      expect(group).toHaveLength(5);
      expect(group).toMatch(/^\d{5}$/);
    });
  });

  it("simple generation function works correctly", () => {
    const sn1 = generateSafetyNumberSimple(
      localKey,
      localUserId,
      peerKey,
      peerUserId,
    );
    const sn2 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    expect(sn1).toBe(sn2.raw);
  });

  it("generates consistent safety numbers for same inputs", () => {
    const result1 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    const result2 = generateSafetyNumber({
      localIdentityKey: localKey,
      localUserId,
      peerIdentityKey: peerKey,
      peerUserId,
    });

    expect(result1.raw).toBe(result2.raw);
  });
});

// ============================================================================
// FORMATTING TESTS
// ============================================================================

describe("Safety Number Formatting", () => {
  it("formats safety number with spaces", () => {
    const raw = "123456789012345678901234567890123456789012345678901234567890";
    const formatted = formatSafetyNumber(raw);

    expect(formatted.split(" ")).toHaveLength(12);
    expect(formatted).not.toContain("  ");
  });

  it("creates correct display grid", () => {
    const raw = "123456789012345678901234567890123456789012345678901234567890";
    const grid = createDisplayGrid(raw);

    expect(grid).toHaveLength(2);
    expect(grid[0]).toEqual([
      "12345",
      "67890",
      "12345",
      "67890",
      "12345",
      "67890",
    ]);
    expect(grid[1]).toEqual([
      "12345",
      "67890",
      "12345",
      "67890",
      "12345",
      "67890",
    ]);
  });

  it("parses formatted safety number back to raw", () => {
    const original =
      "123456789012345678901234567890123456789012345678901234567890";
    const formatted = formatSafetyNumber(original);
    const parsed = parseSafetyNumber(formatted);

    expect(parsed).toBe(original);
  });

  it("parses safety number with various whitespace", () => {
    const raw = "123456789012345678901234567890123456789012345678901234567890";
    const withSpaces =
      "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890";
    const withNewlines = "12345 67890\n12345 67890";

    expect(parseSafetyNumber(withSpaces)).toBe(raw);
    expect(parseSafetyNumber(withNewlines).length).toBeGreaterThan(0);
  });

  it("validates correct safety number format", () => {
    const valid =
      "123456789012345678901234567890123456789012345678901234567890";
    expect(validateSafetyNumberFormat(valid)).toBe(true);

    const formatted = formatSafetyNumber(valid);
    expect(validateSafetyNumberFormat(formatted)).toBe(true);
  });

  it("rejects invalid safety number formats", () => {
    expect(validateSafetyNumberFormat("")).toBe(false);
    expect(validateSafetyNumberFormat("12345")).toBe(false);
    expect(validateSafetyNumberFormat("abcdef")).toBe(false);
    expect(
      validateSafetyNumberFormat(
        "12345678901234567890123456789012345678901234567890123456789",
      ),
    ).toBe(false); // 59 digits
    expect(
      validateSafetyNumberFormat(
        "1234567890123456789012345678901234567890123456789012345678901",
      ),
    ).toBe(false); // 61 digits
  });

  it("formats fingerprint as hex groups", () => {
    const fingerprint = generateRandomBytes(32);
    const formatted = formatFingerprintHex(fingerprint);

    expect(formatted.split(" ")).toHaveLength(8);
    expect(formatted.replace(/ /g, "")).toHaveLength(64);
  });

  it("gets short fingerprint correctly", () => {
    const fingerprint = generateRandomBytes(32);
    const short = getShortFingerprint(fingerprint);

    expect(short).toHaveLength(8);
    expect(short).toMatch(/^[0-9A-F]{8}$/);
  });
});

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

describe("Safety Number Verification", () => {
  it("compares identical safety numbers as equal", () => {
    const sn = "123456789012345678901234567890123456789012345678901234567890";
    expect(compareSafetyNumbers(sn, sn)).toBe(true);
  });

  it("compares formatted and raw safety numbers as equal", () => {
    const raw = "123456789012345678901234567890123456789012345678901234567890";
    const formatted = formatSafetyNumber(raw);

    expect(compareSafetyNumbers(raw, formatted)).toBe(true);
    expect(compareSafetyNumbers(formatted, raw)).toBe(true);
  });

  it("compares different safety numbers as not equal", () => {
    const sn1 = "123456789012345678901234567890123456789012345678901234567890";
    const sn2 = "098765432109876543210987654321098765432109876543210987654321";

    expect(compareSafetyNumbers(sn1, sn2)).toBe(false);
  });

  it("verifies matching safety numbers successfully", () => {
    const expected =
      "123456789012345678901234567890123456789012345678901234567890";
    const provided = formatSafetyNumber(expected);

    const result = verifySafetyNumber(provided, expected);

    expect(result.matches).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("rejects mismatched safety numbers", () => {
    const expected =
      "123456789012345678901234567890123456789012345678901234567890";
    const provided =
      "098765432109876543210987654321098765432109876543210987654321";

    const result = verifySafetyNumber(provided, expected);

    expect(result.matches).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions!.length).toBeGreaterThan(0);
  });

  it("verifies fingerprint against stored record", () => {
    const key = generateRandomBytes(32);
    const userId = "test-user";

    const record = createVerificationRecord(
      userId,
      key,
      "123456789012345678901234567890123456789012345678901234567890",
      "numeric_comparison",
    );

    const currentFingerprint = generateFingerprint(key, userId);
    const result = verifyFingerprint(currentFingerprint, record);

    expect(result.matches).toBe(true);
  });

  it("detects fingerprint mismatch after key change", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const userId = "test-user";

    const record = createVerificationRecord(
      userId,
      key1,
      "123456789012345678901234567890123456789012345678901234567890",
      "numeric_comparison",
    );

    const currentFingerprint = generateFingerprint(key2, userId);
    const result = verifyFingerprint(currentFingerprint, record);

    expect(result.matches).toBe(false);
    expect(result.reason).toContain("changed");
    expect(result.suggestions).toBeDefined();
  });
});

// ============================================================================
// KEY CHANGE DETECTION TESTS
// ============================================================================

describe("Key Change Detection", () => {
  it("does not detect change for null previous key", () => {
    const currentKey = generateRandomBytes(32);

    const changed = detectKeyChange(null, currentKey);

    expect(changed).toBe(false);
  });

  it("does not detect change for same key", () => {
    const key = generateRandomBytes(32);

    const changed = detectKeyChange(key, key);

    expect(changed).toBe(false);
  });

  it("detects change for different keys", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);

    const changed = detectKeyChange(key1, key2);

    expect(changed).toBe(true);
  });

  it("creates key change event with all fields", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const localKey = generateRandomBytes(32);
    const userId = "peer-user";
    const localUserId = "local-user";

    const event = createKeyChangeEvent(
      userId,
      key1,
      key2,
      localUserId,
      localKey,
      true,
    );

    expect(event.userId).toBe(userId);
    expect(event.previousFingerprint).toBeInstanceOf(Uint8Array);
    expect(event.newFingerprint).toBeInstanceOf(Uint8Array);
    expect(event.previousFingerprint).not.toEqual(event.newFingerprint);
    expect(event.wasVerified).toBe(true);
    expect(event.detectedAt).toBeGreaterThan(0);
  });
});

// ============================================================================
// VERIFICATION RECORD TESTS
// ============================================================================

describe("Verification Records", () => {
  it("creates verification record with all fields", () => {
    const key = generateRandomBytes(32);
    const userId = "test-user";
    const safetyNumber =
      "123456789012345678901234567890123456789012345678901234567890";

    const record = createVerificationRecord(
      userId,
      key,
      safetyNumber,
      "qr_code_scan",
      "device-123",
      "Verified in person",
    );

    expect(record.peerUserId).toBe(userId);
    expect(record.peerDeviceId).toBe("device-123");
    expect(record.identityFingerprint).toBeInstanceOf(Uint8Array);
    expect(record.safetyNumber).toBe(safetyNumber);
    expect(record.method).toBe("qr_code_scan");
    expect(record.isValid).toBe(true);
    expect(record.notes).toBe("Verified in person");
    expect(record.verifiedAt).toBeGreaterThan(0);
  });

  it("strips whitespace from safety number in record", () => {
    const key = generateRandomBytes(32);
    const formatted =
      "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890";

    const record = createVerificationRecord(
      "user",
      key,
      formatted,
      "numeric_comparison",
    );

    expect(record.safetyNumber).not.toContain(" ");
    expect(record.safetyNumber).toHaveLength(60);
  });

  it("invalidates verification record", () => {
    const key = generateRandomBytes(32);
    const record = createVerificationRecord(
      "user",
      key,
      "123456789012345678901234567890123456789012345678901234567890",
      "in_person",
    );

    expect(record.isValid).toBe(true);

    const invalidated = invalidateVerification(record);

    expect(invalidated.isValid).toBe(false);
    expect(invalidated.peerUserId).toBe(record.peerUserId);
    expect(invalidated.verifiedAt).toBe(record.verifiedAt);
  });

  it("serializes and deserializes verification record", () => {
    const key = generateRandomBytes(32);
    const record = createVerificationRecord(
      "user-123",
      key,
      "123456789012345678901234567890123456789012345678901234567890",
      "video_call",
      "device-456",
      "Test notes",
    );

    const serialized = serializeVerificationRecord(record);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeVerificationRecord(serialized);

    expect(deserialized.peerUserId).toBe(record.peerUserId);
    expect(deserialized.peerDeviceId).toBe(record.peerDeviceId);
    expect(deserialized.safetyNumber).toBe(record.safetyNumber);
    expect(deserialized.method).toBe(record.method);
    expect(deserialized.isValid).toBe(record.isValid);
    expect(deserialized.notes).toBe(record.notes);
    expect(deserialized.verifiedAt).toBe(record.verifiedAt);
    expect(deserialized.identityFingerprint).toEqual(
      record.identityFingerprint,
    );
  });
});

// ============================================================================
// VERIFICATION STATE TESTS
// ============================================================================

describe("Verification State", () => {
  it("creates initial verification state", () => {
    const state = createVerificationState("peer-123");

    expect(state.peerUserId).toBe("peer-123");
    expect(state.trustLevel).toBe("unknown");
    expect(state.currentVerification).toBeNull();
    expect(state.verificationHistory).toEqual([]);
    expect(state.keyChangeHistory).toEqual([]);
    expect(state.currentFingerprint).toBeNull();
    expect(state.lastUpdated).toBeGreaterThan(0);
  });

  it("updates state with verification", () => {
    const state = createVerificationState("peer-123");
    const key = generateRandomBytes(32);
    const record = createVerificationRecord(
      "peer-123",
      key,
      "123456789012345678901234567890123456789012345678901234567890",
      "numeric_comparison",
    );

    const updated = updateVerificationState(state, record);

    expect(updated.trustLevel).toBe("verified");
    expect(updated.currentVerification).toEqual(record);
    expect(updated.currentFingerprint).toEqual(record.identityFingerprint);
    expect(updated.lastUpdated).toBeGreaterThanOrEqual(state.lastUpdated);
  });

  it("preserves previous verification in history", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);

    const record1 = createVerificationRecord(
      "peer-123",
      key1,
      "123456789012345678901234567890123456789012345678901234567890",
      "numeric_comparison",
    );

    const record2 = createVerificationRecord(
      "peer-123",
      key2,
      "098765432109876543210987654321098765432109876543210987654321",
      "qr_code_scan",
    );

    let state = createVerificationState("peer-123");
    state = updateVerificationState(state, record1);
    state = updateVerificationState(state, record2);

    expect(state.currentVerification).toEqual(record2);
    expect(state.verificationHistory).toContainEqual(record1);
  });

  it("handles key change in state", () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const localKey = generateRandomBytes(32);

    const record = createVerificationRecord(
      "peer-123",
      key1,
      "123456789012345678901234567890123456789012345678901234567890",
      "in_person",
    );

    let state = createVerificationState("peer-123");
    state = updateVerificationState(state, record);

    expect(state.trustLevel).toBe("verified");

    const keyChange = createKeyChangeEvent(
      "peer-123",
      key1,
      key2,
      "local-user",
      localKey,
      true,
    );

    state = handleKeyChangeInState(state, keyChange);

    expect(state.trustLevel).toBe("unverified");
    expect(state.currentVerification?.isValid).toBe(false);
    expect(state.keyChangeHistory).toContainEqual(keyChange);
  });

  it("serializes and deserializes verification state", () => {
    const key = generateRandomBytes(32);
    const record = createVerificationRecord(
      "peer-123",
      key,
      "123456789012345678901234567890123456789012345678901234567890",
      "video_call",
    );

    let state = createVerificationState("peer-123");
    state = updateVerificationState(state, record);

    const serialized = serializeVerificationState(state);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeVerificationState(serialized);

    expect(deserialized.peerUserId).toBe(state.peerUserId);
    expect(deserialized.trustLevel).toBe(state.trustLevel);
    expect(deserialized.currentVerification?.safetyNumber).toBe(
      record.safetyNumber,
    );
    expect(deserialized.currentFingerprint).toEqual(state.currentFingerprint);
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe("Edge Cases", () => {
  it("handles empty user IDs", () => {
    const key = generateRandomBytes(32);

    const result = generateSafetyNumber({
      localIdentityKey: key,
      localUserId: "",
      peerIdentityKey: key,
      peerUserId: "",
    });

    expect(result.raw).toHaveLength(60);
  });

  it("handles very long user IDs", () => {
    const key = generateRandomBytes(32);
    const longId = "x".repeat(1000);

    const result = generateSafetyNumber({
      localIdentityKey: key,
      localUserId: longId,
      peerIdentityKey: key,
      peerUserId: longId,
    });

    expect(result.raw).toHaveLength(60);
  });

  it("handles special characters in user IDs", () => {
    const key = generateRandomBytes(32);
    const specialId = "user@domain.com!#$%";

    const result = generateSafetyNumber({
      localIdentityKey: key,
      localUserId: specialId,
      peerIdentityKey: key,
      peerUserId: "normal-user",
    });

    expect(result.raw).toHaveLength(60);
  });

  it("handles unicode in user IDs", () => {
    const key = generateRandomBytes(32);
    const unicodeId = "用户名";

    const result = generateSafetyNumber({
      localIdentityKey: key,
      localUserId: unicodeId,
      peerIdentityKey: key,
      peerUserId: "other-user",
    });

    expect(result.raw).toHaveLength(60);
  });
});
