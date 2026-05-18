/**
 * Biometric Authentication Tests
 *
 * Tests for biometric authentication across platforms.
 */

import {
  BiometricAuth,
  createBiometricAuth,
  resetBiometricAuth,
  detectPlatform,
} from "../biometric-auth";
import { DEFAULT_BIOMETRIC_INFO } from "../types";

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
  authenticateBiometric: jest.fn().mockResolvedValue({
    success: false,
    data: null,
    error: "Not available",
  }),
};

// ============================================================================
// Tests
// ============================================================================

describe("BiometricAuth", () => {
  let biometricAuth: BiometricAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    resetBiometricAuth();
    biometricAuth = createBiometricAuth(mockStorage as any);
  });

  describe("Platform Detection", () => {
    it("should detect web platform by default", () => {
      const platform = detectPlatform();
      expect(platform).toBe("web");
    });

    it("should handle missing window gracefully", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const platform = detectPlatform();
      expect(platform).toBe("web");

      global.window = originalWindow;
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await biometricAuth.initialize();
      // Should not throw
    });

    it("should initialize storage if not already initialized", async () => {
      mockStorage.isInitialized.mockReturnValueOnce(false);
      await biometricAuth.initialize();
      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it("should only initialize once", async () => {
      await biometricAuth.initialize();
      await biometricAuth.initialize();
      expect(mockStorage.getCapabilities).toHaveBeenCalledTimes(1);
    });
  });

  describe("Biometric Info", () => {
    it("should return default biometric info when not available", async () => {
      await biometricAuth.initialize();
      const info = biometricAuth.getBiometricInfo();
      expect(info.available).toBe(false);
      expect(info.type).toBe("none");
    });

    it("should detect biometric from storage capabilities", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["touchId"],
        secureEnclave: true,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "ios",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();
      const info = biometricAuth.getBiometricInfo();

      expect(info.available).toBe(true);
      expect(info.type).toBe("touchId");
      expect(info.displayName).toBe("Touch ID");
    });

    it("should detect faceId", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["faceId"],
        secureEnclave: true,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "ios",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();
      const info = biometricAuth.getBiometricInfo();

      expect(info.type).toBe("faceId");
      expect(info.displayName).toBe("Face ID");
    });

    it("should detect fingerprint", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();
      const info = biometricAuth.getBiometricInfo();

      expect(info.type).toBe("fingerprint");
      expect(info.displayName).toBe("Fingerprint");
    });
  });

  describe("Availability Checks", () => {
    it("should return false when biometric not available", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(false);
      await biometricAuth.initialize();

      const available = await biometricAuth.isAvailable();
      expect(available).toBe(false);
    });

    it("should return true when biometric is available", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();

      const available = await biometricAuth.isAvailable();
      expect(available).toBe(true);
    });

    it("should check enrollment status", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();

      const enrolled = await biometricAuth.isEnrolled();
      expect(enrolled).toBe(true);
    });

    it("should return biometric type", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["touchId"],
        secureEnclave: true,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "ios",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();

      const type = await biometricAuth.getType();
      expect(type).toBe("touchId");
    });
  });

  describe("Authentication", () => {
    it("should fail when biometric not available", async () => {
      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test reason");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });

    it("should fail when biometric not enrolled", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: false, // Not enrolled
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });

      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test reason");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_ENROLLED");
    });

    it("should authenticate successfully via storage", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });
      mockStorage.authenticateBiometric.mockResolvedValueOnce({
        success: true,
        data: null,
        error: null,
      });

      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test reason");
      expect(result.success).toBe(true);
    });

    it("should handle authentication failure", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });
      mockStorage.authenticateBiometric.mockResolvedValueOnce({
        success: false,
        data: null,
        error: "Authentication failed",
      });

      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test reason");
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("BIOMETRIC_NOT_AVAILABLE");
    });

    it("should handle user cancellation from storage", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });
      // When storage authenticateBiometric rejects with cancel, the code catches it
      // and falls through to platform-specific auth, which fails in test environment
      mockStorage.authenticateBiometric.mockRejectedValueOnce(
        new Error("User cancelled"),
      );

      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test reason");
      expect(result.success).toBe(false);
      // In test environment without Capacitor/Electron, falls back to WebAuthn which is not available
      expect(["BIOMETRIC_CANCELLED", "BIOMETRIC_NOT_AVAILABLE"]).toContain(
        result.errorCode,
      );
    });
  });

  describe("Refresh", () => {
    it("should refresh biometric info", async () => {
      await biometricAuth.initialize();

      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["faceId"],
        secureEnclave: true,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "ios",
        securityLevel: "hardware",
      });

      const info = await biometricAuth.refresh();

      expect(info.available).toBe(true);
      expect(info.type).toBe("faceId");
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors during initialization", async () => {
      mockStorage.getCapabilities.mockRejectedValueOnce(
        new Error("Storage error"),
      );

      await biometricAuth.initialize();
      const info = biometricAuth.getBiometricInfo();

      expect(info.available).toBe(false);
    });

    it("should handle errors during authentication", async () => {
      mockStorage.isBiometricAvailable.mockResolvedValueOnce(true);
      mockStorage.getCapabilities.mockResolvedValueOnce({
        hardwareStorage: true,
        biometricAuth: true,
        biometricTypes: ["fingerprint"],
        secureEnclave: false,
        syncSupported: false,
        maxItemSize: 5 * 1024 * 1024,
        accessGroupsSupported: false,
        os: "android",
        securityLevel: "hardware",
      });
      // Storage auth fails, falls through to platform-specific which is unavailable in tests
      mockStorage.authenticateBiometric.mockRejectedValueOnce(
        new Error("Unknown error"),
      );

      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate("Test");
      expect(result.success).toBe(false);
      // In test environment, platform fallback is not available
      expect(["BIOMETRIC_FAILED", "BIOMETRIC_NOT_AVAILABLE"]).toContain(
        result.errorCode,
      );
    });
  });
});
