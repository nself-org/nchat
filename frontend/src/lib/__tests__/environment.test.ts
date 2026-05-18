/**
 * Tests for environment utilities
 */

import {
  isDevelopment,
  isProduction,
  isStaging,
  isServer,
  isClient,
  getPublicEnv,
} from "../environment";

describe("Environment Utilities", () => {
  const originalWindow = global.window;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore window
    if (originalWindow === undefined) {
      // @ts-ignore
      delete global.window;
    } else {
      global.window = originalWindow;
    }
    // Restore env
    process.env = originalEnv;
  });

  describe("isDevelopment", () => {
    it("should return true in development (server)", () => {
      // @ts-ignore
      delete global.window;
      process.env.NODE_ENV = "development";
      expect(isDevelopment()).toBe(true);
    });

    it("should return true in development (client)", () => {
      global.window = {} as Window & typeof globalThis;
      process.env.NEXT_PUBLIC_ENV = "development";
      expect(isDevelopment()).toBe(true);
    });

    it("should return false in production", () => {
      // @ts-ignore
      delete global.window;
      process.env.NODE_ENV = "production";
      expect(isDevelopment()).toBe(false);
    });
  });

  describe("isProduction", () => {
    it("should return true in production (server)", () => {
      // @ts-ignore
      delete global.window;
      process.env.NODE_ENV = "production";
      expect(isProduction()).toBe(true);
    });

    it("should return true in production (client)", () => {
      global.window = {} as Window & typeof globalThis;
      process.env.NEXT_PUBLIC_ENV = "production";
      expect(isProduction()).toBe(true);
    });

    it("should return false in development", () => {
      // @ts-ignore
      delete global.window;
      process.env.NODE_ENV = "development";
      expect(isProduction()).toBe(false);
    });
  });

  describe("isStaging", () => {
    it("should return true in staging", () => {
      process.env.NEXT_PUBLIC_ENV = "staging";
      expect(isStaging()).toBe(true);
    });

    it("should return false in production", () => {
      process.env.NEXT_PUBLIC_ENV = "production";
      expect(isStaging()).toBe(false);
    });

    it("should return false in development", () => {
      process.env.NEXT_PUBLIC_ENV = "development";
      expect(isStaging()).toBe(false);
    });
  });

  describe("isServer", () => {
    it("should return true when window is undefined", () => {
      // @ts-ignore
      delete global.window;
      expect(isServer()).toBe(true);
    });

    it("should return false when window is defined", () => {
      global.window = {} as Window & typeof globalThis;
      expect(isServer()).toBe(false);
    });
  });

  describe("isClient", () => {
    it("should return true when window is defined", () => {
      global.window = {} as Window & typeof globalThis;
      expect(isClient()).toBe(true);
    });

    it("should return false when window is undefined", () => {
      // @ts-ignore
      delete global.window;
      expect(isClient()).toBe(false);
    });
  });

  describe("getPublicEnv", () => {
    it("should return environment variables with defaults", () => {
      const env = getPublicEnv();
      expect(env).toHaveProperty("NEXT_PUBLIC_ENV");
      expect(env).toHaveProperty("NEXT_PUBLIC_USE_DEV_AUTH");
      expect(env).toHaveProperty("NEXT_PUBLIC_APP_NAME");
    });

    it("should default to development", () => {
      delete process.env.NEXT_PUBLIC_ENV;
      const env = getPublicEnv();
      expect(env.NEXT_PUBLIC_ENV).toBe("development");
    });

    it("should return correct env value", () => {
      process.env.NEXT_PUBLIC_ENV = "production";
      const env = getPublicEnv();
      expect(env.NEXT_PUBLIC_ENV).toBe("production");
    });

    it("should parse USE_DEV_AUTH as boolean", () => {
      process.env.NEXT_PUBLIC_USE_DEV_AUTH = "true";
      expect(getPublicEnv().NEXT_PUBLIC_USE_DEV_AUTH).toBe(true);

      process.env.NEXT_PUBLIC_USE_DEV_AUTH = "false";
      expect(getPublicEnv().NEXT_PUBLIC_USE_DEV_AUTH).toBe(false);
    });

    it("should default app name to ɳChat", () => {
      delete process.env.NEXT_PUBLIC_APP_NAME;
      const env = getPublicEnv();
      expect(env.NEXT_PUBLIC_APP_NAME).toBe("ɳChat");
    });

    it("should use custom app name if set", () => {
      process.env.NEXT_PUBLIC_APP_NAME = "MyApp";
      const env = getPublicEnv();
      expect(env.NEXT_PUBLIC_APP_NAME).toBe("MyApp");
    });
  });
});
