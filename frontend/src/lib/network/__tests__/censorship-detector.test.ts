/**
 * Censorship Detector Tests
 *
 * Tests for the censorship detection module
 */

import {
  CensorshipDetector,
  NetworkStatus,
  createCensorshipDetector,
  createQuickDetector,
  createComprehensiveDetector,
  DEFAULT_DETECTOR_CONFIG,
  BLOCK_PAGE_SIGNATURES,
  CENSORSHIP_DNS_RESPONSES,
  TIMEOUT_PATTERNS,
  SNI_FILTER_PATTERNS,
  CENSORSHIP_DETECTOR_CONSTANTS,
  type CensorshipType,
  type ConfidenceLevel,
} from "../censorship-detector";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  constructor() {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
}

// @ts-expect-error - Mock WebSocket for testing
global.WebSocket = MockWebSocket;

describe("Censorship Detector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe("Constants", () => {
    it("should have default detector config", () => {
      expect(DEFAULT_DETECTOR_CONFIG.enabled).toBe(true);
      expect(DEFAULT_DETECTOR_CONFIG.probeTimeout).toBe(10000);
      expect(DEFAULT_DETECTOR_CONFIG.maxConcurrentProbes).toBe(5);
      expect(DEFAULT_DETECTOR_CONFIG.detectionInterval).toBe(0);
      expect(DEFAULT_DETECTOR_CONFIG.dnsServers.length).toBeGreaterThan(0);
      expect(DEFAULT_DETECTOR_CONFIG.dohServers.length).toBeGreaterThan(0);
    });

    it("should have block page signatures", () => {
      expect(BLOCK_PAGE_SIGNATURES.length).toBeGreaterThan(0);
      expect(BLOCK_PAGE_SIGNATURES[0]).toHaveProperty("pattern");
      expect(BLOCK_PAGE_SIGNATURES[0]).toHaveProperty("type");
    });

    it("should have censorship DNS responses", () => {
      expect(CENSORSHIP_DNS_RESPONSES).toContain("127.0.0.1");
      expect(CENSORSHIP_DNS_RESPONSES).toContain("0.0.0.0");
    });

    it("should have timeout patterns", () => {
      expect(TIMEOUT_PATTERNS.length).toBeGreaterThan(0);
      expect(TIMEOUT_PATTERNS.some((p) => p.test("timeout"))).toBe(true);
      expect(TIMEOUT_PATTERNS.some((p) => p.test("ECONNRESET"))).toBe(true);
    });

    it("should have SNI filter patterns", () => {
      expect(SNI_FILTER_PATTERNS.length).toBeGreaterThan(0);
      expect(SNI_FILTER_PATTERNS.some((p) => p.test("certificate error"))).toBe(
        true,
      );
      expect(SNI_FILTER_PATTERNS.some((p) => p.test("ERR_SSL"))).toBe(true);
    });

    it("should export constants object", () => {
      expect(CENSORSHIP_DETECTOR_CONSTANTS.BLOCK_PAGE_SIGNATURES).toBeDefined();
      expect(
        CENSORSHIP_DETECTOR_CONSTANTS.CENSORSHIP_DNS_RESPONSES,
      ).toBeDefined();
      expect(CENSORSHIP_DETECTOR_CONSTANTS.TIMEOUT_PATTERNS).toBeDefined();
      expect(CENSORSHIP_DETECTOR_CONSTANTS.SNI_FILTER_PATTERNS).toBeDefined();
    });
  });

  // ===========================================================================
  // NetworkStatus Enum Tests
  // ===========================================================================

  describe("NetworkStatus", () => {
    it("should have all expected statuses", () => {
      expect(NetworkStatus.UNKNOWN).toBe("unknown");
      expect(NetworkStatus.CONNECTED).toBe("connected");
      expect(NetworkStatus.LIMITED).toBe("limited");
      expect(NetworkStatus.CENSORED).toBe("censored");
      expect(NetworkStatus.OFFLINE).toBe("offline");
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe("Factory Functions", () => {
    describe("createCensorshipDetector", () => {
      it("should create detector with endpoint", () => {
        const detector = createCensorshipDetector("https://example.com");

        expect(detector).toBeInstanceOf(CensorshipDetector);
        expect(detector.getConfig().primaryEndpoint).toBe(
          "https://example.com",
        );

        detector.dispose();
      });

      it("should accept additional options", () => {
        const detector = createCensorshipDetector("https://example.com", {
          probeTimeout: 5000,
        });

        expect(detector.getConfig().probeTimeout).toBe(5000);

        detector.dispose();
      });
    });

    describe("createQuickDetector", () => {
      it("should create detector with quick settings", () => {
        const detector = createQuickDetector("https://example.com");

        const config = detector.getConfig();
        expect(config.probeTimeout).toBe(5000);
        expect(config.maxConcurrentProbes).toBe(3);
        expect(config.detectionInterval).toBe(0);

        detector.dispose();
      });
    });

    describe("createComprehensiveDetector", () => {
      it("should create comprehensive detector", () => {
        const detector = createComprehensiveDetector("https://primary.com", [
          "https://alt1.com",
          "https://alt2.com",
        ]);

        const config = detector.getConfig();
        expect(config.primaryEndpoint).toBe("https://primary.com");
        expect(config.alternativeEndpoints).toHaveLength(2);
        expect(config.probeTimeout).toBe(15000);
        expect(config.maxConcurrentProbes).toBe(10);

        detector.dispose();
      });
    });
  });

  // ===========================================================================
  // CensorshipDetector Tests
  // ===========================================================================

  describe("CensorshipDetector", () => {
    describe("Configuration", () => {
      it("should create with default config", () => {
        const detector = new CensorshipDetector();

        const config = detector.getConfig();
        expect(config.enabled).toBe(true);
        expect(config.primaryEndpoint).toBe("");

        detector.dispose();
      });

      it("should merge custom config", () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
          probeTimeout: 5000,
        });

        const config = detector.getConfig();
        expect(config.primaryEndpoint).toBe("https://example.com");
        expect(config.probeTimeout).toBe(5000);

        detector.dispose();
      });

      it("should update config", () => {
        const detector = new CensorshipDetector();

        detector.updateConfig({ probeTimeout: 20000 });

        expect(detector.getConfig().probeTimeout).toBe(20000);

        detector.dispose();
      });
    });

    describe("Network Status", () => {
      it("should return initial status as unknown", () => {
        const detector = new CensorshipDetector();

        expect(detector.getNetworkStatus()).toBe(NetworkStatus.UNKNOWN);

        detector.dispose();
      });
    });

    describe("Quick Check", () => {
      it("should return true for successful connection", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          redirected: false,
          url: "https://example.com",
          text: async () => "OK",
          headers: new Map(),
        });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.quickCheck();

        expect(result).toBe(true);

        detector.dispose();
      });

      it("should return false for failed connection", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.quickCheck();

        expect(result).toBe(false);

        detector.dispose();
      });
    });

    describe("Domain Blocking Check", () => {
      it("should detect unblocked domain", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "1.2.3.4" }],
          }),
          text: async () => "OK",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

        const detector = new CensorshipDetector();

        const result = await detector.isDomainBlocked("example.com");

        expect(result.blocked).toBe(false);
        expect(result.indicators).toHaveLength(0);

        detector.dispose();
      });

      it("should detect DNS poisoning", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "127.0.0.1" }],
          }),
        });

        const detector = new CensorshipDetector();

        const result = await detector.isDomainBlocked("blocked.com");

        expect(result.blocked).toBe(true);
        expect(result.indicators.some((i) => i.type === "dns-poisoning")).toBe(
          true,
        );

        detector.dispose();
      });
    });

    describe("Full Detection", () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          redirected: false,
          url: "https://example.com",
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "1.2.3.4" }],
          }),
          text: async () => "OK",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });
      });

      it("should run full detection", async () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result).toHaveProperty("status");
        expect(result).toHaveProperty("censored");
        expect(result).toHaveProperty("censorshipTypes");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("probes");
        expect(result).toHaveProperty("recommendations");
        expect(result).toHaveProperty("timestamp");
        expect(result).toHaveProperty("duration");

        detector.dispose();
      });

      it("should detect no censorship", async () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(false);
        expect(result.status).toBe(NetworkStatus.CONNECTED);

        detector.dispose();
      });

      it("should provide recommendations", async () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations[0]).toHaveProperty("method");
        expect(result.recommendations[0]).toHaveProperty("priority");
        expect(result.recommendations[0]).toHaveProperty("effectiveness");

        detector.dispose();
      });

      it("should store last result", async () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        expect(detector.getLastResult()).toBeUndefined();

        await detector.detect();

        expect(detector.getLastResult()).toBeDefined();

        detector.dispose();
      });

      it("should emit events", async () => {
        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const startedHandler = jest.fn();
        const completedHandler = jest.fn();

        detector.on("detection-started", startedHandler);
        detector.on("detection-completed", completedHandler);

        await detector.detect();

        expect(startedHandler).toHaveBeenCalled();
        expect(completedHandler).toHaveBeenCalled();

        detector.dispose();
      });
    });

    describe("Censorship Detection", () => {
      it("should detect block page", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          redirected: false,
          url: "https://example.com",
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "1.2.3.4" }],
          }),
          text: async () => "This site has been blocked by government order",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("http-blocking");

        detector.dispose();
      });

      it("should detect HTTP 451", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 451,
          redirected: false,
          url: "https://example.com",
          json: async () => ({ Status: 0, Answer: [] }),
          text: async () => "Unavailable For Legal Reasons",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("http-blocking");

        detector.dispose();
      });

      it("should detect suspicious redirect", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          redirected: true,
          url: "https://blocked.gov/notice",
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "1.2.3.4" }],
          }),
          text: async () => "Redirected",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("http-blocking");

        detector.dispose();
      });

      it("should detect connection reset", async () => {
        mockFetch.mockRejectedValue(new Error("ECONNRESET"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("tcp-rst");

        detector.dispose();
      });

      it("should detect timeout as potential blocking", async () => {
        mockFetch.mockRejectedValue(new Error("Connection timeout"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("tcp-blocking");

        detector.dispose();
      });

      it("should detect SNI filtering", async () => {
        mockFetch.mockRejectedValue(new Error("ERR_SSL_PROTOCOL_ERROR"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.censored).toBe(true);
        expect(result.censorshipTypes).toContain("sni-filtering");

        detector.dispose();
      });
    });

    describe("Recommendations", () => {
      it("should recommend direct for no censorship", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          redirected: false,
          url: "https://example.com",
          json: async () => ({
            Status: 0,
            Answer: [{ type: 1, data: "1.2.3.4" }],
          }),
          text: async () => "OK",
          headers: new Map([["content-type", "text/html"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.recommendations.some((r) => r.method === "direct")).toBe(
          true,
        );

        detector.dispose();
      });

      it("should recommend domain fronting for SNI filtering", async () => {
        mockFetch.mockRejectedValue(new Error("ERR_SSL_PROTOCOL_ERROR"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(
          result.recommendations.some((r) => r.method === "domain-fronting"),
        ).toBe(true);

        detector.dispose();
      });

      it("should recommend obfs4 for TCP blocking", async () => {
        mockFetch.mockRejectedValue(new Error("ECONNRESET"));

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        expect(result.recommendations.some((r) => r.method === "obfs4")).toBe(
          true,
        );

        detector.dispose();
      });

      it("should recommend DoH for DNS blocking", async () => {
        // First call for HTTP probe - OK
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            redirected: false,
            url: "https://example.com",
            json: async () => ({
              Status: 0,
              Answer: [{ type: 1, data: "1.2.3.4" }],
            }),
            text: async () => "OK",
            headers: new Map([["content-type", "text/html"]]),
            arrayBuffer: async () => new ArrayBuffer(0),
          })
          // DNS probe - returns poisoned IP
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              Status: 0,
              Answer: [{ type: 1, data: "127.0.0.1" }],
            }),
          })
          // DoH probe - also returns poisoned for consistency
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              Status: 0,
              Answer: [{ type: 1, data: "127.0.0.1" }],
            }),
          })
          // Geo context
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ country: "US" }),
          });

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const result = await detector.detect();

        // DNS poisoning should be detected and DoH recommended
        expect(result.censorshipTypes).toContain("dns-poisoning");
        expect(
          result.recommendations.some((r) => r.method === "dns-over-https"),
        ).toBe(true);

        detector.dispose();
      });
    });

    describe("Concurrent Detection", () => {
      it("should prevent concurrent detection", async () => {
        mockFetch.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    status: 200,
                    redirected: false,
                    url: "https://example.com",
                    json: async () => ({ Status: 0, Answer: [] }),
                    text: async () => "OK",
                    headers: new Map(),
                    arrayBuffer: async () => new ArrayBuffer(0),
                  }),
                100,
              ),
            ),
        );

        const detector = new CensorshipDetector({
          primaryEndpoint: "https://example.com",
        });

        const detect1 = detector.detect();
        const detect2 = detector.detect();

        await expect(detect2).rejects.toThrow("Detection already in progress");
        await detect1;

        detector.dispose();
      });
    });

    describe("Lifecycle", () => {
      it("should dispose cleanly", () => {
        const detector = new CensorshipDetector({
          detectionInterval: 60000,
        });

        expect(() => detector.dispose()).not.toThrow();
      });
    });
  });

  // ===========================================================================
  // Pattern Matching Tests
  // ===========================================================================

  describe("Pattern Matching", () => {
    describe("Block Page Signatures", () => {
      it('should match "blocked" text', () => {
        const pattern = BLOCK_PAGE_SIGNATURES.find((s) =>
          s.pattern.test("blocked"),
        );
        expect(pattern).toBeDefined();
      });

      it('should match "access denied" text', () => {
        const pattern = BLOCK_PAGE_SIGNATURES.find((s) =>
          s.pattern.test("access denied"),
        );
        expect(pattern).toBeDefined();
      });

      it("should match government notices", () => {
        const pattern = BLOCK_PAGE_SIGNATURES.find((s) =>
          s.pattern.test("This page has been blocked by the government"),
        );
        expect(pattern).toBeDefined();
      });
    });

    describe("Timeout Patterns", () => {
      it("should match various timeout errors", () => {
        const errors = [
          "timeout",
          "timed out",
          "ETIMEDOUT",
          "ECONNRESET",
          "ECONNREFUSED",
        ];

        for (const error of errors) {
          const matches = TIMEOUT_PATTERNS.some((p) => p.test(error));
          expect(matches).toBe(true);
        }
      });
    });

    describe("SNI Filter Patterns", () => {
      it("should match TLS/SSL errors", () => {
        const errors = [
          "certificate error",
          "ssl error",
          "tls handshake failed",
          "ERR_SSL",
          "ERR_CERT",
        ];

        for (const error of errors) {
          const matches = SNI_FILTER_PATTERNS.some((p) => p.test(error));
          expect(matches).toBe(true);
        }
      });
    });
  });
});
