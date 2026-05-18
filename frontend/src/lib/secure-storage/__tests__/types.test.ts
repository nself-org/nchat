/**
 * Secure Storage Types Tests
 *
 * Tests for type definitions and error classes.
 */

import {
  SecureStorageError,
  DEFAULT_SERVICE,
  MAX_ITEM_SIZE,
  STORAGE_KEY_PREFIX,
  METADATA_SUFFIX,
} from "../types";

describe("SecureStorageError", () => {
  it("should create error with message and code", () => {
    const error = new SecureStorageError("Test error", "NOT_AVAILABLE");

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("NOT_AVAILABLE");
    expect(error.name).toBe("SecureStorageError");
  });

  it("should store original error", () => {
    const originalError = new Error("Original");
    const error = new SecureStorageError(
      "Wrapped error",
      "PLATFORM_ERROR",
      originalError,
    );

    expect(error.originalError).toBe(originalError);
  });

  it("should convert to result", () => {
    const error = new SecureStorageError("Test error", "NOT_INITIALIZED");
    const result = error.toResult<string>();

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Test error");
    expect(result.errorCode).toBe("NOT_INITIALIZED");
  });

  describe("error codes", () => {
    const errorCodes = [
      "NOT_AVAILABLE",
      "NOT_INITIALIZED",
      "ITEM_NOT_FOUND",
      "ACCESS_DENIED",
      "BIOMETRIC_FAILED",
      "BIOMETRIC_CANCELLED",
      "BIOMETRIC_NOT_AVAILABLE",
      "ENCRYPTION_FAILED",
      "DECRYPTION_FAILED",
      "SERIALIZATION_FAILED",
      "DESERIALIZATION_FAILED",
      "STORAGE_FULL",
      "KEY_NOT_FOUND",
      "INVALID_KEY",
      "PLATFORM_ERROR",
      "UNKNOWN_ERROR",
    ] as const;

    errorCodes.forEach((code) => {
      it(`should accept error code: ${code}`, () => {
        const error = new SecureStorageError("Test", code);
        expect(error.code).toBe(code);
      });
    });
  });
});

describe("Constants", () => {
  it("should have correct DEFAULT_SERVICE", () => {
    expect(DEFAULT_SERVICE).toBe("com.nchat.secure-storage");
  });

  it("should have correct MAX_ITEM_SIZE", () => {
    expect(MAX_ITEM_SIZE).toBe(5 * 1024 * 1024); // 5MB
  });

  it("should have correct STORAGE_KEY_PREFIX", () => {
    expect(STORAGE_KEY_PREFIX).toBe("nchat_secure_");
  });

  it("should have correct METADATA_SUFFIX", () => {
    expect(METADATA_SUFFIX).toBe("_meta");
  });
});
