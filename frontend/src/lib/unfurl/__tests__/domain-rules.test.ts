/**
 * Domain Rules Tests
 *
 * Tests for per-domain configuration rules.
 */

import {
  createDefaultDomainRulesConfig,
  matchDomainPattern,
  findMatchingRule,
  isDomainAllowed,
  getDomainSettings,
  addDomainRule,
  updateDomainRule,
  removeDomainRule,
  setUserDomainOverride,
  removeUserDomainOverride,
  setChannelRules,
  updateProviderSettings,
  serializeDomainRulesConfig,
  deserializeDomainRulesConfig,
  exportRules,
  importRules,
  DomainRulesConfig,
  DomainRule,
  DEFAULT_PROVIDER_SETTINGS,
} from "../domain-rules";

describe("Domain Rules", () => {
  let config: DomainRulesConfig;

  beforeEach(() => {
    config = createDefaultDomainRulesConfig();
  });

  describe("matchDomainPattern", () => {
    it("should match exact domain", () => {
      expect(matchDomainPattern("example.com", "example.com")).toBe(true);
      expect(matchDomainPattern("www.example.com", "example.com")).toBe(true);
    });

    it("should match wildcard patterns", () => {
      expect(matchDomainPattern("sub.example.com", "*.example.com")).toBe(true);
      expect(matchDomainPattern("deep.sub.example.com", "*.example.com")).toBe(
        true,
      );
      expect(matchDomainPattern("example.com", "*.example.com")).toBe(true);
    });

    it("should not match different domains", () => {
      expect(matchDomainPattern("other.com", "example.com")).toBe(false);
      expect(matchDomainPattern("notexample.com", "*.example.com")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(matchDomainPattern("EXAMPLE.COM", "example.com")).toBe(true);
      expect(matchDomainPattern("example.com", "EXAMPLE.COM")).toBe(true);
    });

    it("should match subdomain patterns", () => {
      expect(matchDomainPattern("api.example.com", "example.com")).toBe(true);
    });
  });

  describe("isDomainAllowed", () => {
    it("should allow domains by default", () => {
      const result = isDomainAllowed("allowed.com", config);
      expect(result.allowed).toBe(true);
    });

    it("should block domains matching blocked rules", () => {
      config = addDomainRule(config, {
        domain: "blocked.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
        reason: "Test block",
      });

      const result = isDomainAllowed("blocked.com", config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Test block");
    });

    it("should block all in whitelist mode without matching allow", () => {
      config = { ...config, whitelistMode: true };
      const result = isDomainAllowed("random.com", config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("whitelist");
    });

    it("should allow in whitelist mode with matching rule", () => {
      config = { ...config, whitelistMode: true };
      config = addDomainRule(config, {
        domain: "allowed.com",
        enabled: true,
        behavior: "allow",
        embedStyle: "card",
      });

      const result = isDomainAllowed("allowed.com", config);
      expect(result.allowed).toBe(true);
    });

    it("should check user overrides first", () => {
      const userId = "user-123";
      config = setUserDomainOverride(config, userId, "example.com", {
        domain: "example.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
        reason: "User blocked",
      });

      const result = isDomainAllowed("example.com", config, undefined, userId);
      expect(result.allowed).toBe(false);
    });

    it("should check channel rules", () => {
      const channelId = "channel-123";
      config = setChannelRules(config, channelId, [
        {
          domain: "example.com",
          enabled: true,
          behavior: "block",
          embedStyle: "card",
        },
      ]);

      const result = isDomainAllowed("example.com", config, channelId);
      expect(result.allowed).toBe(false);
    });
  });

  describe("getDomainSettings", () => {
    it("should return default settings for unknown domains", () => {
      const settings = getDomainSettings("unknown.com", "generic", config);
      expect(settings.behavior).toBe("allow");
      expect(settings.embedStyle).toBe("card");
      expect(settings.timeout).toBe(10000);
    });

    it("should use provider settings", () => {
      const settings = getDomainSettings("youtube.com", "youtube", config);
      expect(settings.embedStyle).toBe("player");
      expect(settings.showPlayer).toBe(true);
    });

    it("should override with domain rule settings", () => {
      config = addDomainRule(config, {
        domain: "example.com",
        enabled: true,
        behavior: "minimal",
        embedStyle: "compact",
        timeout: 5000,
        maxImageHeight: 200,
      });

      const settings = getDomainSettings("example.com", "generic", config);
      expect(settings.behavior).toBe("minimal");
      expect(settings.embedStyle).toBe("compact");
      expect(settings.timeout).toBe(5000);
      expect(settings.maxImageHeight).toBe(200);
    });
  });

  describe("Rule Management", () => {
    describe("addDomainRule", () => {
      it("should add a new rule", () => {
        const initialCount = config.rules.length;
        config = addDomainRule(config, {
          domain: "newdomain.com",
          enabled: true,
          behavior: "block",
          embedStyle: "card",
        });

        expect(config.rules.length).toBe(initialCount + 1);
        expect(
          config.rules.find((r) => r.domain === "newdomain.com"),
        ).toBeDefined();
      });

      it("should set timestamps", () => {
        config = addDomainRule(config, {
          domain: "test.com",
          enabled: true,
          behavior: "allow",
          embedStyle: "card",
        });

        const rule = config.rules.find((r) => r.domain === "test.com");
        expect(rule!.createdAt).toBeDefined();
        expect(rule!.updatedAt).toBeDefined();
      });
    });

    describe("updateDomainRule", () => {
      it("should update an existing rule", () => {
        config = addDomainRule(config, {
          domain: "test.com",
          enabled: true,
          behavior: "allow",
          embedStyle: "card",
        });

        config = updateDomainRule(config, "test.com", { behavior: "block" });

        const rule = config.rules.find((r) => r.domain === "test.com");
        expect(rule!.behavior).toBe("block");
      });

      it("should update timestamp", () => {
        config = addDomainRule(config, {
          domain: "test.com",
          enabled: true,
          behavior: "allow",
          embedStyle: "card",
        });

        const originalTime = config.rules.find(
          (r) => r.domain === "test.com",
        )!.updatedAt;

        // Wait a bit to ensure different timestamp
        jest.advanceTimersByTime?.(100) ||
          new Promise((r) => setTimeout(r, 10));

        config = updateDomainRule(config, "test.com", { reason: "Updated" });

        const newTime = config.rules.find(
          (r) => r.domain === "test.com",
        )!.updatedAt;
        expect(newTime).toBeDefined();
      });
    });

    describe("removeDomainRule", () => {
      it("should remove a rule", () => {
        config = addDomainRule(config, {
          domain: "test.com",
          enabled: true,
          behavior: "block",
          embedStyle: "card",
        });

        expect(config.rules.find((r) => r.domain === "test.com")).toBeDefined();

        config = removeDomainRule(config, "test.com");

        expect(
          config.rules.find((r) => r.domain === "test.com"),
        ).toBeUndefined();
      });
    });
  });

  describe("User Overrides", () => {
    const userId = "user-123";

    it("should set user override", () => {
      config = setUserDomainOverride(config, userId, "example.com", {
        domain: "example.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
      });

      expect(config.userOverrides.get(`${userId}:example.com`)).toBeDefined();
    });

    it("should remove user override", () => {
      config = setUserDomainOverride(config, userId, "example.com", {
        domain: "example.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
      });

      config = removeUserDomainOverride(config, userId, "example.com");

      expect(config.userOverrides.get(`${userId}:example.com`)).toBeUndefined();
    });

    it("should use user override in findMatchingRule", () => {
      config = setUserDomainOverride(config, userId, "example.com", {
        domain: "example.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
        reason: "User override",
      });

      const rule = findMatchingRule("example.com", config, undefined, userId);
      expect(rule).not.toBeNull();
      expect(rule!.reason).toBe("User override");
    });
  });

  describe("Channel Rules", () => {
    const channelId = "channel-123";

    it("should set channel rules", () => {
      const rules: DomainRule[] = [
        {
          domain: "blocked.com",
          enabled: true,
          behavior: "block",
          embedStyle: "card",
        },
        {
          domain: "allowed.com",
          enabled: true,
          behavior: "allow",
          embedStyle: "full",
        },
      ];

      config = setChannelRules(config, channelId, rules);

      expect(config.channelRules.get(channelId)).toHaveLength(2);
    });

    it("should find channel-specific rules", () => {
      config = setChannelRules(config, channelId, [
        {
          domain: "channel-only.com",
          enabled: true,
          behavior: "block",
          embedStyle: "card",
        },
      ]);

      const ruleWithChannel = findMatchingRule(
        "channel-only.com",
        config,
        channelId,
      );
      expect(ruleWithChannel).not.toBeNull();

      const ruleWithoutChannel = findMatchingRule("channel-only.com", config);
      expect(ruleWithoutChannel).toBeNull();
    });
  });

  describe("Provider Settings", () => {
    it("should update provider settings", () => {
      config = updateProviderSettings(config, "youtube", {
        enabled: false,
        embedStyle: "card",
      });

      expect(config.providers.youtube!.enabled).toBe(false);
      expect(config.providers.youtube!.embedStyle).toBe("card");
    });

    it("should preserve existing settings", () => {
      config = updateProviderSettings(config, "youtube", { timeout: 5000 });

      expect(config.providers.youtube!.enabled).toBe(true); // Default preserved
      expect(config.providers.youtube!.timeout).toBe(5000);
    });
  });

  describe("Serialization", () => {
    it("should serialize and deserialize config", () => {
      config = addDomainRule(config, {
        domain: "test.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
      });

      const userId = "user-123";
      config = setUserDomainOverride(config, userId, "override.com", {
        domain: "override.com",
        enabled: true,
        behavior: "minimal",
        embedStyle: "compact",
      });

      const serialized = serializeDomainRulesConfig(config);
      const deserialized = deserializeDomainRulesConfig(serialized);

      expect(
        deserialized.rules.find((r) => r.domain === "test.com"),
      ).toBeDefined();
      expect(
        deserialized.userOverrides.get(`${userId}:override.com`),
      ).toBeDefined();
    });
  });

  describe("Export/Import", () => {
    it("should export rules", () => {
      config = addDomainRule(config, {
        domain: "export.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
        reason: "For export",
      });

      const exported = exportRules(config);

      expect(exported).toHaveProperty("version", "1.0");
      expect(exported).toHaveProperty("rules");
      expect(exported).toHaveProperty("providers");
      expect(
        (exported as { rules: DomainRule[] }).rules.find(
          (r) => r.domain === "export.com",
        ),
      ).toBeDefined();
    });

    it("should import rules", () => {
      const importData = {
        rules: [
          { domain: "imported.com", behavior: "block", embedStyle: "card" },
          { domain: "imported2.com", behavior: "allow", embedStyle: "full" },
        ],
        defaultBehavior: "minimal",
      };

      const result = importRules(importData, config);

      expect(result.imported).toBe(2);
      expect(
        result.config.rules.find((r) => r.domain === "imported.com"),
      ).toBeDefined();
      expect(result.config.defaultBehavior).toBe("minimal");
    });

    it("should skip duplicate rules on import", () => {
      config = addDomainRule(config, {
        domain: "existing.com",
        enabled: true,
        behavior: "block",
        embedStyle: "card",
      });

      const importData = {
        rules: [
          { domain: "existing.com", behavior: "allow", embedStyle: "full" },
          { domain: "new.com", behavior: "block", embedStyle: "card" },
        ],
      };

      const result = importRules(importData, config);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe("Default Blocked Domains", () => {
    it("should block localhost by default", () => {
      const result = isDomainAllowed("localhost", config);
      expect(result.allowed).toBe(false);
    });

    it("should block .local domains by default", () => {
      const result = isDomainAllowed("myserver.local", config);
      expect(result.allowed).toBe(false);
    });

    it("should block suspicious TLDs", () => {
      const result = isDomainAllowed("suspicious.tk", config);
      expect(result.allowed).toBe(false);
    });
  });

  describe("Priority Ordering", () => {
    it("should respect rule priority", () => {
      config = addDomainRule(config, {
        domain: "*.example.com",
        enabled: true,
        behavior: "minimal",
        embedStyle: "card",
        priority: 1,
      });

      config = addDomainRule(config, {
        domain: "sub.example.com",
        enabled: true,
        behavior: "full",
        embedStyle: "full",
        priority: 10, // Higher priority
      });

      const rule = findMatchingRule("sub.example.com", config);
      expect(rule!.behavior).toBe("full"); // Higher priority rule wins
    });
  });
});
