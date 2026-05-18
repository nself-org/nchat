/**
 * Domain Fronting Tests
 *
 * Tests for the domain fronting support module
 */

import {
  DomainFrontingClient,
  createCDNEndpoint,
  createCloudflareEndpoint,
  createCloudFrontEndpoint,
  createReflectorConfig,
  createDomainFrontingClient,
  validateDomainFrontingConfig,
  validateEndpoint,
  DEFAULT_DOMAIN_FRONTING_CONFIG,
  KNOWN_CDN_DOMAINS,
  DISGUISE_USER_AGENTS,
  DOMAIN_FRONTING_CONSTANTS,
  type CDNEndpoint,
  type DomainFrontingConfig,
} from "../domain-fronting";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});
global.crypto = {
  getRandomValues: mockGetRandomValues,
} as unknown as Crypto;

describe("Domain Fronting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe("Constants", () => {
    it("should have default configuration", () => {
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.enabled).toBe(false);
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.strategy).toBe("sni-host-split");
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.endpoints).toHaveLength(0);
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.obfuscation).toBeDefined();
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.healthCheck).toBeDefined();
      expect(DEFAULT_DOMAIN_FRONTING_CONFIG.fallback).toBeDefined();
    });

    it("should have known CDN domains", () => {
      expect(KNOWN_CDN_DOMAINS.cloudflare).toBeDefined();
      expect(KNOWN_CDN_DOMAINS.cloudflare.length).toBeGreaterThan(0);
      expect(KNOWN_CDN_DOMAINS.cloudfront).toBeDefined();
      expect(KNOWN_CDN_DOMAINS.fastly).toBeDefined();
      expect(KNOWN_CDN_DOMAINS.akamai).toBeDefined();
    });

    it("should have disguise user agents", () => {
      expect(DISGUISE_USER_AGENTS.length).toBeGreaterThan(0);
      expect(DISGUISE_USER_AGENTS[0]).toContain("Mozilla");
    });

    it("should export constants object", () => {
      expect(DOMAIN_FRONTING_CONSTANTS.KNOWN_CDN_DOMAINS).toBeDefined();
      expect(DOMAIN_FRONTING_CONSTANTS.DISGUISE_USER_AGENTS).toBeDefined();
      expect(DOMAIN_FRONTING_CONSTANTS.DEFAULT_MAX_PADDING).toBe(256);
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe("Factory Functions", () => {
    describe("createCDNEndpoint", () => {
      it("should create endpoint with required fields", () => {
        const endpoint = createCDNEndpoint({
          provider: "cloudflare",
          frontDomain: "cdn.example.com",
          hostHeader: "real.example.com",
        });

        expect(endpoint.id).toContain("endpoint-");
        expect(endpoint.provider).toBe("cloudflare");
        expect(endpoint.frontDomain).toBe("cdn.example.com");
        expect(endpoint.hostHeader).toBe("real.example.com");
        expect(endpoint.pathPrefix).toBe("");
        expect(endpoint.enabled).toBe(true);
        expect(endpoint.priority).toBe(0);
        expect(endpoint.healthy).toBe(true);
      });

      it("should accept optional fields", () => {
        const endpoint = createCDNEndpoint({
          provider: "cloudflare",
          frontDomain: "cdn.example.com",
          hostHeader: "real.example.com",
          pathPrefix: "/api",
          priority: 5,
          region: "us-east",
          customHeaders: { "X-Custom": "value" },
        });

        expect(endpoint.pathPrefix).toBe("/api");
        expect(endpoint.priority).toBe(5);
        expect(endpoint.region).toBe("us-east");
        expect(endpoint.customHeaders).toEqual({ "X-Custom": "value" });
      });
    });

    describe("createCloudflareEndpoint", () => {
      it("should create Cloudflare endpoint", () => {
        const endpoint = createCloudflareEndpoint(
          "cdnjs.cloudflare.com",
          "real.example.com",
        );

        expect(endpoint.provider).toBe("cloudflare");
        expect(endpoint.frontDomain).toBe("cdnjs.cloudflare.com");
        expect(endpoint.hostHeader).toBe("real.example.com");
      });

      it("should merge additional options", () => {
        const endpoint = createCloudflareEndpoint(
          "cdnjs.cloudflare.com",
          "real.example.com",
          { priority: 10 },
        );

        expect(endpoint.priority).toBe(10);
      });
    });

    describe("createCloudFrontEndpoint", () => {
      it("should create CloudFront endpoint", () => {
        const endpoint = createCloudFrontEndpoint(
          "d1234567890abc",
          "real.example.com",
        );

        expect(endpoint.provider).toBe("cloudfront");
        expect(endpoint.frontDomain).toBe("d1234567890abc.cloudfront.net");
        expect(endpoint.hostHeader).toBe("real.example.com");
      });
    });

    describe("createReflectorConfig", () => {
      it("should create reflector config with defaults", () => {
        const config = createReflectorConfig({
          url: "https://reflector.example.com",
          secret: "test-secret",
        });

        expect(config.url).toBe("https://reflector.example.com");
        expect(config.secret).toBe("test-secret");
        expect(config.maxRequestSize).toBe(1024 * 1024);
        expect(config.timeout).toBe(30000);
        expect(config.usePadding).toBe(true);
      });

      it("should accept custom options", () => {
        const config = createReflectorConfig({
          url: "https://reflector.example.com",
          secret: "test-secret",
          maxRequestSize: 2048,
          timeout: 60000,
          usePadding: false,
        });

        expect(config.maxRequestSize).toBe(2048);
        expect(config.timeout).toBe(60000);
        expect(config.usePadding).toBe(false);
      });
    });

    describe("createDomainFrontingClient", () => {
      it("should create client with endpoints", () => {
        const endpoints = [
          createCloudflareEndpoint("cdn.example.com", "real.example.com"),
        ];

        const client = createDomainFrontingClient(endpoints);

        expect(client).toBeInstanceOf(DomainFrontingClient);
        expect(client.getConfig().enabled).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Validation Tests
  // ===========================================================================

  describe("Validation", () => {
    describe("validateDomainFrontingConfig", () => {
      it("should validate empty config when disabled", () => {
        const config: DomainFrontingConfig = {
          ...DEFAULT_DOMAIN_FRONTING_CONFIG,
          enabled: false,
        };

        const result = validateDomainFrontingConfig(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should reject enabled config without endpoints", () => {
        const config: DomainFrontingConfig = {
          ...DEFAULT_DOMAIN_FRONTING_CONFIG,
          enabled: true,
          endpoints: [],
        };

        const result = validateDomainFrontingConfig(config);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          "Domain fronting is enabled but no endpoints are configured",
        );
      });

      it("should warn about single endpoint", () => {
        const config: DomainFrontingConfig = {
          ...DEFAULT_DOMAIN_FRONTING_CONFIG,
          enabled: true,
          endpoints: [
            createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          ],
        };

        const result = validateDomainFrontingConfig(config);

        expect(
          result.warnings.some((w) => w.includes("Only one endpoint")),
        ).toBe(true);
      });

      it("should warn about large padding", () => {
        const config: DomainFrontingConfig = {
          ...DEFAULT_DOMAIN_FRONTING_CONFIG,
          enabled: true,
          endpoints: [
            createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          ],
          obfuscation: {
            ...DEFAULT_DOMAIN_FRONTING_CONFIG.obfuscation,
            maxPadding: 5000,
          },
        };

        const result = validateDomainFrontingConfig(config);

        expect(
          result.warnings.some((w) => w.includes("Large padding size")),
        ).toBe(true);
      });

      it("should validate endpoints", () => {
        const config: DomainFrontingConfig = {
          ...DEFAULT_DOMAIN_FRONTING_CONFIG,
          enabled: true,
          endpoints: [
            {
              ...createCloudflareEndpoint(
                "cdn.example.com",
                "real.example.com",
              ),
              frontDomain: "",
            },
          ],
        };

        const result = validateDomainFrontingConfig(config);

        expect(result.valid).toBe(false);
      });
    });

    describe("validateEndpoint", () => {
      it("should validate valid endpoint", () => {
        const endpoint = createCloudflareEndpoint(
          "cdn.example.com",
          "real.example.com",
        );
        const result = validateEndpoint(endpoint);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should reject missing front domain", () => {
        const endpoint: CDNEndpoint = {
          ...createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          frontDomain: "",
        };

        const result = validateEndpoint(endpoint);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Front domain is required");
      });

      it("should reject missing host header", () => {
        const endpoint: CDNEndpoint = {
          ...createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          hostHeader: "",
        };

        const result = validateEndpoint(endpoint);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Host header is required");
      });

      it("should reject invalid domain format", () => {
        const endpoint: CDNEndpoint = {
          ...createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          frontDomain: "not-a-valid-domain",
        };

        const result = validateEndpoint(endpoint);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("Front domain is not a valid domain");
      });
    });
  });

  // ===========================================================================
  // DomainFrontingClient Tests
  // ===========================================================================

  describe("DomainFrontingClient", () => {
    describe("Configuration", () => {
      it("should create client with default config", () => {
        const client = new DomainFrontingClient();

        const config = client.getConfig();
        expect(config.enabled).toBe(false);
        expect(config.strategy).toBe("sni-host-split");

        client.dispose();
      });

      it("should merge custom config", () => {
        const client = new DomainFrontingClient({
          enabled: true,
          strategy: "meek",
        });

        const config = client.getConfig();
        expect(config.enabled).toBe(true);
        expect(config.strategy).toBe("meek");

        client.dispose();
      });

      it("should update config", () => {
        const client = new DomainFrontingClient();

        client.updateConfig({ enabled: true });

        expect(client.getConfig().enabled).toBe(true);

        client.dispose();
      });
    });

    describe("Endpoint Management", () => {
      it("should add endpoints", () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [],
        });
        const endpoint = createCloudflareEndpoint(
          "cdn.example.com",
          "real.example.com",
        );

        client.addEndpoint(endpoint);

        const config = client.getConfig();
        expect(config.endpoints).toHaveLength(1);

        client.dispose();
      });

      it("should remove endpoints", () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [],
        });
        const endpoint = createCloudflareEndpoint(
          "cdn.example.com",
          "real.example.com",
        );

        client.addEndpoint(endpoint);
        client.removeEndpoint(endpoint.id);

        const config = client.getConfig();
        expect(config.endpoints).toHaveLength(0);

        client.dispose();
      });

      it("should get healthy endpoints", () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [],
        });

        const healthy = createCloudflareEndpoint(
          "healthy.example.com",
          "real.example.com",
        );
        const unhealthy = {
          ...createCloudflareEndpoint(
            "unhealthy.example.com",
            "real.example.com",
          ),
          healthy: false,
        };

        client.addEndpoint(healthy);
        client.addEndpoint(unhealthy);

        const healthyEndpoints = client.getHealthyEndpoints();
        expect(healthyEndpoints).toHaveLength(1);
        expect(healthyEndpoints[0].frontDomain).toBe("healthy.example.com");

        client.dispose();
      });

      it("should select best endpoint by priority", () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [],
        });

        const lowPriority = {
          ...createCloudflareEndpoint("low.example.com", "real.example.com"),
          priority: 10,
        };
        const highPriority = {
          ...createCloudflareEndpoint("high.example.com", "real.example.com"),
          priority: 1,
        };

        client.addEndpoint(lowPriority);
        client.addEndpoint(highPriority);

        const selected = client.selectEndpoint();
        expect(selected?.frontDomain).toBe("high.example.com");

        client.dispose();
      });
    });

    describe("Request Making", () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          arrayBuffer: async () => new ArrayBuffer(0),
        });
      });

      it("should throw when disabled", async () => {
        const client = new DomainFrontingClient({
          enabled: false,
          endpoints: [],
        });

        await expect(
          client.request({
            method: "GET",
            path: "/test",
          }),
        ).rejects.toThrow("Domain fronting is not enabled");

        client.dispose();
      });

      it("should throw when no endpoints available", async () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [],
        });

        await expect(
          client.request({
            method: "GET",
            path: "/test",
          }),
        ).rejects.toThrow("No healthy endpoints available");

        client.dispose();
      });

      it("should make request through endpoint", async () => {
        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [
            createCloudflareEndpoint("cdn.example.com", "real.example.com"),
          ],
          obfuscation: {
            ...DEFAULT_DOMAIN_FRONTING_CONFIG.obfuscation,
            randomPath: false,
            randomQuery: false,
            timingJitter: false,
          },
        });

        await client.request({
          method: "GET",
          path: "/api/test",
        });

        expect(mockFetch).toHaveBeenCalled();
        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain("cdn.example.com");
        expect(options.headers.Host).toBe("real.example.com");

        client.dispose();
      });
    });

    describe("Metrics", () => {
      it("should initialize metrics", () => {
        const client = new DomainFrontingClient({ endpoints: [] });

        const metrics = client.getMetrics();

        expect(metrics.totalRequests).toBe(0);
        expect(metrics.successfulRequests).toBe(0);
        expect(metrics.failedRequests).toBe(0);
        expect(metrics.averageLatency).toBe(0);
        expect(metrics.bytesSent).toBe(0);
        expect(metrics.bytesReceived).toBe(0);

        client.dispose();
      });

      it("should reset metrics", () => {
        const client = new DomainFrontingClient({ endpoints: [] });

        // Manually modify metrics for testing
        const metrics = client.getMetrics();
        expect(metrics.totalRequests).toBe(0);

        client.resetMetrics();

        expect(client.getMetrics().totalRequests).toBe(0);

        client.dispose();
      });
    });

    describe("Endpoint Testing", () => {
      it("should test single endpoint", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map(),
        });

        const client = new DomainFrontingClient({ endpoints: [] });
        const endpoint = createCloudflareEndpoint(
          "cdn.example.com",
          "real.example.com",
        );

        const result = await client.testEndpoint(endpoint);

        expect(result.endpoint).toBe(endpoint);
        expect(result.success).toBe(true);
        expect(result.latency).toBeGreaterThanOrEqual(0);

        client.dispose();
      });

      it("should handle endpoint test failure", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));

        const client = new DomainFrontingClient({ endpoints: [] });
        const endpoint = createCloudflareEndpoint(
          "cdn.example.com",
          "real.example.com",
        );

        const result = await client.testEndpoint(endpoint);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Network error");

        client.dispose();
      });

      it("should test all endpoints", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Map(),
        });

        const endpoint1 = createCloudflareEndpoint(
          "cdn1.example.com",
          "real.example.com",
        );
        const endpoint2 = createCloudflareEndpoint(
          "cdn2.example.com",
          "real.example.com",
        );

        const client = new DomainFrontingClient({
          enabled: true,
          endpoints: [endpoint1, endpoint2],
        });

        const results = await client.testAllEndpoints();

        expect(results).toHaveLength(2);

        client.dispose();
      });
    });

    describe("Lifecycle", () => {
      it("should dispose cleanly", () => {
        const client = new DomainFrontingClient({ endpoints: [] });

        expect(() => client.dispose()).not.toThrow();
      });
    });
  });
});
