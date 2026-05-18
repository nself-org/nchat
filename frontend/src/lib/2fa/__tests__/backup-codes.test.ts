/**
 * Backup Codes Tests
 *
 * Tests for backup code generation, hashing, and verification.
 */

import {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  isValidBackupCodeFormat,
  formatBackupCode,
  generateAndHashBackupCodes,
  formatBackupCodesForDownload,
  maskBackupCode,
  countRemainingCodes,
  shouldRegenerateCodes,
} from "../backup-codes";

describe("Backup Codes Utility", () => {
  describe("generateBackupCodes", () => {
    it("should generate the specified number of codes", () => {
      const codes = generateBackupCodes(10);
      expect(codes).toHaveLength(10);

      const codes5 = generateBackupCodes(5);
      expect(codes5).toHaveLength(5);
    });

    it("should generate codes in XXXX-XXXX format", () => {
      const codes = generateBackupCodes(10);

      for (const code of codes) {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      }
    });

    it("should generate unique codes", () => {
      const codes = generateBackupCodes(100);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(100);
    });

    it("should use default of 10 codes", () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });
  });

  describe("hashBackupCode", () => {
    it("should return a bcrypt hash", async () => {
      const code = "ABCD-1234";
      const hash = await hashBackupCode(code);

      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it("should produce different hashes for same code (due to salt)", async () => {
      const code = "ABCD-1234";
      const hash1 = await hashBackupCode(code);
      const hash2 = await hashBackupCode(code);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle codes without dashes", async () => {
      const hash = await hashBackupCode("ABCD1234");
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
    });
  });

  describe("verifyBackupCode", () => {
    it("should verify a correct backup code", async () => {
      const code = "ABCD-EF12";
      const hash = await hashBackupCode(code);

      const isValid = await verifyBackupCode(code, hash);
      expect(isValid).toBe(true);
    });

    it("should reject an incorrect backup code", async () => {
      const code = "ABCD-EF12";
      const hash = await hashBackupCode(code);

      const isValid = await verifyBackupCode("XXXX-YYYY", hash);
      expect(isValid).toBe(false);
    });

    it("should verify code regardless of formatting (with/without dash)", async () => {
      const code = "ABCD-EF12";
      const hash = await hashBackupCode(code);

      // Verify without dash
      const isValid1 = await verifyBackupCode("ABCDEF12", hash);
      expect(isValid1).toBe(true);

      // Verify with spaces
      const isValid2 = await verifyBackupCode("ABCD EF12", hash);
      expect(isValid2).toBe(true);
    });

    it("should be case insensitive", async () => {
      const code = "ABCD-EF12";
      const hash = await hashBackupCode(code);

      const isValid = await verifyBackupCode("abcd-ef12", hash);
      expect(isValid).toBe(true);
    });
  });

  describe("isValidBackupCodeFormat", () => {
    it("should accept valid formats", () => {
      expect(isValidBackupCodeFormat("ABCD-1234")).toBe(true);
      expect(isValidBackupCodeFormat("ABCD1234")).toBe(true);
      expect(isValidBackupCodeFormat("abcd-1234")).toBe(true);
      expect(isValidBackupCodeFormat("abcd 1234")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidBackupCodeFormat("ABCD-123")).toBe(false); // Too short
      expect(isValidBackupCodeFormat("ABCD-12345")).toBe(false); // Too long
      expect(isValidBackupCodeFormat("GHIJ-1234")).toBe(false); // Invalid hex chars
      expect(isValidBackupCodeFormat("")).toBe(false);
    });
  });

  describe("formatBackupCode", () => {
    it("should format code with dash", () => {
      expect(formatBackupCode("ABCD1234")).toBe("ABCD-1234");
      expect(formatBackupCode("abcd1234")).toBe("ABCD-1234");
    });

    it("should handle already formatted codes", () => {
      expect(formatBackupCode("ABCD-1234")).toBe("ABCD-1234");
    });

    it("should return as-is for invalid length", () => {
      expect(formatBackupCode("ABC")).toBe("ABC");
      expect(formatBackupCode("ABCDEFGHIJ")).toBe("ABCDEFGHIJ");
    });
  });

  describe("generateAndHashBackupCodes", () => {
    it("should generate codes with their hashes", async () => {
      const result = await generateAndHashBackupCodes(5);

      expect(result).toHaveLength(5);

      for (const item of result) {
        expect(item).toHaveProperty("code");
        expect(item).toHaveProperty("hash");
        expect(item.code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
        expect(item.hash).toMatch(/^\$2[aby]\$\d+\$/);
      }
    });

    it("should generate verifiable code-hash pairs", async () => {
      const result = await generateAndHashBackupCodes(3);

      for (const { code, hash } of result) {
        const isValid = await verifyBackupCode(code, hash);
        expect(isValid).toBe(true);
      }
    });
  });

  describe("formatBackupCodesForDownload", () => {
    it("should format codes for text file download", () => {
      const codes = ["ABCD-1234", "EFGH-5678", "IJKL-9ABC"];
      const text = formatBackupCodesForDownload(codes, "test@example.com");

      expect(text).toContain("nchat Backup Codes for test@example.com");
      expect(text).toContain("ABCD-1234");
      expect(text).toContain("EFGH-5678");
      expect(text).toContain("IJKL-9ABC");
      expect(text).toContain("IMPORTANT");
    });

    it("should include numbered list", () => {
      const codes = ["ABCD-1234", "EFGH-5678"];
      const text = formatBackupCodesForDownload(codes, "user@test.com");

      expect(text).toContain("1. ABCD-1234");
      expect(text).toContain("2. EFGH-5678");
    });
  });

  describe("maskBackupCode", () => {
    it("should mask first half of code", () => {
      expect(maskBackupCode("ABCD-1234")).toBe("****-1234");
      expect(maskBackupCode("ABCD1234")).toBe("****-1234");
    });

    it("should handle invalid codes", () => {
      expect(maskBackupCode("ABC")).toBe("****-****");
      expect(maskBackupCode("")).toBe("****-****");
    });
  });

  describe("countRemainingCodes", () => {
    it("should count unused codes", () => {
      const codes = [
        { used_at: null },
        { used_at: new Date() },
        { used_at: null },
        { used_at: new Date() },
        { used_at: null },
      ];

      expect(countRemainingCodes(codes)).toBe(3);
    });

    it("should return 0 when all codes are used", () => {
      const codes = [{ used_at: new Date() }, { used_at: new Date() }];

      expect(countRemainingCodes(codes)).toBe(0);
    });

    it("should handle empty array", () => {
      expect(countRemainingCodes([])).toBe(0);
    });
  });

  describe("shouldRegenerateCodes", () => {
    it("should return true when remaining codes at or below threshold", () => {
      expect(shouldRegenerateCodes(3)).toBe(true); // Default threshold is 3
      expect(shouldRegenerateCodes(2)).toBe(true);
      expect(shouldRegenerateCodes(0)).toBe(true);
    });

    it("should return false when remaining codes above threshold", () => {
      expect(shouldRegenerateCodes(4)).toBe(false);
      expect(shouldRegenerateCodes(10)).toBe(false);
    });

    it("should respect custom threshold", () => {
      expect(shouldRegenerateCodes(5, 5)).toBe(true);
      expect(shouldRegenerateCodes(5, 4)).toBe(false);
    });
  });
});
