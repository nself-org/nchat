/**
 * Metadata Minimizer Tests
 *
 * @module lib/privacy/__tests__/metadata-minimizer.test
 */

import {
  MetadataMinimizer,
  createMetadataMinimizer,
  getMetadataMinimizer,
  resetMetadataMinimizer,
  hashValue,
  hashValueSync,
  truncateValue,
  maskValue,
  generalizeTimestamp,
  pseudonymize,
  isSensitiveField,
  DEFAULT_FIELD_CLASSIFICATIONS,
  DEFAULT_MINIMIZER_CONFIG,
  type MetadataCategory,
  type ScrubMethod,
} from "../metadata-minimizer";

describe("MetadataMinimizer", () => {
  let minimizer: MetadataMinimizer;

  beforeEach(() => {
    resetMetadataMinimizer();
    minimizer = createMetadataMinimizer();
  });

  afterEach(() => {
    resetMetadataMinimizer();
  });

  describe("constructor and initialization", () => {
    it("should create minimizer with default config", () => {
      const config = minimizer.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultRetentionDays).toBe(30);
      expect(config.defaultScrubMethod).toBe("remove");
    });

    it("should create minimizer with custom config", () => {
      const custom = createMetadataMinimizer({
        enabled: false,
        defaultRetentionDays: 60,
        hashSalt: "custom-salt",
      });
      const config = custom.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.defaultRetentionDays).toBe(60);
      expect(config.hashSalt).toBe("custom-salt");
    });
  });

  describe("singleton", () => {
    it("should return same instance from getMetadataMinimizer", () => {
      const instance1 = getMetadataMinimizer();
      const instance2 = getMetadataMinimizer();
      expect(instance1).toBe(instance2);
    });

    it("should reset singleton with resetMetadataMinimizer", () => {
      const instance1 = getMetadataMinimizer();
      resetMetadataMinimizer();
      const instance2 = getMetadataMinimizer();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("minimize", () => {
    it("should remove sensitive fields by default", async () => {
      const data = {
        userId: "user123",
        password: "secret123",
        email: "test@example.com",
      };

      const result = await minimizer.minimize(data, "request");

      expect(result.fieldsRemoved).toContain("password");
      expect(result.data.password).toBeUndefined();
    });

    it("should retain non-sensitive fields", async () => {
      const data = {
        path: "/api/test",
        method: "GET",
        statusCode: 200,
      };

      const result = await minimizer.minimize(data, "request");

      expect(result.data.path).toBe("/api/test");
      expect(result.data.method).toBe("GET");
      expect(result.data.statusCode).toBe(200);
    });

    it("should hash IP addresses", async () => {
      const data = {
        ip: "192.168.1.1",
        ipAddress: "10.0.0.1",
      };

      const result = await minimizer.minimize(data, "request");

      expect(result.fieldsHashed).toContain("ip");
      expect(result.fieldsHashed).toContain("ipAddress");
      expect(result.data.ip).not.toBe("192.168.1.1");
      expect(result.data.ipAddress).not.toBe("10.0.0.1");
    });

    it("should truncate user agent", async () => {
      const longUserAgent = "Mozilla/5.0 ".repeat(20);
      const data = { userAgent: longUserAgent };

      const result = await minimizer.minimize(data, "request");

      expect(result.fieldsMasked).toContain("userAgent");
      expect((result.data.userAgent as string).length).toBeLessThan(
        longUserAgent.length,
      );
    });

    it("should return all fields retained when disabled", async () => {
      minimizer.setEnabled(false);
      const data = { secret: "value", password: "test" };

      const result = await minimizer.minimize(data, "request");

      expect(result.fieldsRetained).toEqual(["secret", "password"]);
      expect(result.fieldsRemoved).toHaveLength(0);
    });

    it("should track processing time", async () => {
      const data = { test: "value" };

      const result = await minimizer.minimize(data, "request");

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should minimize different categories", async () => {
      const categories: MetadataCategory[] = [
        "request",
        "response",
        "user_activity",
        "message",
        "session",
        "analytics",
        "audit",
        "system",
      ];

      for (const category of categories) {
        const data = { test: "value", ip: "1.2.3.4" };
        const result = await minimizer.minimize(data, category);
        expect(result.data).toBeDefined();
      }
    });
  });

  describe("convenience methods", () => {
    it("should minimize request metadata", async () => {
      const data = { authorization: "Bearer token", path: "/api" };
      const result = await minimizer.minimizeRequest(data);

      expect(result.fieldsRemoved).toContain("authorization");
      expect(result.data.path).toBe("/api");
    });

    it("should minimize activity metadata", async () => {
      const data = { userId: "user1", ip: "1.2.3.4" };
      const result = await minimizer.minimizeActivity(data);

      expect(result.data.userId).toBe("user1");
      expect(result.fieldsHashed).toContain("ip");
    });

    it("should minimize message metadata", async () => {
      const data = { senderId: "user1", clientMetadata: { device: "test" } };
      const result = await minimizer.minimizeMessage(data);

      expect(result.data.senderId).toBe("user1");
    });

    it("should minimize analytics metadata", async () => {
      const data = { event: "click", ip: "1.2.3.4" };
      const result = await minimizer.minimizeAnalytics(data);

      expect(result.data.event).toBe("click");
      expect(result.fieldsRemoved).toContain("ip");
    });

    it("should minimize session metadata", async () => {
      const data = { sessionId: "sess123", userId: "user1" };
      const result = await minimizer.minimizeSession(data);

      expect(result.fieldsHashed).toContain("sessionId");
      expect(result.data.userId).toBe("user1");
    });
  });

  describe("policy management", () => {
    it("should add and retrieve policies", () => {
      const policy = {
        id: "test-policy",
        name: "Test Policy",
        enabled: true,
        category: "request" as MetadataCategory,
        fields: [
          {
            field: "custom",
            sensitivity: "pii" as const,
            retentionDays: 7,
            scrubMethod: "remove" as ScrubMethod,
          },
        ],
        defaultRetentionDays: 30,
        defaultScrubMethod: "remove" as ScrubMethod,
        applyToHistorical: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      minimizer.addPolicy(policy);

      const retrieved = minimizer.getPolicy("test-policy");
      expect(retrieved).toEqual(policy);
    });

    it("should remove policies", () => {
      const policy = {
        id: "to-remove",
        name: "Remove Me",
        enabled: true,
        category: "request" as MetadataCategory,
        fields: [],
        defaultRetentionDays: 30,
        defaultScrubMethod: "remove" as ScrubMethod,
        applyToHistorical: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      minimizer.addPolicy(policy);
      expect(minimizer.removePolicy("to-remove")).toBe(true);
      expect(minimizer.getPolicy("to-remove")).toBeUndefined();
    });

    it("should list all policies", () => {
      const policy1 = {
        id: "policy1",
        name: "Policy 1",
        enabled: true,
        category: "request" as MetadataCategory,
        fields: [],
        defaultRetentionDays: 30,
        defaultScrubMethod: "remove" as ScrubMethod,
        applyToHistorical: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const policy2 = {
        id: "policy2",
        name: "Policy 2",
        enabled: true,
        category: "session" as MetadataCategory,
        fields: [],
        defaultRetentionDays: 60,
        defaultScrubMethod: "hash" as ScrubMethod,
        applyToHistorical: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      minimizer.addPolicy(policy1);
      minimizer.addPolicy(policy2);

      const policies = minimizer.listPolicies();
      expect(policies).toHaveLength(2);
    });
  });

  describe("field classification", () => {
    it("should update field classification", () => {
      minimizer.updateFieldClassification("request", "customField", {
        sensitivity: "pii",
        retentionDays: 14,
        scrubMethod: "hash",
      });

      const classification = minimizer.getFieldClassification(
        "request",
        "customField",
      );
      expect(classification?.sensitivity).toBe("pii");
      expect(classification?.retentionDays).toBe(14);
      expect(classification?.scrubMethod).toBe("hash");
    });

    it("should get field classification", () => {
      const classification = minimizer.getFieldClassification("request", "ip");
      expect(classification).toBeDefined();
      expect(classification?.sensitivity).toBe("pii");
    });
  });

  describe("audit log", () => {
    it("should track audit entries", async () => {
      await minimizer.minimize({ test: "value" }, "request");
      await minimizer.minimize({ another: "value" }, "session");

      const entries = minimizer.getAuditLog();
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter audit entries by category", async () => {
      await minimizer.minimize({ test: "value" }, "request");
      await minimizer.minimize({ another: "value" }, "session");

      const requestEntries = minimizer.getAuditLog({ category: "request" });
      expect(requestEntries.every((e) => e.category === "request")).toBe(true);
    });

    it("should get audit statistics", async () => {
      await minimizer.minimize({ secret: "hidden" }, "request");

      const stats = minimizer.getAuditStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.totalFieldsProcessed).toBeGreaterThan(0);
    });

    it("should clear audit log", async () => {
      await minimizer.minimize({ test: "value" }, "request");
      minimizer.clearAuditLog();

      const entries = minimizer.getAuditLog();
      expect(entries).toHaveLength(0);
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      minimizer.updateConfig({ defaultRetentionDays: 60 });

      const config = minimizer.getConfig();
      expect(config.defaultRetentionDays).toBe(60);
    });

    it("should enable/disable minimization", () => {
      minimizer.setEnabled(false);
      expect(minimizer.isEnabled()).toBe(false);

      minimizer.setEnabled(true);
      expect(minimizer.isEnabled()).toBe(true);
    });
  });
});

describe("Utility Functions", () => {
  describe("hashValue", () => {
    it("should hash a string value", async () => {
      const hash = await hashValue("test-value");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should produce consistent hashes", async () => {
      const hash1 = await hashValue("same-value", "salt");
      const hash2 = await hashValue("same-value", "salt");
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes with different salts", async () => {
      const hash1 = await hashValue("value", "salt1");
      const hash2 = await hashValue("value", "salt2");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hashValueSync", () => {
    it("should hash synchronously", () => {
      const hash = hashValueSync("test-value");
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^h_[0-9a-f]+$/);
    });

    it("should be deterministic", () => {
      const hash1 = hashValueSync("value", "salt");
      const hash2 = hashValueSync("value", "salt");
      expect(hash1).toBe(hash2);
    });
  });

  describe("truncateValue", () => {
    it("should truncate long strings", () => {
      const result = truncateValue("this is a very long string", 10);
      expect(result).toBe("this is a ...");
    });

    it("should not truncate short strings", () => {
      const result = truncateValue("short", 10);
      expect(result).toBe("short");
    });

    it("should handle empty strings", () => {
      const result = truncateValue("", 10);
      expect(result).toBe("");
    });
  });

  describe("maskValue", () => {
    it("should mask a value", () => {
      const result = maskValue("sensitive-data");
      expect(result).toMatch(/^\*+$/);
      expect(result.length).toBe("sensitive-data".length);
    });

    it("should preserve first characters", () => {
      const result = maskValue("sensitive-data", "*", 3, 0);
      expect(result).toMatch(/^sen\*+$/);
    });

    it("should preserve last characters", () => {
      const result = maskValue("sensitive-data", "*", 0, 4);
      expect(result).toMatch(/^\*+data$/);
    });

    it("should use custom mask character", () => {
      const result = maskValue("test", "#", 0, 0);
      expect(result).toBe("####");
    });
  });

  describe("generalizeTimestamp", () => {
    it("should generalize to hour", () => {
      const date = new Date("2024-06-15T14:35:22.123Z");
      const result = generalizeTimestamp(date, "hour");
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("should generalize to day", () => {
      const date = new Date("2024-06-15T14:35:22.123Z");
      const result = generalizeTimestamp(date, "day");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });

    it("should generalize to week", () => {
      const date = new Date("2024-06-15T14:35:22.123Z"); // Saturday
      const result = generalizeTimestamp(date, "week");
      expect(result.getDay()).toBe(0); // Sunday (start of week)
    });

    it("should generalize to month", () => {
      const date = new Date("2024-06-15T14:35:22.123Z");
      const result = generalizeTimestamp(date, "month");
      expect(result.getDate()).toBe(1);
    });

    it("should handle string timestamps", () => {
      const result = generalizeTimestamp("2024-06-15T14:35:22.123Z", "day");
      expect(result).toBeInstanceOf(Date);
    });

    it("should handle numeric timestamps", () => {
      const timestamp = Date.now();
      const result = generalizeTimestamp(timestamp, "hour");
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("pseudonymize", () => {
    it("should pseudonymize a value", () => {
      const result = pseudonymize("user@example.com");
      expect(result).toMatch(/^pseudo_h_[0-9a-f]+$/);
    });

    it("should be deterministic", () => {
      const result1 = pseudonymize("value", "seed");
      const result2 = pseudonymize("value", "seed");
      expect(result1).toBe(result2);
    });

    it("should produce different results for different values", () => {
      const result1 = pseudonymize("value1");
      const result2 = pseudonymize("value2");
      expect(result1).not.toBe(result2);
    });
  });

  describe("isSensitiveField", () => {
    it("should detect IP address fields", () => {
      expect(isSensitiveField("ip")).toBe(true);
      expect(isSensitiveField("ipAddress")).toBe(true);
      expect(isSensitiveField("ip_address")).toBe(true);
      expect(isSensitiveField("remote_addr")).toBe(true);
    });

    it("should detect credential fields", () => {
      expect(isSensitiveField("password")).toBe(true);
      expect(isSensitiveField("secret")).toBe(true);
      expect(isSensitiveField("auth_token")).toBe(true);
      expect(isSensitiveField("access_token")).toBe(true);
    });

    it("should detect PII fields", () => {
      expect(isSensitiveField("email")).toBe(true);
      expect(isSensitiveField("phone")).toBe(true);
      expect(isSensitiveField("ssn")).toBe(true);
      expect(isSensitiveField("credit_card")).toBe(true);
    });

    it("should not flag normal fields", () => {
      expect(isSensitiveField("userId")).toBe(false);
      expect(isSensitiveField("status")).toBe(false);
      expect(isSensitiveField("timestamp")).toBe(false);
    });
  });
});

describe("DEFAULT_FIELD_CLASSIFICATIONS", () => {
  it("should have classifications for all categories", () => {
    const categories: MetadataCategory[] = [
      "request",
      "response",
      "user_activity",
      "message",
      "session",
      "analytics",
      "audit",
      "system",
    ];

    for (const category of categories) {
      expect(DEFAULT_FIELD_CLASSIFICATIONS[category]).toBeDefined();
      expect(Array.isArray(DEFAULT_FIELD_CLASSIFICATIONS[category])).toBe(true);
    }
  });

  it("should have valid field classifications", () => {
    for (const fields of Object.values(DEFAULT_FIELD_CLASSIFICATIONS)) {
      for (const field of fields) {
        expect(field.field).toBeDefined();
        expect(field.sensitivity).toBeDefined();
        expect(field.retentionDays).toBeGreaterThanOrEqual(0);
        expect(field.scrubMethod).toBeDefined();
      }
    }
  });
});

describe("DEFAULT_MINIMIZER_CONFIG", () => {
  it("should have valid defaults", () => {
    expect(DEFAULT_MINIMIZER_CONFIG.enabled).toBe(true);
    expect(DEFAULT_MINIMIZER_CONFIG.defaultRetentionDays).toBe(30);
    expect(DEFAULT_MINIMIZER_CONFIG.defaultScrubMethod).toBe("remove");
    expect(DEFAULT_MINIMIZER_CONFIG.enableAuditLog).toBe(true);
  });
});
