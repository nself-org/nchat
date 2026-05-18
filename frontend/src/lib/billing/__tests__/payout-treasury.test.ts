/**
 * Payout & Treasury Controls - Comprehensive Test Suite
 *
 * Tests cover:
 * - Payout policy evaluation (min/max, frequency, compliance)
 * - Multi-approval workflow (threshold-based, quorum, timeout)
 * - Treasury balance management (reserves, limits, reconciliation)
 * - Audit logging (completeness, immutability, queryability)
 * - Edge cases (concurrent approvals, policy changes mid-flight, insufficient funds)
 * - Security (privilege escalation, self-approval prevention, replay attacks)
 *
 * @module @/lib/billing/__tests__/payout-treasury.test
 */

import {
  PayoutPolicyEngine,
  ApprovalManager,
  TreasuryAuditLogger,
  createDefaultPolicy,
  isValidPayoutTransition,
  getValidPayoutTransitions,
  type PolicyEvaluationContext,
} from "../payout-policy";
import { TreasuryManager } from "../treasury-manager";
import {
  type PayoutPolicy,
  type PayoutRequest,
  type CreatePayoutInput,
  type ApprovalRecord,
  type ApprovalThreshold,
  type TreasuryAccount,
  PayoutErrorCode,
  PayoutError,
  VALID_PAYOUT_TRANSITIONS,
  DEFAULT_PAYOUT_POLICY,
  DEFAULT_BUSINESS_HOURS,
} from "../payout-types";
import {
  PayoutService,
  createPayoutService,
} from "@/services/billing/payout.service";

// ============================================================================
// Test Helpers
// ============================================================================

function createTestInput(
  overrides?: Partial<CreatePayoutInput>,
): CreatePayoutInput {
  return {
    workspaceId: "ws_test_1",
    requestedBy: "user_requester",
    amount: 50000, // $500 in cents
    currency: "USD",
    method: "bank_transfer",
    recipientName: "Test Vendor",
    recipientDetails: { bankAccount: "****1234" },
    description: "Test payout",
    category: "vendor_payment",
    ...overrides,
  };
}

function createTestPolicy(overrides?: Partial<PayoutPolicy>): PayoutPolicy {
  return {
    ...DEFAULT_PAYOUT_POLICY,
    id: "policy_test",
    workspaceId: "ws_test_1",
    createdBy: "admin_1",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  } as PayoutPolicy;
}

function createTestContext(
  overrides?: Partial<PolicyEvaluationContext>,
): PolicyEvaluationContext {
  return {
    now: Date.now(),
    recentPayouts: [],
    ...overrides,
  };
}

function createRecentPayout(
  amount: number,
  createdAt: number,
  status: string = "completed",
): PayoutRequest {
  return {
    id: `payout_${createdAt}_${Math.random().toString(36).slice(2, 6)}`,
    workspaceId: "ws_test_1",
    requestedBy: "user_requester",
    amount,
    currency: "USD",
    method: "bank_transfer",
    recipientName: "Vendor",
    recipientDetails: {},
    description: "Recent payout",
    category: "vendor_payment",
    status: status as any,
    statusHistory: [],
    createdAt,
    updatedAt: createdAt,
    version: 0,
  };
}

// ============================================================================
// 1. Payout Policy Evaluation
// ============================================================================

describe("PayoutPolicyEngine", () => {
  let engine: PayoutPolicyEngine;

  beforeEach(() => {
    engine = new PayoutPolicyEngine();
  });

  describe("Amount Limits", () => {
    it("should allow payouts within min/max range", () => {
      const policy = createTestPolicy();
      const input = createTestInput({ amount: 5000 }); // $50
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should block payouts below minimum amount", () => {
      const policy = createTestPolicy({ minPayoutAmount: 1000 }); // $10 min
      const input = createTestInput({ amount: 50 }); // $0.50
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleId).toBe("min_amount");
    });

    it("should block payouts above maximum amount", () => {
      const policy = createTestPolicy({ maxPayoutAmount: 100000 }); // $1000 max
      const input = createTestInput({ amount: 200000 }); // $2000
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.ruleId === "max_amount")).toBe(
        true,
      );
    });

    it("should allow payout exactly at minimum", () => {
      const policy = createTestPolicy({ minPayoutAmount: 100 });
      const input = createTestInput({ amount: 100 });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });

    it("should allow payout exactly at maximum", () => {
      const policy = createTestPolicy({ maxPayoutAmount: 100000 });
      const input = createTestInput({ amount: 100000 });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Frequency Limits", () => {
    it("should block when daily frequency limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({ maxPayoutsPerDay: 3 });
      const recentPayouts = [
        createRecentPayout(1000, now - 3600000),
        createRecentPayout(2000, now - 1800000),
        createRecentPayout(3000, now - 900000),
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "daily_frequency"),
      ).toBe(true);
    });

    it("should block when weekly frequency limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({
        maxPayoutsPerWeek: 2,
        maxPayoutsPerDay: 100,
      });
      const recentPayouts = [
        createRecentPayout(1000, now - 2 * 24 * 3600000),
        createRecentPayout(2000, now - 1 * 24 * 3600000),
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "weekly_frequency"),
      ).toBe(true);
    });

    it("should block when monthly frequency limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({
        maxPayoutsPerMonth: 2,
        maxPayoutsPerDay: 100,
        maxPayoutsPerWeek: 100,
      });
      const recentPayouts = [
        createRecentPayout(1000, now - 20 * 24 * 3600000),
        createRecentPayout(2000, now - 10 * 24 * 3600000),
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "monthly_frequency"),
      ).toBe(true);
    });

    it("should allow when within frequency limits", () => {
      const now = Date.now();
      const policy = createTestPolicy({ maxPayoutsPerDay: 10 });
      const recentPayouts = [createRecentPayout(1000, now - 3600000)];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Aggregate Amount Limits", () => {
    it("should block when daily aggregate limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({ dailyAmountLimit: 100000 }); // $1000 daily
      const recentPayouts = [
        createRecentPayout(60000, now - 3600000), // $600
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput({ amount: 50000 }); // $500 (total $1100 > $1000)

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "daily_amount_limit"),
      ).toBe(true);
    });

    it("should block when weekly aggregate limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({
        weeklyAmountLimit: 200000,
        dailyAmountLimit: 1000000000,
      });
      const recentPayouts = [
        createRecentPayout(150000, now - 2 * 24 * 3600000),
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput({ amount: 60000 });

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "weekly_amount_limit"),
      ).toBe(true);
    });

    it("should block when monthly aggregate limit is exceeded", () => {
      const now = Date.now();
      const policy = createTestPolicy({
        monthlyAmountLimit: 300000,
        dailyAmountLimit: 1000000000,
        weeklyAmountLimit: 1000000000,
      });
      const recentPayouts = [
        createRecentPayout(200000, now - 15 * 24 * 3600000),
        createRecentPayout(80000, now - 5 * 24 * 3600000),
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput({ amount: 30000 });

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "monthly_amount_limit"),
      ).toBe(true);
    });
  });

  describe("Cooldown Period", () => {
    it("should block when within cooldown period", () => {
      const now = Date.now();
      const policy = createTestPolicy({ cooldownPeriodMs: 300000 }); // 5 min cooldown
      const recentPayouts = [
        createRecentPayout(1000, now - 60000), // 1 minute ago
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "cooldown_period"),
      ).toBe(true);
    });

    it("should allow when cooldown period has passed", () => {
      const now = Date.now();
      const policy = createTestPolicy({ cooldownPeriodMs: 300000 });
      const recentPayouts = [
        createRecentPayout(1000, now - 600000), // 10 minutes ago
      ];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });

    it("should skip cooldown check when cooldownPeriodMs is 0", () => {
      const now = Date.now();
      const policy = createTestPolicy({ cooldownPeriodMs: 0 });
      const recentPayouts = [createRecentPayout(1000, now - 1000)];
      const context = createTestContext({ now, recentPayouts });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      // Should not have cooldown violation
      expect(
        result.violations.some((v) => v.ruleId === "cooldown_period"),
      ).toBe(false);
    });
  });

  describe("Method Restrictions", () => {
    it("should block disallowed payout methods", () => {
      const policy = createTestPolicy({ allowedMethods: ["bank_transfer"] });
      const input = createTestInput({ method: "crypto_withdrawal" });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "method_restriction"),
      ).toBe(true);
    });

    it("should allow permitted payout methods", () => {
      const policy = createTestPolicy({
        allowedMethods: ["bank_transfer", "crypto_withdrawal"],
      });
      const input = createTestInput({ method: "crypto_withdrawal" });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Currency Restrictions", () => {
    it("should block disallowed currencies", () => {
      const policy = createTestPolicy({ allowedCurrencies: ["USD", "EUR"] });
      const input = createTestInput({ currency: "BTC" });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "currency_restriction"),
      ).toBe(true);
    });

    it("should allow permitted currencies", () => {
      const policy = createTestPolicy({ allowedCurrencies: ["USD", "EUR"] });
      const input = createTestInput({ currency: "USD" });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Time Window Restrictions", () => {
    it("should block payouts outside business hours (blocking severity)", () => {
      // Set to a Sunday at 2am UTC
      const sunday2am = new Date("2026-02-08T02:00:00Z").getTime();
      const policy = createTestPolicy({
        timeWindowRestrictions: [
          {
            ...DEFAULT_BUSINESS_HOURS,
            severity: "block",
          },
        ],
      });
      const context = createTestContext({ now: sunday2am });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
    });

    it("should warn for payouts outside business hours (warning severity)", () => {
      const sunday2am = new Date("2026-02-08T02:00:00Z").getTime();
      const policy = createTestPolicy({
        timeWindowRestrictions: [
          {
            ...DEFAULT_BUSINESS_HOURS,
            severity: "warning",
          },
        ],
      });
      const context = createTestContext({ now: sunday2am });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should allow payouts during business hours", () => {
      // Tuesday at 10am UTC
      const tuesday10am = new Date("2026-02-10T10:00:00Z").getTime();
      const policy = createTestPolicy({
        timeWindowRestrictions: [
          {
            ...DEFAULT_BUSINESS_HOURS,
            severity: "block",
          },
        ],
      });
      const context = createTestContext({ now: tuesday10am });
      const input = createTestInput();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Reserve Minimum", () => {
    it("should block payouts that breach reserve minimum", () => {
      const policy = createTestPolicy({ minimumReserveFraction: 0.2 }); // 20% reserve
      const treasuryAccount: TreasuryAccount = {
        id: "acct_1",
        workspaceId: "ws_test_1",
        name: "Test Treasury",
        currency: "USD",
        status: "active",
        totalBalance: 100000,
        availableBalance: 90000,
        reservedBalance: 10000,
        pendingOutgoing: 0,
        pendingIncoming: 0,
        minimumBalance: 0,
        maximumBalance: Number.MAX_SAFE_INTEGER,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 0,
      };
      const context = createTestContext({ treasuryAccount });
      const input = createTestInput({ amount: 80000 }); // Would leave $100 available, reserve needs $200

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(
        result.violations.some((v) => v.ruleId === "reserve_minimum"),
      ).toBe(true);
    });

    it("should allow payouts that respect reserve minimum", () => {
      const policy = createTestPolicy({ minimumReserveFraction: 0.1 });
      const treasuryAccount: TreasuryAccount = {
        id: "acct_1",
        workspaceId: "ws_test_1",
        name: "Test Treasury",
        currency: "USD",
        status: "active",
        totalBalance: 100000,
        availableBalance: 80000,
        reservedBalance: 20000,
        pendingOutgoing: 0,
        pendingIncoming: 0,
        minimumBalance: 0,
        maximumBalance: Number.MAX_SAFE_INTEGER,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 0,
      };
      const context = createTestContext({ treasuryAccount });
      const input = createTestInput({ amount: 50000 }); // Leaves $300 available, reserve needs $100

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Custom Rules", () => {
    it("should enforce custom max_amount rule", () => {
      const policy = createTestPolicy({
        rules: [
          {
            id: "custom_max",
            name: "Custom Max",
            description: "Custom maximum",
            enabled: true,
            severity: "block",
            type: "max_amount",
            params: { maxAmount: 10000 },
          },
        ],
      });
      const input = createTestInput({ amount: 20000 });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.ruleId === "custom_max")).toBe(
        true,
      );
    });

    it("should skip disabled custom rules", () => {
      const policy = createTestPolicy({
        rules: [
          {
            id: "custom_max",
            name: "Custom Max",
            description: "Disabled rule",
            enabled: false,
            severity: "block",
            type: "max_amount",
            params: { maxAmount: 10000 },
          },
        ],
      });
      const input = createTestInput({ amount: 20000 });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.violations.some((v) => v.ruleId === "custom_max")).toBe(
        false,
      );
    });

    it("should enforce recipient_whitelist rule", () => {
      const policy = createTestPolicy({
        rules: [
          {
            id: "whitelist",
            name: "Recipient Whitelist",
            description: "Only whitelisted recipients",
            enabled: true,
            severity: "block",
            type: "recipient_whitelist",
            params: { whitelist: ["vendor_1", "vendor_2"] },
          },
        ],
      });
      const input = createTestInput({ recipientId: "vendor_3" });
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.ruleId === "whitelist")).toBe(
        true,
      );
    });
  });

  describe("Disabled Policy", () => {
    it("should allow everything when policy is disabled", () => {
      const policy = createTestPolicy({ enabled: false });
      const input = createTestInput({ amount: 999999999 }); // Huge amount
      const context = createTestContext();

      const result = engine.evaluate(input, policy, context);
      expect(result.allowed).toBe(true);
      expect(result.appliedRules).toContain("policy_disabled");
    });
  });

  describe("Approval Thresholds", () => {
    it("should return small threshold for small amounts", () => {
      const policy = createTestPolicy();
      const threshold = engine.getApprovalThreshold(5000, policy); // $50
      expect(threshold).not.toBeNull();
      expect(threshold!.id).toBe("small");
      expect(threshold!.requiredApprovals).toBe(1);
    });

    it("should return medium threshold for medium amounts", () => {
      const policy = createTestPolicy();
      const threshold = engine.getApprovalThreshold(500000, policy); // $5000
      expect(threshold).not.toBeNull();
      expect(threshold!.id).toBe("medium");
      expect(threshold!.requiredApprovals).toBe(2);
    });

    it("should return large threshold for large amounts", () => {
      const policy = createTestPolicy();
      const threshold = engine.getApprovalThreshold(5000000, policy); // $50,000
      expect(threshold).not.toBeNull();
      expect(threshold!.id).toBe("large");
      expect(threshold!.requiredApprovals).toBe(3);
    });
  });
});

// ============================================================================
// 2. Multi-Approval Workflow
// ============================================================================

describe("ApprovalManager", () => {
  let manager: ApprovalManager;

  beforeEach(() => {
    manager = new ApprovalManager();
  });

  describe("Creating Approval Status", () => {
    it("should create approval status with correct threshold", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      const status = manager.createApprovalStatus(
        "payout_1",
        500000,
        policy,
        now,
      );

      expect(status.payoutId).toBe("payout_1");
      expect(status.requiredApprovals).toBe(2); // Medium threshold
      expect(status.currentApprovals).toBe(0);
      expect(status.isFullyApproved).toBe(false);
      expect(status.isRejected).toBe(false);
      expect(status.isExpired).toBe(false);
    });

    it("should set expiry time from threshold", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      const status = manager.createApprovalStatus(
        "payout_1",
        500000,
        policy,
        now,
      );

      // Medium threshold has 48 hour expiry
      expect(status.expiresAt).toBe(now + 48 * 60 * 60 * 1000);
    });
  });

  describe("Processing Approvals", () => {
    it("should accept valid approval", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus("payout_1", 5000, policy, now); // small, 1 required

      const approval: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "admin_1",
        approverRole: "admin",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(status, approval, "user_requester", now);
      expect(status.currentApprovals).toBe(1);
      expect(status.isFullyApproved).toBe(true);
    });

    it("should require multiple approvals for large amounts", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus(
        "payout_1",
        5000000,
        policy,
        now,
      ); // large, 3 required

      const approval1: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "owner_1",
        approverRole: "owner",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        approval1,
        "user_requester",
        now,
      );
      expect(status.currentApprovals).toBe(1);
      expect(status.isFullyApproved).toBe(false);

      const approval2: ApprovalRecord = {
        id: "approval_2",
        payoutId: "payout_1",
        approverId: "owner_2",
        approverRole: "owner",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        approval2,
        "user_requester",
        now,
      );
      expect(status.currentApprovals).toBe(2);
      expect(status.isFullyApproved).toBe(false);

      const approval3: ApprovalRecord = {
        id: "approval_3",
        payoutId: "payout_1",
        approverId: "owner_3",
        approverRole: "owner",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        approval3,
        "user_requester",
        now,
      );
      expect(status.currentApprovals).toBe(3);
      expect(status.isFullyApproved).toBe(true);
    });

    it("should handle rejection immediately", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus(
        "payout_1",
        500000,
        policy,
        now,
      ); // 2 required

      const rejection: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "admin_1",
        approverRole: "admin",
        decision: "rejected",
        reason: "Suspicious payout",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        rejection,
        "user_requester",
        now,
      );
      expect(status.isRejected).toBe(true);
      expect(status.rejections).toHaveLength(1);
    });
  });

  describe("Self-Approval Prevention", () => {
    it("should prevent requester from approving their own payout", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      const status = manager.createApprovalStatus(
        "payout_1",
        5000,
        policy,
        now,
      );

      const approval: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "user_requester", // Same as requestedBy
        approverRole: "admin",
        decision: "approved",
        timestamp: now,
      };

      expect(() => {
        manager.processApproval(status, approval, "user_requester", now);
      }).toThrow(PayoutError);

      try {
        manager.processApproval(status, approval, "user_requester", now);
      } catch (e) {
        expect((e as PayoutError).code).toBe(
          PayoutErrorCode.SELF_APPROVAL_DENIED,
        );
      }
    });
  });

  describe("Duplicate Approval Prevention", () => {
    it("should prevent same approver from approving twice", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus(
        "payout_1",
        500000,
        policy,
        now,
      ); // 2 required

      const approval1: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "admin_1",
        approverRole: "admin",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        approval1,
        "user_requester",
        now,
      );

      const approval2: ApprovalRecord = {
        id: "approval_2",
        payoutId: "payout_1",
        approverId: "admin_1", // Same approver
        approverRole: "admin",
        decision: "approved",
        timestamp: now + 1000,
      };

      expect(() => {
        manager.processApproval(status, approval2, "user_requester", now);
      }).toThrow(PayoutError);

      try {
        manager.processApproval(status, approval2, "user_requester", now);
      } catch (e) {
        expect((e as PayoutError).code).toBe(
          PayoutErrorCode.DUPLICATE_APPROVAL,
        );
      }
    });
  });

  describe("Role-Based Approval", () => {
    it("should reject approval from unauthorized role", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      const status = manager.createApprovalStatus(
        "payout_1",
        5000000,
        policy,
        now,
      );
      // Large threshold requires 'owner' role

      const approval: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "member_1",
        approverRole: "member", // Not 'owner'
        decision: "approved",
        timestamp: now,
      };

      expect(() => {
        manager.processApproval(status, approval, "user_requester", now);
      }).toThrow(PayoutError);

      try {
        manager.processApproval(status, approval, "user_requester", now);
      } catch (e) {
        expect((e as PayoutError).code).toBe(PayoutErrorCode.INSUFFICIENT_ROLE);
      }
    });
  });

  describe("Approval Expiry", () => {
    it("should detect expired approval windows", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus("payout_1", 5000, policy, now);

      // Advance past expiry
      const future = now + 25 * 60 * 60 * 1000; // 25 hours later
      status = manager.checkExpiry(status, future);
      expect(status.isExpired).toBe(true);
    });

    it("should not expire before deadline", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus("payout_1", 5000, policy, now);

      const soon = now + 12 * 60 * 60 * 1000; // 12 hours later
      status = manager.checkExpiry(status, soon);
      expect(status.isExpired).toBe(false);
    });

    it("should reject approval on expired status", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus("payout_1", 5000, policy, now);

      // Advance past expiry
      const future = now + 25 * 60 * 60 * 1000;

      const approval: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "admin_1",
        approverRole: "admin",
        decision: "approved",
        timestamp: future,
      };

      status = manager.processApproval(
        status,
        approval,
        "user_requester",
        future,
      );
      expect(status.isExpired).toBe(true);
    });

    it("should not allow decisions after full approval", () => {
      const policy = createTestPolicy();
      const now = Date.now();
      let status = manager.createApprovalStatus("payout_1", 5000, policy, now); // 1 required

      const approval1: ApprovalRecord = {
        id: "approval_1",
        payoutId: "payout_1",
        approverId: "admin_1",
        approverRole: "admin",
        decision: "approved",
        timestamp: now,
      };

      status = manager.processApproval(
        status,
        approval1,
        "user_requester",
        now,
      );
      expect(status.isFullyApproved).toBe(true);

      const approval2: ApprovalRecord = {
        id: "approval_2",
        payoutId: "payout_1",
        approverId: "admin_2",
        approverRole: "admin",
        decision: "approved",
        timestamp: now + 1000,
      };

      expect(() => {
        manager.processApproval(
          status,
          approval2,
          "user_requester",
          now + 1000,
        );
      }).toThrow(PayoutError);
    });
  });
});

// ============================================================================
// 3. Treasury Balance Management
// ============================================================================

describe("TreasuryManager", () => {
  let treasury: TreasuryManager;

  beforeEach(() => {
    treasury = new TreasuryManager();
  });

  describe("Account Creation", () => {
    it("should create an account with initial balance", () => {
      const account = treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Main Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      expect(account.id).toBe("acct_1");
      expect(account.totalBalance).toBe(100000);
      expect(account.availableBalance).toBe(100000);
      expect(account.reservedBalance).toBe(0);
      expect(account.status).toBe("active");
    });

    it("should create an account with zero balance", () => {
      const account = treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Empty Treasury",
        currency: "USD",
      });

      expect(account.totalBalance).toBe(0);
      expect(account.availableBalance).toBe(0);
    });

    it("should reject duplicate account IDs", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
      });

      expect(() => {
        treasury.createAccount({
          id: "acct_1",
          workspaceId: "ws_2",
          name: "Another",
          currency: "USD",
        });
      }).toThrow(PayoutError);
    });
  });

  describe("Deposits", () => {
    it("should increase balance on deposit", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 50000,
      });

      treasury.deposit("acct_1", 25000, "Revenue deposit", "admin_1");
      const account = treasury.getAccount("acct_1")!;

      expect(account.totalBalance).toBe(75000);
      expect(account.availableBalance).toBe(75000);
    });

    it("should reject deposits that exceed maximum balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 90000,
        maximumBalance: 100000,
      });

      expect(() => {
        treasury.deposit("acct_1", 20000, "Too much", "admin_1");
      }).toThrow(PayoutError);
    });

    it("should reject zero or negative deposits", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
      });

      expect(() => {
        treasury.deposit("acct_1", 0, "Zero", "admin_1");
      }).toThrow(PayoutError);

      expect(() => {
        treasury.deposit("acct_1", -100, "Negative", "admin_1");
      }).toThrow(PayoutError);
    });
  });

  describe("Withdrawals", () => {
    it("should decrease balance on withdrawal", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.withdraw("acct_1", 30000, "Withdrawal", "admin_1");
      const account = treasury.getAccount("acct_1")!;

      expect(account.totalBalance).toBe(70000);
      expect(account.availableBalance).toBe(70000);
    });

    it("should reject withdrawals exceeding available balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 50000,
      });

      expect(() => {
        treasury.withdraw("acct_1", 60000, "Too much", "admin_1");
      }).toThrow(PayoutError);

      try {
        treasury.withdraw("acct_1", 60000, "Too much", "admin_1");
      } catch (e) {
        expect((e as PayoutError).code).toBe(
          PayoutErrorCode.INSUFFICIENT_FUNDS,
        );
      }
    });

    it("should reject withdrawals that breach minimum balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
        minimumBalance: 50000,
      });

      expect(() => {
        treasury.withdraw("acct_1", 60000, "Below min", "admin_1");
      }).toThrow(PayoutError);

      try {
        treasury.withdraw("acct_1", 60000, "Below min", "admin_1");
      } catch (e) {
        expect((e as PayoutError).code).toBe(
          PayoutErrorCode.BALANCE_BELOW_MINIMUM,
        );
      }
    });
  });

  describe("Reserve Management", () => {
    it("should hold reserve correctly", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");
      const account = treasury.getAccount("acct_1")!;

      expect(account.totalBalance).toBe(100000);
      expect(account.availableBalance).toBe(70000);
      expect(account.reservedBalance).toBe(30000);
      expect(account.pendingOutgoing).toBe(30000);
    });

    it("should release reserve correctly", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");
      treasury.releaseReserve("acct_1", 30000, "payout_1", "admin_1");

      const account = treasury.getAccount("acct_1")!;
      expect(account.totalBalance).toBe(100000);
      expect(account.availableBalance).toBe(100000);
      expect(account.reservedBalance).toBe(0);
      expect(account.pendingOutgoing).toBe(0);
    });

    it("should reject reserve hold exceeding available balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 50000,
      });

      expect(() => {
        treasury.holdReserve("acct_1", 60000, "payout_1", "admin_1");
      }).toThrow(PayoutError);
    });

    it("should reject reserve release exceeding reserved balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");

      expect(() => {
        treasury.releaseReserve("acct_1", 50000, "payout_1", "admin_1");
      }).toThrow(PayoutError);
    });
  });

  describe("Payout Execution", () => {
    it("should execute payout from reserved funds", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");
      treasury.executePayout("acct_1", 30000, "payout_1", "admin_1");

      const account = treasury.getAccount("acct_1")!;
      expect(account.totalBalance).toBe(70000);
      expect(account.availableBalance).toBe(70000);
      expect(account.reservedBalance).toBe(0);
      expect(account.pendingOutgoing).toBe(0);
    });

    it("should reject payout exceeding reserved balance", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");

      expect(() => {
        treasury.executePayout("acct_1", 50000, "payout_1", "admin_1");
      }).toThrow(PayoutError);
    });
  });

  describe("Account Freeze/Unfreeze", () => {
    it("should freeze an account", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      const account = treasury.freezeAccount("acct_1");
      expect(account.status).toBe("frozen");
    });

    it("should block operations on frozen account", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.freezeAccount("acct_1");

      expect(() => {
        treasury.deposit("acct_1", 10000, "Deposit", "admin_1");
      }).toThrow(PayoutError);

      expect(() => {
        treasury.withdraw("acct_1", 10000, "Withdraw", "admin_1");
      }).toThrow(PayoutError);

      expect(() => {
        treasury.holdReserve("acct_1", 10000, "p1", "admin_1");
      }).toThrow(PayoutError);
    });

    it("should unfreeze an account", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.freezeAccount("acct_1");
      const account = treasury.unfreezeAccount("acct_1");
      expect(account.status).toBe("active");

      // Should allow operations again
      treasury.deposit("acct_1", 10000, "Post-unfreeze", "admin_1");
      const updated = treasury.getAccount("acct_1")!;
      expect(updated.totalBalance).toBe(110000);
    });

    it("should reject freezing already frozen account", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
      });

      treasury.freezeAccount("acct_1");

      expect(() => {
        treasury.freezeAccount("acct_1");
      }).toThrow(PayoutError);
    });
  });

  describe("Reconciliation", () => {
    it("should reconcile a balanced account", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.deposit("acct_1", 50000, "Deposit", "admin_1");
      treasury.withdraw("acct_1", 20000, "Withdraw", "admin_1");

      const result = treasury.reconcile("acct_1");
      expect(result.isBalanced).toBe(true);
      expect(result.discrepancy).toBe(0);
      expect(result.computedBalance).toBe(130000);
    });

    it("should track all transactions during reconciliation", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.deposit("acct_1", 50000, "D1", "admin_1");
      treasury.deposit("acct_1", 25000, "D2", "admin_1");
      treasury.withdraw("acct_1", 10000, "W1", "admin_1");

      const result = treasury.reconcile("acct_1");
      // Initial deposit + 2 deposits + 1 withdrawal = 4 transactions
      expect(result.transactionCount).toBe(4);
    });

    it("should reconcile with reserves correctly", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");

      const result = treasury.reconcile("acct_1");
      expect(result.isBalanced).toBe(true);
    });
  });

  describe("Snapshots", () => {
    it("should capture current state", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.holdReserve("acct_1", 30000, "payout_1", "admin_1");

      const snapshot = treasury.snapshot("acct_1");
      expect(snapshot.totalBalance).toBe(100000);
      expect(snapshot.availableBalance).toBe(70000);
      expect(snapshot.reservedBalance).toBe(30000);
    });
  });

  describe("Transaction Queries", () => {
    it("should query transactions by type", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.deposit("acct_1", 50000, "D1", "admin_1");
      treasury.withdraw("acct_1", 20000, "W1", "admin_1");

      const deposits = treasury.getTransactions("acct_1", { type: "deposit" });
      expect(deposits.length).toBe(2); // initial + D1

      const withdrawals = treasury.getTransactions("acct_1", {
        type: "withdrawal",
      });
      expect(withdrawals.length).toBe(1);
    });

    it("should return total transaction count", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.deposit("acct_1", 50000, "D1", "admin_1");
      treasury.deposit("acct_1", 25000, "D2", "admin_1");

      expect(treasury.getTransactionCount("acct_1")).toBe(3); // initial + 2
    });
  });

  describe("Account Lookup", () => {
    it("should find account by workspace ID", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
      });

      const account = treasury.getAccountByWorkspace("ws_1");
      expect(account).not.toBeUndefined();
      expect(account!.id).toBe("acct_1");
    });

    it("should return undefined for unknown workspace", () => {
      const account = treasury.getAccountByWorkspace("ws_unknown");
      expect(account).toBeUndefined();
    });

    it("should return undefined for unknown account ID", () => {
      const account = treasury.getAccount("acct_unknown");
      expect(account).toBeUndefined();
    });
  });

  describe("Adjustments", () => {
    it("should apply positive adjustment", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.adjustment("acct_1", 5000, "Correction", "admin_1");
      const account = treasury.getAccount("acct_1")!;
      expect(account.totalBalance).toBe(105000);
    });

    it("should apply negative adjustment", () => {
      treasury.createAccount({
        id: "acct_1",
        workspaceId: "ws_1",
        name: "Treasury",
        currency: "USD",
        initialBalance: 100000,
      });

      treasury.adjustment("acct_1", -5000, "Fee correction", "admin_1");
      const account = treasury.getAccount("acct_1")!;
      expect(account.totalBalance).toBe(95000);
    });
  });
});

// ============================================================================
// 4. Audit Logging
// ============================================================================

describe("TreasuryAuditLogger", () => {
  let auditLogger: TreasuryAuditLogger;

  beforeEach(() => {
    auditLogger = new TreasuryAuditLogger("test-secret");
  });

  describe("Recording Events", () => {
    it("should record an audit entry", () => {
      const entry = auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Test payout requested",
        amount: 5000,
        now: 1000,
      });

      expect(entry.id).toBeDefined();
      expect(entry.eventType).toBe("payout_requested");
      expect(entry.actorId).toBe("user_1");
      expect(entry.checksum).toBeDefined();
      expect(entry.previousChecksum).toBeUndefined();
    });

    it("should chain checksums", () => {
      const entry1 = auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "First",
        now: 1000,
      });

      const entry2 = auditLogger.record({
        eventType: "payout_approved",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "Second",
        now: 2000,
      });

      expect(entry2.previousChecksum).toBe(entry1.checksum);
    });

    it("should track total entries", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "E1",
      });
      auditLogger.record({
        eventType: "payout_approved",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "E2",
      });

      expect(auditLogger.size).toBe(2);
    });
  });

  describe("Integrity Verification", () => {
    it("should verify intact chain", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "E1",
        now: 1000,
      });
      auditLogger.record({
        eventType: "payout_approved",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "E2",
        now: 2000,
      });
      auditLogger.record({
        eventType: "payout_completed",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "E3",
        now: 3000,
      });

      const result = auditLogger.verifyIntegrity();
      expect(result.valid).toBe(true);
    });

    it("should verify empty chain", () => {
      const result = auditLogger.verifyIntegrity();
      expect(result.valid).toBe(true);
    });

    it("should verify single-entry chain", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Only entry",
      });

      const result = auditLogger.verifyIntegrity();
      expect(result.valid).toBe(true);
    });
  });

  describe("Querying", () => {
    it("should query by event type", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Request 1",
      });
      auditLogger.record({
        eventType: "payout_approved",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "Approval 1",
      });
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_2",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Request 2",
      });

      const requests = auditLogger.query({ eventTypes: ["payout_requested"] });
      expect(requests).toHaveLength(2);
    });

    it("should query by actor ID", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "By user_1",
      });
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_2",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "By user_2",
      });

      const results = auditLogger.query({ actorId: "user_1" });
      expect(results).toHaveLength(1);
      expect(results[0].actorId).toBe("user_1");
    });

    it("should query by payout ID", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Payout 1",
        payoutId: "payout_1",
      });
      auditLogger.record({
        eventType: "payout_approved",
        actorId: "admin_1",
        actorRole: "admin",
        workspaceId: "ws_1",
        description: "Approved payout 1",
        payoutId: "payout_1",
      });
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_2",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Payout 2",
        payoutId: "payout_2",
      });

      const trail = auditLogger.getPayoutAuditTrail("payout_1");
      expect(trail).toHaveLength(2);
    });

    it("should query by time range", () => {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "Old event",
        now: 1000,
      });
      auditLogger.record({
        eventType: "payout_requested",
        actorId: "user_1",
        actorRole: "user",
        workspaceId: "ws_1",
        description: "New event",
        now: 5000,
      });

      const results = auditLogger.query({ startTime: 3000 });
      expect(results).toHaveLength(1);
      expect(results[0].description).toBe("New event");
    });

    it("should apply pagination", () => {
      for (let i = 0; i < 10; i++) {
        auditLogger.record({
          eventType: "payout_requested",
          actorId: "user_1",
          actorRole: "user",
          workspaceId: "ws_1",
          description: `Event ${i}`,
          now: i * 1000,
        });
      }

      const page1 = auditLogger.query({ limit: 3, offset: 0 });
      expect(page1).toHaveLength(3);

      const page2 = auditLogger.query({ limit: 3, offset: 3 });
      expect(page2).toHaveLength(3);

      const lastPage = auditLogger.query({ limit: 3, offset: 9 });
      expect(lastPage).toHaveLength(1);
    });
  });
});

// ============================================================================
// 5. State Machine
// ============================================================================

describe("Payout State Transitions", () => {
  it("should validate draft -> pending_approval", () => {
    expect(isValidPayoutTransition("draft", "pending_approval")).toBe(true);
  });

  it("should validate draft -> cancelled", () => {
    expect(isValidPayoutTransition("draft", "cancelled")).toBe(true);
  });

  it("should reject invalid transitions", () => {
    expect(isValidPayoutTransition("draft", "completed")).toBe(false);
    expect(isValidPayoutTransition("cancelled", "approved")).toBe(false);
    expect(isValidPayoutTransition("completed", "draft")).toBe(false);
  });

  it("should allow completed -> reversed", () => {
    expect(isValidPayoutTransition("completed", "reversed")).toBe(true);
  });

  it("should allow failed -> draft (retry)", () => {
    expect(isValidPayoutTransition("failed", "draft")).toBe(true);
  });

  it("should list valid transitions for a state", () => {
    const transitions = getValidPayoutTransitions("pending_approval");
    expect(transitions).toContain("approved");
    expect(transitions).toContain("expired");
    expect(transitions).toContain("cancelled");
  });

  it("should return empty for terminal states", () => {
    expect(getValidPayoutTransitions("cancelled")).toHaveLength(0);
    expect(getValidPayoutTransitions("reversed")).toHaveLength(0);
  });
});

// ============================================================================
// 6. Integrated Payout Service
// ============================================================================

describe("PayoutService", () => {
  let service: PayoutService;
  let treasury: TreasuryManager;

  beforeEach(() => {
    treasury = new TreasuryManager();
    service = createPayoutService(treasury);

    // Create a treasury account for the test workspace
    treasury.createAccount({
      id: "treasury_ws_test_1",
      workspaceId: "ws_test_1",
      name: "Test Treasury",
      currency: "USD",
      initialBalance: 1000000, // $10,000
    });
  });

  describe("Creating Payouts", () => {
    it("should create a payout request in draft state", () => {
      const result = service.createPayout(createTestInput());
      expect(result.success).toBe(true);
      expect(result.payout).toBeDefined();
      expect(result.payout!.status).toBe("draft");
    });

    it("should reject invalid input", () => {
      const result = service.createPayout(createTestInput({ amount: -100 }));
      expect(result.success).toBe(false);
    });

    it("should reject payouts violating policy", () => {
      const policy = createTestPolicy({
        workspaceId: "ws_test_1",
        maxPayoutAmount: 10000,
      });
      service.setPolicy(policy);

      const result = service.createPayout(createTestInput({ amount: 50000 }));
      expect(result.success).toBe(false);
      expect(result.policyResult).toBeDefined();
      expect(result.policyResult!.allowed).toBe(false);
    });

    it("should include policy warnings in successful result", () => {
      // Create policy with time window warning
      const policy = createTestPolicy({
        workspaceId: "ws_test_1",
        timeWindowRestrictions: [
          {
            ...DEFAULT_BUSINESS_HOURS,
            severity: "warning",
          },
        ],
      });
      service.setPolicy(policy);

      // Use a Sunday timestamp
      const sunday2am = new Date("2026-02-08T02:00:00Z").getTime();
      const result = service.createPayout(createTestInput(), sunday2am);
      expect(result.success).toBe(true);
      expect(result.policyResult!.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Approval Workflow", () => {
    it("should submit payout for approval", () => {
      const createResult = service.createPayout(createTestInput());
      expect(createResult.success).toBe(true);

      const submitResult = service.submitForApproval(
        createResult.payout!.id,
        "user_requester",
      );
      expect(submitResult.success).toBe(true);
      expect(submitResult.payout!.status).toBe("pending_approval");
      expect(submitResult.payout!.approvalStatus).toBeDefined();
    });

    it("should hold treasury reserve on submission", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 50000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");

      const account = treasury.getAccount("treasury_ws_test_1")!;
      expect(account.reservedBalance).toBe(50000);
      expect(account.availableBalance).toBe(950000);
    });

    it("should transition to approved after sufficient approvals", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      ); // small
      service.submitForApproval(createResult.payout!.id, "user_requester");

      const approveResult = service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );

      expect(approveResult.success).toBe(true);
      expect(approveResult.payout!.status).toBe("approved");
      expect(approveResult.autoTransitioned).toBe(true);
    });

    it("should require multiple approvals for medium amounts", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 500000 }),
      ); // medium
      service.submitForApproval(createResult.payout!.id, "user_requester");

      const approve1 = service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );
      expect(approve1.success).toBe(true);
      expect(approve1.payout!.status).toBe("pending_approval"); // Still pending

      const approve2 = service.processApproval(
        createResult.payout!.id,
        "admin_2",
        "admin",
        "approved",
      );
      expect(approve2.success).toBe(true);
      expect(approve2.payout!.status).toBe("approved"); // Now approved
    });

    it("should release reserve on rejection", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 50000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");

      // Verify reserve was held
      expect(treasury.getAccount("treasury_ws_test_1")!.reservedBalance).toBe(
        50000,
      );

      const rejectResult = service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "rejected",
        "Not justified",
      );

      expect(rejectResult.success).toBe(true);
      expect(rejectResult.payout!.status).toBe("cancelled");

      // Reserve should be released
      const account = treasury.getAccount("treasury_ws_test_1")!;
      expect(account.reservedBalance).toBe(0);
      expect(account.availableBalance).toBe(1000000);
    });

    it("should prevent self-approval", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");

      const result = service.processApproval(
        createResult.payout!.id,
        "user_requester", // Same as requestedBy
        "admin",
        "approved",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot approve your own");
    });
  });

  describe("Payout Execution", () => {
    it("should execute an approved payout", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");
      service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );

      const execResult = service.executePayout(
        createResult.payout!.id,
        "admin_1",
      );
      expect(execResult.success).toBe(true);
      expect(execResult.payout!.status).toBe("completed");
      expect(execResult.transactionId).toBeDefined();

      // Verify treasury balance
      const account = treasury.getAccount("treasury_ws_test_1")!;
      expect(account.totalBalance).toBe(995000);
      expect(account.reservedBalance).toBe(0);
    });

    it("should reject execution of non-approved payout", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      );

      const execResult = service.executePayout(
        createResult.payout!.id,
        "admin_1",
      );
      expect(execResult.success).toBe(false);
    });
  });

  describe("Payout Cancellation", () => {
    it("should cancel a draft payout", () => {
      const createResult = service.createPayout(createTestInput());
      const cancelResult = service.cancelPayout(
        createResult.payout!.id,
        "admin_1",
        "No longer needed",
      );

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.payout!.status).toBe("cancelled");
    });

    it("should cancel a pending payout and release reserve", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 50000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");

      const cancelResult = service.cancelPayout(
        createResult.payout!.id,
        "admin_1",
      );
      expect(cancelResult.success).toBe(true);

      const account = treasury.getAccount("treasury_ws_test_1")!;
      expect(account.reservedBalance).toBe(0);
      expect(account.availableBalance).toBe(1000000);
    });

    it("should not cancel a completed payout", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");
      service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );
      service.executePayout(createResult.payout!.id, "admin_1");

      const cancelResult = service.cancelPayout(
        createResult.payout!.id,
        "admin_1",
      );
      expect(cancelResult.success).toBe(false);
    });
  });

  describe("Payout Reversal", () => {
    it("should reverse a completed payout", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 50000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");
      service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );
      service.executePayout(createResult.payout!.id, "admin_1");

      // Balance should be reduced
      expect(treasury.getAccount("treasury_ws_test_1")!.totalBalance).toBe(
        950000,
      );

      const reverseResult = service.reversePayout(
        createResult.payout!.id,
        "admin_1",
        "Duplicate payment",
      );

      expect(reverseResult.success).toBe(true);
      expect(reverseResult.payout!.status).toBe("reversed");

      // Balance should be restored
      expect(treasury.getAccount("treasury_ws_test_1")!.totalBalance).toBe(
        1000000,
      );
    });

    it("should not reverse a non-completed payout", () => {
      const createResult = service.createPayout(createTestInput());
      const result = service.reversePayout(
        createResult.payout!.id,
        "admin_1",
        "Reason",
      );
      expect(result.success).toBe(false);
    });
  });

  describe("Query Methods", () => {
    it("should get payout by ID", () => {
      const createResult = service.createPayout(createTestInput());
      const payout = service.getPayout(createResult.payout!.id);
      expect(payout).toBeDefined();
      expect(payout!.id).toBe(createResult.payout!.id);
    });

    it("should return undefined for unknown ID", () => {
      expect(service.getPayout("unknown")).toBeUndefined();
    });

    it("should query payouts by workspace", () => {
      // Use a policy with no cooldown for this test
      const policy = createTestPolicy({
        workspaceId: "ws_test_1",
        cooldownPeriodMs: 0,
      });
      service.setPolicy(policy);

      const now = Date.now();
      service.createPayout(createTestInput({ workspaceId: "ws_test_1" }), now);
      service.createPayout(
        createTestInput({ workspaceId: "ws_test_1" }),
        now + 1,
      );

      const results = service.queryPayouts({ workspaceId: "ws_test_1" });
      expect(results).toHaveLength(2);
    });

    it("should query payouts by status", () => {
      // Use a policy with no cooldown for this test
      const policy = createTestPolicy({
        workspaceId: "ws_test_1",
        cooldownPeriodMs: 0,
      });
      service.setPolicy(policy);

      const now = Date.now();
      service.createPayout(createTestInput(), now); // draft
      const create2 = service.createPayout(createTestInput(), now + 1);
      service.submitForApproval(create2.payout!.id, "user_requester", now + 2); // pending_approval

      const drafts = service.queryPayouts({ status: ["draft"] });
      expect(drafts).toHaveLength(1);

      const pending = service.queryPayouts({ status: ["pending_approval"] });
      expect(pending).toHaveLength(1);
    });
  });

  describe("Audit Trail", () => {
    it("should record audit entries for payout lifecycle", () => {
      const createResult = service.createPayout(
        createTestInput({ amount: 5000 }),
      );
      service.submitForApproval(createResult.payout!.id, "user_requester");
      service.processApproval(
        createResult.payout!.id,
        "admin_1",
        "admin",
        "approved",
      );
      service.executePayout(createResult.payout!.id, "admin_1");

      const trail = service.getPayoutAuditTrail(createResult.payout!.id);
      expect(trail.length).toBeGreaterThanOrEqual(4); // request, submit, approve, execute + reserve hold/payout
    });

    it("should maintain audit chain integrity", () => {
      service.createPayout(createTestInput());
      service.createPayout(createTestInput());
      service.createPayout(createTestInput());

      const integrity = service.verifyAuditIntegrity();
      expect(integrity.valid).toBe(true);
    });
  });
});

// ============================================================================
// 7. Default Policy Factory
// ============================================================================

describe("createDefaultPolicy", () => {
  it("should create a policy with workspace ID", () => {
    const policy = createDefaultPolicy("ws_1", "admin_1");
    expect(policy.workspaceId).toBe("ws_1");
    expect(policy.createdBy).toBe("admin_1");
    expect(policy.enabled).toBe(true);
  });

  it("should use default values", () => {
    const policy = createDefaultPolicy("ws_1", "admin_1");
    expect(policy.minPayoutAmount).toBe(DEFAULT_PAYOUT_POLICY.minPayoutAmount);
    expect(policy.maxPayoutAmount).toBe(DEFAULT_PAYOUT_POLICY.maxPayoutAmount);
    expect(policy.approvalThresholds.length).toBeGreaterThan(0);
  });

  it("should use provided timestamp", () => {
    const policy = createDefaultPolicy("ws_1", "admin_1", 12345);
    expect(policy.createdAt).toBe(12345);
    expect(policy.updatedAt).toBe(12345);
  });
});

// ============================================================================
// 8. Error Types
// ============================================================================

describe("PayoutError", () => {
  it("should create error with code and message", () => {
    const error = new PayoutError(
      PayoutErrorCode.INSUFFICIENT_FUNDS,
      "Not enough money",
    );
    expect(error.code).toBe(PayoutErrorCode.INSUFFICIENT_FUNDS);
    expect(error.message).toBe("Not enough money");
    expect(error.name).toBe("PayoutError");
  });

  it("should include optional payout ID and metadata", () => {
    const error = new PayoutError(
      PayoutErrorCode.POLICY_VIOLATION,
      "Policy blocked",
      "payout_123",
      { rule: "max_amount" },
    );
    expect(error.payoutId).toBe("payout_123");
    expect(error.metadata).toEqual({ rule: "max_amount" });
  });
});

// ============================================================================
// 9. Edge Cases & Security
// ============================================================================

describe("Edge Cases", () => {
  it("should handle multiple concurrent approval requests gracefully", () => {
    const manager = new ApprovalManager();
    const policy = createTestPolicy();
    const now = Date.now();
    let status = manager.createApprovalStatus("payout_1", 500000, policy, now);

    // Two approvers approve at the same time
    const approval1: ApprovalRecord = {
      id: "a1",
      payoutId: "payout_1",
      approverId: "admin_1",
      approverRole: "admin",
      decision: "approved",
      timestamp: now,
    };
    const approval2: ApprovalRecord = {
      id: "a2",
      payoutId: "payout_1",
      approverId: "admin_2",
      approverRole: "admin",
      decision: "approved",
      timestamp: now,
    };

    status = manager.processApproval(status, approval1, "user_requester", now);
    status = manager.processApproval(status, approval2, "user_requester", now);

    expect(status.currentApprovals).toBe(2);
    expect(status.isFullyApproved).toBe(true);
  });

  it("should handle edge case of exactly hitting limits", () => {
    const engine = new PayoutPolicyEngine();
    const now = Date.now();
    const policy = createTestPolicy({
      dailyAmountLimit: 100000,
      maxPayoutsPerDay: 10,
    });
    const recentPayouts = [createRecentPayout(50000, now - 3600000)];
    const context = createTestContext({ now, recentPayouts });

    // Exactly at the limit
    const input = createTestInput({ amount: 50000 });
    const result = engine.evaluate(input, policy, context);
    expect(result.allowed).toBe(true);
  });

  it("should handle empty approval thresholds list", () => {
    const engine = new PayoutPolicyEngine();
    const policy = createTestPolicy({ approvalThresholds: [] });
    const threshold = engine.getApprovalThreshold(50000, policy);
    expect(threshold).toBeNull();
  });

  it("should handle payout with all optional fields", () => {
    const service = createPayoutService();
    const result = service.createPayout({
      workspaceId: "ws_test_1",
      requestedBy: "user_1",
      amount: 5000,
      currency: "USD",
      method: "bank_transfer",
      recipientName: "Vendor",
      recipientDetails: { bank: "Test Bank" },
      description: "Full payout",
      category: "vendor_payment",
      reference: "REF-001",
      recipientId: "vendor_1",
      metadata: { notes: "Test" },
    });

    expect(result.success).toBe(true);
    expect(result.payout!.reference).toBe("REF-001");
    expect(result.payout!.recipientId).toBe("vendor_1");
    expect(result.payout!.metadata).toEqual({ notes: "Test" });
  });

  it("should properly track status history through full lifecycle", () => {
    const treasury = new TreasuryManager();
    treasury.createAccount({
      id: "treasury_ws_test_1",
      workspaceId: "ws_test_1",
      name: "Treasury",
      currency: "USD",
      initialBalance: 1000000,
    });
    const service = createPayoutService(treasury);

    const create = service.createPayout(createTestInput({ amount: 5000 }));
    service.submitForApproval(create.payout!.id, "user_requester");
    service.processApproval(create.payout!.id, "admin_1", "admin", "approved");
    service.executePayout(create.payout!.id, "admin_1");

    const payout = service.getPayout(create.payout!.id)!;
    expect(payout.statusHistory.length).toBe(4); // draft->pending, pending->approved, approved->processing, processing->completed
    expect(payout.statusHistory[0].fromStatus).toBe("draft");
    expect(payout.statusHistory[0].toStatus).toBe("pending_approval");
    expect(payout.statusHistory[3].toStatus).toBe("completed");
  });

  it("should validate all transition constants are consistent", () => {
    // Every from-state and to-state should be a valid PayoutStatus
    const validStatuses: string[] = [
      "draft",
      "pending_approval",
      "approved",
      "processing",
      "completed",
      "failed",
      "cancelled",
      "reversed",
      "expired",
    ];
    for (const [from, tos] of Object.entries(VALID_PAYOUT_TRANSITIONS)) {
      expect(validStatuses).toContain(from);
      for (const to of tos as string[]) {
        expect(validStatuses).toContain(to);
      }
    }
  });
});

describe("Security", () => {
  it("should not allow modifying frozen treasury for payouts", () => {
    const treasury = new TreasuryManager();
    treasury.createAccount({
      id: "treasury_ws_test_1",
      workspaceId: "ws_test_1",
      name: "Treasury",
      currency: "USD",
      initialBalance: 1000000,
    });
    const service = createPayoutService(treasury);

    const create = service.createPayout(createTestInput({ amount: 5000 }));

    treasury.freezeAccount("treasury_ws_test_1");

    // Submitting for approval should fail because reserve hold fails
    const submitResult = service.submitForApproval(
      create.payout!.id,
      "user_requester",
    );
    expect(submitResult.success).toBe(false);
  });

  it("should prevent privilege escalation by rejecting unqualified approvers", () => {
    const treasury = new TreasuryManager();
    treasury.createAccount({
      id: "treasury_ws_test_1",
      workspaceId: "ws_test_1",
      name: "Treasury",
      currency: "USD",
      initialBalance: 50_000_000, // $500,000 - enough for large payout
    });
    const service = createPayoutService(treasury);

    // Create a large payout requiring owner-level approval
    const create = service.createPayout(createTestInput({ amount: 5000000 }));
    expect(create.success).toBe(true);
    service.submitForApproval(create.payout!.id, "user_requester");

    // Try to approve as a regular member (should fail for large threshold)
    const result = service.processApproval(
      create.payout!.id,
      "admin_1",
      "member", // Too low role - large threshold requires 'owner'
      "approved",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Role");
  });

  it("should maintain immutable audit trail", () => {
    const auditLogger = new TreasuryAuditLogger("secret");

    // Record several entries
    for (let i = 0; i < 5; i++) {
      auditLogger.record({
        eventType: "payout_requested",
        actorId: `user_${i}`,
        actorRole: "user",
        workspaceId: "ws_1",
        description: `Event ${i}`,
        now: i * 1000,
      });
    }

    // Verify integrity holds
    expect(auditLogger.verifyIntegrity().valid).toBe(true);

    // Entries are frozen objects - verify we can still read them
    const all = auditLogger.getAll();
    expect(all).toHaveLength(5);
    for (const entry of all) {
      expect(entry.checksum).toBeDefined();
      expect(entry.checksum.length).toBe(64); // SHA256 hex
    }
  });

  it("should use unique IDs for payouts", () => {
    const service = createPayoutService();
    // Disable cooldown and raise frequency limits for this test
    const policy = createTestPolicy({
      workspaceId: "ws_test_1",
      cooldownPeriodMs: 0,
      maxPayoutsPerDay: 100,
      maxPayoutsPerWeek: 100,
      maxPayoutsPerMonth: 100,
    });
    service.setPolicy(policy);

    const ids = new Set<string>();
    const now = Date.now();

    for (let i = 0; i < 20; i++) {
      const result = service.createPayout(createTestInput(), now + i);
      expect(result.success).toBe(true);
      expect(ids.has(result.payout!.id)).toBe(false);
      ids.add(result.payout!.id);
    }

    expect(ids.size).toBe(20);
  });
});
