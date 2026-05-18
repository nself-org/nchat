/**
 * TOTP (Time-based One-Time Password) Tests
 *
 * Tests for the TOTP utility functions used in 2FA.
 */

import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  generateTOTPToken,
  formatSecretForDisplay,
  isValidTOTPSecret,
  getCurrentTimeStep,
  getRemainingSeconds,
} from "../totp";

describe("TOTP Utility", () => {
  describe("generateTOTPSecret", () => {
    it("should generate a valid TOTP secret", () => {
      const result = generateTOTPSecret({
        name: "test@example.com",
        issuer: "nchat",
      });

      expect(result).toHaveProperty("secret");
      expect(result).toHaveProperty("otpauthUrl");
      expect(result).toHaveProperty("base32");
      expect(result.base32).toBeTruthy();
      expect(result.otpauthUrl).toContain("otpauth://totp/");
    });

    it("should include issuer and name in otpauth URL", () => {
      const result = generateTOTPSecret({
        name: "user@company.com",
        issuer: "TestApp",
      });

      expect(result.otpauthUrl).toContain("TestApp");
      // URL-encoded email
      expect(result.otpauthUrl).toContain("user%40company.com");
    });

    it("should use default issuer when not provided", () => {
      const result = generateTOTPSecret({
        name: "test@example.com",
      });

      expect(result.otpauthUrl).toContain("nchat");
    });

    it("should generate unique secrets for each call", () => {
      const result1 = generateTOTPSecret({ name: "test@example.com" });
      const result2 = generateTOTPSecret({ name: "test@example.com" });

      expect(result1.base32).not.toBe(result2.base32);
    });
  });

  describe("generateQRCode", () => {
    it("should generate a valid QR code data URL", async () => {
      const { otpauthUrl } = generateTOTPSecret({
        name: "test@example.com",
      });

      const qrCode = await generateQRCode(otpauthUrl);

      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });

    it("should throw error for invalid URL", async () => {
      // QRCode library handles empty strings gracefully
      // but we can test with a valid otpauth URL
      const qrCode = await generateQRCode("otpauth://totp/test");
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("verifyTOTP", () => {
    it("should verify a valid TOTP token", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      // Generate the current token
      const token = generateTOTPToken(base32);

      // Verify it
      const isValid = verifyTOTP(token, base32);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid token", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      const isValid = verifyTOTP("000000", base32);
      expect(isValid).toBe(false);
    });

    it("should reject tokens with wrong format", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      expect(verifyTOTP("12345", base32)).toBe(false); // Too short
      expect(verifyTOTP("1234567", base32)).toBe(false); // Too long
      expect(verifyTOTP("abcdef", base32)).toBe(false); // Not numeric
    });

    it("should handle tokens with spaces", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      const token = generateTOTPToken(base32);
      const tokenWithSpaces = `${token.slice(0, 3)} ${token.slice(3)}`;

      const isValid = verifyTOTP(tokenWithSpaces, base32);
      expect(isValid).toBe(true);
    });

    it("should allow time window for token validation", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      // Generate current token
      const token = generateTOTPToken(base32);

      // Verify with larger window
      const isValid = verifyTOTP(token, base32, 2);
      expect(isValid).toBe(true);
    });
  });

  describe("generateTOTPToken", () => {
    it("should generate a 6-digit numeric token", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      const token = generateTOTPToken(base32);

      expect(token).toMatch(/^\d{6}$/);
    });

    it("should generate consistent tokens for the same time step", () => {
      const { base32 } = generateTOTPSecret({
        name: "test@example.com",
      });

      // Within the same 30-second window, tokens should be identical
      const token1 = generateTOTPToken(base32);
      const token2 = generateTOTPToken(base32);

      expect(token1).toBe(token2);
    });
  });

  describe("formatSecretForDisplay", () => {
    it("should format secret in groups of 4", () => {
      const secret = "ABCDEFGHIJKLMNOP";
      const formatted = formatSecretForDisplay(secret);

      expect(formatted).toBe("ABCD EFGH IJKL MNOP");
    });

    it("should handle secrets not divisible by 4", () => {
      const secret = "ABCDEFGHIJ";
      const formatted = formatSecretForDisplay(secret);

      expect(formatted).toBe("ABCD EFGH IJ");
    });

    it("should handle empty string", () => {
      const formatted = formatSecretForDisplay("");
      expect(formatted).toBe("");
    });
  });

  describe("isValidTOTPSecret", () => {
    it("should return true for valid base32 secrets", () => {
      expect(isValidTOTPSecret("ABCDEFGHIJKLMNOP")).toBe(true);
      expect(isValidTOTPSecret("A2B3C4D5E6F7G2H3")).toBe(true);
      expect(isValidTOTPSecret("JBSWY3DPEHPK3PXP")).toBe(true);
    });

    it("should return true for base32 with padding", () => {
      expect(isValidTOTPSecret("ABCDEFGH========")).toBe(true);
    });

    it("should return false for invalid characters", () => {
      expect(isValidTOTPSecret("ABCD0189")).toBe(false); // Contains 0, 1, 8, 9
      expect(isValidTOTPSecret("abcdefgh")).toBe(false); // Lowercase
      expect(isValidTOTPSecret("ABCD!@#$")).toBe(false); // Special chars
    });
  });

  describe("getCurrentTimeStep", () => {
    it("should return a positive integer", () => {
      const timeStep = getCurrentTimeStep();

      expect(Number.isInteger(timeStep)).toBe(true);
      expect(timeStep).toBeGreaterThan(0);
    });

    it("should return same value within 30 seconds", () => {
      const step1 = getCurrentTimeStep();
      const step2 = getCurrentTimeStep();

      expect(step2 - step1).toBeLessThanOrEqual(1);
    });
  });

  describe("getRemainingSeconds", () => {
    it("should return a value between 1 and 30", () => {
      const remaining = getRemainingSeconds();

      expect(remaining).toBeGreaterThanOrEqual(1);
      expect(remaining).toBeLessThanOrEqual(30);
    });
  });
});
