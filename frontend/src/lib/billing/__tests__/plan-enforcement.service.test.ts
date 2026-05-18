/**
 * Plan Enforcement Service Tests
 *
 * Tests for server-side plan limit enforcement.
 */

import {
  PlanEnforcementService,
  getPlanEnforcementService,
} from "../plan-enforcement.service";
import type { PlanTier } from "@/types/subscription.types";

describe("PlanEnforcementService", () => {
  let service: PlanEnforcementService;

  beforeEach(() => {
    service = new PlanEnforcementService();
  });

  describe("checkFeatureAccess", () => {
    it("should allow access to features included in plan", async () => {
      const result = await service.checkFeatureAccess("starter", "videoCalls");
      expect(result.allowed).toBe(true);
      expect(result.upgradeRequired).toBeUndefined();
    });

    it("should deny access to features not in plan", async () => {
      const result = await service.checkFeatureAccess("free", "videoCalls");
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe("starter");
      expect(result.reason).toContain("starter");
    });

    it("should suggest enterprise for SSO", async () => {
      const result = await service.checkFeatureAccess("professional", "sso");
      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe("enterprise");
    });
  });

  describe("checkLimit", () => {
    it("should allow when within limit", async () => {
      const result = await service.checkLimit("free", "maxMembers", 5, 1);
      expect(result.withinLimit).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.warning).toBe("none");
    });

    it("should block when exceeding limit", async () => {
      const result = await service.checkLimit("free", "maxMembers", 10, 1);
      expect(result.withinLimit).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.warning).toBe("exceeded");
    });

    it("should warn when approaching limit", async () => {
      const result = await service.checkLimit("free", "maxMembers", 7, 1); // 80%
      expect(result.withinLimit).toBe(true);
      expect(result.warning).toBe("approaching");
    });

    it("should warn critically when near limit", async () => {
      const result = await service.checkLimit("free", "maxMembers", 9, 0); // 90%
      expect(result.withinLimit).toBe(true);
      expect(result.warning).toBe("critical");
    });

    it("should handle unlimited correctly", async () => {
      const result = await service.checkLimit(
        "enterprise",
        "maxMembers",
        1000,
        100,
      );
      expect(result.withinLimit).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
      expect(result.usagePercent).toBeNull();
    });
  });

  describe("enforceMaxMembers", () => {
    it("should allow adding members within limit", async () => {
      const result = await service.enforceMaxMembers("free", 5, 2);
      expect(result.success).toBe(true);
      expect(result.action).toBe("allow");
    });

    it("should block adding members over limit", async () => {
      const result = await service.enforceMaxMembers("free", 9, 2);
      expect(result.success).toBe(false);
      expect(result.action).toBe("block");
      expect(result.upgradeRequired).toBe("starter");
      expect(result.error).toContain("10");
    });

    it("should warn when approaching limit", async () => {
      const result = await service.enforceMaxMembers("free", 7, 1); // 80%
      expect(result.success).toBe(true);
      expect(result.action).toBe("warn");
    });
  });

  describe("enforceMaxChannels", () => {
    it("should allow creating channels within limit", async () => {
      const result = await service.enforceMaxChannels("free", 3, 1);
      expect(result.success).toBe(true);
    });

    it("should block creating channels over limit", async () => {
      const result = await service.enforceMaxChannels("free", 5, 1); // 5 is the limit for free
      expect(result.success).toBe(false);
      expect(result.action).toBe("block");
    });
  });

  describe("enforceMaxStorage", () => {
    it("should allow uploads within storage limit", async () => {
      const currentBytes = 500 * 1024 * 1024; // 500 MB
      const addingBytes = 100 * 1024 * 1024; // 100 MB
      const result = await service.enforceMaxStorage(
        "free",
        currentBytes,
        addingBytes,
      );
      expect(result.success).toBe(true);
    });

    it("should block uploads exceeding storage limit", async () => {
      const currentBytes = 900 * 1024 * 1024; // 900 MB
      const addingBytes = 200 * 1024 * 1024; // 200 MB
      const result = await service.enforceMaxStorage(
        "free",
        currentBytes,
        addingBytes,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain("GB");
    });
  });

  describe("enforceMaxFileSize", () => {
    it("should allow files within size limit", async () => {
      const result = await service.enforceMaxFileSize("free", 5 * 1024 * 1024); // 5 MB
      expect(result.success).toBe(true);
    });

    it("should block files exceeding size limit", async () => {
      const result = await service.enforceMaxFileSize("free", 15 * 1024 * 1024); // 15 MB (limit is 10)
      expect(result.success).toBe(false);
      expect(result.error).toContain("MB");
    });
  });

  describe("enforceApiCallLimit", () => {
    it("should allow API calls within limit", async () => {
      const result = await service.enforceApiCallLimit("free", 500);
      expect(result.success).toBe(true);
    });

    it("should block when API limit exceeded", async () => {
      const result = await service.enforceApiCallLimit("free", 1000); // 1000 is the limit
      expect(result.success).toBe(false);
      expect(result.action).toBe("block");
    });
  });

  describe("enforceCallParticipants", () => {
    it("should allow within participant limit", async () => {
      const result = await service.enforceCallParticipants("free", 3); // Free allows 4
      expect(result.success).toBe(true);
    });

    it("should block exceeding participant limit", async () => {
      const result = await service.enforceCallParticipants("free", 6);
      expect(result.success).toBe(false);
    });
  });

  describe("enforceStreamDuration", () => {
    it("should allow within duration limit", async () => {
      const result = await service.enforceStreamDuration("free", 30); // Free allows 60
      expect(result.success).toBe(true);
    });

    it("should block exceeding duration limit", async () => {
      const result = await service.enforceStreamDuration("free", 90);
      expect(result.success).toBe(false);
    });

    it("should allow unlimited for enterprise", async () => {
      const result = await service.enforceStreamDuration("enterprise", 1000);
      expect(result.success).toBe(true);
    });
  });

  describe("getPlanStatus", () => {
    it("should return comprehensive plan status", async () => {
      const status = await service.getPlanStatus("starter", {
        members: 15,
        channels: 10,
        storageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
        apiCalls: 5000,
      });

      expect(status.plan).toBe("starter");
      expect(status.limits).toBeDefined();
      expect(status.usage).toBeDefined();
      expect(status.checks.members).toBeDefined();
      expect(status.checks.channels).toBeDefined();
      expect(status.checks.storage).toBeDefined();
      expect(status.checks.apiCalls).toBeDefined();
    });
  });

  describe("getUsageWarnings", () => {
    it("should return warnings for high usage", async () => {
      const warnings = await service.getUsageWarnings("starter", {
        members: 23, // 92% of 25
        channels: 8, // 40% of 20
        storageBytes: 2 * 1024 * 1024 * 1024, // 20% of 10GB
        apiCalls: 8500, // 85% of 10000
      });

      expect(warnings.length).toBe(2); // members (critical) and apiCalls (warning)

      const memberWarning = warnings.find((w) => w.resource === "members");
      expect(memberWarning?.level).toBe("critical");

      const apiWarning = warnings.find((w) => w.resource === "API calls");
      expect(apiWarning?.level).toBe("warning");
    });

    it("should return no warnings for low usage", async () => {
      const warnings = await service.getUsageWarnings("starter", {
        members: 5,
        channels: 5,
        storageBytes: 1 * 1024 * 1024 * 1024,
        apiCalls: 1000,
      });

      expect(warnings.length).toBe(0);
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getPlanEnforcementService();
      const instance2 = getPlanEnforcementService();
      expect(instance1).toBe(instance2);
    });
  });
});
