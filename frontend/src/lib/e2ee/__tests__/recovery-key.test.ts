/**
 * Recovery Key Tests
 *
 * Tests for recovery key generation, validation, and encryption.
 */

import { describe, it, expect } from "@jest/globals";
import {
  generateRecoveryKey,
  formatRecoveryKey,
  normalizeRecoveryKey,
  validateRecoveryKey,
  looksLikeRecoveryKey,
  encryptMasterKeyWithRecovery,
  decryptMasterKeyWithRecovery,
  createRecoveryKeyHash,
  verifyRecoveryKeyHash,
  checkRateLimit,
  recordVerificationAttempt,
  getRecoveryKeyGroups,
  getRecoveryPhraseStrength,
  maskRecoveryKey,
  createRecoveryKeyQR,
  parseRecoveryKeyQR,
  MAX_VERIFICATION_ATTEMPTS,
  LOCKOUT_DURATION_SECONDS,
  ATTEMPT_WINDOW_SECONDS,
  type VerificationAttempt,
} from "../recovery-key";

describe("Recovery Key", () => {
  describe("generateRecoveryKey", () => {
    it("generates a recovery key result", () => {
      const result = generateRecoveryKey();

      expect(result).toHaveProperty("displayKey");
      expect(result).toHaveProperty("rawKey");
      expect(result).toHaveProperty("keyBytes");
      expect(result).toHaveProperty("checksum");
      expect(result).toHaveProperty("createdAt");
    });

    it("generates 32-byte key bytes", () => {
      const result = generateRecoveryKey();
      expect(result.keyBytes).toBeInstanceOf(Uint8Array);
      expect(result.keyBytes.length).toBe(32);
    });

    it("generates 2-byte checksum", () => {
      const result = generateRecoveryKey();
      expect(result.checksum).toBeInstanceOf(Uint8Array);
      expect(result.checksum.length).toBe(2);
    });

    it("generates display key with dashes", () => {
      const result = generateRecoveryKey();
      expect(result.displayKey).toContain("-");
    });

    it("generates raw key without dashes", () => {
      const result = generateRecoveryKey();
      expect(result.rawKey).not.toContain("-");
      expect(result.rawKey).toMatch(/^[A-Z2-9]+$/);
    });

    it("generates different keys each time", () => {
      const result1 = generateRecoveryKey();
      const result2 = generateRecoveryKey();
      expect(result1.rawKey).not.toBe(result2.rawKey);
    });

    it("sets creation timestamp", () => {
      const before = Date.now();
      const result = generateRecoveryKey();
      const after = Date.now();

      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("formatRecoveryKey", () => {
    it("formats raw key with dashes", () => {
      const raw = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567891234";
      const formatted = formatRecoveryKey(raw);
      expect(formatted).toContain("-");
    });

    it("creates groups of 5 characters", () => {
      const result = generateRecoveryKey();
      const groups = result.displayKey.split("-");

      // All groups except last should be 5 chars
      for (let i = 0; i < groups.length - 1; i++) {
        expect(groups[i].length).toBe(5);
      }
    });

    it("normalizes to uppercase", () => {
      const formatted = formatRecoveryKey("abcdefghijk");
      expect(formatted).toBe(formatted.toUpperCase());
    });

    it("removes existing dashes before formatting", () => {
      const formatted = formatRecoveryKey("ABC-DEF-GHI-JKL");
      expect(formatted.replace(/-/g, "")).toBe("ABCDEFGHIJKL");
    });
  });

  describe("normalizeRecoveryKey", () => {
    it("converts to uppercase", () => {
      const normalized = normalizeRecoveryKey("abcdef");
      expect(normalized).toBe("ABCDEF");
    });

    it("removes dashes", () => {
      const normalized = normalizeRecoveryKey("ABC-DEF-GHI");
      expect(normalized).toBe("ABCDEFGHI");
    });

    it("removes spaces", () => {
      const normalized = normalizeRecoveryKey("ABC DEF GHI");
      expect(normalized).toBe("ABCDEFGHI");
    });

    it("handles mixed formatting", () => {
      const normalized = normalizeRecoveryKey("abc-def ghi-JKL");
      expect(normalized).toBe("ABCDEFGHIJKL");
    });
  });

  describe("validateRecoveryKey", () => {
    it("validates a generated recovery key", () => {
      const result = generateRecoveryKey();
      const validation = validateRecoveryKey(result.displayKey);

      expect(validation.valid).toBe(true);
      expect(validation.normalizedKey).toBeDefined();
      expect(validation.keyBytes).toBeDefined();
    });

    it("validates raw key format", () => {
      const result = generateRecoveryKey();
      const validation = validateRecoveryKey(result.rawKey);

      expect(validation.valid).toBe(true);
    });

    it("rejects invalid length", () => {
      const validation = validateRecoveryKey("ABC");

      expect(validation.valid).toBe(false);
      // Error message may vary
      expect(validation.error).toBeDefined();
    });

    it("rejects invalid characters", () => {
      // Create a string with valid length but invalid chars - '0', '1', 'I', 'O', 'L' not in alphabet
      const invalidKey = "0".repeat(55); // '0' is not in alphabet
      const validation = validateRecoveryKey(invalidKey);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it("rejects modified checksum", () => {
      const result = generateRecoveryKey();
      // Modify multiple characters in the middle (part of entropy/checksum)
      const chars = result.rawKey.split("");
      // Rotate each character by several positions to ensure change
      for (let i = 10; i < 15; i++) {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const currentIdx = alphabet.indexOf(chars[i]);
        chars[i] = alphabet[(currentIdx + 5) % alphabet.length];
      }
      const modified = chars.join("");

      const validation = validateRecoveryKey(modified);
      // Modified key should fail checksum verification
      expect(validation.valid).toBe(false);
    });

    it("returns key bytes for valid key", () => {
      const result = generateRecoveryKey();
      const validation = validateRecoveryKey(result.rawKey);

      expect(validation.keyBytes).toEqual(result.keyBytes);
    });
  });

  describe("looksLikeRecoveryKey", () => {
    it("returns true for valid format", () => {
      const result = generateRecoveryKey();
      expect(looksLikeRecoveryKey(result.rawKey)).toBe(true);
    });

    it("returns true for formatted key", () => {
      const result = generateRecoveryKey();
      expect(looksLikeRecoveryKey(result.displayKey)).toBe(true);
    });

    it("returns false for wrong length", () => {
      expect(looksLikeRecoveryKey("ABC")).toBe(false);
    });

    it("returns false for invalid characters", () => {
      expect(looksLikeRecoveryKey("0".repeat(44))).toBe(false);
    });
  });

  describe("encryptMasterKeyWithRecovery", () => {
    it("encrypts master key with recovery key", async () => {
      const masterKey = new Uint8Array(32).fill(42);
      const recoveryKey = generateRecoveryKey();

      const encrypted = await encryptMasterKeyWithRecovery(
        masterKey,
        recoveryKey.keyBytes,
      );

      expect(encrypted.encryptedKey).toBeDefined();
      expect(encrypted.recoveryKeyHash).toBeDefined();
      expect(encrypted.version).toBe(1);
      expect(encrypted.createdAt).toBeGreaterThan(0);
    });

    it("produces base64 encrypted key", async () => {
      const masterKey = new Uint8Array(32).fill(42);
      const recoveryKey = generateRecoveryKey();

      const encrypted = await encryptMasterKeyWithRecovery(
        masterKey,
        recoveryKey.keyBytes,
      );

      expect(() => atob(encrypted.encryptedKey)).not.toThrow();
    });

    it("produces hex recovery key hash", async () => {
      const masterKey = new Uint8Array(32).fill(42);
      const recoveryKey = generateRecoveryKey();

      const encrypted = await encryptMasterKeyWithRecovery(
        masterKey,
        recoveryKey.keyBytes,
      );

      expect(encrypted.recoveryKeyHash).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe("decryptMasterKeyWithRecovery", () => {
    it("decrypts master key with correct recovery key", async () => {
      const masterKey = new Uint8Array(32).fill(42);
      const recoveryKey = generateRecoveryKey();

      const encrypted = await encryptMasterKeyWithRecovery(
        masterKey,
        recoveryKey.keyBytes,
      );
      const decrypted = await decryptMasterKeyWithRecovery(
        encrypted,
        recoveryKey.keyBytes,
      );

      expect(decrypted).toEqual(masterKey);
    });

    it("rejects wrong recovery key", async () => {
      const masterKey = new Uint8Array(32).fill(42);
      const recoveryKey = generateRecoveryKey();
      const wrongRecoveryKey = generateRecoveryKey();

      const encrypted = await encryptMasterKeyWithRecovery(
        masterKey,
        recoveryKey.keyBytes,
      );

      await expect(
        decryptMasterKeyWithRecovery(encrypted, wrongRecoveryKey.keyBytes),
      ).rejects.toThrow("Invalid recovery key");
    });
  });

  describe("createRecoveryKeyHash / verifyRecoveryKeyHash", () => {
    it("creates hex hash", () => {
      const recoveryKey = generateRecoveryKey();
      const hash = createRecoveryKeyHash(recoveryKey.keyBytes);

      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it("creates consistent hash", () => {
      const recoveryKey = generateRecoveryKey();
      const hash1 = createRecoveryKeyHash(recoveryKey.keyBytes);
      const hash2 = createRecoveryKeyHash(recoveryKey.keyBytes);

      expect(hash1).toBe(hash2);
    });

    it("verifies correct recovery key", () => {
      const recoveryKey = generateRecoveryKey();
      const hash = createRecoveryKeyHash(recoveryKey.keyBytes);

      expect(verifyRecoveryKeyHash(recoveryKey.keyBytes, hash)).toBe(true);
    });

    it("rejects wrong recovery key", () => {
      const recoveryKey1 = generateRecoveryKey();
      const recoveryKey2 = generateRecoveryKey();
      const hash = createRecoveryKeyHash(recoveryKey1.keyBytes);

      expect(verifyRecoveryKeyHash(recoveryKey2.keyBytes, hash)).toBe(false);
    });
  });

  describe("checkRateLimit", () => {
    it("allows first attempt", () => {
      const result = checkRateLimit([]);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(MAX_VERIFICATION_ATTEMPTS);
    });

    it("counts failed attempts", () => {
      const attempts: VerificationAttempt[] = [
        { timestamp: Date.now(), success: false },
        { timestamp: Date.now(), success: false },
      ];

      const result = checkRateLimit(attempts);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(MAX_VERIFICATION_ATTEMPTS - 2);
    });

    it("does not count successful attempts", () => {
      const attempts: VerificationAttempt[] = [
        { timestamp: Date.now(), success: true },
        { timestamp: Date.now(), success: true },
      ];

      const result = checkRateLimit(attempts);

      expect(result.remainingAttempts).toBe(MAX_VERIFICATION_ATTEMPTS);
    });

    it("blocks after max attempts", () => {
      const now = Date.now();
      const attempts: VerificationAttempt[] = Array(MAX_VERIFICATION_ATTEMPTS)
        .fill(null)
        .map(() => ({ timestamp: now, success: false }));

      const result = checkRateLimit(attempts);

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.waitSeconds).toBeGreaterThan(0);
    });

    it("ignores old attempts", () => {
      const oldTime = Date.now() - (ATTEMPT_WINDOW_SECONDS + 10) * 1000;
      const attempts: VerificationAttempt[] = Array(MAX_VERIFICATION_ATTEMPTS)
        .fill(null)
        .map(() => ({ timestamp: oldTime, success: false }));

      const result = checkRateLimit(attempts);

      expect(result.allowed).toBe(true);
    });
  });

  describe("recordVerificationAttempt", () => {
    it("adds new attempt", () => {
      const attempts: VerificationAttempt[] = [];
      const updated = recordVerificationAttempt(attempts, false);

      expect(updated.length).toBe(1);
      expect(updated[0].success).toBe(false);
    });

    it("preserves existing recent attempts", () => {
      const now = Date.now();
      const attempts: VerificationAttempt[] = [
        { timestamp: now, success: false },
      ];

      const updated = recordVerificationAttempt(attempts, true);

      expect(updated.length).toBe(2);
    });

    it("records source identifier", () => {
      const updated = recordVerificationAttempt([], false, "device-123");

      expect(updated[0].source).toBe("device-123");
    });

    it("removes very old attempts", () => {
      const veryOld = Date.now() - (LOCKOUT_DURATION_SECONDS + 100) * 1000;
      const attempts: VerificationAttempt[] = [
        { timestamp: veryOld, success: false },
      ];

      const updated = recordVerificationAttempt(attempts, false);

      expect(updated.length).toBe(1);
      expect(updated[0].timestamp).toBeGreaterThan(veryOld);
    });
  });

  describe("getRecoveryKeyGroups", () => {
    it("splits display key into groups", () => {
      const result = generateRecoveryKey();
      const groups = getRecoveryKeyGroups(result.displayKey);

      expect(Array.isArray(groups)).toBe(true);
      // 34 bytes = 55 chars when base32 encoded, which is 11 groups of 5
      expect(groups.length).toBeGreaterThanOrEqual(8);
    });

    it("returns expected group sizes", () => {
      const result = generateRecoveryKey();
      const groups = getRecoveryKeyGroups(result.displayKey);

      // All groups should be 5 chars
      for (const group of groups) {
        expect(group.length).toBe(5);
      }
    });
  });

  describe("getRecoveryPhraseStrength", () => {
    it("returns 0 for empty phrase", () => {
      expect(getRecoveryPhraseStrength("")).toBe(0);
    });

    it("increases strength with length", () => {
      const short = getRecoveryPhraseStrength("short");
      const long = getRecoveryPhraseStrength("this is a much longer phrase");

      expect(long).toBeGreaterThan(short);
    });

    it("increases strength with character variety", () => {
      const simple = getRecoveryPhraseStrength("onlylowercase");
      const complex = getRecoveryPhraseStrength("Mix3d&Complex!");

      expect(complex).toBeGreaterThan(simple);
    });

    it("returns max of 4", () => {
      const strength = getRecoveryPhraseStrength(
        "Very-Complex-P@ssphrase-123!",
      );
      expect(strength).toBeLessThanOrEqual(4);
    });
  });

  describe("maskRecoveryKey", () => {
    it("masks middle groups", () => {
      const result = generateRecoveryKey();
      const masked = maskRecoveryKey(result.displayKey);

      expect(masked).toContain("*****");
    });

    it("shows first and last groups by default", () => {
      const result = generateRecoveryKey();
      const masked = maskRecoveryKey(result.displayKey);
      const groups = result.displayKey.split("-");

      expect(masked).toContain(groups[0]);
      expect(masked).toContain(groups[1]);
      expect(masked).toContain(groups[groups.length - 2]);
      expect(masked).toContain(groups[groups.length - 1]);
    });

    it("respects visible groups parameter", () => {
      const result = generateRecoveryKey();
      const masked = maskRecoveryKey(result.displayKey, 1);
      const groups = result.displayKey.split("-");

      // Should show first and last 1 group each
      expect(masked).toContain(groups[0]);
      expect(masked).toContain(groups[groups.length - 1]);
    });

    it("does not mask if all groups visible", () => {
      const result = generateRecoveryKey();
      const masked = maskRecoveryKey(result.displayKey, 10);

      expect(masked).toBe(result.displayKey);
    });
  });

  describe("createRecoveryKeyQR / parseRecoveryKeyQR", () => {
    it("creates QR data", () => {
      const result = generateRecoveryKey();
      const qrData = createRecoveryKeyQR(result, "user-123");

      expect(typeof qrData).toBe("string");
      expect(() => JSON.parse(qrData)).not.toThrow();
    });

    it("includes type and version", () => {
      const result = generateRecoveryKey();
      const qrData = createRecoveryKeyQR(result, "user-123");
      const parsed = JSON.parse(qrData);

      expect(parsed.type).toBe("nchat-recovery-key");
      expect(parsed.version).toBe(1);
    });

    it("includes userId and key", () => {
      const result = generateRecoveryKey();
      const qrData = createRecoveryKeyQR(result, "user-123");
      const parsed = JSON.parse(qrData);

      expect(parsed.userId).toBe("user-123");
      expect(parsed.key).toBe(result.rawKey);
    });

    it("parses QR data correctly", () => {
      const result = generateRecoveryKey();
      const qrData = createRecoveryKeyQR(result, "user-123");
      const parsed = parseRecoveryKeyQR(qrData);

      expect(parsed).not.toBeNull();
      expect(parsed?.userId).toBe("user-123");
      expect(parsed?.recoveryKey).toBe(result.rawKey);
    });

    it("returns null for invalid QR data", () => {
      expect(parseRecoveryKeyQR("not json")).toBeNull();
      expect(parseRecoveryKeyQR("{}")).toBeNull();
      expect(parseRecoveryKeyQR('{"type": "wrong"}')).toBeNull();
    });
  });
});
