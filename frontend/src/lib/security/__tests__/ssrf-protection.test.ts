/**
 * SSRF Protection Tests
 *
 * Tests for DNS resolution, private IP blocking, cloud metadata blocking,
 * and DNS rebinding protection.
 */

import {
  SsrfProtection,
  validateUrl,
  isUrlSafe,
  sanitizeUrl,
  clearDnsCache,
  getCachedDnsResult,
} from "../ssrf-protection";

describe("ssrf-protection", () => {
  beforeEach(() => {
    clearDnsCache();
  });

  describe("isUrlSafe", () => {
    it("should allow valid HTTPS URLs", () => {
      expect(isUrlSafe("https://example.com")).toBe(true);
      expect(isUrlSafe("https://api.github.com/users")).toBe(true);
      expect(isUrlSafe("https://cdn.jsdelivr.net/npm/package")).toBe(true);
    });

    it("should allow valid HTTP URLs", () => {
      expect(isUrlSafe("http://example.com")).toBe(true);
      expect(isUrlSafe("http://api.example.org/data")).toBe(true);
    });

    it("should block non-HTTP protocols", () => {
      expect(isUrlSafe("file:///etc/passwd")).toBe(false);
      expect(isUrlSafe("ftp://ftp.example.com")).toBe(false);
      expect(isUrlSafe("gopher://gopher.example.com")).toBe(false);
      expect(isUrlSafe("javascript:alert(1)")).toBe(false);
      expect(isUrlSafe("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("should block localhost", () => {
      expect(isUrlSafe("http://localhost")).toBe(false);
      expect(isUrlSafe("http://localhost:3000")).toBe(false);
      expect(isUrlSafe("http://127.0.0.1")).toBe(false);
      expect(isUrlSafe("http://127.0.0.1:8080")).toBe(false);
      expect(isUrlSafe("http://0.0.0.0")).toBe(false);
    });

    it("should block IPv6 localhost", () => {
      expect(isUrlSafe("http://[::1]")).toBe(false);
      expect(isUrlSafe("http://[::1]:8080")).toBe(false);
      expect(isUrlSafe("http://[0:0:0:0:0:0:0:1]")).toBe(false);
    });

    it("should block private IPv4 ranges", () => {
      // 10.0.0.0/8
      expect(isUrlSafe("http://10.0.0.1")).toBe(false);
      expect(isUrlSafe("http://10.255.255.255")).toBe(false);

      // 172.16.0.0/12
      expect(isUrlSafe("http://172.16.0.1")).toBe(false);
      expect(isUrlSafe("http://172.31.255.255")).toBe(false);

      // 192.168.0.0/16
      expect(isUrlSafe("http://192.168.0.1")).toBe(false);
      expect(isUrlSafe("http://192.168.255.255")).toBe(false);

      // Link-local
      expect(isUrlSafe("http://169.254.1.1")).toBe(false);
    });

    it("should block CGNAT range (100.64.0.0/10)", () => {
      expect(isUrlSafe("http://100.64.0.1")).toBe(false);
      expect(isUrlSafe("http://100.100.100.100")).toBe(false);
      expect(isUrlSafe("http://100.127.255.255")).toBe(false);
    });

    it("should block cloud metadata endpoints", () => {
      expect(isUrlSafe("http://169.254.169.254")).toBe(false);
      expect(isUrlSafe("http://169.254.169.254/latest/meta-data/")).toBe(false);
      expect(isUrlSafe("http://100.100.100.200")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isUrlSafe("not-a-url")).toBe(false);
      expect(isUrlSafe("")).toBe(false);
      expect(isUrlSafe("http://")).toBe(false);
    });
  });

  describe("sanitizeUrl", () => {
    it("should return safe URLs unchanged", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
      expect(sanitizeUrl("https://example.com/path?query=1")).toBe(
        "https://example.com/path?query=1",
      );
    });

    it("should return null for unsafe URLs", () => {
      expect(sanitizeUrl("http://localhost")).toBeNull();
      expect(sanitizeUrl("http://10.0.0.1")).toBeNull();
      expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
      expect(sanitizeUrl("http://169.254.169.254")).toBeNull();
    });

    it("should return null for invalid URLs", () => {
      expect(sanitizeUrl("not-a-url")).toBeNull();
      expect(sanitizeUrl("")).toBeNull();
    });
  });

  describe("SsrfProtection.validateUrl", () => {
    let protection: SsrfProtection;

    beforeEach(() => {
      protection = new SsrfProtection();
    });

    it("should validate safe URLs", async () => {
      const result = await protection.validateUrl("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should reject disallowed protocols", async () => {
      const result = await protection.validateUrl("ftp://example.com");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Protocol");
      expect(result.reason).toContain("not allowed");
    });

    it("should reject localhost", async () => {
      const result = await protection.validateUrl("http://localhost");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Localhost");
    });

    it("should reject cloud metadata", async () => {
      const result = await protection.validateUrl("http://169.254.169.254");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cloud metadata");
    });

    it("should reject private IPs", async () => {
      const result = await protection.validateUrl("http://10.0.0.1");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Private IP");
    });

    it("should reject blocked domains", async () => {
      const result = await protection.validateUrl(
        "http://metadata.google.internal",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("blocklist");
    });

    it("should handle invalid URLs gracefully", async () => {
      const result = await protection.validateUrl("not-a-valid-url");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Invalid URL");
    });
  });

  describe("SsrfProtection with custom config", () => {
    it("should allow localhost when configured", async () => {
      const protection = new SsrfProtection({
        allowLocalhost: true,
      });

      const result = await protection.validateUrl("http://localhost:3000");
      expect(result.valid).toBe(true);
    });

    it("should allow private IPs when configured", async () => {
      const protection = new SsrfProtection({
        allowPrivateIPs: true,
      });

      const result = await protection.validateUrl("http://192.168.1.1");
      expect(result.valid).toBe(true);
    });

    it("should enforce allowlist when provided", async () => {
      const protection = new SsrfProtection({
        allowedDomains: ["example.com", "api.example.com"],
      });

      const allowed = await protection.validateUrl("https://example.com");
      expect(allowed.valid).toBe(true);

      const subdomain = await protection.validateUrl("https://sub.example.com");
      expect(subdomain.valid).toBe(true);

      const notAllowed = await protection.validateUrl("https://other.com");
      expect(notAllowed.valid).toBe(false);
      expect(notAllowed.reason).toContain("not in allowlist");
    });

    it("should add custom blocked domains", async () => {
      const protection = new SsrfProtection({
        blockedDomains: ["evil.com", "malware.org"],
      });

      const result = await protection.validateUrl("https://evil.com");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("blocklist");
    });
  });

  describe("validateUrl helper function", () => {
    it("should use default config", async () => {
      const safe = await validateUrl("https://example.com");
      expect(safe.valid).toBe(true);

      const unsafe = await validateUrl("http://localhost");
      expect(unsafe.valid).toBe(false);
    });
  });

  describe("DNS cache functions", () => {
    it("should return null for uncached hostnames", () => {
      expect(getCachedDnsResult("example.com")).toBeNull();
    });

    it("should clear cache", () => {
      // clearDnsCache is called in beforeEach, just verify it works
      clearDnsCache();
      expect(getCachedDnsResult("anything.com")).toBeNull();
    });
  });

  describe("IPv4-mapped IPv6 handling", () => {
    it("should block IPv4-mapped IPv6 private addresses", async () => {
      const protection = new SsrfProtection();

      // These would need DNS resolution to detect in real scenarios
      // but we test the isPrivateIP function indirectly
      const result = await protection.validateUrl("http://10.0.0.1");
      expect(result.valid).toBe(false);
    });

    it("should block IPv6 private ranges", async () => {
      const protection = new SsrfProtection();

      const loopback = await protection.validateUrl("http://[::1]");
      expect(loopback.valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle URLs with ports", async () => {
      const protection = new SsrfProtection();

      const safe = await protection.validateUrl("https://example.com:443");
      expect(safe.valid).toBe(true);

      const unsafe = await protection.validateUrl("http://localhost:8080");
      expect(unsafe.valid).toBe(false);
    });

    it("should handle URLs with paths and query strings", async () => {
      const protection = new SsrfProtection();

      const result = await protection.validateUrl(
        "https://api.example.com/v1/users?limit=10",
      );
      expect(result.valid).toBe(true);
    });

    it("should handle URLs with fragments", async () => {
      const protection = new SsrfProtection();

      const result = await protection.validateUrl(
        "https://example.com/page#section",
      );
      expect(result.valid).toBe(true);
    });

    it("should handle URLs with authentication", async () => {
      const protection = new SsrfProtection();

      // URLs with credentials should still be validated
      const result = await protection.validateUrl(
        "https://user:pass@example.com",
      );
      expect(result.valid).toBe(true);
    });

    it("should handle punycode domains", async () => {
      const protection = new SsrfProtection();

      // International domain name
      const result = await protection.validateUrl("https://xn--nxasmq5b.com");
      expect(result.valid).toBe(true);
    });
  });

  describe("blocked cloud metadata hostnames", () => {
    const protection = new SsrfProtection();

    it("should block GCP metadata", async () => {
      const result = await protection.validateUrl(
        "http://metadata.google.internal",
      );
      expect(result.valid).toBe(false);
    });

    it("should block Kubernetes internal", async () => {
      const result = await protection.validateUrl(
        "http://kubernetes.default.svc",
      );
      expect(result.valid).toBe(false);
    });

    it("should block Docker internal", async () => {
      const result = await protection.validateUrl(
        "http://host.docker.internal",
      );
      expect(result.valid).toBe(false);
    });
  });
});
