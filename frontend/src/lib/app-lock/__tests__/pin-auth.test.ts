/**
 * PIN Authentication Tests
 *
 * Tests for PIN setting, verification, and security features.
 */

import { PinAuth, createPinAuth, resetPinAuth } from "../pin-auth";
import { STORAGE_KEYS, SECURE_STORAGE_SERVICE } from "../types";

// ============================================================================
// Mock Setup
// ============================================================================

const mockStorage = {
  os: "web" as const,
  isInitialized: jest.fn().mockReturnValue(true),
  initialize: jest.fn().mockResolvedValue(undefined),
  getCapabilities: jest.fn().mockResolvedValue({
    hardwareStorage: false,
    biometricAuth: false,
    biometricTypes: [],
    secureEnclave: false,
    syncSupported: false,
    maxItemSize: 5 * 1024 * 1024,
    accessGroupsSupported: false,
    os: "web",
    securityLevel: "encrypted",
  }),
  setItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  hasItem: jest.fn().mockResolvedValue(false),
  removeItem: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getAllKeys: jest.fn().mockResolvedValue([]),
  clear: jest
    .fn()
    .mockResolvedValue({ success: true, data: null, error: null }),
  getItemMeta: jest.fn().mockResolvedValue(null),
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
  authenticateBiometric: jest
    .fn()
    .mockResolvedValue({ success: false, data: null, error: "Not available" }),
};

// ============================================================================
// Tests
// ============================================================================

describe("PinAuth", () => {
  let pinAuth: PinAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPinAuth();
    pinAuth = createPinAuth(mockStorage as any, 6);
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await pinAuth.initialize();
      expect(mockStorage.initialize).not.toHaveBeenCalled(); // Already initialized
    });

    it("should initialize storage if not already initialized", async () => {
      mockStorage.isInitialized.mockReturnValueOnce(false);
      await pinAuth.initialize();
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it("should only initialize once", async () => {
      await pinAuth.initialize();
      await pinAuth.initialize();
      // Should not call anything twice
      expect(mockStorage.isInitialized).toHaveBeenCalledTimes(1);
    });
  });

  describe("PIN Length", () => {
    it("should use provided PIN length", () => {
      expect(pinAuth.getPinLength()).toBe(6);
    });

    it("should enforce minimum PIN length of 4", () => {
      const shortPinAuth = createPinAuth(mockStorage as any, 2);
      expect(shortPinAuth.getPinLength()).toBe(4);
    });

    it("should enforce maximum PIN length of 8", () => {
      const longPinAuth = createPinAuth(mockStorage as any, 12);
      expect(longPinAuth.getPinLength()).toBe(8);
    });

    it("should allow updating PIN length", () => {
      pinAuth.setPinLength(4);
      expect(pinAuth.getPinLength()).toBe(4);
    });
  });

  describe("hasPinSet", () => {
    it("should return false when no PIN is set", async () => {
      mockStorage.hasItem.mockResolvedValueOnce(false);
      const result = await pinAuth.hasPinSet();
      expect(result).toBe(false);
      expect(mockStorage.hasItem).toHaveBeenCalledWith(STORAGE_KEYS.PIN_HASH, {
        service: SECURE_STORAGE_SERVICE,
      });
    });

    it("should return true when PIN is set", async () => {
      mockStorage.hasItem.mockResolvedValueOnce(true);
      const result = await pinAuth.hasPinSet();
      expect(result).toBe(true);
    });
  });

  describe("setPin", () => {
    it("should reject PIN with non-digit characters", async () => {
      const result = await pinAuth.setPin("12ab56");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
    });

    it("should reject PIN that is too short", async () => {
      const result = await pinAuth.setPin("123");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_TOO_SHORT");
    });

    it("should reject PIN that is too long", async () => {
      const result = await pinAuth.setPin("123456789");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_TOO_LONG");
    });

    it("should accept valid PIN", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      const result = await pinAuth.setPin("123456");
      expect(result.success).toBe(true);
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it("should store hashed PIN data with salt", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");

      const [key, value, options] = mockStorage.setItem.mock.calls[0];
      expect(key).toBe(STORAGE_KEYS.PIN_HASH);
      expect(options.service).toBe(SECURE_STORAGE_SERVICE);

      const storedData = JSON.parse(value);
      expect(storedData.hash).toBeTruthy();
      expect(storedData.salt).toBeTruthy();
      expect(storedData.iterations).toBe(100000);
      expect(storedData.algorithm).toBe("SHA-256");
      expect(storedData.createdAt).toBeTruthy();
    });

    it("should generate different hashes for the same PIN", async () => {
      mockStorage.setItem.mockResolvedValue({
        success: true,
        data: null,
        error: null,
      });

      await pinAuth.setPin("123456");
      const firstHash = JSON.parse(mockStorage.setItem.mock.calls[0][1]);

      // Create new instance to reset
      const pinAuth2 = createPinAuth(mockStorage as any, 6);
      await pinAuth2.setPin("123456");
      const secondHash = JSON.parse(mockStorage.setItem.mock.calls[1][1]);

      // Hashes should be different due to random salt
      expect(firstHash.hash).not.toBe(secondHash.hash);
      expect(firstHash.salt).not.toBe(secondHash.salt);
    });

    it("should handle storage errors gracefully", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: false,
        data: null,
        error: "Storage full",
      });
      const result = await pinAuth.setPin("123456");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("STORAGE_ERROR");
    });
  });

  describe("verifyPin", () => {
    const storedPinData = {
      hash: "dGVzdGhhc2g=", // Base64 encoded test hash
      salt: "dGVzdHNhbHQ=", // Base64 encoded test salt
      iterations: 100000,
      algorithm: "SHA-256",
      createdAt: new Date().toISOString(),
    };

    it("should return error when no PIN is set", async () => {
      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await pinAuth.verifyPin("123456");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_NOT_SET");
    });

    it("should reject invalid PIN format", async () => {
      const result = await pinAuth.verifyPin("abc");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
    });

    it("should verify correct PIN", async () => {
      // First set a PIN
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");

      // Get the stored data from the setItem call
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      // Mock getItem to return the stored data
      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });

      const result = await pinAuth.verifyPin("123456");
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it("should reject incorrect PIN", async () => {
      // First set a PIN
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");

      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });

      const result = await pinAuth.verifyPin("654321");
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
    });
  });

  describe("changePin", () => {
    it("should reject if current PIN is wrong", async () => {
      // Set up existing PIN
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });

      const result = await pinAuth.changePin("wrong", "654321");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
    });

    it("should change PIN when current PIN is correct", async () => {
      // Set up existing PIN
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await pinAuth.changePin("123456", "654321");
      expect(result.success).toBe(true);
    });

    it("should reject new PIN with invalid format", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });

      const result = await pinAuth.changePin("123456", "12");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_TOO_SHORT");
    });
  });

  describe("removePin", () => {
    it("should reject if current PIN is wrong", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });

      const result = await pinAuth.removePin("wrong");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("INVALID_PIN");
    });

    it("should remove PIN when current PIN is correct", async () => {
      mockStorage.setItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });
      await pinAuth.setPin("123456");
      const storedValue = mockStorage.setItem.mock.calls[0][1];

      mockStorage.getItem.mockResolvedValueOnce({
        success: true,
        data: storedValue,
        error: null,
      });
      mockStorage.removeItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await pinAuth.removePin("123456");
      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.PIN_HASH,
        {
          service: SECURE_STORAGE_SERVICE,
        },
      );
    });
  });

  describe("forceRemovePin", () => {
    it("should remove PIN without verification", async () => {
      mockStorage.removeItem.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      const result = await pinAuth.forceRemovePin();
      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalled();
    });

    it("should handle storage errors", async () => {
      mockStorage.removeItem.mockRejectedValueOnce(new Error("Storage error"));

      const result = await pinAuth.forceRemovePin();
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("STORAGE_ERROR");
    });
  });
});
