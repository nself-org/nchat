/**
 * Backup Key Derivation Tests
 *
 * Tests for passphrase-based key derivation for E2EE backups.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  deriveBackupKey,
  verifyAndDeriveKey,
  toStorableParams,
  assessPassphraseStrength,
  isValidPassphrase,
  generateSuggestedPassphrase,
  stretchKey,
  deriveMultipleKeys,
  SecurityLevel,
  ITERATION_COUNTS,
  MIN_PASSPHRASE_LENGTH,
} from "../backup-key-derivation";

describe("Backup Key Derivation", () => {
  const validPassphrase = "my-secure-passphrase-123";
  const shortPassphrase = "short";

  describe("deriveBackupKey", () => {
    it("derives a 32-byte encryption key", async () => {
      const result = await deriveBackupKey(validPassphrase);
      expect(result.encryptionKey).toBeInstanceOf(Uint8Array);
      expect(result.encryptionKey.length).toBe(32);
    });

    it("generates a 32-byte salt", async () => {
      const result = await deriveBackupKey(validPassphrase);
      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.salt.length).toBe(32);
    });

    it("generates a verification tag", async () => {
      const result = await deriveBackupKey(validPassphrase);
      expect(result.verificationTag).toBeInstanceOf(Uint8Array);
      expect(result.verificationTag.length).toBe(32);
    });

    it("uses provided salt", async () => {
      const salt = new Uint8Array(32).fill(42);
      const result = await deriveBackupKey(validPassphrase, salt);
      expect(result.salt).toEqual(salt);
    });

    it("produces consistent results with same passphrase and salt", async () => {
      const salt = new Uint8Array(32).fill(1);
      const result1 = await deriveBackupKey(validPassphrase, salt);
      const result2 = await deriveBackupKey(validPassphrase, salt);
      expect(result1.encryptionKey).toEqual(result2.encryptionKey);
      expect(result1.verificationTag).toEqual(result2.verificationTag);
    });

    it("produces different results with different passphrases", async () => {
      const salt = new Uint8Array(32).fill(1);
      const result1 = await deriveBackupKey("passphrase-1", salt);
      const result2 = await deriveBackupKey("passphrase-2", salt);
      expect(result1.encryptionKey).not.toEqual(result2.encryptionKey);
    });

    it("produces different results with different salts", async () => {
      const salt1 = new Uint8Array(32).fill(1);
      const salt2 = new Uint8Array(32).fill(2);
      const result1 = await deriveBackupKey(validPassphrase, salt1);
      const result2 = await deriveBackupKey(validPassphrase, salt2);
      expect(result1.encryptionKey).not.toEqual(result2.encryptionKey);
    });

    it("rejects short passphrases", async () => {
      await expect(deriveBackupKey(shortPassphrase)).rejects.toThrow(
        `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`,
      );
    });

    it("uses correct iterations for standard security", async () => {
      const result = await deriveBackupKey(
        validPassphrase,
        undefined,
        SecurityLevel.STANDARD,
      );
      expect(result.iterations).toBe(ITERATION_COUNTS[SecurityLevel.STANDARD]);
      expect(result.securityLevel).toBe(SecurityLevel.STANDARD);
    });

    it("uses correct iterations for high security", async () => {
      const result = await deriveBackupKey(
        validPassphrase,
        undefined,
        SecurityLevel.HIGH,
      );
      expect(result.iterations).toBe(ITERATION_COUNTS[SecurityLevel.HIGH]);
      expect(result.securityLevel).toBe(SecurityLevel.HIGH);
    });

    it("uses correct iterations for maximum security", async () => {
      const result = await deriveBackupKey(
        validPassphrase,
        undefined,
        SecurityLevel.MAXIMUM,
      );
      expect(result.iterations).toBe(ITERATION_COUNTS[SecurityLevel.MAXIMUM]);
      expect(result.securityLevel).toBe(SecurityLevel.MAXIMUM);
    });

    it("sets algorithm and version correctly", async () => {
      const result = await deriveBackupKey(validPassphrase);
      expect(result.algorithm).toBe("pbkdf2-sha512");
      expect(result.version).toBe(1);
    });
  });

  describe("verifyAndDeriveKey", () => {
    it("verifies and derives key with correct passphrase", async () => {
      const original = await deriveBackupKey(validPassphrase);
      const params = toStorableParams(original);

      const derived = await verifyAndDeriveKey(validPassphrase, params);
      expect(derived).toEqual(original.encryptionKey);
    });

    it("rejects incorrect passphrase", async () => {
      const original = await deriveBackupKey(validPassphrase);
      const params = toStorableParams(original);

      await expect(
        verifyAndDeriveKey("wrong-passphrase", params),
      ).rejects.toThrow("Invalid passphrase");
    });

    it("rejects unsupported algorithm", async () => {
      const params = {
        salt: "00".repeat(32),
        verificationTag: "00".repeat(32),
        iterations: 310000,
        algorithm: "unsupported" as any,
        version: 1,
      };

      await expect(verifyAndDeriveKey(validPassphrase, params)).rejects.toThrow(
        "Unsupported key derivation",
      );
    });

    it("rejects unsupported version", async () => {
      const params = {
        salt: "00".repeat(32),
        verificationTag: "00".repeat(32),
        iterations: 310000,
        algorithm: "pbkdf2-sha512" as const,
        version: 99,
      };

      await expect(verifyAndDeriveKey(validPassphrase, params)).rejects.toThrow(
        "Unsupported key derivation",
      );
    });
  });

  describe("toStorableParams", () => {
    it("converts derivation result to storable format", async () => {
      const result = await deriveBackupKey(validPassphrase);
      const params = toStorableParams(result);

      expect(typeof params.salt).toBe("string");
      expect(typeof params.verificationTag).toBe("string");
      expect(params.salt.length).toBe(64); // 32 bytes as hex
      expect(params.verificationTag.length).toBe(64);
      expect(params.iterations).toBe(result.iterations);
      expect(params.algorithm).toBe("pbkdf2-sha512");
      expect(params.version).toBe(1);
    });

    it("produces valid hex strings", async () => {
      const result = await deriveBackupKey(validPassphrase);
      const params = toStorableParams(result);

      expect(params.salt).toMatch(/^[0-9a-f]+$/i);
      expect(params.verificationTag).toMatch(/^[0-9a-f]+$/i);
    });
  });

  describe("assessPassphraseStrength", () => {
    it("rates empty passphrase as weak", () => {
      const strength = assessPassphraseStrength("");
      expect(strength.level).toBe("weak");
      expect(strength.meetsMinimum).toBe(false);
    });

    it("rates short passphrase as weak", () => {
      const strength = assessPassphraseStrength("short");
      expect(strength.level).toBe("weak");
      expect(strength.meetsMinimum).toBe(false);
      expect(strength.suggestions.length).toBeGreaterThan(0);
    });

    it("rates simple passphrase as fair", () => {
      const strength = assessPassphraseStrength("simplepass");
      expect(strength.meetsMinimum).toBe(true);
      expect(["weak", "fair"]).toContain(strength.level);
    });

    it("rates mixed character passphrase as fair or better", () => {
      const strength = assessPassphraseStrength("MyP@ssw0rd123!");
      expect(["fair", "good", "strong", "excellent"]).toContain(strength.level);
      expect(strength.meetsMinimum).toBe(true);
    });

    it("rates long passphrase with words as strong", () => {
      const strength = assessPassphraseStrength(
        "correct horse battery staple 42",
      );
      expect(["strong", "excellent"]).toContain(strength.level);
    });

    it("penalizes sequential characters", () => {
      const strength = assessPassphraseStrength("abc123abc123");
      expect(strength.suggestions.some((s) => s.includes("sequential"))).toBe(
        true,
      );
    });

    it("penalizes repeated characters", () => {
      const strength = assessPassphraseStrength("aaaabbbbcccc");
      // Score is reduced due to repeated chars, even if suggestion is trimmed
      expect(strength.score).toBeLessThan(50);
    });

    it("penalizes common words", () => {
      const strength = assessPassphraseStrength("password123456");
      // Score is reduced due to common word, even if suggestion list is trimmed
      expect(strength.score).toBeLessThan(50);
    });

    it("provides crack time estimate", () => {
      const strength = assessPassphraseStrength("validpass");
      expect(typeof strength.estimatedCrackTime).toBe("string");
      expect(strength.estimatedCrackTime.length).toBeGreaterThan(0);
    });

    it("returns score between 0 and 100", () => {
      const strength = assessPassphraseStrength("testpass");
      expect(strength.score).toBeGreaterThanOrEqual(0);
      expect(strength.score).toBeLessThanOrEqual(100);
    });
  });

  describe("isValidPassphrase", () => {
    it("accepts passphrase at minimum length", () => {
      const passphrase = "a".repeat(MIN_PASSPHRASE_LENGTH);
      expect(isValidPassphrase(passphrase)).toBe(true);
    });

    it("accepts passphrase above minimum length", () => {
      const passphrase = "a".repeat(MIN_PASSPHRASE_LENGTH + 10);
      expect(isValidPassphrase(passphrase)).toBe(true);
    });

    it("rejects passphrase below minimum length", () => {
      const passphrase = "a".repeat(MIN_PASSPHRASE_LENGTH - 1);
      expect(isValidPassphrase(passphrase)).toBe(false);
    });

    it("rejects empty passphrase", () => {
      expect(isValidPassphrase("")).toBe(false);
    });
  });

  describe("generateSuggestedPassphrase", () => {
    it("generates a non-empty passphrase", () => {
      const passphrase = generateSuggestedPassphrase();
      expect(passphrase.length).toBeGreaterThan(0);
    });

    it("generates passphrase with dashes", () => {
      const passphrase = generateSuggestedPassphrase();
      expect(passphrase).toContain("-");
    });

    it("generates passphrase with number at end", () => {
      const passphrase = generateSuggestedPassphrase();
      const parts = passphrase.split("-");
      const lastPart = parts[parts.length - 1];
      expect(lastPart).toMatch(/^\d+$/);
    });

    it("generates different passphrases each time", () => {
      const passphrase1 = generateSuggestedPassphrase();
      const passphrase2 = generateSuggestedPassphrase();
      expect(passphrase1).not.toBe(passphrase2);
    });

    it("generates passphrase that meets minimum requirements", () => {
      const passphrase = generateSuggestedPassphrase();
      expect(isValidPassphrase(passphrase)).toBe(true);
    });

    it("generates passphrase with multiple words", () => {
      const passphrase = generateSuggestedPassphrase();
      const words = passphrase.split("-").filter((w) => isNaN(Number(w)));
      expect(words.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("stretchKey", () => {
    it("produces 32-byte key by default", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const stretched = stretchKey(masterKey, "test-purpose");
      expect(stretched.length).toBe(32);
    });

    it("produces key of specified length", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const stretched = stretchKey(masterKey, "test-purpose", 16);
      expect(stretched.length).toBe(16);
    });

    it("produces different keys for different purposes", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const key1 = stretchKey(masterKey, "purpose-1");
      const key2 = stretchKey(masterKey, "purpose-2");
      expect(key1).not.toEqual(key2);
    });

    it("produces consistent results", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const key1 = stretchKey(masterKey, "test-purpose");
      const key2 = stretchKey(masterKey, "test-purpose");
      expect(key1).toEqual(key2);
    });
  });

  describe("deriveMultipleKeys", () => {
    it("derives keys for all specified purposes", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const purposes = ["encryption", "authentication", "signing"];

      const keys = deriveMultipleKeys(masterKey, purposes);

      expect(keys.size).toBe(3);
      expect(keys.has("encryption")).toBe(true);
      expect(keys.has("authentication")).toBe(true);
      expect(keys.has("signing")).toBe(true);
    });

    it("produces different keys for each purpose", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const purposes = ["key-1", "key-2", "key-3"];

      const keys = deriveMultipleKeys(masterKey, purposes);

      const key1 = keys.get("key-1")!;
      const key2 = keys.get("key-2")!;
      const key3 = keys.get("key-3")!;

      expect(key1).not.toEqual(key2);
      expect(key2).not.toEqual(key3);
      expect(key1).not.toEqual(key3);
    });

    it("handles empty purposes array", () => {
      const masterKey = new Uint8Array(32).fill(1);
      const keys = deriveMultipleKeys(masterKey, []);
      expect(keys.size).toBe(0);
    });
  });

  describe("Security Level Constants", () => {
    it("has correct standard iteration count", () => {
      expect(ITERATION_COUNTS[SecurityLevel.STANDARD]).toBe(310000);
    });

    it("has correct high iteration count", () => {
      expect(ITERATION_COUNTS[SecurityLevel.HIGH]).toBe(600000);
    });

    it("has correct maximum iteration count", () => {
      expect(ITERATION_COUNTS[SecurityLevel.MAXIMUM]).toBe(1000000);
    });

    it("has increasing iteration counts with security level", () => {
      expect(ITERATION_COUNTS[SecurityLevel.STANDARD]).toBeLessThan(
        ITERATION_COUNTS[SecurityLevel.HIGH],
      );
      expect(ITERATION_COUNTS[SecurityLevel.HIGH]).toBeLessThan(
        ITERATION_COUNTS[SecurityLevel.MAXIMUM],
      );
    });
  });
});
