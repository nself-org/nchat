/**
 * @jest-environment node
 */

/**
 * 2FA API Route Tests
 *
 * Integration tests for Two-Factor Authentication endpoints:
 * - /api/auth/2fa/setup
 * - /api/auth/2fa/verify-setup
 * - /api/auth/2fa/verify
 * - /api/auth/2fa/disable
 * - /api/auth/2fa/backup-codes
 * - /api/auth/2fa/status
 * - /api/auth/2fa/trusted-devices
 */

import { NextRequest } from "next/server";

// Mock the TOTP library before importing routes
jest.mock("speakeasy", () => ({
  generateSecret: jest.fn(() => ({
    ascii: "test-ascii-secret",
    base32: "JBSWY3DPEHPK3PXP",
    otpauth_url:
      "otpauth://totp/nchat:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=nchat",
  })),
  totp: {
    verify: jest.fn(({ token }) => token === "123456"),
  },
}));

// Mock QRCode
jest.mock("qrcode", () => ({
  toDataURL: jest.fn(() =>
    Promise.resolve("data:image/png;base64,mockQRCodeData"),
  ),
}));

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  hash: jest.fn((code: string) => Promise.resolve(`$2a$10$hashed_${code}`)),
  compare: jest.fn((code: string, hash: string) => {
    const normalizedCode = code.replace(/[-\s]/g, "").toUpperCase();
    return Promise.resolve(hash.includes(normalizedCode));
  }),
}));

// Mock Apollo Client
const mockQuery = jest.fn();
const mockMutate = jest.fn();

jest.mock("@/lib/apollo-client", () => ({
  getApolloClient: () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    mutate: (...args: unknown[]) => mockMutate(...args),
  }),
}));

// Mock auth config
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    useDevAuth: true,
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { POST as SetupPOST } from "../auth/2fa/setup/route";
import { POST as VerifySetupPOST } from "../auth/2fa/verify-setup/route";
import { POST as VerifyPOST } from "../auth/2fa/verify/route";
import { POST as DisablePOST } from "../auth/2fa/disable/route";
import {
  GET as BackupCodesGET,
  POST as BackupCodesPOST,
} from "../auth/2fa/backup-codes/route";
import { GET as StatusGET } from "../auth/2fa/status/route";
import {
  GET as TrustedDevicesGET,
  DELETE as TrustedDevicesDELETE,
} from "../auth/2fa/trusted-devices/route";

describe("2FA API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/2fa/setup", () => {
    it("should generate TOTP secret and QR code", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/setup",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            email: "test@example.com",
          }),
        },
      );

      const response = await SetupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("secret");
      expect(data.data).toHaveProperty("qrCodeDataUrl");
      expect(data.data).toHaveProperty("otpauthUrl");
      expect(data.data).toHaveProperty("backupCodes");
      expect(data.data).toHaveProperty("manualEntryCode");
      expect(data.data.backupCodes).toHaveLength(10);
    });

    it("should require userId and email", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/setup",
        {
          method: "POST",
          body: JSON.stringify({ userId: "user-123" }),
        },
      );

      const response = await SetupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });

  describe("POST /api/auth/2fa/verify-setup", () => {
    it("should enable 2FA with valid TOTP code", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_user_2fa_settings_one: {
            id: "settings-123",
            is_enabled: true,
          },
          delete_nchat_user_backup_codes: { affected_rows: 0 },
          insert_nchat_user_backup_codes: { affected_rows: 10 },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify-setup",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            secret: "JBSWY3DPEHPK3PXP",
            code: "123456",
            backupCodes: ["ABCD-1234", "EFGH-5678"],
          }),
        },
      );

      const response = await VerifySetupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("enabled");
    });

    it("should reject invalid TOTP code", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify-setup",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            secret: "JBSWY3DPEHPK3PXP",
            code: "000000", // Invalid code
            backupCodes: ["ABCD-1234"],
          }),
        },
      );

      const response = await VerifySetupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should require all fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify-setup",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            secret: "JBSWY3DPEHPK3PXP",
            // Missing code and backupCodes
          }),
        },
      );

      const response = await VerifySetupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing");
    });
  });

  describe("POST /api/auth/2fa/verify", () => {
    it("should verify valid TOTP code during login", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
              is_enabled: true,
            },
          ],
          nchat_user_backup_codes: [],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            update_nchat_user_2fa_settings_by_pk: { id: "settings-123" },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            code: "123456",
          }),
        },
      );

      const response = await VerifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usedBackupCode).toBe(false);
    });

    it("should verify valid backup code", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
              is_enabled: true,
            },
          ],
          nchat_user_backup_codes: [
            {
              id: "backup-code-1",
              code_hash: "$2a$10$hashed_ABCD1234",
            },
          ],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            update_nchat_user_2fa_settings_by_pk: { id: "settings-123" },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            code: "ABCD-1234",
          }),
        },
      );

      const response = await VerifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usedBackupCode).toBe(true);
    });

    it("should reject invalid code", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
              is_enabled: true,
            },
          ],
          nchat_user_backup_codes: [],
        },
      });

      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            code: "000000",
          }),
        },
      );

      const response = await VerifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid");
    });

    it("should return error if 2FA not enabled", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [],
          nchat_user_backup_codes: [],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/verify",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            code: "123456",
          }),
        },
      );

      const response = await VerifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not enabled");
    });
  });

  describe("POST /api/auth/2fa/disable", () => {
    it("should disable 2FA with valid TOTP code", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            update_nchat_user_2fa_settings: { affected_rows: 1 },
            delete_nchat_user_backup_codes: { affected_rows: 10 },
            delete_nchat_user_trusted_devices: { affected_rows: 2 },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/disable",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            totpCode: "123456",
          }),
        },
      );

      const response = await DisablePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("disabled");
    });

    it("should disable 2FA with valid password in dev mode", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            update_nchat_user_2fa_settings: { affected_rows: 1 },
            delete_nchat_user_backup_codes: { affected_rows: 10 },
            delete_nchat_user_trusted_devices: { affected_rows: 2 },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/disable",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            password: "password123",
          }),
        },
      );

      const response = await DisablePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should require password or TOTP code", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/disable",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
          }),
        },
      );

      const response = await DisablePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject invalid credentials", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/disable",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            totpCode: "000000",
            password: "wrongpassword",
          }),
        },
      );

      const response = await DisablePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Invalid");
    });
  });

  describe("GET /api/auth/2fa/backup-codes", () => {
    it("should return backup codes status", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          total: { aggregate: { count: 10 } },
          unused: { aggregate: { count: 8 } },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes?userId=user-123",
      );

      const response = await BackupCodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(10);
      expect(data.data.unused).toBe(8);
      expect(data.data.used).toBe(2);
    });

    it("should require userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
      );

      const response = await BackupCodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });

  describe("POST /api/auth/2fa/backup-codes", () => {
    it("should regenerate backup codes with valid TOTP", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            delete_nchat_user_backup_codes: { affected_rows: 10 },
            insert_nchat_user_backup_codes: { affected_rows: 10 },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            totpCode: "123456",
          }),
        },
      );

      const response = await BackupCodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.codes).toHaveLength(10);
      expect(data.data.created).toBe(10);
    });

    it("should regenerate backup codes with valid password in dev mode", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate
        .mockResolvedValueOnce({
          data: {
            insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
          },
        })
        .mockResolvedValueOnce({
          data: {
            delete_nchat_user_backup_codes: { affected_rows: 10 },
            insert_nchat_user_backup_codes: { affected_rows: 10 },
          },
        });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            password: "password123",
          }),
        },
      );

      const response = await BackupCodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.codes).toHaveLength(10);
    });

    it("should require password or TOTP code", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
          }),
        },
      );

      const response = await BackupCodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should reject invalid credentials", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              secret: "JBSWY3DPEHPK3PXP",
            },
          ],
        },
      });

      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_2fa_verification_attempts_one: { id: "attempt-1" },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            totpCode: "000000",
            password: "wrongpassword",
          }),
        },
      );

      const response = await BackupCodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Invalid");
    });

    it("should fail if 2FA not enabled", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/backup-codes",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-123",
            totpCode: "123456",
          }),
        },
      );

      const response = await BackupCodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not enabled");
    });
  });

  describe("GET /api/auth/2fa/status", () => {
    it("should return 2FA status for user", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [
            {
              id: "settings-123",
              is_enabled: true,
              enabled_at: "2026-01-15T10:00:00Z",
              last_used_at: "2026-02-05T14:30:00Z",
            },
          ],
          backup_codes_total: { aggregate: { count: 10 } },
          backup_codes_unused: { aggregate: { count: 7 } },
          trusted_devices: [
            {
              id: "device-1",
              device_name: "Chrome on macOS",
              device_id: "abc123",
              trusted_until: "2026-03-07T10:00:00Z",
              last_used_at: "2026-02-05T14:30:00Z",
              created_at: "2026-02-05T10:00:00Z",
            },
          ],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/status?userId=user-123",
      );

      const response = await StatusGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isEnabled).toBe(true);
      expect(data.data.backupCodes.total).toBe(10);
      expect(data.data.backupCodes.unused).toBe(7);
      expect(data.data.backupCodes.used).toBe(3);
      expect(data.data.trustedDevices).toHaveLength(1);
    });

    it("should return disabled status when 2FA not set up", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_2fa_settings: [],
          backup_codes_total: { aggregate: { count: 0 } },
          backup_codes_unused: { aggregate: { count: 0 } },
          trusted_devices: [],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/status?userId=user-123",
      );

      const response = await StatusGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isEnabled).toBe(false);
    });

    it("should require userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/status",
      );

      const response = await StatusGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });

  describe("GET /api/auth/2fa/trusted-devices", () => {
    it("should list trusted devices", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_trusted_devices: [
            {
              id: "device-1",
              device_id: "abc123",
              device_name: "Chrome on macOS",
              device_info: { platform: "MacIntel" },
              trusted_until: "2026-03-07T10:00:00Z",
              last_used_at: "2026-02-05T14:30:00Z",
              created_at: "2026-02-05T10:00:00Z",
            },
            {
              id: "device-2",
              device_id: "def456",
              device_name: "Firefox on Windows",
              device_info: { platform: "Win32" },
              trusted_until: "2026-03-01T10:00:00Z",
              last_used_at: "2026-02-01T10:00:00Z",
              created_at: "2026-01-15T10:00:00Z",
            },
          ],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices?userId=user-123",
      );

      const response = await TrustedDevicesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.devices).toHaveLength(2);
      expect(data.data.total).toBe(2);
    });

    it("should check if specific device is trusted", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_trusted_devices: [
            {
              id: "device-1",
              device_name: "Chrome on macOS",
              trusted_until: "2026-03-07T10:00:00Z",
            },
          ],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices?userId=user-123&deviceId=abc123&action=check",
      );

      const response = await TrustedDevicesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isTrusted).toBe(true);
      expect(data.data.device).toBeTruthy();
    });

    it("should return false for untrusted device", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_user_trusted_devices: [],
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices?userId=user-123&deviceId=unknown&action=check",
      );

      const response = await TrustedDevicesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isTrusted).toBe(false);
      expect(data.data.device).toBeNull();
    });

    it("should require userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices",
      );

      const response = await TrustedDevicesGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });

  describe("DELETE /api/auth/2fa/trusted-devices", () => {
    it("should remove trusted device", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          delete_nchat_user_trusted_devices_by_pk: {
            id: "device-1",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices?id=device-1",
        {
          method: "DELETE",
        },
      );

      const response = await TrustedDevicesDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("removed");
    });

    it("should require device id", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/auth/2fa/trusted-devices",
        {
          method: "DELETE",
        },
      );

      const response = await TrustedDevicesDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });
  });
});
