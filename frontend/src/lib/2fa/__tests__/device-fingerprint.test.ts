/**
 * Device Fingerprint Tests
 *
 * Tests for device fingerprinting used in 2FA trusted devices.
 */

import {
  generateDeviceFingerprint,
  getDeviceName,
  getDeviceType,
  createDeviceRecord,
  getDeviceTrustExpiry,
  isDeviceTrustExpired,
  getDaysUntilExpiry,
  isValidDeviceFingerprint,
} from "../device-fingerprint";
import type { DeviceInfo } from "../device-fingerprint";

describe("Device Fingerprint Utility", () => {
  const mockDeviceInfo: DeviceInfo = {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "MacIntel",
    language: "en-US",
    screenResolution: "1920x1080",
    timezone: "America/New_York",
    colorDepth: 24,
    deviceMemory: 8,
    hardwareConcurrency: 8,
    vendor: "Google Inc.",
  };

  describe("generateDeviceFingerprint", () => {
    it("should generate a SHA-256 hash (64 hex characters)", () => {
      const fingerprint = generateDeviceFingerprint(mockDeviceInfo);

      expect(fingerprint).toHaveLength(64);
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should generate consistent fingerprints for same device info", () => {
      const fp1 = generateDeviceFingerprint(mockDeviceInfo);
      const fp2 = generateDeviceFingerprint(mockDeviceInfo);

      expect(fp1).toBe(fp2);
    });

    it("should generate different fingerprints for different device info", () => {
      const fp1 = generateDeviceFingerprint(mockDeviceInfo);
      const fp2 = generateDeviceFingerprint({
        ...mockDeviceInfo,
        screenResolution: "2560x1440",
      });

      expect(fp1).not.toBe(fp2);
    });

    it("should handle missing optional fields", () => {
      const minimalInfo: DeviceInfo = {
        userAgent: "Mozilla/5.0",
        platform: "Unknown",
        language: "en",
        screenResolution: "0x0",
        timezone: "UTC",
        colorDepth: 0,
      };

      const fingerprint = generateDeviceFingerprint(minimalInfo);
      expect(fingerprint).toHaveLength(64);
    });
  });

  describe("getDeviceName", () => {
    it("should detect Chrome on macOS", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = getDeviceName(ua);

      expect(name).toContain("Chrome");
      expect(name).toContain("macOS");
    });

    it("should detect Firefox on Windows", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
      const name = getDeviceName(ua);

      expect(name).toContain("Firefox");
      expect(name).toContain("Windows");
    });

    it("should detect Safari on iOS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
      const name = getDeviceName(ua);

      expect(name).toContain("Safari");
      // iOS user agents contain iPhone/iPad indicators
      expect(name.toLowerCase()).toMatch(/ios|iphone|ipad|macos/);
    });

    it("should detect Edge browser", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const name = getDeviceName(ua);

      expect(name).toContain("Edge");
    });

    it("should detect Android devices", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36";
      const name = getDeviceName(ua);

      // Android devices can show up as Linux or Android depending on parser
      expect(name.toLowerCase()).toMatch(/android|linux/);
    });
  });

  describe("getDeviceType", () => {
    it("should detect desktop devices", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0";
      expect(getDeviceType(ua)).toBe("desktop");
    });

    it("should detect mobile devices", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile";
      expect(getDeviceType(ua)).toBe("mobile");

      const androidUa =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
      expect(getDeviceType(androidUa)).toBe("mobile");
    });

    it("should detect tablet devices", () => {
      const ipadUa =
        "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
      expect(getDeviceType(ipadUa)).toBe("tablet");

      const androidTabletUa =
        "Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 Safari/537.36";
      expect(getDeviceType(androidTabletUa)).toBe("tablet");
    });
  });

  describe("createDeviceRecord", () => {
    // Skip tests that require window object
    it("should create a complete device record (server-side)", () => {
      const record = createDeviceRecord();

      expect(record).toHaveProperty("deviceId");
      expect(record).toHaveProperty("deviceName");
      expect(record).toHaveProperty("deviceType");
      expect(record).toHaveProperty("deviceInfo");
      expect(record.deviceId).toHaveLength(64);
    });
  });

  describe("getDeviceTrustExpiry", () => {
    it("should return date in ISO format", () => {
      const expiry = getDeviceTrustExpiry(30);
      expect(expiry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it("should return date 30 days in the future by default", () => {
      const expiry = getDeviceTrustExpiry();
      const expiryDate = new Date(expiry);
      const now = new Date();

      const diffDays = Math.round(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);
    });

    it("should respect custom days parameter", () => {
      const expiry = getDeviceTrustExpiry(7);
      const expiryDate = new Date(expiry);
      const now = new Date();

      const diffDays = Math.round(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(7);
    });
  });

  describe("isDeviceTrustExpired", () => {
    it("should return true for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(isDeviceTrustExpired(pastDate.toISOString())).toBe(true);
    });

    it("should return false for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(isDeviceTrustExpired(futureDate.toISOString())).toBe(false);
    });
  });

  describe("getDaysUntilExpiry", () => {
    it("should return correct days for future date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const days = getDaysUntilExpiry(futureDate.toISOString());
      expect(days).toBe(10);
    });

    it("should return 0 for past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const days = getDaysUntilExpiry(pastDate.toISOString());
      expect(days).toBe(0);
    });
  });

  describe("isValidDeviceFingerprint", () => {
    it("should return true for valid SHA-256 hashes", () => {
      const validHash = "a".repeat(64);
      expect(isValidDeviceFingerprint(validHash)).toBe(true);

      const mixedHash = "abcdef1234567890".repeat(4);
      expect(isValidDeviceFingerprint(mixedHash)).toBe(true);
    });

    it("should return false for invalid hashes", () => {
      expect(isValidDeviceFingerprint("too-short")).toBe(false);
      expect(isValidDeviceFingerprint("g".repeat(64))).toBe(false); // Invalid hex char
      expect(isValidDeviceFingerprint("")).toBe(false);
      expect(isValidDeviceFingerprint("a".repeat(63))).toBe(false); // Too short
      expect(isValidDeviceFingerprint("a".repeat(65))).toBe(false); // Too long
    });
  });
});
