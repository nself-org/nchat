/**
 * Tests for Auth Configuration
 *
 * Tests security guards and configuration validation.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

describe("Auth Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validatePassword", () => {
    it("should validate password with minimum length", () => {
      // Re-import to get fresh config
      const { validatePassword } = require("../auth.config");

      const result = validatePassword("short");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters");
    });

    it("should require uppercase letter", () => {
      const { validatePassword } = require("../auth.config");

      const result = validatePassword("lowercase123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter",
      );
    });

    it("should require lowercase letter", () => {
      const { validatePassword } = require("../auth.config");

      const result = validatePassword("UPPERCASE123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter",
      );
    });

    it("should require number", () => {
      const { validatePassword } = require("../auth.config");

      const result = validatePassword("PasswordOnly");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number",
      );
    });

    it("should accept valid password", () => {
      const { validatePassword } = require("../auth.config");

      const result = validatePassword("ValidPassword123");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("isEmailDomainAllowed", () => {
    it("should allow all domains when allowedDomains is empty", () => {
      process.env.NEXT_PUBLIC_ALLOWED_DOMAINS = "";
      jest.resetModules();
      const { isEmailDomainAllowed } = require("../auth.config");

      expect(isEmailDomainAllowed("test@example.com")).toBe(true);
      expect(isEmailDomainAllowed("test@company.org")).toBe(true);
    });

    it("should reject invalid email format", () => {
      const { isEmailDomainAllowed } = require("../auth.config");

      expect(isEmailDomainAllowed("invalid-email")).toBe(false);
    });
  });

  describe("isTwoFactorRequired", () => {
    it("should require 2FA for owner role", () => {
      const { isTwoFactorRequired } = require("../auth.config");

      expect(isTwoFactorRequired("owner")).toBe(true);
    });

    it("should require 2FA for admin role", () => {
      const { isTwoFactorRequired } = require("../auth.config");

      expect(isTwoFactorRequired("admin")).toBe(true);
    });

    it("should not require 2FA for member role by default", () => {
      const { isTwoFactorRequired } = require("../auth.config");

      expect(isTwoFactorRequired("member")).toBe(false);
    });
  });

  describe("getEnabledProviders", () => {
    it("should return enabled providers", () => {
      const { getEnabledProviders } = require("../auth.config");

      const providers = getEnabledProviders();
      expect(providers).toContain("email-password");
      expect(providers).toContain("magic-link");
    });
  });

  describe("Production Security Guards", () => {
    it("should not enable dev auth in production", () => {
      process.env.NODE_ENV = "production";
      process.env.NEXT_PUBLIC_USE_DEV_AUTH = "true";

      jest.resetModules();
      const { authConfig } = require("../auth.config");

      // Dev auth should be disabled even if env var is set
      expect(authConfig.useDevAuth).toBe(false);
    });

    it("should allow dev auth in development", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_USE_DEV_AUTH = "true";

      jest.resetModules();
      const { authConfig } = require("../auth.config");

      expect(authConfig.useDevAuth).toBe(true);
    });

    it("should have correct environment flags", () => {
      process.env.NODE_ENV = "production";

      jest.resetModules();
      const { authConfig } = require("../auth.config");

      expect(authConfig.isProduction).toBe(true);
      expect(authConfig.isDevelopment).toBe(false);
    });
  });
});

describe("Auth Configuration Types", () => {
  it("should export all required types", () => {
    const authConfigModule = require("../auth.config");

    expect(authConfigModule.authConfig).toBeDefined();
    expect(authConfigModule.validatePassword).toBeDefined();
    expect(authConfigModule.isEmailDomainAllowed).toBeDefined();
    expect(authConfigModule.isTwoFactorRequired).toBeDefined();
    expect(authConfigModule.getEnabledProviders).toBeDefined();
    expect(authConfigModule.isProviderEnabled).toBeDefined();
    expect(authConfigModule.verifySecurityConfiguration).toBeDefined();
  });
});
