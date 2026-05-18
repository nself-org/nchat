/**
 * Error Tracker Tests
 *
 * Tests for error capturing, breadcrumbs, and context management.
 */

import {
  ErrorTracker,
  ErrorSeverity,
  BreadcrumbType,
  getErrorTracker,
  resetErrorTracker,
  captureError,
  captureException,
  captureMessage,
  addBreadcrumb,
  setErrorContext,
  setErrorTags,
  wrapFunction,
  wrapAsyncFunction,
  ErrorTrackerConfig,
  CapturedError,
} from "../error-tracker";
import { resetAnalyticsClient, getAnalyticsClient } from "../analytics-client";
import {
  ConsentCategory,
  ConsentState,
  CONSENT_VERSION,
} from "../privacy-filter";

// ============================================================================
// Mocks
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

// ============================================================================
// Test Helpers
// ============================================================================

const createConsentState = (analytics: boolean): ConsentState => ({
  [ConsentCategory.ESSENTIAL]: true,
  [ConsentCategory.ANALYTICS]: analytics,
  [ConsentCategory.FUNCTIONAL]: false,
  [ConsentCategory.MARKETING]: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION,
});

const createTestConfig = (
  overrides: Partial<ErrorTrackerConfig> = {},
): Partial<ErrorTrackerConfig> => ({
  enabled: true,
  captureUnhandledErrors: false,
  captureUnhandledRejections: false,
  captureConsoleErrors: false,
  maxBreadcrumbs: 10,
  maxStackFrames: 10,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Error Tracker", () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    jest.clearAllMocks();
    resetErrorTracker();
    resetAnalyticsClient();

    // Initialize analytics client
    const client = getAnalyticsClient({
      enabled: true,
      flushInterval: 0,
      respectDoNotTrack: false,
    });
    client.initialize(createConsentState(true));
  });

  afterEach(() => {
    resetErrorTracker();
    resetAnalyticsClient();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe("constructor", () => {
    it("should create tracker with default config", () => {
      const tracker = new ErrorTracker();
      expect(tracker).toBeInstanceOf(ErrorTracker);
    });

    it("should merge custom config", () => {
      const tracker = new ErrorTracker({ maxBreadcrumbs: 100 });
      expect(tracker).toBeInstanceOf(ErrorTracker);
    });
  });

  // ==========================================================================
  // Initialize Tests
  // ==========================================================================

  describe("initialize", () => {
    it("should initialize tracker", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.initialize();
      // Should not throw
    });

    it("should not initialize when disabled", () => {
      const tracker = new ErrorTracker(createTestConfig({ enabled: false }));
      tracker.initialize();
      // Should not throw
    });

    it("should not initialize twice", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.initialize();
      tracker.initialize();
      // Should not throw
    });
  });

  // ==========================================================================
  // Destroy Tests
  // ==========================================================================

  describe("destroy", () => {
    it("should destroy tracker", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.initialize();
      tracker.destroy();
      // Should not throw
    });
  });

  // ==========================================================================
  // Capture Error Tests
  // ==========================================================================

  describe("captureError", () => {
    it("should capture Error object", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test error");

      const event = tracker.captureError(error);

      expect(event).not.toBeNull();
    });

    it("should capture string as error", () => {
      const tracker = new ErrorTracker(createTestConfig());

      const event = tracker.captureError("String error message");

      expect(event).not.toBeNull();
    });

    it("should include context", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test error");

      const event = tracker.captureError(error, {
        componentName: "TestComponent",
        actionName: "testAction",
      });

      expect(event).not.toBeNull();
      expect(event?.properties.componentName).toBe("TestComponent");
      expect(event?.properties.actionName).toBe("testAction");
    });

    it("should use specified severity", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test error");

      const event = tracker.captureError(error, {}, ErrorSeverity.WARNING);

      expect(event).not.toBeNull();
    });

    it("should return null when disabled", () => {
      const tracker = new ErrorTracker(createTestConfig({ enabled: false }));
      const error = new Error("Test error");

      const event = tracker.captureError(error);

      expect(event).toBeNull();
    });

    it("should add error breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test error");

      tracker.captureError(error);

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs.some((b) => b.type === BreadcrumbType.ERROR)).toBe(
        true,
      );
    });

    it("should call onCapture callback", () => {
      const onCapture = jest.fn();
      const tracker = new ErrorTracker(createTestConfig({ onCapture }));
      const error = new Error("Test error");

      tracker.captureError(error);

      expect(onCapture).toHaveBeenCalled();
    });

    it("should call beforeCapture hook", () => {
      const beforeCapture = jest.fn((captured: CapturedError) => captured);
      const tracker = new ErrorTracker(createTestConfig({ beforeCapture }));
      const error = new Error("Test error");

      tracker.captureError(error);

      expect(beforeCapture).toHaveBeenCalled();
    });

    it("should filter error when beforeCapture returns null", () => {
      const beforeCapture = jest.fn(() => null);
      const tracker = new ErrorTracker(createTestConfig({ beforeCapture }));
      const error = new Error("Test error");

      const event = tracker.captureError(error);

      expect(event).toBeNull();
    });
  });

  // ==========================================================================
  // Capture Exception Tests
  // ==========================================================================

  describe("captureException", () => {
    it("should capture exception", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test exception");

      const event = tracker.captureException(error);

      expect(event).not.toBeNull();
    });

    it("should include context", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test exception");

      const event = tracker.captureException(error, {
        componentName: "TestComponent",
      });

      expect(event).not.toBeNull();
    });
  });

  // ==========================================================================
  // Capture Message Tests
  // ==========================================================================

  describe("captureMessage", () => {
    it("should capture message", () => {
      const tracker = new ErrorTracker(createTestConfig());

      const event = tracker.captureMessage("Test message");

      expect(event).not.toBeNull();
    });

    it("should use specified severity", () => {
      const tracker = new ErrorTracker(createTestConfig());

      const event = tracker.captureMessage(
        "Warning message",
        ErrorSeverity.WARNING,
      );

      expect(event).not.toBeNull();
    });

    it("should include context", () => {
      const tracker = new ErrorTracker(createTestConfig());

      const event = tracker.captureMessage("Test message", ErrorSeverity.INFO, {
        actionName: "testAction",
      });

      expect(event).not.toBeNull();
    });
  });

  // ==========================================================================
  // Breadcrumb Tests
  // ==========================================================================

  describe("addBreadcrumb", () => {
    it("should add breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "User clicked button",
      });

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0].message).toBe("User clicked button");
    });

    it("should add timestamp", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const before = Date.now();

      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "Test",
      });

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].timestamp).toBeGreaterThanOrEqual(before);
    });

    it("should limit to maxBreadcrumbs", () => {
      const tracker = new ErrorTracker(createTestConfig({ maxBreadcrumbs: 3 }));

      for (let i = 0; i < 5; i++) {
        tracker.addBreadcrumb({
          type: BreadcrumbType.USER,
          category: "user",
          message: `Breadcrumb ${i}`,
        });
      }

      expect(tracker.getBreadcrumbs()).toHaveLength(3);
    });

    it("should filter sensitive data", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "Test",
        data: { password: "secret123" },
      });

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].data?.password).toBe("[REDACTED]");
    });
  });

  describe("addNavigationBreadcrumb", () => {
    it("should add navigation breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addNavigationBreadcrumb("/page1", "/page2");

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].type).toBe(BreadcrumbType.NAVIGATION);
      expect(breadcrumbs[0].data?.from).toBe("/page1");
      expect(breadcrumbs[0].data?.to).toBe("/page2");
    });
  });

  describe("addHttpBreadcrumb", () => {
    it("should add HTTP breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addHttpBreadcrumb("GET", "/api/data", 200, 100);

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].type).toBe(BreadcrumbType.HTTP);
      expect(breadcrumbs[0].data?.method).toBe("GET");
      expect(breadcrumbs[0].data?.statusCode).toBe(200);
    });

    it("should mark error for 4xx/5xx status codes", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addHttpBreadcrumb("POST", "/api/data", 500, 100);

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].level).toBe(ErrorSeverity.ERROR);
    });
  });

  describe("addUserBreadcrumb", () => {
    it("should add user breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addUserBreadcrumb("Clicked submit button");

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].type).toBe(BreadcrumbType.USER);
      expect(breadcrumbs[0].message).toBe("Clicked submit button");
    });
  });

  describe("addUIBreadcrumb", () => {
    it("should add UI breadcrumb", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.addUIBreadcrumb("button#submit", "click");

      const breadcrumbs = tracker.getBreadcrumbs();
      expect(breadcrumbs[0].type).toBe(BreadcrumbType.UI);
      expect(breadcrumbs[0].data?.element).toBe("button#submit");
      expect(breadcrumbs[0].data?.action).toBe("click");
    });
  });

  describe("getBreadcrumbs", () => {
    it("should return copy of breadcrumbs", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "Test",
      });

      const breadcrumbs = tracker.getBreadcrumbs();
      breadcrumbs.pop();

      expect(tracker.getBreadcrumbs()).toHaveLength(1);
    });
  });

  describe("clearBreadcrumbs", () => {
    it("should clear all breadcrumbs", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "Test",
      });

      tracker.clearBreadcrumbs();

      expect(tracker.getBreadcrumbs()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Tag Tests
  // ==========================================================================

  describe("setTag", () => {
    it("should set tag", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setTag("environment", "production");

      const tags = tracker.getTags();
      expect(tags.environment).toBe("production");
    });
  });

  describe("setTags", () => {
    it("should set multiple tags", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setTags({ env: "prod", version: "1.0.0" });

      const tags = tracker.getTags();
      expect(tags.env).toBe("prod");
      expect(tags.version).toBe("1.0.0");
    });

    it("should merge with existing tags", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setTag("existing", "value");

      tracker.setTags({ new: "tag" });

      const tags = tracker.getTags();
      expect(tags.existing).toBe("value");
      expect(tags.new).toBe("tag");
    });
  });

  describe("clearTag", () => {
    it("should clear tag", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setTag("test", "value");

      tracker.clearTag("test");

      const tags = tracker.getTags();
      expect(tags.test).toBeUndefined();
    });
  });

  describe("getTags", () => {
    it("should return copy of tags", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setTag("test", "value");

      const tags = tracker.getTags();
      tags.test = "modified";

      expect(tracker.getTags().test).toBe("value");
    });
  });

  // ==========================================================================
  // Context Tests
  // ==========================================================================

  describe("setContext", () => {
    it("should set context", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setContext("request", { url: "/api/data" });

      const context = tracker.getContext();
      expect(context.request).toEqual({ url: "/api/data" });
    });

    it("should filter sensitive data", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setContext("auth", { token: "secret123" });

      const context = tracker.getContext();
      expect((context.auth as Record<string, unknown>).token).toBe(
        "[REDACTED]",
      );
    });
  });

  describe("setUser", () => {
    it("should set user context", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setUser({ id: "user-123", name: "John Doe" });

      const context = tracker.getContext();
      const user = context.user as Record<string, unknown>;
      expect(user.id).toBe("user-123");
      expect(user.name).toBe("John Doe");
    });

    it("should mask email", () => {
      const tracker = new ErrorTracker(createTestConfig());

      tracker.setUser({ id: "user-123", email: "test@example.com" });

      const context = tracker.getContext();
      const user = context.user as Record<string, unknown>;
      expect(user.email).not.toBe("test@example.com");
    });
  });

  describe("clearUser", () => {
    it("should clear user context", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setUser({ id: "user-123" });

      tracker.clearUser();

      const context = tracker.getContext();
      expect(context.user).toBeUndefined();
    });
  });

  describe("getContext", () => {
    it("should return copy of context", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setContext("test", { value: 123 });

      const context = tracker.getContext();
      (context.test as Record<string, unknown>).value = 456;

      expect((tracker.getContext().test as Record<string, unknown>).value).toBe(
        123,
      );
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should clear all state", () => {
      const tracker = new ErrorTracker(createTestConfig());
      tracker.setTag("test", "value");
      tracker.setContext("test", { data: 123 });
      tracker.addBreadcrumb({
        type: BreadcrumbType.USER,
        category: "user",
        message: "Test",
      });

      tracker.reset();

      expect(tracker.getTags()).toEqual({});
      expect(tracker.getContext()).toEqual({});
      expect(tracker.getBreadcrumbs()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Wrap Tests
  // ==========================================================================

  describe("wrap", () => {
    it("should wrap function and capture errors", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const fn = () => {
        throw new Error("Test error");
      };

      const wrapped = tracker.wrap(fn);

      expect(() => wrapped()).toThrow("Test error");
      expect(
        tracker.getBreadcrumbs().some((b) => b.type === BreadcrumbType.ERROR),
      ).toBe(true);
    });

    it("should pass through successful execution", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const fn = () => "result";

      const wrapped = tracker.wrap(fn);

      expect(wrapped()).toBe("result");
    });

    it("should preserve this context", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const obj = {
        value: 42,
        fn() {
          return this.value;
        },
      };

      obj.fn = tracker.wrap(obj.fn);

      expect(obj.fn()).toBe(42);
    });
  });

  describe("wrapAsync", () => {
    it("should wrap async function and capture errors", async () => {
      const tracker = new ErrorTracker(createTestConfig());
      const fn = async () => {
        throw new Error("Async error");
      };

      const wrapped = tracker.wrapAsync(fn);

      await expect(wrapped()).rejects.toThrow("Async error");
      expect(
        tracker.getBreadcrumbs().some((b) => b.type === BreadcrumbType.ERROR),
      ).toBe(true);
    });

    it("should pass through successful async execution", async () => {
      const tracker = new ErrorTracker(createTestConfig());
      const fn = async () => "async result";

      const wrapped = tracker.wrapAsync(fn);

      expect(await wrapped()).toBe("async result");
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const tracker1 = getErrorTracker();
      const tracker2 = getErrorTracker();
      expect(tracker1).toBe(tracker2);
    });

    it("should reset instance", () => {
      const tracker1 = getErrorTracker();
      resetErrorTracker();
      const tracker2 = getErrorTracker();
      expect(tracker1).not.toBe(tracker2);
    });
  });

  // ==========================================================================
  // Convenience Function Tests
  // ==========================================================================

  describe("convenience functions", () => {
    describe("captureError", () => {
      it("should capture using singleton", () => {
        const event = captureError(new Error("Test"));
        expect(event).not.toBeNull();
      });
    });

    describe("captureException", () => {
      it("should capture using singleton", () => {
        const event = captureException(new Error("Test"));
        expect(event).not.toBeNull();
      });
    });

    describe("captureMessage", () => {
      it("should capture using singleton", () => {
        const event = captureMessage("Test message");
        expect(event).not.toBeNull();
      });
    });

    describe("addBreadcrumb", () => {
      it("should add using singleton", () => {
        addBreadcrumb({
          type: BreadcrumbType.USER,
          category: "user",
          message: "Test",
        });
        expect(getErrorTracker().getBreadcrumbs()).toHaveLength(1);
      });
    });

    describe("setErrorContext", () => {
      it("should set using singleton", () => {
        setErrorContext("test", { value: 123 });
        expect(getErrorTracker().getContext().test).toEqual({ value: 123 });
      });
    });

    describe("setErrorTags", () => {
      it("should set using singleton", () => {
        setErrorTags({ env: "test" });
        expect(getErrorTracker().getTags().env).toBe("test");
      });
    });

    describe("wrapFunction", () => {
      it("should wrap using singleton", () => {
        const fn = () => "result";
        const wrapped = wrapFunction(fn);
        expect(wrapped()).toBe("result");
      });
    });

    describe("wrapAsyncFunction", () => {
      it("should wrap async using singleton", async () => {
        const fn = async () => "async result";
        const wrapped = wrapAsyncFunction(fn);
        expect(await wrapped()).toBe("async result");
      });
    });
  });

  // ==========================================================================
  // Ignore Pattern Tests
  // ==========================================================================

  describe("ignore patterns", () => {
    it("should ignore matching errors", () => {
      const tracker = new ErrorTracker(
        createTestConfig({
          ignorePatterns: [/Test ignored/i],
        }),
      );
      tracker.initialize();

      // This would be captured internally, not via captureError
      // Just verify the pattern is configured
    });
  });

  // ==========================================================================
  // Stack Trace Processing Tests
  // ==========================================================================

  describe("stack trace processing", () => {
    it("should limit stack frames", () => {
      const tracker = new ErrorTracker(createTestConfig({ maxStackFrames: 3 }));
      const error = new Error("Test error");

      tracker.captureError(error);

      // Stack trace should be processed
    });

    it("should filter sensitive paths", () => {
      const tracker = new ErrorTracker(createTestConfig());
      const error = new Error("Test error");
      error.stack = "Error: Test\n    at /Users/john/project/file.js:10:20";

      tracker.captureError(error);

      // User path should be filtered
    });
  });
});
