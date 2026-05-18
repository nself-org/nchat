/**
 * @fileoverview Tests for Socket.io configuration
 */

import { SOCKET_CONFIG } from "../config";

describe("SOCKET_CONFIG", () => {
  describe("url", () => {
    it("should have a default URL", () => {
      expect(SOCKET_CONFIG.url).toBeDefined();
      expect(typeof SOCKET_CONFIG.url).toBe("string");
    });

    it("should use localhost:3001 as default", () => {
      // Default when NEXT_PUBLIC_SOCKET_URL is not set
      expect(SOCKET_CONFIG.url).toContain("localhost");
    });

    it("should be a valid URL format", () => {
      expect(SOCKET_CONFIG.url).toMatch(/^https?:\/\//);
    });
  });

  describe("options", () => {
    it("should have reconnection enabled", () => {
      expect(SOCKET_CONFIG.options.reconnection).toBe(true);
    });

    it("should have reconnection attempts set", () => {
      expect(SOCKET_CONFIG.options.reconnectionAttempts).toBe(5);
      expect(typeof SOCKET_CONFIG.options.reconnectionAttempts).toBe("number");
    });

    it("should have reconnection delay set", () => {
      expect(SOCKET_CONFIG.options.reconnectionDelay).toBe(1000);
      expect(typeof SOCKET_CONFIG.options.reconnectionDelay).toBe("number");
    });

    it("should have timeout set", () => {
      expect(SOCKET_CONFIG.options.timeout).toBe(10000);
      expect(typeof SOCKET_CONFIG.options.timeout).toBe("number");
    });

    it("should have reasonable reconnection attempts (1-10)", () => {
      expect(SOCKET_CONFIG.options.reconnectionAttempts).toBeGreaterThanOrEqual(
        1,
      );
      expect(SOCKET_CONFIG.options.reconnectionAttempts).toBeLessThanOrEqual(
        10,
      );
    });

    it("should have reasonable timeout (1-30 seconds)", () => {
      expect(SOCKET_CONFIG.options.timeout).toBeGreaterThanOrEqual(1000);
      expect(SOCKET_CONFIG.options.timeout).toBeLessThanOrEqual(30000);
    });

    it("should have reasonable reconnection delay (100ms - 10s)", () => {
      expect(SOCKET_CONFIG.options.reconnectionDelay).toBeGreaterThanOrEqual(
        100,
      );
      expect(SOCKET_CONFIG.options.reconnectionDelay).toBeLessThanOrEqual(
        10000,
      );
    });
  });

  describe("structure", () => {
    it("should have url property", () => {
      expect(SOCKET_CONFIG).toHaveProperty("url");
    });

    it("should have options property", () => {
      expect(SOCKET_CONFIG).toHaveProperty("options");
    });

    it("should have exactly 2 top-level properties", () => {
      expect(Object.keys(SOCKET_CONFIG)).toHaveLength(2);
    });

    it("should have exactly 4 options properties", () => {
      expect(Object.keys(SOCKET_CONFIG.options)).toHaveLength(4);
    });
  });
});
