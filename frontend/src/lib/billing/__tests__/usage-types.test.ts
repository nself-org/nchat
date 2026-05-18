/**
 * Usage Types Tests
 *
 * Tests for usage metered billing type definitions and utilities.
 */

import {
  UsageBillingError,
  UsageBillingErrorCode,
  DEFAULT_DIMENSION_CONFIGS,
  DEFAULT_THRESHOLDS,
  DEFAULT_OVERAGE_CONFIG,
  ALERT_LEVEL_THRESHOLDS,
  getAlertLevel,
  formatUsageValue,
  calculateBillingPeriod,
  generateIdempotencyKey,
  validateUsageEventInput,
  type UsageDimensionType,
  type UsageAlertLevel,
  type CreateUsageEventInput,
} from "../usage-types";

describe("Usage Types", () => {
  describe("DEFAULT_DIMENSION_CONFIGS", () => {
    const dimensionKeys: UsageDimensionType[] = [
      "storage",
      "seats",
      "api_calls",
      "bandwidth",
      "messages",
      "file_uploads",
      "video_minutes",
      "compute_units",
    ];

    it("should define all dimension types", () => {
      for (const key of dimensionKeys) {
        expect(DEFAULT_DIMENSION_CONFIGS[key]).toBeDefined();
      }
    });

    it("should have required properties for each dimension", () => {
      for (const key of dimensionKeys) {
        const config = DEFAULT_DIMENSION_CONFIGS[key];
        expect(config.key).toBe(key);
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.unit).toBeDefined();
        expect(typeof config.unitDivisor).toBe("number");
        expect(config.aggregationMethod).toBeDefined();
        expect(config.billingModel).toBeDefined();
        expect(config.resetBehavior).toBeDefined();
        expect(typeof config.enabled).toBe("boolean");
      }
    });

    it("should have correct unit divisors", () => {
      // Storage and bandwidth are in GB
      expect(DEFAULT_DIMENSION_CONFIGS.storage.unitDivisor).toBe(
        1024 * 1024 * 1024,
      );
      expect(DEFAULT_DIMENSION_CONFIGS.bandwidth.unitDivisor).toBe(
        1024 * 1024 * 1024,
      );
      // Others should be 1
      expect(DEFAULT_DIMENSION_CONFIGS.seats.unitDivisor).toBe(1);
      expect(DEFAULT_DIMENSION_CONFIGS.api_calls.unitDivisor).toBe(1);
    });

    it("should have valid aggregation methods", () => {
      const validMethods = ["sum", "max", "average", "last", "count"];
      for (const key of dimensionKeys) {
        expect(validMethods).toContain(
          DEFAULT_DIMENSION_CONFIGS[key].aggregationMethod,
        );
      }
    });

    it("should have valid billing models", () => {
      const validModels = ["flat", "tiered", "graduated", "volume", "package"];
      for (const key of dimensionKeys) {
        expect(validModels).toContain(
          DEFAULT_DIMENSION_CONFIGS[key].billingModel,
        );
      }
    });

    it("should have valid reset behaviors", () => {
      const validBehaviors = [
        "billing_period",
        "calendar_month",
        "never",
        "custom",
      ];
      for (const key of dimensionKeys) {
        expect(validBehaviors).toContain(
          DEFAULT_DIMENSION_CONFIGS[key].resetBehavior,
        );
      }
    });

    it("should define Stripe meter names for key dimensions", () => {
      expect(DEFAULT_DIMENSION_CONFIGS.storage.stripeMeterName).toBeDefined();
      expect(DEFAULT_DIMENSION_CONFIGS.api_calls.stripeMeterName).toBeDefined();
      expect(
        DEFAULT_DIMENSION_CONFIGS.video_minutes.stripeMeterName,
      ).toBeDefined();
    });

    it("should define free tier allowances where applicable", () => {
      expect(DEFAULT_DIMENSION_CONFIGS.api_calls.freeTierAllowance).toBe(1000);
      expect(DEFAULT_DIMENSION_CONFIGS.messages.freeTierAllowance).toBe(10000);
      expect(DEFAULT_DIMENSION_CONFIGS.video_minutes.freeTierAllowance).toBe(
        60,
      );
    });
  });

  describe("DEFAULT_THRESHOLDS", () => {
    it("should define all threshold levels", () => {
      expect(DEFAULT_THRESHOLDS.infoThreshold).toBeDefined();
      expect(DEFAULT_THRESHOLDS.warningThreshold).toBeDefined();
      expect(DEFAULT_THRESHOLDS.criticalThreshold).toBeDefined();
    });

    it("should have ascending threshold values", () => {
      expect(DEFAULT_THRESHOLDS.infoThreshold).toBeLessThan(
        DEFAULT_THRESHOLDS.warningThreshold,
      );
      expect(DEFAULT_THRESHOLDS.warningThreshold).toBeLessThan(
        DEFAULT_THRESHOLDS.criticalThreshold,
      );
    });

    it("should define notification settings", () => {
      expect(typeof DEFAULT_THRESHOLDS.emailNotifications).toBe("boolean");
      expect(typeof DEFAULT_THRESHOLDS.inAppNotifications).toBe("boolean");
      expect(typeof DEFAULT_THRESHOLDS.webhookNotifications).toBe("boolean");
    });

    it("should have sensible default values", () => {
      expect(DEFAULT_THRESHOLDS.infoThreshold).toBe(50);
      expect(DEFAULT_THRESHOLDS.warningThreshold).toBe(75);
      expect(DEFAULT_THRESHOLDS.criticalThreshold).toBe(90);
    });
  });

  describe("DEFAULT_OVERAGE_CONFIG", () => {
    it("should define overage handling strategy", () => {
      expect(DEFAULT_OVERAGE_CONFIG.strategy).toBeDefined();
      expect(["block", "charge", "warn", "soft_block"]).toContain(
        DEFAULT_OVERAGE_CONFIG.strategy,
      );
    });

    it("should define overage rate multiplier", () => {
      expect(typeof DEFAULT_OVERAGE_CONFIG.overageRateMultiplier).toBe(
        "number",
      );
      expect(DEFAULT_OVERAGE_CONFIG.overageRateMultiplier).toBeGreaterThan(1);
    });

    it("should have default to charge strategy with 1.5x multiplier", () => {
      expect(DEFAULT_OVERAGE_CONFIG.strategy).toBe("charge");
      expect(DEFAULT_OVERAGE_CONFIG.overageRateMultiplier).toBe(1.5);
    });
  });

  describe("ALERT_LEVEL_THRESHOLDS", () => {
    it("should define all alert levels", () => {
      expect(ALERT_LEVEL_THRESHOLDS.normal).toBeDefined();
      expect(ALERT_LEVEL_THRESHOLDS.info).toBeDefined();
      expect(ALERT_LEVEL_THRESHOLDS.warning).toBeDefined();
      expect(ALERT_LEVEL_THRESHOLDS.critical).toBeDefined();
      expect(ALERT_LEVEL_THRESHOLDS.exceeded).toBeDefined();
    });

    it("should have ascending threshold values", () => {
      expect(ALERT_LEVEL_THRESHOLDS.normal).toBeLessThan(
        ALERT_LEVEL_THRESHOLDS.info,
      );
      expect(ALERT_LEVEL_THRESHOLDS.info).toBeLessThan(
        ALERT_LEVEL_THRESHOLDS.warning,
      );
      expect(ALERT_LEVEL_THRESHOLDS.warning).toBeLessThan(
        ALERT_LEVEL_THRESHOLDS.critical,
      );
      expect(ALERT_LEVEL_THRESHOLDS.critical).toBeLessThan(
        ALERT_LEVEL_THRESHOLDS.exceeded,
      );
    });
  });
});

describe("Utility Functions", () => {
  describe("getAlertLevel", () => {
    it("should return normal for low usage", () => {
      expect(getAlertLevel(0)).toBe("normal");
      expect(getAlertLevel(25)).toBe("normal");
      expect(getAlertLevel(49)).toBe("normal");
    });

    it("should return info for moderate usage", () => {
      expect(getAlertLevel(50)).toBe("info");
      expect(getAlertLevel(60)).toBe("info");
      expect(getAlertLevel(74)).toBe("info");
    });

    it("should return warning for high usage", () => {
      expect(getAlertLevel(75)).toBe("warning");
      expect(getAlertLevel(80)).toBe("warning");
      expect(getAlertLevel(89)).toBe("warning");
    });

    it("should return critical for very high usage", () => {
      expect(getAlertLevel(90)).toBe("critical");
      expect(getAlertLevel(95)).toBe("critical");
      expect(getAlertLevel(99)).toBe("critical");
    });

    it("should return exceeded when at or over limit", () => {
      expect(getAlertLevel(100)).toBe("exceeded");
      expect(getAlertLevel(110)).toBe("exceeded");
      expect(getAlertLevel(200)).toBe("exceeded");
    });
  });

  describe("formatUsageValue", () => {
    it("should format storage values in GB", () => {
      const oneGB = 1024 * 1024 * 1024;
      expect(formatUsageValue(oneGB, "storage")).toBe("1.00 GB");
      expect(formatUsageValue(2 * oneGB, "storage")).toBe("2.00 GB");
      expect(formatUsageValue(0.5 * oneGB, "storage")).toBe("0.50 GB");
    });

    it("should format seat counts", () => {
      expect(formatUsageValue(10, "seats")).toBe("10.00 seats");
      expect(formatUsageValue(1, "seats")).toBe("1.00 seats");
    });

    it("should format API calls", () => {
      expect(formatUsageValue(500, "api_calls")).toBe("500.00 calls");
      expect(formatUsageValue(1500, "api_calls")).toBe("1.50K calls");
    });

    it("should format large numbers with K/M suffix", () => {
      expect(formatUsageValue(5000, "api_calls")).toBe("5.00K calls");
      expect(formatUsageValue(1000000, "messages")).toBe("1.00M messages");
      expect(formatUsageValue(2500000, "messages")).toBe("2.50M messages");
    });

    it("should respect precision parameter", () => {
      expect(formatUsageValue(1.23456 * 1024 * 1024 * 1024, "storage", 3)).toBe(
        "1.235 GB",
      );
      expect(formatUsageValue(1.23456 * 1024 * 1024 * 1024, "storage", 0)).toBe(
        "1 GB",
      );
    });

    it("should handle video minutes", () => {
      expect(formatUsageValue(120, "video_minutes")).toBe("120.00 minutes");
      expect(formatUsageValue(3600, "video_minutes")).toBe("3.60K minutes");
    });
  });

  describe("calculateBillingPeriod", () => {
    it("should calculate monthly billing period correctly", () => {
      // Use first of month for predictable results
      const startDate = new Date("2026-02-01");
      const referenceDate = new Date("2026-02-15");

      const period = calculateBillingPeriod(
        startDate,
        "monthly",
        referenceDate,
      );

      expect(period.interval).toBe("monthly");
      expect(period.startDate.getMonth()).toBe(1); // February
      expect(period.isCurrent).toBe(true);
    });

    it("should calculate yearly billing period correctly", () => {
      // Start at beginning of year
      const startDate = new Date("2026-01-01");
      const referenceDate = new Date("2026-06-15");

      const period = calculateBillingPeriod(startDate, "yearly", referenceDate);

      expect(period.interval).toBe("yearly");
      // Period start and end should be a year apart
      const yearDiff =
        period.endDate.getFullYear() - period.startDate.getFullYear();
      expect(yearDiff).toBe(1);
    });

    it("should calculate days in period", () => {
      const startDate = new Date("2026-02-01");
      const referenceDate = new Date("2026-02-15");

      const period = calculateBillingPeriod(
        startDate,
        "monthly",
        referenceDate,
      );

      expect(period.daysInPeriod).toBeGreaterThan(0);
      expect(period.daysElapsed).toBeGreaterThan(0);
      expect(period.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it("should calculate progress percentage", () => {
      const startDate = new Date("2026-02-01");
      const referenceDate = new Date("2026-02-15");

      const period = calculateBillingPeriod(
        startDate,
        "monthly",
        referenceDate,
      );

      expect(period.progressPercentage).toBeGreaterThan(0);
      expect(period.progressPercentage).toBeLessThanOrEqual(100);
    });

    it("should generate unique period ID", () => {
      const period1 = calculateBillingPeriod(
        new Date("2026-01-01"),
        "monthly",
        new Date("2026-01-15"),
      );
      const period2 = calculateBillingPeriod(
        new Date("2026-02-01"),
        "monthly",
        new Date("2026-02-15"),
      );

      expect(period1.id).not.toBe(period2.id);
    });
  });

  describe("generateIdempotencyKey", () => {
    it("should generate unique keys", () => {
      const key1 = generateIdempotencyKey("org1", "api_calls", new Date());
      const key2 = generateIdempotencyKey("org2", "api_calls", new Date());

      expect(key1).not.toBe(key2);
    });

    it("should include organization ID in key", () => {
      const key = generateIdempotencyKey("org123", "storage", new Date());
      expect(key).toContain("org123");
    });

    it("should include dimension in key", () => {
      const key = generateIdempotencyKey("org1", "api_calls", new Date());
      expect(key).toContain("api_calls");
    });

    it("should handle optional suffix", () => {
      const timestamp = new Date();
      const keyWithSuffix = generateIdempotencyKey(
        "org1",
        "storage",
        timestamp,
        "custom",
      );
      const keyWithoutSuffix = generateIdempotencyKey(
        "org1",
        "storage",
        timestamp,
      );

      expect(keyWithSuffix).toContain("custom");
      expect(keyWithoutSuffix).not.toContain("custom");
    });

    it("should produce consistent keys for same inputs", () => {
      const timestamp = new Date("2026-02-01T12:00:00Z");
      const key1 = generateIdempotencyKey("org1", "api_calls", timestamp);
      const key2 = generateIdempotencyKey("org1", "api_calls", timestamp);

      expect(key1).toBe(key2);
    });
  });

  describe("validateUsageEventInput", () => {
    it("should accept valid input", () => {
      const input: CreateUsageEventInput = {
        organizationId: "org123",
        dimension: "api_calls",
        quantity: 100,
      };

      expect(() => validateUsageEventInput(input)).not.toThrow();
    });

    it("should reject missing organization ID", () => {
      const input = {
        organizationId: "",
        dimension: "api_calls" as UsageDimensionType,
        quantity: 100,
      };

      expect(() => validateUsageEventInput(input)).toThrow(UsageBillingError);
    });

    it("should reject invalid dimension", () => {
      const input = {
        organizationId: "org123",
        dimension: "invalid" as UsageDimensionType,
        quantity: 100,
      };

      expect(() => validateUsageEventInput(input)).toThrow(UsageBillingError);
    });

    it("should reject non-finite quantity", () => {
      const input: CreateUsageEventInput = {
        organizationId: "org123",
        dimension: "api_calls",
        quantity: Infinity,
      };

      expect(() => validateUsageEventInput(input)).toThrow(UsageBillingError);
    });

    it("should reject NaN quantity", () => {
      const input: CreateUsageEventInput = {
        organizationId: "org123",
        dimension: "api_calls",
        quantity: NaN,
      };

      expect(() => validateUsageEventInput(input)).toThrow(UsageBillingError);
    });

    it("should accept negative quantity (for decrements)", () => {
      const input: CreateUsageEventInput = {
        organizationId: "org123",
        dimension: "storage",
        quantity: -500,
      };

      expect(() => validateUsageEventInput(input)).not.toThrow();
    });

    it("should accept zero quantity", () => {
      const input: CreateUsageEventInput = {
        organizationId: "org123",
        dimension: "api_calls",
        quantity: 0,
      };

      expect(() => validateUsageEventInput(input)).not.toThrow();
    });
  });
});

describe("UsageBillingError", () => {
  it("should create error with code and message", () => {
    const error = new UsageBillingError(
      UsageBillingErrorCode.INVALID_DIMENSION,
      "Invalid dimension provided",
    );

    expect(error.code).toBe(UsageBillingErrorCode.INVALID_DIMENSION);
    expect(error.message).toBe("Invalid dimension provided");
    expect(error.name).toBe("UsageBillingError");
  });

  it("should include dimension when provided", () => {
    const error = new UsageBillingError(
      UsageBillingErrorCode.LIMIT_EXCEEDED,
      "Storage limit exceeded",
      "storage",
    );

    expect(error.dimension).toBe("storage");
  });

  it("should include metadata when provided", () => {
    const error = new UsageBillingError(
      UsageBillingErrorCode.LIMIT_EXCEEDED,
      "API limit exceeded",
      "api_calls",
      { currentUsage: 10000, limit: 5000 },
    );

    expect(error.metadata).toEqual({ currentUsage: 10000, limit: 5000 });
  });

  it("should be an instance of Error", () => {
    const error = new UsageBillingError(
      UsageBillingErrorCode.UNKNOWN_ERROR,
      "Something went wrong",
    );

    expect(error).toBeInstanceOf(Error);
  });

  it("should have all error codes defined", () => {
    expect(UsageBillingErrorCode.INVALID_DIMENSION).toBeDefined();
    expect(UsageBillingErrorCode.INVALID_QUANTITY).toBeDefined();
    expect(UsageBillingErrorCode.DUPLICATE_EVENT).toBeDefined();
    expect(UsageBillingErrorCode.LIMIT_EXCEEDED).toBeDefined();
    expect(UsageBillingErrorCode.OVERAGE_BLOCKED).toBeDefined();
    expect(UsageBillingErrorCode.BILLING_SYNC_FAILED).toBeDefined();
    expect(UsageBillingErrorCode.PERIOD_NOT_FOUND).toBeDefined();
    expect(UsageBillingErrorCode.AGGREGATION_ERROR).toBeDefined();
    expect(UsageBillingErrorCode.CALCULATION_ERROR).toBeDefined();
    expect(UsageBillingErrorCode.STRIPE_SYNC_ERROR).toBeDefined();
    expect(UsageBillingErrorCode.INVALID_PERIOD).toBeDefined();
    expect(UsageBillingErrorCode.UNKNOWN_ERROR).toBeDefined();
  });
});
