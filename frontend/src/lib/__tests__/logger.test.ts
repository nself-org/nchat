/**
 * Tests for logger utility
 */

import { logger, createLogger } from "../logger";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

describe("Logger", () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleSpy: {
    debug: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, "debug").mockImplementation(),
      info: jest.spyOn(console, "info").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    process.env.NODE_ENV = originalEnv;
  });

  describe("debug", () => {
    it("should not log (debug disabled for performance)", () => {
      // Debug logging is intentionally disabled to reduce noise
      process.env.NODE_ENV = "development";
      logger.debug("Test message");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should not log with context (debug disabled)", () => {
      process.env.NODE_ENV = "development";
      const context = { userId: "123" };
      logger.debug("Test message", context);
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should not log in production", () => {
      process.env.NODE_ENV = "production";
      logger.debug("Test message");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("should log in development", () => {
      process.env.NODE_ENV = "development";
      logger.info("Test message");
      expect(consoleSpy.info).toHaveBeenCalledWith("[INFO] Test message", "");
    });

    it("should log with context", () => {
      process.env.NODE_ENV = "development";
      const context = { action: "click" };
      logger.info("Test message", context);
      expect(consoleSpy.info).toHaveBeenCalledWith(
        "[INFO] Test message",
        context,
      );
    });
  });

  describe("warn", () => {
    it("should always log warnings", () => {
      logger.warn("Warning message");
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log with context", () => {
      const context = { code: "WARN_001" };
      logger.warn("Warning message", context);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        "[WARN] Warning message",
        context,
      );
    });
  });

  describe("error", () => {
    it("should always log errors", () => {
      const error = new Error("Test error");
      logger.error("Error message", error);
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should log with context", () => {
      const error = new Error("Test error");
      const context = { userId: "123" };
      logger.error("Error message", error, context);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "[ERROR] Error message",
        error,
        context,
      );
    });

    it("should handle non-Error objects", () => {
      logger.error("Error message", "string error");
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("log", () => {
    it("should route to debug (disabled)", () => {
      // Debug is disabled, so nothing should be logged
      process.env.NODE_ENV = "development";
      logger.log("debug", "Test message");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should route to info", () => {
      process.env.NODE_ENV = "development";
      logger.log("info", "Test message");
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should route to warn", () => {
      logger.log("warn", "Test message");
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should route to error", () => {
      logger.log("error", "Test message");
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("scoped logger", () => {
    it("should create scoped logger", () => {
      const scopedLogger = logger.scope("TestModule");
      expect(scopedLogger).toBeDefined();
    });

    it("should prefix messages with scope (debug disabled)", () => {
      // Debug is disabled, so nothing should be logged
      process.env.NODE_ENV = "development";
      const scopedLogger = logger.scope("TestModule");
      scopedLogger.debug("Test message");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should work with all log levels", () => {
      process.env.NODE_ENV = "development";
      const scopedLogger = logger.scope("TestModule");

      scopedLogger.debug("Debug");
      scopedLogger.info("Info");
      scopedLogger.warn("Warn");
      scopedLogger.error("Error", new Error("test"));

      // Debug is disabled
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("createLogger", () => {
    it("should create scoped logger", () => {
      const log = createLogger("MyModule");
      expect(log).toBeDefined();
    });

    it("should work like scoped logger", () => {
      process.env.NODE_ENV = "development";
      const log = createLogger("MyModule");
      log.info("Test");
      expect(consoleSpy.info).toHaveBeenCalledWith(
        "[INFO] [MyModule] Test",
        "",
      );
    });
  });
});
