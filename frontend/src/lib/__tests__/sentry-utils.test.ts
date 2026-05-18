/**
 * Tests for Sentry utility functions
 */

import * as Sentry from "@sentry/nextjs";
import {
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  addSentryBreadcrumb,
  captureError,
  captureMessage,
  setSentryTags,
  hasOptedOutOfTracking,
  optOutOfTracking,
  optInToTracking,
} from "../sentry-utils";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  setUser: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setTag: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    finish: jest.fn(),
  })),
  close: jest.fn(),
}));

describe("sentry-utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe("setSentryUser", () => {
    it("should set user in Sentry", () => {
      const user = {
        id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "admin",
      };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "admin",
      });
    });

    it("should work with minimal user data", () => {
      const user = { id: "123" };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: "123",
        email: undefined,
        username: undefined,
        role: undefined,
      });
    });
  });

  describe("clearSentryUser", () => {
    it("should clear user in Sentry", () => {
      clearSentryUser();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe("setSentryContext", () => {
    it("should set context in Sentry", () => {
      const context = { channelId: "123", type: "public" };

      setSentryContext("channel", context);

      expect(Sentry.setContext).toHaveBeenCalledWith("channel", context);
    });
  });

  describe("addSentryBreadcrumb", () => {
    it("should add breadcrumb with default level", () => {
      addSentryBreadcrumb("chat", "Message sent", { channelId: "123" });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "chat",
        message: "Message sent",
        level: "info",
        data: { channelId: "123" },
      });
    });

    it("should add breadcrumb with custom level", () => {
      addSentryBreadcrumb("auth", "Login failed", undefined, "error");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "auth",
        message: "Login failed",
        level: "error",
        data: undefined,
      });
    });
  });

  describe("captureError", () => {
    it("should capture error with context", () => {
      const error = new Error("Test error");
      const context = {
        tags: { feature: "chat" },
        extra: { channelId: "123" },
        level: "error" as const,
      };

      captureError(error, context);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, context);
    });

    it("should capture error without context", () => {
      const error = new Error("Test error");

      captureError(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: undefined,
        extra: undefined,
        level: undefined,
      });
    });
  });

  describe("captureMessage", () => {
    it("should capture message with context", () => {
      const context = {
        tags: { feature: "upload" },
        extra: { fileSize: 1024 },
        level: "info" as const,
      };

      captureMessage("File uploaded", context);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "File uploaded",
        context,
      );
    });

    it("should capture message with default level", () => {
      captureMessage("Test message");

      expect(Sentry.captureMessage).toHaveBeenCalledWith("Test message", {
        tags: undefined,
        extra: undefined,
        level: "info",
      });
    });
  });

  describe("setSentryTags", () => {
    it("should set multiple tags", () => {
      setSentryTags({ feature: "chat", userId: "123" });

      expect(Sentry.setTag).toHaveBeenCalledWith("feature", "chat");
      expect(Sentry.setTag).toHaveBeenCalledWith("userId", "123");
    });
  });

  describe("opt-out functionality", () => {
    it("should check opt-out status", () => {
      expect(hasOptedOutOfTracking()).toBe(false);

      localStorage.setItem("sentry-opt-out", "true");

      expect(hasOptedOutOfTracking()).toBe(true);
    });

    it("should opt out of tracking", () => {
      optOutOfTracking();

      expect(localStorage.getItem("sentry-opt-out")).toBe("true");
      expect(Sentry.close).toHaveBeenCalled();
    });

    it("should opt in to tracking", () => {
      localStorage.setItem("sentry-opt-out", "true");

      optInToTracking();

      expect(localStorage.getItem("sentry-opt-out")).toBeNull();
    });
  });
});
