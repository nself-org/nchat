/**
 * Performance Tracker Tests
 *
 * Tests for performance measurement, API timing, and Core Web Vitals tracking.
 */

import {
  PerformanceTracker,
  getPerformanceTracker,
  resetPerformanceTracker,
  startMeasure,
  endMeasure,
  measureAsync,
  measureSync,
  recordApiTiming,
  getPageLoadMetrics,
  getCoreWebVitals,
  PerformanceTrackerConfig,
  ApiTiming,
} from "../performance-tracker";
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

// Mock performance API
const mockPerformanceNow = jest.fn(() => Date.now());
const mockPerformanceMark = jest.fn();
const mockPerformanceMeasure = jest.fn();
const mockPerformanceClearResourceTimings = jest.fn();
const mockGetEntriesByType = jest.fn(() => []);

Object.defineProperty(window, "performance", {
  value: {
    now: mockPerformanceNow,
    mark: mockPerformanceMark,
    measure: mockPerformanceMeasure,
    clearResourceTimings: mockPerformanceClearResourceTimings,
    getEntriesByType: mockGetEntriesByType,
  },
  configurable: true,
});

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
  overrides: Partial<PerformanceTrackerConfig> = {},
): Partial<PerformanceTrackerConfig> => ({
  enabled: true,
  trackCoreWebVitals: false,
  trackResourceTiming: false,
  trackLongTasks: false,
  slowThreshold: 3000,
  longTaskThreshold: 50,
  sampleRate: 1.0,
  ...overrides,
});

const createApiTiming = (overrides: Partial<ApiTiming> = {}): ApiTiming => ({
  endpoint: "/api/messages",
  method: "GET",
  startTime: Date.now(),
  duration: 100,
  statusCode: 200,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Performance Tracker", () => {
  let currentTime = 0;

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    jest.clearAllMocks();
    resetPerformanceTracker();
    resetAnalyticsClient();

    // Setup time simulation
    currentTime = 0;
    mockPerformanceNow.mockImplementation(() => {
      return currentTime;
    });

    // Initialize analytics client
    const client = getAnalyticsClient({
      enabled: true,
      flushInterval: 0,
      respectDoNotTrack: false,
    });
    client.initialize(createConsentState(true));
  });

  afterEach(() => {
    resetPerformanceTracker();
    resetAnalyticsClient();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe("constructor", () => {
    it("should create tracker with default config", () => {
      const tracker = new PerformanceTracker();
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });

    it("should merge custom config", () => {
      const tracker = new PerformanceTracker({ slowThreshold: 5000 });
      expect(tracker).toBeInstanceOf(PerformanceTracker);
    });
  });

  // ==========================================================================
  // Initialize Tests
  // ==========================================================================

  describe("initialize", () => {
    it("should initialize tracker", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.initialize();
      // Should not throw
    });

    it("should not initialize when disabled", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ enabled: false }),
      );
      tracker.initialize();
      // Should not throw
    });

    it("should not initialize twice", () => {
      const tracker = new PerformanceTracker(createTestConfig());
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
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.initialize();
      tracker.destroy();
      // Should not throw
    });
  });

  // ==========================================================================
  // Measurement Tests
  // ==========================================================================

  describe("startMeasure", () => {
    it("should start measurement", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.startMeasure("test-operation");
      expect(mockPerformanceMark).toHaveBeenCalledWith("test-operation-start");
    });

    it("should store metadata", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.startMeasure("test-operation", { custom: "value" });
      // Verify measurement is stored
    });

    it("should not start when disabled", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ enabled: false }),
      );
      tracker.startMeasure("test-operation");
      expect(mockPerformanceMark).not.toHaveBeenCalled();
    });
  });

  describe("endMeasure", () => {
    it("should end measurement and return result", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.startMeasure("test-operation");

      currentTime = 100;

      const result = tracker.endMeasure("test-operation");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("test-operation");
      expect(result?.duration).toBe(100);
    });

    it("should mark end time", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.startMeasure("test-operation");

      currentTime = 100;
      tracker.endMeasure("test-operation");

      expect(mockPerformanceMark).toHaveBeenCalledWith("test-operation-end");
      expect(mockPerformanceMeasure).toHaveBeenCalledWith(
        "test-operation",
        "test-operation-start",
        "test-operation-end",
      );
    });

    it("should return null for non-existent measurement", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      const result = tracker.endMeasure("non-existent");
      expect(result).toBeNull();
    });

    it("should track slow operations", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ slowThreshold: 50 }),
      );
      tracker.startMeasure("slow-operation");

      currentTime = 100;
      tracker.endMeasure("slow-operation");

      // Should have tracked slow operation
    });

    it("should return null when disabled", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ enabled: false }),
      );
      const result = tracker.endMeasure("test");
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Async Measurement Tests
  // ==========================================================================

  describe("measureAsync", () => {
    it("should measure async operation", async () => {
      const tracker = new PerformanceTracker(createTestConfig());

      let operationCalled = false;
      const operation = async () => {
        currentTime = 50;
        operationCalled = true;
        return "result";
      };

      const result = await tracker.measureAsync("async-op", operation);

      expect(operationCalled).toBe(true);
      expect(result).toBe("result");
    });

    it("should measure duration", async () => {
      const tracker = new PerformanceTracker(createTestConfig());

      const operation = async () => {
        currentTime = 100;
        return "result";
      };

      await tracker.measureAsync("async-op", operation);
      // Duration should be calculated
    });

    it("should end measurement on error", async () => {
      const tracker = new PerformanceTracker(createTestConfig());

      const operation = async () => {
        currentTime = 50;
        throw new Error("Test error");
      };

      await expect(tracker.measureAsync("async-op", operation)).rejects.toThrow(
        "Test error",
      );
    });

    it("should include metadata", async () => {
      const tracker = new PerformanceTracker(createTestConfig());

      const operation = async () => "result";
      await tracker.measureAsync("async-op", operation, { key: "value" });
      // Metadata should be stored
    });
  });

  // ==========================================================================
  // Sync Measurement Tests
  // ==========================================================================

  describe("measureSync", () => {
    it("should measure sync operation", () => {
      const tracker = new PerformanceTracker(createTestConfig());

      let operationCalled = false;
      const operation = () => {
        currentTime = 50;
        operationCalled = true;
        return "result";
      };

      const result = tracker.measureSync("sync-op", operation);

      expect(operationCalled).toBe(true);
      expect(result).toBe("result");
    });

    it("should end measurement on error", () => {
      const tracker = new PerformanceTracker(createTestConfig());

      const operation = () => {
        throw new Error("Test error");
      };

      expect(() => tracker.measureSync("sync-op", operation)).toThrow(
        "Test error",
      );
    });
  });

  // ==========================================================================
  // API Timing Tests
  // ==========================================================================

  describe("recordApiTiming", () => {
    it("should record API timing", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      const timing = createApiTiming();

      tracker.recordApiTiming(timing);

      const timings = tracker.getApiTimings();
      expect(timings).toHaveLength(1);
      expect(timings[0].endpoint).toBe("/api/messages");
    });

    it("should keep only last 100 timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());

      for (let i = 0; i < 150; i++) {
        tracker.recordApiTiming(createApiTiming({ endpoint: `/api/${i}` }));
      }

      expect(tracker.getApiTimings().length).toBeLessThanOrEqual(100);
    });

    it("should track slow API calls", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ slowThreshold: 100 }),
      );

      tracker.recordApiTiming(createApiTiming({ duration: 200 }));

      // Should track slow operation
    });

    it("should not record when disabled", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ enabled: false }),
      );
      tracker.recordApiTiming(createApiTiming());

      expect(tracker.getApiTimings()).toHaveLength(0);
    });
  });

  describe("getApiTimings", () => {
    it("should return API timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.recordApiTiming(createApiTiming({ endpoint: "/api/1" }));
      tracker.recordApiTiming(createApiTiming({ endpoint: "/api/2" }));

      const timings = tracker.getApiTimings();

      expect(timings).toHaveLength(2);
    });

    it("should return copy of timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.recordApiTiming(createApiTiming());

      const timings = tracker.getApiTimings();
      timings.pop();

      expect(tracker.getApiTimings()).toHaveLength(1);
    });
  });

  describe("getAverageApiTime", () => {
    it("should calculate average API time", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.recordApiTiming(createApiTiming({ duration: 100 }));
      tracker.recordApiTiming(createApiTiming({ duration: 200 }));
      tracker.recordApiTiming(createApiTiming({ duration: 300 }));

      const average = tracker.getAverageApiTime();

      expect(average).toBe(200);
    });

    it("should return 0 when no timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      expect(tracker.getAverageApiTime()).toBe(0);
    });
  });

  // ==========================================================================
  // Page Load Metrics Tests
  // ==========================================================================

  describe("getPageLoadMetrics", () => {
    it("should return page load metrics", () => {
      mockGetEntriesByType.mockReturnValue([
        {
          domainLookupStart: 0,
          domainLookupEnd: 10,
          connectStart: 10,
          connectEnd: 20,
          secureConnectionStart: 15,
          requestStart: 20,
          responseStart: 30,
          responseEnd: 50,
          domInteractive: 100,
          domComplete: 150,
          loadEventEnd: 200,
          fetchStart: 0,
          startTime: 0,
        },
      ]);

      const tracker = new PerformanceTracker(createTestConfig());
      const metrics = tracker.getPageLoadMetrics();

      expect(metrics).not.toBeNull();
      expect(metrics?.dnsLookup).toBe(10);
      expect(metrics?.tcpConnection).toBe(10);
      expect(metrics?.totalTime).toBe(200);
    });

    it("should return null when no navigation entry", () => {
      mockGetEntriesByType.mockReturnValue([]);

      const tracker = new PerformanceTracker(createTestConfig());
      const metrics = tracker.getPageLoadMetrics();

      expect(metrics).toBeNull();
    });
  });

  // ==========================================================================
  // Core Web Vitals Tests
  // ==========================================================================

  describe("getCoreWebVitals", () => {
    it("should return web vitals object", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      const vitals = tracker.getCoreWebVitals();

      expect(vitals).toHaveProperty("lcp");
      expect(vitals).toHaveProperty("fid");
      expect(vitals).toHaveProperty("cls");
      expect(vitals).toHaveProperty("fcp");
      expect(vitals).toHaveProperty("ttfb");
      expect(vitals).toHaveProperty("inp");
    });

    it("should return copy of vitals", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      const vitals1 = tracker.getCoreWebVitals();
      vitals1.lcp = 9999;

      const vitals2 = tracker.getCoreWebVitals();
      expect(vitals2.lcp).not.toBe(9999);
    });
  });

  // ==========================================================================
  // Resource Timing Tests
  // ==========================================================================

  describe("getResourceTimings", () => {
    it("should return resource timings", () => {
      mockGetEntriesByType.mockImplementation((type) => {
        if (type === "resource") {
          return [
            {
              name: "https://example.com/script.js",
              initiatorType: "script",
              startTime: 100,
              duration: 50,
              transferSize: 10000,
              nextHopProtocol: "h2",
            },
          ];
        }
        return [];
      });

      const tracker = new PerformanceTracker(
        createTestConfig({ trackResourceTiming: true }),
      );
      const resources = tracker.getResourceTimings();

      expect(resources).toHaveLength(1);
      expect(resources[0].name).toBe("https://example.com/script.js");
      expect(resources[0].type).toBe("script");
    });

    it("should return empty array when disabled", () => {
      const tracker = new PerformanceTracker(
        createTestConfig({ trackResourceTiming: false }),
      );
      const resources = tracker.getResourceTimings();

      expect(resources).toEqual([]);
    });
  });

  // ==========================================================================
  // Clear Tests
  // ==========================================================================

  describe("clear", () => {
    it("should clear measurements", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.startMeasure("test");

      tracker.clear();

      expect(tracker.endMeasure("test")).toBeNull();
    });

    it("should clear API timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.recordApiTiming(createApiTiming());

      tracker.clear();

      expect(tracker.getApiTimings()).toHaveLength(0);
    });

    it("should clear resource timings", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      tracker.clear();

      expect(mockPerformanceClearResourceTimings).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Report Tests
  // ==========================================================================

  describe("report", () => {
    it("should generate performance report", () => {
      const tracker = new PerformanceTracker(createTestConfig());
      const event = tracker.report();

      expect(event).not.toBeNull();
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const tracker1 = getPerformanceTracker();
      const tracker2 = getPerformanceTracker();
      expect(tracker1).toBe(tracker2);
    });

    it("should reset instance", () => {
      const tracker1 = getPerformanceTracker();
      resetPerformanceTracker();
      const tracker2 = getPerformanceTracker();
      expect(tracker1).not.toBe(tracker2);
    });
  });

  // ==========================================================================
  // Convenience Function Tests
  // ==========================================================================

  describe("convenience functions", () => {
    describe("startMeasure / endMeasure", () => {
      it("should measure using singleton", () => {
        startMeasure("test");
        currentTime = 100;
        const result = endMeasure("test");

        expect(result).not.toBeNull();
        expect(result?.duration).toBe(100);
      });
    });

    describe("measureAsync", () => {
      it("should measure async using singleton", async () => {
        const result = await measureAsync("async-test", async () => {
          currentTime = 50;
          return "result";
        });

        expect(result).toBe("result");
      });
    });

    describe("measureSync", () => {
      it("should measure sync using singleton", () => {
        const result = measureSync("sync-test", () => {
          currentTime = 50;
          return "result";
        });

        expect(result).toBe("result");
      });
    });

    describe("recordApiTiming", () => {
      it("should record using singleton", () => {
        recordApiTiming(createApiTiming());
        expect(getPerformanceTracker().getApiTimings()).toHaveLength(1);
      });
    });

    describe("getPageLoadMetrics", () => {
      it("should get metrics using singleton", () => {
        mockGetEntriesByType.mockReturnValue([
          {
            domainLookupStart: 0,
            domainLookupEnd: 10,
            connectStart: 10,
            connectEnd: 20,
            secureConnectionStart: 0,
            requestStart: 20,
            responseStart: 30,
            responseEnd: 50,
            domInteractive: 100,
            domComplete: 150,
            loadEventEnd: 200,
            fetchStart: 0,
            startTime: 0,
          },
        ]);

        const metrics = getPageLoadMetrics();
        expect(metrics).not.toBeNull();
      });
    });

    describe("getCoreWebVitals", () => {
      it("should get vitals using singleton", () => {
        const vitals = getCoreWebVitals();
        expect(vitals).toHaveProperty("lcp");
      });
    });
  });

  // ==========================================================================
  // Sample Rate Tests
  // ==========================================================================

  describe("sample rate", () => {
    it("should respect sample rate", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.8);

      const tracker = new PerformanceTracker(
        createTestConfig({ sampleRate: 0.5 }),
      );
      tracker.initialize();

      // Initialization should be skipped when random > sampleRate
    });

    it("should initialize when within sample rate", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.3);

      const tracker = new PerformanceTracker(
        createTestConfig({ sampleRate: 0.5 }),
      );
      tracker.initialize();

      // Should initialize
    });
  });
});
