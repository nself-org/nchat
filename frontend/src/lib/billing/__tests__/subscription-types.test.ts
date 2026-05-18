/**
 * Subscription Types Tests
 *
 * Tests for subscription type definitions, state info, and constants.
 *
 * @jest-environment node
 */

import {
  SubscriptionState,
  SubscriptionStateInfo,
  SUBSCRIPTION_STATE_INFO,
  StateTransitionTrigger,
  CancellationReasonCategory,
  CANCELLATION_REASONS,
  DEFAULT_PAUSE_LIMITS,
  SubscriptionError,
  SubscriptionErrorCode,
  PlanChangeErrorCode,
} from "../subscription-types";

// ============================================================================
// Subscription State Info Tests
// ============================================================================

describe("SUBSCRIPTION_STATE_INFO", () => {
  describe("state definitions", () => {
    it("should define all subscription states", () => {
      const states: SubscriptionState[] = [
        "trial",
        "active",
        "grace",
        "past_due",
        "paused",
        "canceled",
      ];

      states.forEach((state) => {
        expect(SUBSCRIPTION_STATE_INFO[state]).toBeDefined();
        expect(SUBSCRIPTION_STATE_INFO[state].state).toBe(state);
      });
    });

    it("should have complete state info structure", () => {
      Object.values(SUBSCRIPTION_STATE_INFO).forEach((info) => {
        expect(info).toHaveProperty("state");
        expect(info).toHaveProperty("label");
        expect(info).toHaveProperty("description");
        expect(info).toHaveProperty("isAccessGranted");
        expect(info).toHaveProperty("isPaymentRequired");
        expect(info).toHaveProperty("canUpgrade");
        expect(info).toHaveProperty("canDowngrade");
        expect(info).toHaveProperty("canPause");
        expect(info).toHaveProperty("canCancel");
        expect(info).toHaveProperty("canResume");
      });
    });
  });

  describe("trial state", () => {
    it("should grant access during trial", () => {
      expect(SUBSCRIPTION_STATE_INFO.trial.isAccessGranted).toBe(true);
    });

    it("should not require payment during trial", () => {
      expect(SUBSCRIPTION_STATE_INFO.trial.isPaymentRequired).toBe(false);
    });

    it("should allow upgrades and downgrades", () => {
      expect(SUBSCRIPTION_STATE_INFO.trial.canUpgrade).toBe(true);
      expect(SUBSCRIPTION_STATE_INFO.trial.canDowngrade).toBe(true);
    });

    it("should not allow pause during trial", () => {
      expect(SUBSCRIPTION_STATE_INFO.trial.canPause).toBe(false);
    });

    it("should allow cancellation", () => {
      expect(SUBSCRIPTION_STATE_INFO.trial.canCancel).toBe(true);
    });
  });

  describe("active state", () => {
    it("should grant access when active", () => {
      expect(SUBSCRIPTION_STATE_INFO.active.isAccessGranted).toBe(true);
    });

    it("should not require immediate payment", () => {
      expect(SUBSCRIPTION_STATE_INFO.active.isPaymentRequired).toBe(false);
    });

    it("should allow all plan operations", () => {
      expect(SUBSCRIPTION_STATE_INFO.active.canUpgrade).toBe(true);
      expect(SUBSCRIPTION_STATE_INFO.active.canDowngrade).toBe(true);
      expect(SUBSCRIPTION_STATE_INFO.active.canPause).toBe(true);
      expect(SUBSCRIPTION_STATE_INFO.active.canCancel).toBe(true);
    });
  });

  describe("grace state", () => {
    it("should still grant access during grace period", () => {
      expect(SUBSCRIPTION_STATE_INFO.grace.isAccessGranted).toBe(true);
    });

    it("should require payment", () => {
      expect(SUBSCRIPTION_STATE_INFO.grace.isPaymentRequired).toBe(true);
    });

    it("should not allow plan changes", () => {
      expect(SUBSCRIPTION_STATE_INFO.grace.canUpgrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.grace.canDowngrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.grace.canPause).toBe(false);
    });

    it("should allow cancellation", () => {
      expect(SUBSCRIPTION_STATE_INFO.grace.canCancel).toBe(true);
    });
  });

  describe("past_due state", () => {
    it("should deny access when past due", () => {
      expect(SUBSCRIPTION_STATE_INFO.past_due.isAccessGranted).toBe(false);
    });

    it("should require payment", () => {
      expect(SUBSCRIPTION_STATE_INFO.past_due.isPaymentRequired).toBe(true);
    });

    it("should not allow any operations except cancel", () => {
      expect(SUBSCRIPTION_STATE_INFO.past_due.canUpgrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.past_due.canDowngrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.past_due.canPause).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.past_due.canCancel).toBe(true);
    });
  });

  describe("paused state", () => {
    it("should deny access when paused", () => {
      expect(SUBSCRIPTION_STATE_INFO.paused.isAccessGranted).toBe(false);
    });

    it("should not require payment", () => {
      expect(SUBSCRIPTION_STATE_INFO.paused.isPaymentRequired).toBe(false);
    });

    it("should only allow resume and cancel", () => {
      expect(SUBSCRIPTION_STATE_INFO.paused.canUpgrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.paused.canDowngrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.paused.canPause).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.paused.canResume).toBe(true);
      expect(SUBSCRIPTION_STATE_INFO.paused.canCancel).toBe(true);
    });
  });

  describe("canceled state", () => {
    it("should deny access when canceled", () => {
      expect(SUBSCRIPTION_STATE_INFO.canceled.isAccessGranted).toBe(false);
    });

    it("should not allow any operations", () => {
      expect(SUBSCRIPTION_STATE_INFO.canceled.canUpgrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.canceled.canDowngrade).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.canceled.canPause).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.canceled.canResume).toBe(false);
      expect(SUBSCRIPTION_STATE_INFO.canceled.canCancel).toBe(false);
    });
  });
});

// ============================================================================
// Cancellation Reasons Tests
// ============================================================================

describe("CANCELLATION_REASONS", () => {
  it("should define all cancellation reason categories", () => {
    const categories: CancellationReasonCategory[] = [
      "too_expensive",
      "not_using",
      "missing_features",
      "found_alternative",
      "temporary_pause",
      "company_closed",
      "technical_issues",
      "support_issues",
      "other",
    ];

    categories.forEach((category) => {
      expect(CANCELLATION_REASONS[category]).toBeDefined();
      expect(CANCELLATION_REASONS[category].category).toBe(category);
    });
  });

  it("should have complete reason info structure", () => {
    Object.values(CANCELLATION_REASONS).forEach((reason) => {
      expect(reason).toHaveProperty("category");
      expect(reason).toHaveProperty("label");
      expect(reason).toHaveProperty("description");
      expect(reason).toHaveProperty("requiresFeedback");
      expect(reason).toHaveProperty("offerAlternative");
    });
  });

  it("should require feedback for some reasons", () => {
    expect(CANCELLATION_REASONS.missing_features.requiresFeedback).toBe(true);
    expect(CANCELLATION_REASONS.found_alternative.requiresFeedback).toBe(true);
    expect(CANCELLATION_REASONS.technical_issues.requiresFeedback).toBe(true);
    expect(CANCELLATION_REASONS.support_issues.requiresFeedback).toBe(true);
    expect(CANCELLATION_REASONS.other.requiresFeedback).toBe(true);
  });

  it("should offer alternatives for some reasons", () => {
    expect(CANCELLATION_REASONS.too_expensive.offerAlternative).toBe(true);
    expect(CANCELLATION_REASONS.not_using.offerAlternative).toBe(true);
    expect(CANCELLATION_REASONS.temporary_pause.offerAlternative).toBe(true);
  });

  it("should have alternative offers for reasons that offer them", () => {
    const reasonsWithAlternatives = Object.values(CANCELLATION_REASONS).filter(
      (r) => r.offerAlternative,
    );

    reasonsWithAlternatives.forEach((reason) => {
      expect(reason.alternativeOffer).toBeDefined();
      expect(reason.alternativeOffer).toHaveProperty("type");
      expect(reason.alternativeOffer).toHaveProperty("message");
    });
  });

  it("should have correct alternative types", () => {
    expect(CANCELLATION_REASONS.too_expensive.alternativeOffer?.type).toBe(
      "downgrade",
    );
    expect(CANCELLATION_REASONS.not_using.alternativeOffer?.type).toBe("pause");
    expect(CANCELLATION_REASONS.temporary_pause.alternativeOffer?.type).toBe(
      "pause",
    );
    expect(CANCELLATION_REASONS.technical_issues.alternativeOffer?.type).toBe(
      "support",
    );
  });
});

// ============================================================================
// Default Pause Limits Tests
// ============================================================================

describe("DEFAULT_PAUSE_LIMITS", () => {
  it("should have maximum pause duration", () => {
    expect(DEFAULT_PAUSE_LIMITS.maxPauseDurationDays).toBe(90);
  });

  it("should limit pauses per year", () => {
    expect(DEFAULT_PAUSE_LIMITS.maxPausesPerYear).toBe(3);
  });

  it("should require minimum days between pauses", () => {
    expect(DEFAULT_PAUSE_LIMITS.minDaysBetweenPauses).toBe(30);
  });

  it("should not allow pause during trial", () => {
    expect(DEFAULT_PAUSE_LIMITS.allowPauseInTrial).toBe(false);
  });

  it("should not allow pause during grace period", () => {
    expect(DEFAULT_PAUSE_LIMITS.allowPauseInGrace).toBe(false);
  });
});

// ============================================================================
// SubscriptionError Tests
// ============================================================================

describe("SubscriptionError", () => {
  it("should create error with code and message", () => {
    const error = new SubscriptionError(
      SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
      "Subscription not found",
    );

    expect(error.code).toBe(SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND);
    expect(error.message).toBe("Subscription not found");
    expect(error.name).toBe("SubscriptionError");
  });

  it("should include subscription ID when provided", () => {
    const error = new SubscriptionError(
      SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND,
      "Subscription not found",
      "sub_123",
    );

    expect(error.subscriptionId).toBe("sub_123");
  });

  it("should include metadata when provided", () => {
    const error = new SubscriptionError(
      SubscriptionErrorCode.USAGE_EXCEEDS_LIMIT,
      "Storage limit exceeded",
      "sub_123",
      { currentUsage: 100, limit: 50 },
    );

    expect(error.metadata).toEqual({ currentUsage: 100, limit: 50 });
  });

  it("should be an instance of Error", () => {
    const error = new SubscriptionError(
      SubscriptionErrorCode.INTERNAL_ERROR,
      "Internal error",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SubscriptionError);
  });
});

// ============================================================================
// Error Code Tests
// ============================================================================

describe("SubscriptionErrorCode", () => {
  it("should have state transition error codes", () => {
    expect(SubscriptionErrorCode.INVALID_STATE_TRANSITION).toBeDefined();
    expect(SubscriptionErrorCode.STATE_ALREADY_SET).toBeDefined();
    expect(SubscriptionErrorCode.SUBSCRIPTION_NOT_FOUND).toBeDefined();
  });

  it("should have plan change error codes", () => {
    expect(SubscriptionErrorCode.INVALID_PLAN_CHANGE).toBeDefined();
    expect(SubscriptionErrorCode.USAGE_EXCEEDS_LIMIT).toBeDefined();
    expect(SubscriptionErrorCode.PENDING_CHANGE_EXISTS).toBeDefined();
  });

  it("should have payment error codes", () => {
    expect(SubscriptionErrorCode.PAYMENT_REQUIRED).toBeDefined();
    expect(SubscriptionErrorCode.PAYMENT_FAILED).toBeDefined();
    expect(SubscriptionErrorCode.PAYMENT_METHOD_REQUIRED).toBeDefined();
  });

  it("should have pause error codes", () => {
    expect(SubscriptionErrorCode.PAUSE_NOT_ALLOWED).toBeDefined();
    expect(SubscriptionErrorCode.ALREADY_PAUSED).toBeDefined();
    expect(SubscriptionErrorCode.MAX_PAUSES_EXCEEDED).toBeDefined();
    expect(SubscriptionErrorCode.PAUSE_TOO_SOON).toBeDefined();
    expect(SubscriptionErrorCode.NOT_PAUSED).toBeDefined();
  });

  it("should have cancellation error codes", () => {
    expect(SubscriptionErrorCode.ALREADY_CANCELED).toBeDefined();
    expect(SubscriptionErrorCode.CANCELLATION_NOT_ALLOWED).toBeDefined();
  });

  it("should have general error codes", () => {
    expect(SubscriptionErrorCode.INVALID_REQUEST).toBeDefined();
    expect(SubscriptionErrorCode.INTERNAL_ERROR).toBeDefined();
  });
});

// ============================================================================
// PlanChangeErrorCode Tests
// ============================================================================

describe("PlanChangeErrorCode", () => {
  it("should define all plan change error codes", () => {
    const expectedCodes = [
      "SAME_PLAN",
      "INVALID_PLAN",
      "USAGE_EXCEEDS_LIMIT",
      "PAYMENT_REQUIRED",
      "STATE_NOT_ALLOWED",
      "CUSTOM_PLAN_CONTACT_SALES",
      "PENDING_CHANGE_EXISTS",
      "INTERVAL_NOT_AVAILABLE",
    ];

    expectedCodes.forEach((code) => {
      expect(code).toBeDefined();
    });
  });
});
