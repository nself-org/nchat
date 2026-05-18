/**
 * Proxy Manager Tests
 *
 * Tests for the proxy and bridge management module
 */

import {
  ProxyManager,
  ProxyStatus,
  createProxyConfig,
  createSocks5Proxy,
  createHttpProxy,
  createShadowsocksProxy,
  createObfs4Bridge,
  createMeekBridge,
  createSnowflakeBridge,
  createProxyChain,
  parseProxyUrl,
  DEFAULT_PROXY_OPTIONS,
  DEFAULT_PROXY_MANAGER_CONFIG,
  IP_CHECK_SERVICES,
  COMMON_SOCKS5_PORTS,
  COMMON_HTTP_PROXY_PORTS,
  PROXY_MANAGER_CONSTANTS,
  type ProxyConfig,
} from "../proxy-manager";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Proxy Manager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Constants Tests
  // ===========================================================================

  describe("Constants", () => {
    it("should have default proxy options", () => {
      expect(DEFAULT_PROXY_OPTIONS.connectionTimeout).toBe(30000);
      expect(DEFAULT_PROXY_OPTIONS.requestTimeout).toBe(60000);
      expect(DEFAULT_PROXY_OPTIONS.keepAlive).toBe(true);
      expect(DEFAULT_PROXY_OPTIONS.maxConnections).toBe(10);
      expect(DEFAULT_PROXY_OPTIONS.udpEnabled).toBe(false);
      expect(DEFAULT_PROXY_OPTIONS.dnsResolution).toBe("proxy");
      expect(DEFAULT_PROXY_OPTIONS.tlsVerify).toBe(true);
    });

    it("should have default manager config", () => {
      expect(DEFAULT_PROXY_MANAGER_CONFIG.enabled).toBe(false);
      expect(DEFAULT_PROXY_MANAGER_CONFIG.defaultProtocol).toBe("socks5");
      expect(DEFAULT_PROXY_MANAGER_CONFIG.selectionMode).toBe("priority");
      expect(DEFAULT_PROXY_MANAGER_CONFIG.rotationInterval).toBe(0);
      expect(DEFAULT_PROXY_MANAGER_CONFIG.healthCheckInterval).toBe(60000);
      expect(DEFAULT_PROXY_MANAGER_CONFIG.failureThreshold).toBe(3);
      expect(DEFAULT_PROXY_MANAGER_CONFIG.maxChainLength).toBe(3);
    });

    it("should have IP check services", () => {
      expect(IP_CHECK_SERVICES.length).toBeGreaterThan(0);
      expect(IP_CHECK_SERVICES[0]).toContain("https://");
    });

    it("should have common ports", () => {
      expect(COMMON_SOCKS5_PORTS).toContain(1080);
      expect(COMMON_SOCKS5_PORTS).toContain(9050);
      expect(COMMON_HTTP_PROXY_PORTS).toContain(8080);
      expect(COMMON_HTTP_PROXY_PORTS).toContain(3128);
    });

    it("should export constants object", () => {
      expect(PROXY_MANAGER_CONSTANTS.DEFAULT_PROXY_OPTIONS).toBeDefined();
      expect(
        PROXY_MANAGER_CONSTANTS.DEFAULT_PROXY_MANAGER_CONFIG,
      ).toBeDefined();
      expect(PROXY_MANAGER_CONSTANTS.IP_CHECK_SERVICES).toBeDefined();
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe("Factory Functions", () => {
    describe("createProxyConfig", () => {
      it("should create basic proxy config", () => {
        const proxy = createProxyConfig({
          protocol: "socks5",
          host: "proxy.example.com",
          port: 1080,
        });

        expect(proxy.id).toContain("proxy-");
        expect(proxy.protocol).toBe("socks5");
        expect(proxy.host).toBe("proxy.example.com");
        expect(proxy.port).toBe(1080);
        expect(proxy.enabled).toBe(true);
        expect(proxy.priority).toBe(0);
        expect(proxy.status).toBe(ProxyStatus.UNKNOWN);
      });

      it("should accept optional fields", () => {
        const proxy = createProxyConfig({
          protocol: "http",
          host: "proxy.example.com",
          port: 8080,
          name: "My Proxy",
          auth: { type: "basic", username: "user", password: "pass" },
          priority: 5,
          region: "us-east",
          country: "US",
          tags: ["fast", "anonymous"],
        });

        expect(proxy.name).toBe("My Proxy");
        expect(proxy.auth?.username).toBe("user");
        expect(proxy.priority).toBe(5);
        expect(proxy.region).toBe("us-east");
        expect(proxy.country).toBe("US");
        expect(proxy.tags).toContain("fast");
      });
    });

    describe("createSocks5Proxy", () => {
      it("should create SOCKS5 proxy", () => {
        const proxy = createSocks5Proxy("proxy.example.com", 1080);

        expect(proxy.protocol).toBe("socks5");
        expect(proxy.host).toBe("proxy.example.com");
        expect(proxy.port).toBe(1080);
      });

      it("should merge additional options", () => {
        const proxy = createSocks5Proxy("proxy.example.com", 1080, {
          priority: 10,
        });

        expect(proxy.priority).toBe(10);
      });
    });

    describe("createHttpProxy", () => {
      it("should create HTTP proxy", () => {
        const proxy = createHttpProxy("proxy.example.com", 8080);

        expect(proxy.protocol).toBe("http");
        expect(proxy.host).toBe("proxy.example.com");
        expect(proxy.port).toBe(8080);
      });
    });

    describe("createShadowsocksProxy", () => {
      it("should create Shadowsocks proxy", () => {
        const proxy = createShadowsocksProxy({
          host: "ss.example.com",
          port: 8388,
          password: "mypassword",
          cipher: "aes-256-gcm",
        });

        expect(proxy.protocol).toBe("shadowsocks");
        expect(proxy.options?.cipher).toBe("aes-256-gcm");
        expect(proxy.options?.key).toBe("mypassword");
      });
    });

    describe("createObfs4Bridge", () => {
      it("should create obfs4 bridge", () => {
        const bridge = createObfs4Bridge({
          address: "bridge.example.com",
          port: 443,
          fingerprint: "ABCD1234",
          cert: "base64cert",
        });

        expect(bridge.id).toContain("bridge-");
        expect(bridge.protocol).toBe("obfs4");
        expect(bridge.address).toBe("bridge.example.com");
        expect(bridge.port).toBe(443);
        expect(bridge.fingerprint).toBe("ABCD1234");
        expect(bridge.cert).toBe("base64cert");
        expect(bridge.iatMode).toBe(0);
      });

      it("should accept custom iat mode", () => {
        const bridge = createObfs4Bridge({
          address: "bridge.example.com",
          port: 443,
          fingerprint: "ABCD1234",
          cert: "base64cert",
          iatMode: 1,
        });

        expect(bridge.iatMode).toBe(1);
      });
    });

    describe("createMeekBridge", () => {
      it("should create meek bridge", () => {
        const bridge = createMeekBridge({
          cdnUrl: "https://cdn.example.com",
          frontDomain: "allowed.example.com",
        });

        expect(bridge.protocol).toBe("meek");
        expect(bridge.cdnUrl).toBe("https://cdn.example.com");
        expect(bridge.frontDomain).toBe("allowed.example.com");
        expect(bridge.port).toBe(443);
      });
    });

    describe("createSnowflakeBridge", () => {
      it("should create snowflake bridge with defaults", () => {
        const bridge = createSnowflakeBridge();

        expect(bridge.protocol).toBe("snowflake");
        expect(bridge.brokerUrl).toContain("snowflake-broker");
        expect(bridge.stunServers?.length).toBeGreaterThan(0);
      });

      it("should accept custom options", () => {
        const bridge = createSnowflakeBridge({
          brokerUrl: "https://custom.broker.com",
          stunServers: ["stun:custom.stun.com:3478"],
        });

        expect(bridge.brokerUrl).toBe("https://custom.broker.com");
        expect(bridge.stunServers).toContain("stun:custom.stun.com:3478");
      });
    });

    describe("createProxyChain", () => {
      it("should create proxy chain", () => {
        const chain = createProxyChain({
          name: "My Chain",
          proxyIds: ["proxy-1", "proxy-2"],
        });

        expect(chain.id).toContain("chain-");
        expect(chain.name).toBe("My Chain");
        expect(chain.proxyIds).toHaveLength(2);
        expect(chain.enabled).toBe(true);
        expect(chain.strategy).toBe("strict");
      });

      it("should accept custom strategy", () => {
        const chain = createProxyChain({
          name: "My Chain",
          proxyIds: ["proxy-1", "proxy-2"],
          strategy: "dynamic",
        });

        expect(chain.strategy).toBe("dynamic");
      });
    });

    describe("parseProxyUrl", () => {
      it("should parse SOCKS5 URL", () => {
        const proxy = parseProxyUrl("socks5://proxy.example.com:1080");

        expect(proxy).toBeDefined();
        expect(proxy?.protocol).toBe("socks5");
        expect(proxy?.host).toBe("proxy.example.com");
        expect(proxy?.port).toBe(1080);
      });

      it("should parse HTTP URL", () => {
        const proxy = parseProxyUrl("http://proxy.example.com:8080");

        expect(proxy?.protocol).toBe("http");
        expect(proxy?.port).toBe(8080);
      });

      it("should parse URL with auth", () => {
        const proxy = parseProxyUrl(
          "socks5://user:pass@proxy.example.com:1080",
        );

        expect(proxy?.auth?.username).toBe("user");
        expect(proxy?.auth?.password).toBe("pass");
      });

      it("should handle URL-encoded auth", () => {
        const proxy = parseProxyUrl(
          "http://user%40domain:p%40ss@proxy.example.com:8080",
        );

        expect(proxy?.auth?.username).toBe("user@domain");
        expect(proxy?.auth?.password).toBe("p@ss");
      });

      it("should return undefined for invalid URL", () => {
        const proxy = parseProxyUrl("invalid-url");

        expect(proxy).toBeUndefined();
      });

      it("should return undefined for unsupported protocol", () => {
        const proxy = parseProxyUrl("ftp://proxy.example.com:21");

        expect(proxy).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // ProxyStatus Enum Tests
  // ===========================================================================

  describe("ProxyStatus", () => {
    it("should have all expected statuses", () => {
      expect(ProxyStatus.UNKNOWN).toBe("unknown");
      expect(ProxyStatus.AVAILABLE).toBe("available");
      expect(ProxyStatus.CONNECTING).toBe("connecting");
      expect(ProxyStatus.CONNECTED).toBe("connected");
      expect(ProxyStatus.FAILED).toBe("failed");
      expect(ProxyStatus.BLOCKED).toBe("blocked");
      expect(ProxyStatus.RATE_LIMITED).toBe("rate_limited");
    });
  });

  // ===========================================================================
  // ProxyManager Tests
  // ===========================================================================

  describe("ProxyManager", () => {
    describe("Configuration", () => {
      it("should create with default config", () => {
        const manager = new ProxyManager();

        const config = manager.getConfig();
        expect(config.enabled).toBe(false);
        expect(config.selectionMode).toBe("priority");
      });

      it("should merge custom config", () => {
        const manager = new ProxyManager({
          enabled: true,
          selectionMode: "random",
        });

        const config = manager.getConfig();
        expect(config.enabled).toBe(true);
        expect(config.selectionMode).toBe("random");
      });

      it("should update config", () => {
        const manager = new ProxyManager();

        manager.updateConfig({ enabled: true });

        expect(manager.getConfig().enabled).toBe(true);
      });
    });

    describe("Proxy Management", () => {
      let manager: ProxyManager;

      beforeEach(() => {
        manager = new ProxyManager({ enabled: true });
      });

      afterEach(() => {
        manager.dispose();
      });

      it("should add proxy", () => {
        const proxy = createSocks5Proxy("proxy.example.com", 1080);

        manager.addProxy(proxy);

        expect(manager.getAllProxies()).toHaveLength(1);
        expect(manager.getProxy(proxy.id)).toBeDefined();
      });

      it("should remove proxy", () => {
        const proxy = createSocks5Proxy("proxy.example.com", 1080);

        manager.addProxy(proxy);
        const removed = manager.removeProxy(proxy.id);

        expect(removed).toBe(true);
        expect(manager.getAllProxies()).toHaveLength(0);
      });

      it("should return false when removing non-existent proxy", () => {
        const removed = manager.removeProxy("non-existent");

        expect(removed).toBe(false);
      });

      it("should update proxy", () => {
        const proxy = createSocks5Proxy("proxy.example.com", 1080);

        manager.addProxy(proxy);
        const updated = manager.updateProxy(proxy.id, { priority: 5 });

        expect(updated).toBe(true);
        expect(manager.getProxy(proxy.id)?.priority).toBe(5);
      });

      it("should return false when updating non-existent proxy", () => {
        const updated = manager.updateProxy("non-existent", { priority: 5 });

        expect(updated).toBe(false);
      });

      it("should get proxies by status", () => {
        const available = {
          ...createSocks5Proxy("available.com", 1080),
          status: ProxyStatus.AVAILABLE,
        };
        const failed = {
          ...createSocks5Proxy("failed.com", 1080),
          status: ProxyStatus.FAILED,
        };

        manager.addProxy(available);
        manager.addProxy(failed);

        expect(manager.getProxiesByStatus(ProxyStatus.AVAILABLE)).toHaveLength(
          1,
        );
        expect(manager.getProxiesByStatus(ProxyStatus.FAILED)).toHaveLength(1);
      });

      it("should get proxies by region", () => {
        const usProxy = {
          ...createSocks5Proxy("us.com", 1080),
          region: "us-east",
        };
        const euProxy = {
          ...createSocks5Proxy("eu.com", 1080),
          region: "eu-west",
        };

        manager.addProxy(usProxy);
        manager.addProxy(euProxy);

        expect(manager.getProxiesByRegion("us-east")).toHaveLength(1);
        expect(manager.getProxiesByRegion("eu-west")).toHaveLength(1);
      });

      it("should get proxies by country", () => {
        const usProxy = { ...createSocks5Proxy("us.com", 1080), country: "US" };
        const gbProxy = { ...createSocks5Proxy("gb.com", 1080), country: "GB" };

        manager.addProxy(usProxy);
        manager.addProxy(gbProxy);

        expect(manager.getProxiesByCountry("US")).toHaveLength(1);
        expect(manager.getProxiesByCountry("GB")).toHaveLength(1);
      });

      it("should get proxies by tag", () => {
        const fastProxy = {
          ...createSocks5Proxy("fast.com", 1080),
          tags: ["fast"],
        };
        const slowProxy = {
          ...createSocks5Proxy("slow.com", 1080),
          tags: ["slow"],
        };

        manager.addProxy(fastProxy);
        manager.addProxy(slowProxy);

        expect(manager.getProxiesByTag("fast")).toHaveLength(1);
        expect(manager.getProxiesByTag("slow")).toHaveLength(1);
      });

      it("should get healthy proxies", () => {
        const healthy: ProxyConfig = {
          ...createSocks5Proxy("healthy.com", 1080),
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };
        const unhealthy: ProxyConfig = {
          ...createSocks5Proxy("unhealthy.com", 1080),
          health: {
            healthy: false,
            score: 0,
            successCount: 0,
            failureCount: 5,
            averageLatency: 0,
            lastCheck: new Date(),
          },
        };

        manager.addProxy(healthy);
        manager.addProxy(unhealthy);

        const healthyProxies = manager.getHealthyProxies();
        expect(healthyProxies).toHaveLength(1);
        expect(healthyProxies[0].host).toBe("healthy.com");
      });
    });

    describe("Bridge Management", () => {
      let manager: ProxyManager;

      beforeEach(() => {
        manager = new ProxyManager({ enabled: true });
      });

      afterEach(() => {
        manager.dispose();
      });

      it("should add bridge", () => {
        const bridge = createSnowflakeBridge();

        manager.addBridge(bridge);

        expect(manager.getAllBridges()).toHaveLength(1);
      });

      it("should remove bridge", () => {
        const bridge = createSnowflakeBridge();

        manager.addBridge(bridge);
        const removed = manager.removeBridge(bridge.id);

        expect(removed).toBe(true);
        expect(manager.getAllBridges()).toHaveLength(0);
      });

      it("should get healthy bridges", () => {
        const healthy = {
          ...createSnowflakeBridge(),
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };

        manager.addBridge(healthy);

        expect(manager.getHealthyBridges()).toHaveLength(1);
      });
    });

    describe("Chain Management", () => {
      let manager: ProxyManager;

      beforeEach(() => {
        manager = new ProxyManager({ enabled: true });
      });

      afterEach(() => {
        manager.dispose();
      });

      it("should add chain", () => {
        const chain = createProxyChain({
          name: "Test Chain",
          proxyIds: ["proxy-1", "proxy-2"],
        });

        manager.addChain(chain);

        expect(manager.getAllChains()).toHaveLength(1);
        expect(manager.getChain(chain.id)).toBeDefined();
      });

      it("should reject chain exceeding max length", () => {
        const chain = createProxyChain({
          name: "Long Chain",
          proxyIds: ["p1", "p2", "p3", "p4", "p5"],
        });

        expect(() => manager.addChain(chain)).toThrow(
          "Chain length exceeds maximum",
        );
      });

      it("should remove chain", () => {
        const chain = createProxyChain({
          name: "Test Chain",
          proxyIds: ["proxy-1"],
        });

        manager.addChain(chain);
        const removed = manager.removeChain(chain.id);

        expect(removed).toBe(true);
        expect(manager.getAllChains()).toHaveLength(0);
      });

      it("should resolve chain to proxies", () => {
        const proxy1 = createSocks5Proxy("proxy1.com", 1080);
        const proxy2 = createSocks5Proxy("proxy2.com", 1080);

        manager.addProxy(proxy1);
        manager.addProxy(proxy2);

        const chain = createProxyChain({
          name: "Test Chain",
          proxyIds: [proxy1.id, proxy2.id],
        });
        manager.addChain(chain);

        const resolved = manager.resolveChain(chain.id);
        expect(resolved).toHaveLength(2);
      });
    });

    describe("Proxy Selection", () => {
      let manager: ProxyManager;

      beforeEach(() => {
        manager = new ProxyManager({
          enabled: true,
          selectionMode: "priority",
        });
      });

      afterEach(() => {
        manager.dispose();
      });

      it("should select by priority", () => {
        const lowPriority: ProxyConfig = {
          ...createSocks5Proxy("low.com", 1080),
          priority: 10,
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };
        const highPriority: ProxyConfig = {
          ...createSocks5Proxy("high.com", 1080),
          priority: 1,
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };

        manager.addProxy(lowPriority);
        manager.addProxy(highPriority);

        const selected = manager.selectProxy();
        expect(selected?.host).toBe("high.com");
      });

      it("should return undefined when no healthy proxies", () => {
        const selected = manager.selectProxy();
        expect(selected).toBeUndefined();
      });

      it("should set and get active proxy", () => {
        const proxy: ProxyConfig = {
          ...createSocks5Proxy("proxy.com", 1080),
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };

        manager.addProxy(proxy);
        const set = manager.setActiveProxy(proxy.id);

        expect(set).toBe(true);
        expect(manager.getActiveProxy()?.id).toBe(proxy.id);
      });

      it("should rotate to next proxy", () => {
        const proxy1: ProxyConfig = {
          ...createSocks5Proxy("proxy1.com", 1080),
          priority: 1,
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };
        const proxy2: ProxyConfig = {
          ...createSocks5Proxy("proxy2.com", 1080),
          priority: 2,
          health: {
            healthy: true,
            score: 100,
            successCount: 5,
            failureCount: 0,
            averageLatency: 100,
            lastCheck: new Date(),
          },
        };

        manager.addProxy(proxy1);
        manager.addProxy(proxy2);

        const rotated = manager.rotate();
        expect(rotated).toBeDefined();
      });
    });

    describe("Metrics", () => {
      let manager: ProxyManager;

      beforeEach(() => {
        manager = new ProxyManager({ enabled: true });
      });

      afterEach(() => {
        manager.dispose();
      });

      it("should get initial metrics", () => {
        const metrics = manager.getMetrics();

        expect(metrics.totalProxies).toBe(0);
        expect(metrics.healthyProxies).toBe(0);
        expect(metrics.failedProxies).toBe(0);
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.averageLatency).toBe(0);
      });

      it("should record successful request", () => {
        manager.recordSuccess(100, 1024, 2048);

        const metrics = manager.getMetrics();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.successfulRequests).toBe(1);
        expect(metrics.bytesSent).toBe(1024);
        expect(metrics.bytesReceived).toBe(2048);
      });

      it("should record failed request", () => {
        manager.recordFailure();

        const metrics = manager.getMetrics();
        expect(metrics.totalRequests).toBe(1);
        expect(metrics.failedRequests).toBe(1);
      });

      it("should reset metrics", () => {
        manager.recordSuccess(100, 1024, 2048);
        manager.resetMetrics();

        const metrics = manager.getMetrics();
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.bytesSent).toBe(0);
      });
    });

    describe("Lifecycle", () => {
      it("should dispose cleanly", () => {
        const manager = new ProxyManager({ enabled: true });

        manager.addProxy(createSocks5Proxy("proxy.com", 1080));

        expect(() => manager.dispose()).not.toThrow();
        expect(manager.getAllProxies()).toHaveLength(0);
      });
    });
  });
});
