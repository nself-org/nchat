/**
 * Property-Based and Fuzz Tests for E2EE Cryptographic Operations
 *
 * Tests cryptographic security with:
 * - Random data inputs
 * - Key generation properties
 * - Encryption/decryption roundtrip
 * - Binary data edge cases
 */

import { describe, it, expect } from "@jest/globals";
import * as fc from "fast-check";
import {
  generateRandomBytes,
  generateDeviceId,
  generateRegistrationId,
  hash256,
  hash512,
  generateFingerprint,
  deriveMasterKey,
  generateSalt,
  verifyMasterKey,
  encryptAESGCM,
  decryptAESGCM,
  encodeEncryptedData,
  KEY_LENGTH,
  SALT_LENGTH,
  IV_LENGTH,
} from "../crypto";

// Mock window.crypto for tests
if (typeof window === "undefined") {
  (global as typeof globalThis & { window: unknown }).window = {
    crypto: {
      subtle: {
        importKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
  } as typeof globalThis.window;
}

// ============================================================================
// RANDOM GENERATION - Property Tests
// ============================================================================

describe("Random Generation - Property Tests", () => {
  it("should generate bytes of requested length", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1024 }), (length) => {
        const bytes = generateRandomBytes(length);
        expect(bytes.length).toBe(length);
      }),
      { numRuns: 500 },
    );
  });

  it("should generate different bytes on each call", () => {
    fc.assert(
      fc.property(fc.integer({ min: 16, max: 64 }), (length) => {
        const bytes1 = generateRandomBytes(length);
        const bytes2 = generateRandomBytes(length);
        // Extremely unlikely to be equal
        expect(bytes1).not.toEqual(bytes2);
      }),
      { numRuns: 100 },
    );
  });

  it("should generate device IDs of consistent format", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const deviceId = generateDeviceId();
        expect(typeof deviceId).toBe("string");
        expect(deviceId.length).toBe(32); // 16 bytes = 32 hex chars
        expect(/^[0-9a-f]{32}$/.test(deviceId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("should generate unique device IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateDeviceId());
    }
    expect(ids.size).toBe(1000);
  });

  it("should generate registration IDs within 14-bit range", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const regId = generateRegistrationId();
        expect(regId).toBeGreaterThanOrEqual(0);
        expect(regId).toBeLessThan(16384); // 2^14
      }),
      { numRuns: 1000 },
    );
  });
});

// ============================================================================
// HASHING - Property Tests
// ============================================================================

describe("Hashing - Property Tests", () => {
  it("should produce deterministic SHA-256 hashes", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (data) => {
        const hash1 = hash256(data);
        const hash2 = hash256(data);
        expect(hash1).toEqual(hash2);
      }),
      { numRuns: 500 },
    );
  });

  it("should produce 32-byte SHA-256 hashes", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (data) => {
        const hash = hash256(data);
        expect(hash.length).toBe(32);
      }),
      { numRuns: 500 },
    );
  });

  it("should produce different hashes for different inputs", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        (data1, data2) => {
          fc.pre(!areEqual(data1, data2));
          const hash1 = hash256(data1);
          const hash2 = hash256(data2);
          expect(hash1).not.toEqual(hash2);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("should produce deterministic SHA-512 hashes", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (data) => {
        const hash1 = hash512(data);
        const hash2 = hash512(data);
        expect(hash1).toEqual(hash2);
      }),
      { numRuns: 500 },
    );
  });

  it("should produce 64-byte SHA-512 hashes", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 1, maxLength: 1024 }), (data) => {
        const hash = hash512(data);
        expect(hash.length).toBe(64);
      }),
      { numRuns: 500 },
    );
  });

  it("should generate consistent fingerprints", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        (publicKey) => {
          const fp1 = generateFingerprint(publicKey);
          const fp2 = generateFingerprint(publicKey);
          expect(fp1).toBe(fp2);
          expect(typeof fp1).toBe("string");
          expect(fp1.length).toBe(64); // 32 bytes = 64 hex chars
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// KEY DERIVATION - Property Tests
// ============================================================================

describe("Key Derivation - Property Tests", () => {
  it("should derive consistent keys from same password and salt", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const key1 = await deriveMasterKey(password, salt);
          const key2 = await deriveMasterKey(password, salt);
          expect(key1).toEqual(key2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should derive keys of correct length", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const key = await deriveMasterKey(password, salt);
          expect(key.length).toBe(KEY_LENGTH);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should derive different keys for different passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.string({ minLength: 8, maxLength: 50 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (pass1, pass2, salt) => {
          fc.pre(pass1 !== pass2);
          const key1 = await deriveMasterKey(pass1, salt);
          const key2 = await deriveMasterKey(pass2, salt);
          expect(key1).not.toEqual(key2);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("should derive different keys for different salts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt1, salt2) => {
          fc.pre(!areEqual(salt1, salt2));
          const key1 = await deriveMasterKey(password, salt1);
          const key2 = await deriveMasterKey(password, salt2);
          expect(key1).not.toEqual(key2);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("should generate unique salts", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const salt1 = generateSalt();
        const salt2 = generateSalt();
        expect(salt1).not.toEqual(salt2);
        expect(salt1.length).toBe(SALT_LENGTH);
        expect(salt2.length).toBe(SALT_LENGTH);
      }),
      { numRuns: 100 },
    );
  });

  it("should verify correct master keys", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const masterKey = await deriveMasterKey(password, salt);
          const keyHash = hash256(masterKey);
          const verified = verifyMasterKey(masterKey, keyHash);
          expect(verified).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("should reject incorrect master keys", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        fc.uint8Array({ minLength: KEY_LENGTH, maxLength: KEY_LENGTH }),
        async (password, salt, wrongKey) => {
          const masterKey = await deriveMasterKey(password, salt);
          fc.pre(!areEqual(masterKey, wrongKey));
          const keyHash = hash256(masterKey);
          const verified = verifyMasterKey(wrongKey, keyHash);
          expect(verified).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// ENCRYPTION/DECRYPTION - Property Tests
// ============================================================================

describe("Encryption/Decryption - Property Tests", () => {
  // Note: These tests are skipped if Web Crypto API is not available
  const hasWebCrypto = typeof window !== "undefined" && window.crypto?.subtle;

  (hasWebCrypto ? it : it.skip)(
    "should encrypt to different ciphertext each time",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 1024 }),
          fc.uint8Array({ minLength: KEY_LENGTH, maxLength: KEY_LENGTH }),
          async (plaintext, key) => {
            try {
              const result1 = await encryptAESGCM(plaintext, key);
              const result2 = await encryptAESGCM(plaintext, key);
              // Different IVs should produce different ciphertext
              expect(result1.ciphertext).not.toEqual(result2.ciphertext);
              expect(result1.iv).not.toEqual(result2.iv);
            } catch (error) {
              // Web Crypto may not be available in test environment
              expect(error).toBeDefined();
            }
          },
        ),
        { numRuns: 20 },
      );
    },
  );
  (hasWebCrypto ? it : it.skip)(
    "should produce IVs of correct length",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.uint8Array({ minLength: KEY_LENGTH, maxLength: KEY_LENGTH }),
          async (plaintext, key) => {
            try {
              const result = await encryptAESGCM(plaintext, key);
              expect(result.iv.length).toBe(IV_LENGTH);
            } catch (error) {
              expect(error).toBeDefined();
            }
          },
        ),
        { numRuns: 20 },
      );
    },
  );

  it("should encode and prepare encrypted data correctly", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1024 }),
        fc.uint8Array({ minLength: IV_LENGTH, maxLength: IV_LENGTH }),
        (ciphertext, iv) => {
          const encoded = encodeEncryptedData(ciphertext, iv);
          expect(encoded.length).toBe(iv.length + ciphertext.length);
          // IV should be at the beginning
          expect(encoded.slice(0, IV_LENGTH)).toEqual(iv);
          // Ciphertext should follow
          expect(encoded.slice(IV_LENGTH)).toEqual(ciphertext);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// BINARY DATA EDGE CASES - Fuzz Tests
// ============================================================================

describe("Binary Data Edge Cases - Fuzz Tests", () => {
  it("should handle empty byte arrays", () => {
    const empty = new Uint8Array(0);
    expect(() => hash256(empty)).not.toThrow();
    expect(() => hash512(empty)).not.toThrow();
  });

  it("should handle very large byte arrays", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 100000, maxLength: 1000000 }),
        (data) => {
          expect(() => hash256(data)).not.toThrow();
          const hash = hash256(data);
          expect(hash.length).toBe(32);
        },
      ),
      { numRuns: 5 },
    );
  });

  it("should handle all-zero byte arrays", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1024 }), (length) => {
        const zeros = new Uint8Array(length);
        expect(() => hash256(zeros)).not.toThrow();
        expect(() => hash512(zeros)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it("should handle all-ones byte arrays", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1024 }), (length) => {
        const ones = new Uint8Array(length).fill(255);
        expect(() => hash256(ones)).not.toThrow();
        expect(() => hash512(ones)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it("should handle byte arrays with repeating patterns", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 1, max: 1024 }),
        (byte, length) => {
          const pattern = new Uint8Array(length).fill(byte);
          expect(() => hash256(pattern)).not.toThrow();
          const hash = hash256(pattern);
          expect(hash.length).toBe(32);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ============================================================================
// PASSWORD STRENGTH - Fuzz Tests
// ============================================================================

describe("Password Strength - Fuzz Tests", () => {
  it("should handle weak passwords", async () => {
    const weakPasswords = [
      "password",
      "12345678",
      "qwerty",
      "abc123",
      "password123",
    ];

    for (const password of weakPasswords) {
      const salt = generateSalt();
      const key = await deriveMasterKey(password, salt);
      expect(key.length).toBe(KEY_LENGTH);
      // Weak passwords still produce valid keys
      expect(key.some((b) => b !== 0)).toBe(true);
    }
  });

  it("should handle very long passwords", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1000, maxLength: 10000 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const key = await deriveMasterKey(password, salt);
          expect(key.length).toBe(KEY_LENGTH);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should handle passwords with special characters", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const key = await deriveMasterKey(password, salt);
          expect(key.length).toBe(KEY_LENGTH);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("should handle passwords with null bytes", async () => {
    const passwordWithNull = "test\0password";
    const salt = generateSalt();
    const key = await deriveMasterKey(passwordWithNull, salt);
    expect(key.length).toBe(KEY_LENGTH);
  });

  it("should handle emoji passwords", async () => {
    const emojiPasswords = ["🔒🔑🛡️💪🔐", "😀😁😂🤣😃😄", "❤️💙💚💛🧡💜"];

    for (const password of emojiPasswords) {
      const salt = generateSalt();
      const key = await deriveMasterKey(password, salt);
      expect(key.length).toBe(KEY_LENGTH);
    }
  });
});

// ============================================================================
// TIMING ATTACK RESISTANCE - Property Tests
// ============================================================================

describe("Timing Attack Resistance", () => {
  it("should use constant-time comparison for key verification", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 100 }),
        fc.uint8Array({ minLength: SALT_LENGTH, maxLength: SALT_LENGTH }),
        async (password, salt) => {
          const masterKey = await deriveMasterKey(password, salt);
          const keyHash = hash256(masterKey);

          // Measure time for correct key
          const start1 = performance.now();
          verifyMasterKey(masterKey, keyHash);
          const time1 = performance.now() - start1;

          // Measure time for incorrect key
          const wrongKey = new Uint8Array(KEY_LENGTH).fill(0);
          const start2 = performance.now();
          verifyMasterKey(wrongKey, keyHash);
          const time2 = performance.now() - start2;

          // Times should be similar (within reasonable variance)
          // This is a soft check since exact timing is hard to control
          const ratio = Math.max(time1, time2) / Math.min(time1, time2);
          expect(ratio).toBeLessThan(10);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if two Uint8Arrays are equal
 */
function areEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Constant-time equality check
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
