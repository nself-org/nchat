/**
 * Plan Gate Middleware Tests
 *
 * Tests for plan-based feature access middleware.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkPlanGate,
  ROUTE_FEATURE_MAP,
  createPlanGateMiddleware,
  withPlanGate,
  hasFeatureAccess,
  getRemainingQuota,
  type PlanGateConfig,
} from "../plan-gate";

// Mock dependencies
jest.mock("@/lib/tenants/tenant-middleware", () => ({
  getTenantId: jest.fn(),
}));

jest.mock("@/lib/tenants/tenant-service", () => ({
  getTenantService: jest.fn(() => ({
    getTenantById: jest.fn(),
  })),
}));

jest.mock("@/lib/billing/plan-enforcement.service", () => ({
  getPlanEnforcementService: jest.fn(() => ({
    checkFeatureAccess: jest.fn(),
    checkLimit: jest.fn(),
  })),
}));

import { getTenantId } from "@/lib/tenants/tenant-middleware";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getPlanEnforcementService } from "@/lib/billing/plan-enforcement.service";

const mockGetTenantId = getTenantId as jest.Mock;
const mockGetTenantService = getTenantService as jest.Mock;
const mockGetPlanEnforcementService = getPlanEnforcementService as jest.Mock;

describe("Plan Gate Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ROUTE_FEATURE_MAP", () => {
    it("should have mappings for key routes", () => {
      expect(ROUTE_FEATURE_MAP["/api/calls"]).toBeDefined();
      expect(ROUTE_FEATURE_MAP["/api/calls"].feature).toBe("videoCalls");

      expect(ROUTE_FEATURE_MAP["/api/auth/sso"]).toBeDefined();
      expect(ROUTE_FEATURE_MAP["/api/auth/sso"].feature).toBe("sso");

      expect(ROUTE_FEATURE_MAP["/api/channels"]).toBeDefined();
      expect(ROUTE_FEATURE_MAP["/api/channels"].limit).toBe("maxChannels");
    });
  });

  describe("checkPlanGate", () => {
    it("should allow request when no tenant context", async () => {
      mockGetTenantId.mockReturnValue(null);

      const request = new NextRequest("http://localhost/api/calls");
      const result = await checkPlanGate(request);

      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe("free");
    });

    it("should allow request when tenant not found", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue(null),
      });

      const request = new NextRequest("http://localhost/api/calls");
      const result = await checkPlanGate(request);

      expect(result.allowed).toBe(true);
    });

    it("should allow request when no config matches route", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "starter",
            usageTracking: { users: 5, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });

      const request = new NextRequest("http://localhost/api/users");
      const result = await checkPlanGate(request);

      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe("starter");
    });

    it("should deny access when feature not in plan", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "free",
            usageTracking: { users: 5, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn().mockResolvedValue({
          allowed: false,
          reason: "Video calls require starter plan",
          upgradeRequired: "starter",
        }),
        checkLimit: jest.fn(),
      });

      const request = new NextRequest("http://localhost/api/calls");
      const result = await checkPlanGate(request, { feature: "videoCalls" });

      expect(result.allowed).toBe(false);
      expect(result.upgradeRequired).toBe("starter");
    });

    it("should deny access when limit exceeded", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "free",
            usageTracking: { users: 10, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn(),
        checkLimit: jest.fn().mockResolvedValue({
          withinLimit: false,
          limit: 10,
          currentUsage: 11,
        }),
      });

      const request = new NextRequest(
        "http://localhost/api/workspaces/123/members",
      );
      const result = await checkPlanGate(request, { limit: "maxMembers" });

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.currentUsage).toBe(11);
    });

    it("should allow access when feature and limit pass", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "professional",
            usageTracking: { users: 50, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn().mockResolvedValue({ allowed: true }),
        checkLimit: jest.fn().mockResolvedValue({ withinLimit: true }),
      });

      const request = new NextRequest("http://localhost/api/calls");
      const result = await checkPlanGate(request, { feature: "videoCalls" });

      expect(result.allowed).toBe(true);
      expect(result.currentPlan).toBe("professional");
    });

    it("should run custom check when provided", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "starter",
            usageTracking: { users: 5, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn().mockResolvedValue({ allowed: true }),
        checkLimit: jest.fn(),
      });

      const customCheck = jest.fn().mockResolvedValue({
        allowed: false,
        reason: "Custom check failed",
      });

      const request = new NextRequest("http://localhost/api/custom");
      const result = await checkPlanGate(request, {
        feature: "videoCalls",
        customCheck,
      });

      expect(customCheck).toHaveBeenCalled();
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Custom check failed");
    });
  });

  describe("createPlanGateMiddleware", () => {
    it("should create middleware that returns null when allowed", async () => {
      mockGetTenantId.mockReturnValue(null);

      const middleware = createPlanGateMiddleware({ feature: "videoCalls" });
      const request = new NextRequest("http://localhost/api/calls");

      const response = await middleware(request);
      expect(response).toBeNull();
    });

    it("should create middleware that returns 403 when denied", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "free",
            usageTracking: { users: 5, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn().mockResolvedValue({
          allowed: false,
          reason: "Requires upgrade",
          upgradeRequired: "starter",
        }),
        checkLimit: jest.fn(),
      });

      const middleware = createPlanGateMiddleware({ feature: "videoCalls" });
      const request = new NextRequest("http://localhost/api/calls");

      const response = await middleware(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);

      const body = await response?.json();
      expect(body.error).toBe("Plan restriction");
    });
  });

  describe("withPlanGate", () => {
    it("should wrap handler and pass through when allowed", async () => {
      mockGetTenantId.mockReturnValue(null);

      const handler = jest
        .fn()
        .mockResolvedValue(
          NextResponse.json({ success: true }, { status: 200 }),
        );

      const gatedHandler = withPlanGate(handler, { feature: "videoCalls" });
      const request = new NextRequest("http://localhost/api/calls");

      await gatedHandler(request);
      expect(handler).toHaveBeenCalled();
    });

    it("should wrap handler and block when denied", async () => {
      mockGetTenantId.mockReturnValue("tenant-123");
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue({
          id: "tenant-123",
          billing: {
            plan: "free",
            usageTracking: { users: 5, storageBytes: 0, apiCallsThisMonth: 0 },
          },
        }),
      });
      mockGetPlanEnforcementService.mockReturnValue({
        checkFeatureAccess: jest.fn().mockResolvedValue({
          allowed: false,
          reason: "Requires upgrade",
          upgradeRequired: "starter",
        }),
        checkLimit: jest.fn(),
      });

      const handler = jest.fn();
      const gatedHandler = withPlanGate(handler, { feature: "videoCalls" });
      const request = new NextRequest("http://localhost/api/calls");

      const response = await gatedHandler(request);
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
});

describe("Utility Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hasFeatureAccess", () => {
    it("should return false when tenant not found", async () => {
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue(null),
      });

      const result = await hasFeatureAccess("tenant-123", "videoCalls");
      expect(result).toBe(false);
    });
  });

  describe("getRemainingQuota", () => {
    it("should return null when tenant not found", async () => {
      mockGetTenantService.mockReturnValue({
        getTenantById: jest.fn().mockResolvedValue(null),
      });

      const result = await getRemainingQuota("tenant-123", "maxMembers");
      expect(result).toBeNull();
    });
  });
});
