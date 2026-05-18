/**
 * Device Verification Unit Tests
 *
 * Comprehensive tests for device trust verification including
 * device detection, safety numbers, QR verification, and trust management.
 */

import {
  DeviceVerification,
  Device,
  DeviceInfo,
  SafetyNumber,
  QRVerificationData,
  TrustLevel,
  detectDeviceType,
  detectOS,
  detectBrowser,
  getCurrentDeviceInfo,
  generateDeviceFingerprint,
  generateSafetyNumber,
  compareSafetyNumbers,
  validateSafetyNumber,
  generateQRVerificationData,
  encodeQRVerificationData,
  decodeQRVerificationData,
  validateQRVerificationData,
  createDevice,
  updateDeviceActivity,
  setDeviceTrustLevel,
  isDeviceTrusted,
  isDeviceBlocked,
  verifyDeviceWithQR,
  verifyDeviceWithSafetyNumber,
  doesKeyMatchDevice,
  computeDeviceSimilarity,
  deviceVerification,
} from "../device-verification";

// ============================================================================
// Mock Setup
// ============================================================================

const mockPublicKey = {} as CryptoKey;
const mockJwk: JsonWebKey = {
  kty: "EC",
  crv: "P-256",
  x: "test-x-coordinate",
  y: "test-y-coordinate",
};

// Mock crypto.subtle
const mockCryptoSubtle = {
  digest: jest.fn(),
  exportKey: jest.fn(),
};

const originalCrypto = global.crypto;

beforeAll(() => {
  Object.defineProperty(global, "crypto", {
    value: {
      subtle: mockCryptoSubtle,
      getRandomValues: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }),
    },
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(global, "crypto", {
    value: originalCrypto,
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCryptoSubtle.digest.mockResolvedValue(new ArrayBuffer(64));
  mockCryptoSubtle.exportKey.mockResolvedValue(mockJwk);
});

// ============================================================================
// Device Detection Tests
// ============================================================================

describe("Device Detection", () => {
  describe("detectDeviceType", () => {
    it("should detect desktop Windows", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
      expect(detectDeviceType(ua)).toBe("desktop");
    });

    it("should detect desktop Mac", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
      expect(detectDeviceType(ua)).toBe("desktop");
    });

    it("should detect desktop Linux", () => {
      const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";
      expect(detectDeviceType(ua)).toBe("desktop");
    });

    it("should detect mobile iPhone", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15";
      expect(detectDeviceType(ua)).toBe("mobile");
    });

    it("should detect mobile Android", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Mobile";
      expect(detectDeviceType(ua)).toBe("mobile");
    });

    it("should detect tablet iPad", () => {
      const ua =
        "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15";
      expect(detectDeviceType(ua)).toBe("tablet");
    });

    it("should detect tablet Android", () => {
      const ua = "Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36";
      expect(detectDeviceType(ua)).toBe("tablet");
    });

    it("should detect web browser", () => {
      const ua = "Mozilla/5.0 Chrome/91.0";
      expect(detectDeviceType(ua)).toBe("web");
    });

    it("should return unknown for unrecognized user agent", () => {
      const ua = "CustomBot/1.0";
      expect(detectDeviceType(ua)).toBe("unknown");
    });

    it("should handle empty user agent", () => {
      expect(detectDeviceType("")).toBe("unknown");
    });

    it("should handle Windows Phone", () => {
      const ua = "Mozilla/5.0 (Windows Phone 10.0) AppleWebKit/537.36";
      expect(detectDeviceType(ua)).toBe("mobile");
    });

    it("should handle BlackBerry", () => {
      const ua = "Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)";
      expect(detectDeviceType(ua)).toBe("mobile");
    });

    it("should handle Kindle/Silk", () => {
      const ua = "Mozilla/5.0 (Linux; U; Android 4.0.3; Silk/3.68)";
      expect(detectDeviceType(ua)).toBe("tablet");
    });
  });

  describe("detectOS", () => {
    it("should detect Windows 10/11", () => {
      const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      expect(detectOS(ua)).toBe("Windows 10/11");
    });

    it("should detect Windows 8.1", () => {
      const ua = "Mozilla/5.0 (Windows NT 6.3; Win64; x64)";
      expect(detectOS(ua)).toBe("Windows 8.1");
    });

    it("should detect Windows 8", () => {
      const ua = "Mozilla/5.0 (Windows NT 6.2; Win64; x64)";
      expect(detectOS(ua)).toBe("Windows 8");
    });

    it("should detect Windows 7", () => {
      const ua = "Mozilla/5.0 (Windows NT 6.1; Win64; x64)";
      expect(detectOS(ua)).toBe("Windows 7");
    });

    it("should detect generic Windows", () => {
      const ua = "Mozilla/5.0 (Windows NT 5.1)";
      expect(detectOS(ua)).toBe("Windows");
    });

    it("should detect macOS with version", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
      expect(detectOS(ua)).toBe("macOS 10.15");
    });

    it("should detect macOS generic", () => {
      const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X)";
      expect(detectOS(ua)).toBe("macOS");
    });

    it("should detect iOS with version", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";
      expect(detectOS(ua)).toBe("iOS 14");
    });

    it("should detect iPadOS with version", () => {
      const ua = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)";
      expect(detectOS(ua)).toBe("iPadOS 14");
    });

    it("should detect iOS generic", () => {
      const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS like Mac OS X)";
      expect(detectOS(ua)).toBe("iOS");
    });

    it("should detect Android with version", () => {
      const ua = "Mozilla/5.0 (Linux; Android 11; Pixel 5)";
      expect(detectOS(ua)).toBe("Android 11");
    });

    it("should detect Android generic", () => {
      const ua = "Mozilla/5.0 (Linux; Android; Pixel)";
      expect(detectOS(ua)).toBe("Android");
    });

    it("should detect Linux", () => {
      const ua = "Mozilla/5.0 (X11; Linux x86_64)";
      expect(detectOS(ua)).toBe("Linux");
    });

    it("should detect Chrome OS", () => {
      const ua = "Mozilla/5.0 (X11; CrOS x86_64)";
      expect(detectOS(ua)).toBe("Chrome OS");
    });

    it("should return Unknown OS for unrecognized", () => {
      const ua = "CustomBot/1.0";
      expect(detectOS(ua)).toBe("Unknown OS");
    });
  });

  describe("detectBrowser", () => {
    it("should detect Chrome", () => {
      const ua = "Mozilla/5.0 Chrome/91.0.4472.124 Safari/537.36";
      expect(detectBrowser(ua)).toBe("Chrome");
    });

    it("should detect Firefox", () => {
      const ua = "Mozilla/5.0 Firefox/89.0";
      expect(detectBrowser(ua)).toBe("Firefox");
    });

    it("should detect Safari", () => {
      const ua =
        "Mozilla/5.0 AppleWebKit/605.1.15 Version/14.1.1 Safari/605.1.15";
      expect(detectBrowser(ua)).toBe("Safari");
    });

    it("should detect Microsoft Edge", () => {
      const ua =
        "Mozilla/5.0 Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59";
      expect(detectBrowser(ua)).toBe("Microsoft Edge");
    });

    it("should detect Opera", () => {
      const ua =
        "Mozilla/5.0 Chrome/91.0.4472.124 Safari/537.36 OPR/77.0.4054.277";
      expect(detectBrowser(ua)).toBe("Opera");
    });

    it("should detect Internet Explorer", () => {
      const ua =
        "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)";
      expect(detectBrowser(ua)).toBe("Internet Explorer");
    });

    it("should detect IE with Trident", () => {
      const ua = "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0)";
      expect(detectBrowser(ua)).toBe("Internet Explorer");
    });

    it("should return Unknown Browser for unrecognized", () => {
      const ua = "CustomBot/1.0";
      expect(detectBrowser(ua)).toBe("Unknown Browser");
    });
  });

  describe("getCurrentDeviceInfo", () => {
    const originalNavigator = global.navigator;

    beforeEach(() => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/91.0",
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should return device info object", () => {
      const info = getCurrentDeviceInfo();

      expect(info).toHaveProperty("type");
      expect(info).toHaveProperty("os");
      expect(info).toHaveProperty("browser");
      expect(info).toHaveProperty("userAgent");
    });

    it("should detect correct device type", () => {
      const info = getCurrentDeviceInfo();
      expect(info.type).toBe("desktop");
    });
  });

  describe("generateDeviceFingerprint", () => {
    const originalNavigator = global.navigator;
    const originalScreen = global.screen;

    beforeEach(() => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent: "TestAgent/1.0",
          language: "en-US",
          hardwareConcurrency: 8,
          maxTouchPoints: 0,
        },
        writable: true,
      });

      Object.defineProperty(global, "screen", {
        value: {
          width: 1920,
          height: 1080,
          colorDepth: 24,
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
      Object.defineProperty(global, "screen", {
        value: originalScreen,
        writable: true,
      });
    });

    it("should generate a hex string fingerprint", async () => {
      const hashBuffer = new Uint8Array(32).buffer;
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer);

      const fingerprint = await generateDeviceFingerprint();

      expect(typeof fingerprint).toBe("string");
      expect(/^[0-9a-f]+$/.test(fingerprint)).toBe(true);
    });

    it("should use SHA-256 for hashing", async () => {
      await generateDeviceFingerprint();

      expect(mockCryptoSubtle.digest).toHaveBeenCalledWith(
        "SHA-256",
        expect.any(Uint8Array),
      );
    });
  });
});

// ============================================================================
// Safety Number Tests
// ============================================================================

describe("Safety Numbers", () => {
  describe("generateSafetyNumber", () => {
    it("should generate a safety number", async () => {
      const hashBuffer = new Uint8Array(64);
      for (let i = 0; i < 64; i++) hashBuffer[i] = i;
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer.buffer);

      const result = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "user1",
        "user2",
      );

      expect(result).toHaveProperty("displayNumber");
      expect(result).toHaveProperty("rawBytes");
      expect(result).toHaveProperty("generatedAt");
      expect(result).toHaveProperty("version");
    });

    it("should generate 60-digit number", async () => {
      const hashBuffer = new Uint8Array(64);
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer.buffer);

      const result = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "user1",
        "user2",
      );

      const digits = result.displayNumber.replace(/\s/g, "");
      expect(digits.length).toBe(60);
    });

    it("should format as groups of 5", async () => {
      const hashBuffer = new Uint8Array(64);
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer.buffer);

      const result = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "user1",
        "user2",
      );

      const groups = result.displayNumber.split(" ");
      groups.forEach((group) => {
        expect(group.length).toBe(5);
      });
    });

    it("should be deterministic for same keys", async () => {
      const hashBuffer = new Uint8Array(64);
      for (let i = 0; i < 64; i++) hashBuffer[i] = i;
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer.buffer);

      const result1 = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "user1",
        "user2",
      );

      const result2 = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "user1",
        "user2",
      );

      expect(result1.displayNumber).toBe(result2.displayNumber);
    });

    it("should be bidirectional (same result regardless of order)", async () => {
      const hashBuffer = new Uint8Array(64);
      for (let i = 0; i < 64; i++) hashBuffer[i] = i;
      mockCryptoSubtle.digest.mockResolvedValue(hashBuffer.buffer);

      // Same user IDs, should produce same result regardless of order
      const result1 = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "aaa",
        "bbb",
      );

      const result2 = await generateSafetyNumber(
        mockPublicKey,
        mockPublicKey,
        "bbb",
        "aaa",
      );

      expect(result1.displayNumber).toBe(result2.displayNumber);
    });
  });

  describe("compareSafetyNumbers", () => {
    it("should return true for matching numbers", () => {
      const num1: SafetyNumber = {
        displayNumber:
          "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      const num2: SafetyNumber = {
        displayNumber:
          "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      expect(compareSafetyNumbers(num1, num2)).toBe(true);
    });

    it("should return false for different numbers", () => {
      const num1: SafetyNumber = {
        displayNumber:
          "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      const num2: SafetyNumber = {
        displayNumber:
          "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67891",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      expect(compareSafetyNumbers(num1, num2)).toBe(false);
    });

    it("should return false for different versions", () => {
      const num1: SafetyNumber = {
        displayNumber: "12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      const num2: SafetyNumber = {
        displayNumber: "12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 2,
      };

      expect(compareSafetyNumbers(num1, num2)).toBe(false);
    });

    it("should ignore whitespace differences", () => {
      const num1: SafetyNumber = {
        displayNumber: "12345 67890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      const num2: SafetyNumber = {
        displayNumber: "1234567890",
        rawBytes: new Uint8Array(30),
        generatedAt: new Date(),
        version: 1,
      };

      expect(compareSafetyNumbers(num1, num2)).toBe(true);
    });
  });

  describe("validateSafetyNumber", () => {
    it("should return true for valid 60-digit number", () => {
      const validNumber =
        "12345 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890";
      expect(validateSafetyNumber(validNumber)).toBe(true);
    });

    it("should return true without spaces", () => {
      const validNumber =
        "123456789012345678901234567890123456789012345678901234567890";
      expect(validateSafetyNumber(validNumber)).toBe(true);
    });

    it("should return false for too short", () => {
      const shortNumber = "12345";
      expect(validateSafetyNumber(shortNumber)).toBe(false);
    });

    it("should return false for too long", () => {
      const longNumber = "1234567890".repeat(7); // 70 digits
      expect(validateSafetyNumber(longNumber)).toBe(false);
    });

    it("should return false for non-numeric characters", () => {
      const invalidNumber =
        "abcde 67890 12345 67890 12345 67890 12345 67890 12345 67890 12345 67890";
      expect(validateSafetyNumber(invalidNumber)).toBe(false);
    });
  });
});

// ============================================================================
// QR Verification Tests
// ============================================================================

describe("QR Verification", () => {
  describe("generateQRVerificationData", () => {
    it("should generate QR data with all fields", () => {
      const data = generateQRVerificationData(
        "device-123",
        "0102 0304",
        "user-456",
      );

      expect(data).toMatchObject({
        deviceId: "device-123",
        fingerprint: "0102 0304",
        userId: "user-456",
        version: 1,
      });
      expect(data.timestamp).toBeDefined();
    });

    it("should include signature when provided", () => {
      const data = generateQRVerificationData(
        "device-123",
        "0102 0304",
        "user-456",
        "signature-data",
      );

      expect(data.signature).toBe("signature-data");
    });

    it("should use current timestamp", () => {
      const before = Date.now();
      const data = generateQRVerificationData("device", "fp", "user");
      const after = Date.now();

      expect(data.timestamp).toBeGreaterThanOrEqual(before);
      expect(data.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("encodeQRVerificationData", () => {
    it("should encode data as base64", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: 1234567890,
        userId: "user-456",
        version: 1,
      };

      const encoded = encodeQRVerificationData(data);

      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);
    });

    it("should be decodable", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: 1234567890,
        userId: "user-456",
        version: 1,
      };

      const encoded = encodeQRVerificationData(data);
      const decoded = decodeQRVerificationData(encoded);

      expect(decoded).toEqual(data);
    });
  });

  describe("decodeQRVerificationData", () => {
    it("should decode valid base64 data", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: 1234567890,
        userId: "user-456",
        version: 1,
      };

      const encoded = btoa(JSON.stringify(data));
      const decoded = decodeQRVerificationData(encoded);

      expect(decoded).toEqual(data);
    });

    it("should return null for invalid base64", () => {
      const result = decodeQRVerificationData("not-valid-base64!!!");
      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      const encoded = btoa("not json");
      const result = decodeQRVerificationData(encoded);
      expect(result).toBeNull();
    });

    it("should return null for missing required fields", () => {
      const incompleteData = { deviceId: "device-123" };
      const encoded = btoa(JSON.stringify(incompleteData));
      const result = decodeQRVerificationData(encoded);
      expect(result).toBeNull();
    });

    it("should return null for wrong field types", () => {
      const badData = {
        deviceId: 123, // Should be string
        fingerprint: "0102",
        timestamp: 1234567890,
        userId: "user",
        version: 1,
      };
      const encoded = btoa(JSON.stringify(badData));
      const result = decodeQRVerificationData(encoded);
      expect(result).toBeNull();
    });
  });

  describe("validateQRVerificationData", () => {
    it("should return valid for fresh QR data", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304 ABCD",
        timestamp: Date.now(),
        userId: "user-456",
        version: 1,
      };

      const result = validateQRVerificationData(data);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for expired QR data", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        userId: "user-456",
        version: 1,
      };

      const result = validateQRVerificationData(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("QR code has expired");
    });

    it("should return invalid for future timestamp", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: Date.now() + 60000, // 1 minute in future
        userId: "user-456",
        version: 1,
      };

      const result = validateQRVerificationData(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("QR code timestamp is in the future");
    });

    it("should return invalid for unsupported version", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: Date.now(),
        userId: "user-456",
        version: 999,
      };

      const result = validateQRVerificationData(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unsupported QR code version");
    });

    it("should return invalid for bad fingerprint format", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "invalid!@#$%",
        timestamp: Date.now(),
        userId: "user-456",
        version: 1,
      };

      const result = validateQRVerificationData(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid fingerprint format");
    });

    it("should use custom max age", () => {
      const data: QRVerificationData = {
        deviceId: "device-123",
        fingerprint: "0102 0304",
        timestamp: Date.now() - 2 * 60 * 1000, // 2 minutes ago
        userId: "user-456",
        version: 1,
      };

      // Should be valid with 3 minute max age
      const result1 = validateQRVerificationData(data, 3 * 60 * 1000);
      expect(result1.valid).toBe(true);

      // Should be invalid with 1 minute max age
      const result2 = validateQRVerificationData(data, 1 * 60 * 1000);
      expect(result2.valid).toBe(false);
    });
  });
});

// ============================================================================
// Device Trust Tests
// ============================================================================

describe("Device Trust", () => {
  describe("createDevice", () => {
    const originalNavigator = global.navigator;

    beforeEach(() => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/91.0",
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should create a device with TOFU trust level", () => {
      const device = createDevice("device-123", mockJwk, "0102 0304");

      expect(device.id).toBe("device-123");
      expect(device.publicKey).toBe(mockJwk);
      expect(device.fingerprint).toBe("0102 0304");
      expect(device.trustLevel).toBe("tofu");
    });

    it("should use provided name", () => {
      const device = createDevice("device-123", mockJwk, "0102", "My Phone");

      expect(device.name).toBe("My Phone");
    });

    it("should generate name from device info", () => {
      const device = createDevice("device-123", mockJwk, "0102");

      expect(device.name).toContain("Chrome");
      expect(device.name).toContain("macOS");
    });

    it("should set timestamps", () => {
      const before = new Date();
      const device = createDevice("device-123", mockJwk, "0102");
      const after = new Date();

      expect(device.firstSeenAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(device.firstSeenAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(device.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it("should have null verification fields initially", () => {
      const device = createDevice("device-123", mockJwk, "0102");

      expect(device.verifiedAt).toBeNull();
      expect(device.verifiedBy).toBeNull();
    });
  });

  describe("updateDeviceActivity", () => {
    it("should update lastActiveAt timestamp", () => {
      const oldDate = new Date(2020, 0, 1);
      const device: Device = {
        id: "device-123",
        name: "Test Device",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "tofu",
        firstSeenAt: oldDate,
        lastActiveAt: oldDate,
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      const updated = updateDeviceActivity(device);

      expect(updated.lastActiveAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it("should preserve other fields", () => {
      const device: Device = {
        id: "device-123",
        name: "Test Device",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "verified",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: new Date(),
        verifiedBy: "user-1",
        publicKey: mockJwk,
      };

      const updated = updateDeviceActivity(device);

      expect(updated.id).toBe(device.id);
      expect(updated.trustLevel).toBe("verified");
      expect(updated.verifiedAt).toBe(device.verifiedAt);
    });
  });

  describe("setDeviceTrustLevel", () => {
    it("should set trust level to verified", () => {
      const device: Device = {
        id: "device-123",
        name: "Test Device",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      const updated = setDeviceTrustLevel(device, "verified", "verifier-user");

      expect(updated.trustLevel).toBe("verified");
      expect(updated.verifiedAt).toBeInstanceOf(Date);
      expect(updated.verifiedBy).toBe("verifier-user");
    });

    it("should set trust level to blocked", () => {
      const device: Device = {
        id: "device-123",
        name: "Test Device",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      const updated = setDeviceTrustLevel(device, "blocked");

      expect(updated.trustLevel).toBe("blocked");
      expect(updated.verifiedAt).toBeNull();
    });

    it("should preserve verifiedAt when not verifying", () => {
      const verifiedDate = new Date(2020, 0, 1);
      const device: Device = {
        id: "device-123",
        name: "Test Device",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "verified",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: verifiedDate,
        verifiedBy: "old-verifier",
        publicKey: mockJwk,
      };

      const updated = setDeviceTrustLevel(device, "blocked");

      expect(updated.verifiedAt).toBe(verifiedDate);
      expect(updated.verifiedBy).toBe("old-verifier");
    });
  });

  describe("isDeviceTrusted", () => {
    it("should return true for verified devices", () => {
      const device: Device = {
        id: "device-123",
        name: "Test",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "verified",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: new Date(),
        verifiedBy: "user-1",
        publicKey: mockJwk,
      };

      expect(isDeviceTrusted(device)).toBe(true);
    });

    it("should return true for TOFU devices", () => {
      const device: Device = {
        id: "device-123",
        name: "Test",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      expect(isDeviceTrusted(device)).toBe(true);
    });

    it("should return false for blocked devices", () => {
      const device: Device = {
        id: "device-123",
        name: "Test",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "blocked",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      expect(isDeviceTrusted(device)).toBe(false);
    });

    it("should return false for untrusted devices", () => {
      const device: Device = {
        id: "device-123",
        name: "Test",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "untrusted",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      expect(isDeviceTrusted(device)).toBe(false);
    });
  });

  describe("isDeviceBlocked", () => {
    it("should return true for blocked devices", () => {
      const device: Device = {
        id: "device-123",
        name: "Test",
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        fingerprint: "0102",
        trustLevel: "blocked",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      expect(isDeviceBlocked(device)).toBe(true);
    });

    it("should return false for non-blocked devices", () => {
      const trustLevels: TrustLevel[] = ["untrusted", "tofu", "verified"];

      trustLevels.forEach((level) => {
        const device: Device = {
          id: "device-123",
          name: "Test",
          type: "desktop",
          os: "macOS",
          browser: "Chrome",
          fingerprint: "0102",
          trustLevel: level,
          firstSeenAt: new Date(),
          lastActiveAt: new Date(),
          verifiedAt: null,
          verifiedBy: null,
          publicKey: mockJwk,
        };

        expect(isDeviceBlocked(device)).toBe(false);
      });
    });
  });

  describe("computeDeviceSimilarity", () => {
    it("should return 1 for identical devices", () => {
      const info: DeviceInfo = {
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        userAgent: "Mozilla/5.0",
      };

      expect(computeDeviceSimilarity(info, info)).toBe(1);
    });

    it("should return 0 for completely different devices", () => {
      const info1: DeviceInfo = {
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        userAgent: "UA1",
      };

      const info2: DeviceInfo = {
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        userAgent: "UA2",
      };

      expect(computeDeviceSimilarity(info1, info2)).toBe(0);
    });

    it("should return partial score for partial matches", () => {
      const info1: DeviceInfo = {
        type: "desktop",
        os: "macOS",
        browser: "Chrome",
        userAgent: "UA1",
      };

      const info2: DeviceInfo = {
        type: "desktop",
        os: "macOS",
        browser: "Firefox",
        userAgent: "UA2",
      };

      expect(computeDeviceSimilarity(info1, info2)).toBe(0.5);
    });
  });
});

// ============================================================================
// DeviceVerification Class Tests
// ============================================================================

describe("DeviceVerification Class", () => {
  let verification: DeviceVerification;

  beforeEach(() => {
    jest.useFakeTimers();
    verification = new DeviceVerification();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("initialize", () => {
    it("should initialize with own device", () => {
      const device = verification.initialize("device-1", mockJwk, "0102 0304");

      expect(device.id).toBe("device-1");
      expect(device.trustLevel).toBe("verified");
      expect(verification.getOwnDeviceId()).toBe("device-1");
    });

    it("should store the device", () => {
      verification.initialize("device-1", mockJwk, "0102");

      expect(verification.getDevice("device-1")).toBeDefined();
    });
  });

  describe("getOwnDeviceId", () => {
    it("should return null before initialization", () => {
      expect(verification.getOwnDeviceId()).toBeNull();
    });

    it("should return device ID after initialization", () => {
      verification.initialize("device-1", mockJwk, "0102");
      expect(verification.getOwnDeviceId()).toBe("device-1");
    });
  });

  describe("getDevice", () => {
    it("should return undefined for non-existent device", () => {
      expect(verification.getDevice("non-existent")).toBeUndefined();
    });

    it("should return device after adding", () => {
      verification.initialize("device-1", mockJwk, "0102");
      const device = verification.getDevice("device-1");

      expect(device).toBeDefined();
      expect(device?.id).toBe("device-1");
    });
  });

  describe("getAllDevices", () => {
    it("should return empty array initially", () => {
      expect(verification.getAllDevices()).toEqual([]);
    });

    it("should return all devices", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const device2: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device2);

      const devices = verification.getAllDevices();
      expect(devices).toHaveLength(2);
    });
  });

  describe("getTrustedDevices", () => {
    it("should return only trusted devices", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const device2: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "blocked",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device2);

      const trusted = verification.getTrustedDevices();
      expect(trusted).toHaveLength(1);
      expect(trusted[0].id).toBe("device-1");
    });
  });

  describe("getBlockedDevices", () => {
    it("should return only blocked devices", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const device2: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "blocked",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device2);

      const blocked = verification.getBlockedDevices();
      expect(blocked).toHaveLength(1);
      expect(blocked[0].id).toBe("device-2");
    });
  });

  describe("addDevice", () => {
    it("should add a new device", () => {
      const device: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device);

      expect(verification.getDevice("device-2")).toBeDefined();
    });

    it("should preserve trust level when updating existing device", () => {
      verification.initialize("device-1", mockJwk, "0102");
      verification.blockDevice("device-1"); // This won't work on own device

      const newDeviceInfo: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(newDeviceInfo);
      verification.blockDevice("device-2");

      // Update with new info but different trust level
      const updatedInfo: Device = {
        ...newDeviceInfo,
        trustLevel: "verified", // Trying to change trust
      };

      verification.addDevice(updatedInfo);

      // Should preserve blocked status
      expect(verification.getDevice("device-2")?.trustLevel).toBe("blocked");
    });
  });

  describe("removeDevice", () => {
    it("should remove a device", () => {
      const device: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device);
      const result = verification.removeDevice("device-2");

      expect(result).toBe(true);
      expect(verification.getDevice("device-2")).toBeUndefined();
    });

    it("should not remove own device", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const result = verification.removeDevice("device-1");

      expect(result).toBe(false);
      expect(verification.getDevice("device-1")).toBeDefined();
    });

    it("should return false for non-existent device", () => {
      const result = verification.removeDevice("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("blockDevice", () => {
    it("should block a device", () => {
      const device: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device);
      const result = verification.blockDevice("device-2");

      expect(result).toBe(true);
      expect(verification.getDevice("device-2")?.trustLevel).toBe("blocked");
    });

    it("should not block own device", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const result = verification.blockDevice("device-1");

      expect(result).toBe(false);
      expect(verification.getDevice("device-1")?.trustLevel).toBe("verified");
    });
  });

  describe("unblockDevice", () => {
    it("should unblock a blocked device", () => {
      const device: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "blocked",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device);
      const result = verification.unblockDevice("device-2");

      expect(result).toBe(true);
      expect(verification.getDevice("device-2")?.trustLevel).toBe("tofu");
    });

    it("should return false for non-blocked device", () => {
      const device: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device);
      const result = verification.unblockDevice("device-2");

      expect(result).toBe(false);
    });
  });

  describe("updateActivity", () => {
    it("should update device activity", () => {
      verification.initialize("device-1", mockJwk, "0102");
      const oldTime = verification.getDevice("device-1")?.lastActiveAt;

      // Wait a bit to ensure time difference
      jest.advanceTimersByTime(1000);

      verification.updateActivity("device-1");

      const newTime = verification.getDevice("device-1")?.lastActiveAt;
      expect(newTime?.getTime()).toBeGreaterThanOrEqual(
        oldTime?.getTime() || 0,
      );
    });
  });

  describe("generateOwnQRData", () => {
    it("should generate QR data for own device", () => {
      verification.initialize("device-1", mockJwk, "0102 0304");

      const qrData = verification.generateOwnQRData("user-1");

      expect(qrData).toMatchObject({
        deviceId: "device-1",
        fingerprint: "0102 0304",
        userId: "user-1",
        version: 1,
      });
    });

    it("should return null if not initialized", () => {
      const qrData = verification.generateOwnQRData("user-1");
      expect(qrData).toBeNull();
    });
  });

  describe("getDeviceCount", () => {
    it("should return 0 initially", () => {
      expect(verification.getDeviceCount()).toBe(0);
    });

    it("should return correct count", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const device2: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device2);

      expect(verification.getDeviceCount()).toBe(2);
    });
  });

  describe("clearOtherDevices", () => {
    it("should clear all devices except own", () => {
      verification.initialize("device-1", mockJwk, "0102");

      const device2: Device = {
        id: "device-2",
        name: "Test 2",
        type: "mobile",
        os: "iOS",
        browser: "Safari",
        fingerprint: "0304",
        trustLevel: "tofu",
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        verifiedAt: null,
        verifiedBy: null,
        publicKey: mockJwk,
      };

      verification.addDevice(device2);
      verification.clearOtherDevices();

      expect(verification.getDeviceCount()).toBe(1);
      expect(verification.getDevice("device-1")).toBeDefined();
      expect(verification.getDevice("device-2")).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      verification.initialize("device-1", mockJwk, "0102");
      verification.reset();

      expect(verification.getOwnDeviceId()).toBeNull();
      expect(verification.getDeviceCount()).toBe(0);
    });
  });
});

// ============================================================================
// Singleton Instance Tests
// ============================================================================

describe("Singleton Instance", () => {
  it("should export deviceVerification singleton", () => {
    expect(deviceVerification).toBeInstanceOf(DeviceVerification);
  });
});
