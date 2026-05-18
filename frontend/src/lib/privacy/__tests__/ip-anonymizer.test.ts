/**
 * IP Anonymizer Tests
 *
 * @module lib/privacy/__tests__/ip-anonymizer.test
 */

import {
  IPAnonymizer,
  createIPAnonymizer,
  getIPAnonymizer,
  resetIPAnonymizer,
  anonymizeIP,
  detectIPVersion,
  parseIPv4,
  parseIPv6,
  parseIPAddress,
  isPrivateIPv4,
  isLoopbackIPv4,
  isLinkLocalIPv4,
  truncateIPv4,
  truncateIPv6,
  compressIPv6,
  hashIPAddress,
  ANONYMIZED_IPV4,
  ANONYMIZED_IPV6,
  TRUNCATION_CONFIG,
} from "../ip-anonymizer";

describe("IPAnonymizer", () => {
  let anonymizer: IPAnonymizer;

  beforeEach(() => {
    resetIPAnonymizer();
    anonymizer = createIPAnonymizer();
  });

  afterEach(() => {
    resetIPAnonymizer();
  });

  describe("constructor and initialization", () => {
    it("should create with default config", () => {
      const config = anonymizer.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultStrategy).toBe("truncate");
      expect(config.preservePrivateIPs).toBe(true);
    });

    it("should create with custom config", () => {
      const custom = createIPAnonymizer({
        defaultStrategy: "hash",
        truncationLevel: "aggressive",
        hashSalt: "custom-salt",
      });
      const config = custom.getConfig();
      expect(config.defaultStrategy).toBe("hash");
      expect(config.truncationLevel).toBe("aggressive");
      expect(config.hashSalt).toBe("custom-salt");
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getIPAnonymizer();
      const instance2 = getIPAnonymizer();
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton", () => {
      const instance1 = getIPAnonymizer();
      resetIPAnonymizer();
      const instance2 = getIPAnonymizer();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("anonymize IPv4", () => {
    it("should truncate public IPv4 by default", () => {
      const result = anonymizer.anonymize("203.0.113.45");
      expect(result.isValid).toBe(true);
      expect(result.version).toBe("ipv4");
      expect(result.anonymized).not.toBe("203.0.113.45");
      expect(result.anonymized).toMatch(/^\d+\.\d+\.0\.0$/);
    });

    it("should preserve private IPs when configured", () => {
      const result = anonymizer.anonymize("192.168.1.100");
      expect(result.anonymized).toBe("192.168.1.100");
      expect(result.strategy).toBe("none");
    });

    it("should preserve loopback IPs", () => {
      const result = anonymizer.anonymize("127.0.0.1");
      expect(result.anonymized).toBe("127.0.0.1");
    });

    it("should not preserve private IPs when disabled", () => {
      anonymizer.updateConfig({ preservePrivateIPs: false });
      const result = anonymizer.anonymize("192.168.1.100");
      expect(result.anonymized).not.toBe("192.168.1.100");
    });

    it("should hash IPv4 when strategy is hash", () => {
      const result = anonymizer.anonymize("8.8.8.8", "hash");
      expect(result.strategy).toBe("hash");
      expect(result.anonymized).toMatch(/^ip_/);
    });

    it("should remove IPv4 when strategy is remove", () => {
      const result = anonymizer.anonymize("8.8.8.8", "remove");
      expect(result.anonymized).toBe(ANONYMIZED_IPV4);
    });
  });

  describe("anonymize IPv6", () => {
    it("should truncate public IPv6", () => {
      const result = anonymizer.anonymize(
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      );
      expect(result.isValid).toBe(true);
      expect(result.version).toBe("ipv6");
    });

    it("should handle compressed IPv6", () => {
      const result = anonymizer.anonymize("2001:db8::1");
      expect(result.isValid).toBe(true);
      expect(result.version).toBe("ipv6");
    });

    it("should remove IPv6 when strategy is remove", () => {
      const result = anonymizer.anonymize("2001:db8::1", "remove");
      expect(result.anonymized).toBe(ANONYMIZED_IPV6);
    });
  });

  describe("invalid IPs", () => {
    it("should handle invalid IPv4", () => {
      const result = anonymizer.anonymize("999.999.999.999");
      expect(result.isValid).toBe(false);
    });

    it("should handle non-IP strings", () => {
      const result = anonymizer.anonymize("not-an-ip");
      expect(result.isValid).toBe(false);
      expect(result.version).toBe("unknown");
    });

    it("should handle empty string", () => {
      const result = anonymizer.anonymize("");
      expect(result.isValid).toBe(false);
    });
  });

  describe("batch anonymization", () => {
    it("should anonymize multiple IPs", () => {
      const ips = ["8.8.8.8", "1.1.1.1", "192.168.1.1", "2001:db8::1"];
      const results = anonymizer.anonymizeBatch(ips);
      expect(results).toHaveLength(4);
    });

    it("should handle mixed valid and invalid IPs", () => {
      const ips = ["8.8.8.8", "invalid", "1.1.1.1"];
      const results = anonymizer.anonymizeBatch(ips, { skipInvalid: true });
      expect(results).toHaveLength(3);
    });
  });

  describe("shouldAnonymize", () => {
    it("should return true for public IPs", () => {
      expect(anonymizer.shouldAnonymize("8.8.8.8")).toBe(true);
    });

    it("should return false for private IPs", () => {
      expect(anonymizer.shouldAnonymize("192.168.1.1")).toBe(false);
    });

    it("should return false when disabled", () => {
      anonymizer.setEnabled(false);
      expect(anonymizer.shouldAnonymize("8.8.8.8")).toBe(false);
    });
  });

  describe("statistics", () => {
    it("should track anonymization count", () => {
      anonymizer.anonymize("8.8.8.8");
      anonymizer.anonymize("1.1.1.1");

      const stats = anonymizer.getStats();
      expect(stats.anonymizationCount).toBe(2);
    });

    it("should reset statistics", () => {
      anonymizer.anonymize("8.8.8.8");
      anonymizer.resetStats();

      const stats = anonymizer.getStats();
      expect(stats.anonymizationCount).toBe(0);
    });
  });

  describe("configuration", () => {
    it("should update strategy", () => {
      anonymizer.setStrategy("hash");
      expect(anonymizer.getConfig().defaultStrategy).toBe("hash");
    });

    it("should update truncation level", () => {
      anonymizer.setTruncationLevel("aggressive");
      expect(anonymizer.getConfig().truncationLevel).toBe("aggressive");
    });

    it("should update hash salt", () => {
      anonymizer.setHashSalt("new-salt");
      expect(anonymizer.getConfig().hashSalt).toBe("new-salt");
    });
  });
});

describe("detectIPVersion", () => {
  it("should detect IPv4", () => {
    expect(detectIPVersion("192.168.1.1")).toBe("ipv4");
    expect(detectIPVersion("8.8.8.8")).toBe("ipv4");
    expect(detectIPVersion("255.255.255.255")).toBe("ipv4");
  });

  it("should detect IPv6", () => {
    expect(detectIPVersion("2001:db8::1")).toBe("ipv6");
    expect(detectIPVersion("::1")).toBe("ipv6");
    expect(detectIPVersion("fe80::1")).toBe("ipv6");
  });

  it("should return unknown for invalid", () => {
    expect(detectIPVersion("not-an-ip")).toBe("unknown");
    expect(detectIPVersion("")).toBe("unknown");
  });
});

describe("parseIPv4", () => {
  it("should parse valid IPv4", () => {
    const octets = parseIPv4("192.168.1.100");
    expect(octets).toEqual([192, 168, 1, 100]);
  });

  it("should return null for invalid", () => {
    expect(parseIPv4("999.1.1.1")).toBeNull();
    expect(parseIPv4("not-ip")).toBeNull();
    expect(parseIPv4("1.2.3")).toBeNull();
  });
});

describe("parseIPv6", () => {
  it("should parse full IPv6", () => {
    const hextets = parseIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(hextets).toHaveLength(8);
    expect(hextets?.[0]).toBe(0x2001);
  });

  it("should parse compressed IPv6", () => {
    const hextets = parseIPv6("2001:db8::1");
    expect(hextets).toHaveLength(8);
    expect(hextets?.[0]).toBe(0x2001);
    expect(hextets?.[7]).toBe(1);
  });

  it("should parse ::1 (loopback)", () => {
    const hextets = parseIPv6("::1");
    expect(hextets).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it("should parse :: (all zeros)", () => {
    const hextets = parseIPv6("::");
    expect(hextets).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("parseIPAddress", () => {
  it("should parse IPv4 with metadata", () => {
    const parsed = parseIPAddress("192.168.1.1");
    expect(parsed.version).toBe("ipv4");
    expect(parsed.isValid).toBe(true);
    expect(parsed.isPrivate).toBe(true);
    expect(parsed.isLoopback).toBe(false);
  });

  it("should identify loopback", () => {
    const parsed = parseIPAddress("127.0.0.1");
    expect(parsed.isLoopback).toBe(true);
  });

  it("should identify link-local", () => {
    const parsed = parseIPAddress("169.254.1.1");
    expect(parsed.isLinkLocal).toBe(true);
  });
});

describe("isPrivateIPv4", () => {
  it("should identify 10.x.x.x as private", () => {
    expect(isPrivateIPv4([10, 0, 0, 1])).toBe(true);
    expect(isPrivateIPv4([10, 255, 255, 255])).toBe(true);
  });

  it("should identify 172.16-31.x.x as private", () => {
    expect(isPrivateIPv4([172, 16, 0, 1])).toBe(true);
    expect(isPrivateIPv4([172, 31, 255, 255])).toBe(true);
    expect(isPrivateIPv4([172, 15, 0, 1])).toBe(false);
    expect(isPrivateIPv4([172, 32, 0, 1])).toBe(false);
  });

  it("should identify 192.168.x.x as private", () => {
    expect(isPrivateIPv4([192, 168, 0, 1])).toBe(true);
    expect(isPrivateIPv4([192, 168, 255, 255])).toBe(true);
  });

  it("should identify public IPs as not private", () => {
    expect(isPrivateIPv4([8, 8, 8, 8])).toBe(false);
    expect(isPrivateIPv4([203, 0, 113, 1])).toBe(false);
  });
});

describe("isLoopbackIPv4", () => {
  it("should identify 127.x.x.x as loopback", () => {
    expect(isLoopbackIPv4([127, 0, 0, 1])).toBe(true);
    expect(isLoopbackIPv4([127, 255, 255, 255])).toBe(true);
  });

  it("should not identify other IPs as loopback", () => {
    expect(isLoopbackIPv4([128, 0, 0, 1])).toBe(false);
    expect(isLoopbackIPv4([192, 168, 1, 1])).toBe(false);
  });
});

describe("isLinkLocalIPv4", () => {
  it("should identify 169.254.x.x as link-local", () => {
    expect(isLinkLocalIPv4([169, 254, 0, 1])).toBe(true);
    expect(isLinkLocalIPv4([169, 254, 255, 255])).toBe(true);
  });

  it("should not identify other IPs as link-local", () => {
    expect(isLinkLocalIPv4([169, 253, 1, 1])).toBe(false);
    expect(isLinkLocalIPv4([192, 168, 1, 1])).toBe(false);
  });
});

describe("truncateIPv4", () => {
  it("should truncate with /24 mask", () => {
    expect(truncateIPv4([192, 168, 1, 100], 24)).toBe("192.168.1.0");
  });

  it("should truncate with /16 mask", () => {
    expect(truncateIPv4([192, 168, 1, 100], 16)).toBe("192.168.0.0");
  });

  it("should truncate with /8 mask", () => {
    expect(truncateIPv4([192, 168, 1, 100], 8)).toBe("192.0.0.0");
  });

  it("should return 0.0.0.0 for /0 mask", () => {
    expect(truncateIPv4([192, 168, 1, 100], 0)).toBe("0.0.0.0");
  });

  it("should return full IP for /32 mask", () => {
    expect(truncateIPv4([192, 168, 1, 100], 32)).toBe("192.168.1.100");
  });
});

describe("truncateIPv6", () => {
  it("should truncate with /48 mask", () => {
    const hextets = [
      0x2001, 0x0db8, 0x85a3, 0x1234, 0x5678, 0x8a2e, 0x0370, 0x7334,
    ];
    const result = truncateIPv6(hextets, 48);
    expect(result).toBe("2001:db8:85a3::");
  });

  it("should return :: for /0 mask", () => {
    const hextets = [0x2001, 0x0db8, 0, 0, 0, 0, 0, 1];
    const result = truncateIPv6(hextets, 0);
    expect(result).toBe("::");
  });
});

describe("compressIPv6", () => {
  it("should compress consecutive zeros", () => {
    expect(compressIPv6([0x2001, 0x0db8, 0, 0, 0, 0, 0, 1])).toBe(
      "2001:db8::1",
    );
  });

  it("should compress all zeros", () => {
    expect(compressIPv6([0, 0, 0, 0, 0, 0, 0, 0])).toBe("::");
  });

  it("should compress loopback", () => {
    expect(compressIPv6([0, 0, 0, 0, 0, 0, 0, 1])).toBe("::1");
  });

  it("should not compress single zeros", () => {
    // When there's no run of 2+ consecutive zeros, no :: compression
    const result = compressIPv6([
      0x2001, 0x0db8, 0x0001, 0, 0x0002, 0, 0x0003, 0x0004,
    ]);
    // Single zeros stay as 0, no :: compression for runs shorter than 2
    expect(result).toBe("2001:db8:1:0:2:0:3:4");
  });
});

describe("hashIPAddress", () => {
  it("should hash IP address", () => {
    const hash = hashIPAddress("8.8.8.8");
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
  });

  it("should produce consistent hashes", () => {
    const hash1 = hashIPAddress("8.8.8.8", "salt");
    const hash2 = hashIPAddress("8.8.8.8", "salt");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different IPs", () => {
    const hash1 = hashIPAddress("8.8.8.8");
    const hash2 = hashIPAddress("1.1.1.1");
    expect(hash1).not.toBe(hash2);
  });
});

describe("anonymizeIP convenience function", () => {
  beforeEach(() => {
    resetIPAnonymizer();
  });

  it("should anonymize using default strategy", () => {
    const result = anonymizeIP("8.8.8.8");
    expect(result).not.toBe("8.8.8.8");
  });

  it("should respect custom strategy", () => {
    const result = anonymizeIP("8.8.8.8", "remove");
    expect(result).toBe(ANONYMIZED_IPV4);
  });
});

describe("TRUNCATION_CONFIG", () => {
  it("should have valid configurations for all levels", () => {
    expect(TRUNCATION_CONFIG.minimal.ipv4Mask).toBe(24);
    expect(TRUNCATION_CONFIG.moderate.ipv4Mask).toBe(16);
    expect(TRUNCATION_CONFIG.aggressive.ipv4Mask).toBe(8);
    expect(TRUNCATION_CONFIG.maximum.ipv4Mask).toBe(0);
  });

  it("should have IPv6 masks", () => {
    expect(TRUNCATION_CONFIG.minimal.ipv6Mask).toBeDefined();
    expect(TRUNCATION_CONFIG.moderate.ipv6Mask).toBeDefined();
  });
});
