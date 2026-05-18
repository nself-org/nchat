/**
 * Monetization Abuse Prevention Types
 *
 * Type definitions for anti-sharing detection, seat abuse controls,
 * suspicious payment heuristics, and the unified abuse prevention engine.
 *
 * @module @/lib/billing/abuse/types
 * @version 1.0.0
 */

import type { PlanTier } from "@/types/subscription.types";

// ============================================================================
// Risk & Enforcement Types
// ============================================================================

/**
 * Risk assessment levels.
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Enforcement actions the system can take in response to abuse.
 */
export type EnforcementAction =
  | "none"
  | "warn"
  | "throttle"
  | "require_verification"
  | "suspend"
  | "block";

/**
 * Abuse signal categories.
 */
export type AbuseCategory = "sharing" | "seat_abuse" | "payment_abuse";

/**
 * Appeal status for disputed enforcement actions.
 */
export type AppealStatus = "pending" | "under_review" | "approved" | "denied";

// ============================================================================
// Abuse Signal Types
// ============================================================================

/**
 * A detected abuse signal from any detection module.
 */
export interface AbuseSignal {
  /** Unique signal identifier */
  id: string;
  /** Category of abuse */
  category: AbuseCategory;
  /** Specific indicator type */
  indicatorType: string;
  /** Risk level of this signal */
  riskLevel: RiskLevel;
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable description */
  description: string;
  /** Associated account / subscription ID */
  accountId: string;
  /** Workspace ID */
  workspaceId: string;
  /** When the signal was detected */
  detectedAt: number;
  /** Raw evidence data */
  evidence: Record<string, unknown>;
  /** Whether this was later marked as false positive */
  isFalsePositive: boolean;
}

// ============================================================================
// Anti-Sharing Types
// ============================================================================

/**
 * Sharing indicator types.
 */
export type SharingIndicatorType =
  | "concurrent_sessions"
  | "device_fingerprint_mismatch"
  | "ip_pattern_anomaly"
  | "geographic_impossibility";

/**
 * Device fingerprint data.
 */
export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  /** Hash of the combined fingerprint for quick comparison */
  hash: string;
}

/**
 * Session record for tracking concurrent access.
 */
export interface SessionRecord {
  sessionId: string;
  userId: string;
  subscriptionId: string;
  deviceFingerprint: DeviceFingerprint;
  ipAddress: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  startedAt: number;
  lastActiveAt: number;
  isActive: boolean;
}

/**
 * Sharing analysis result.
 */
export interface SharingAnalysis {
  subscriptionId: string;
  userId: string;
  signals: AbuseSignal[];
  concurrentSessionCount: number;
  uniqueDeviceCount: number;
  uniqueIpCount: number;
  geographicAnomalies: GeographicAnomaly[];
  overallRisk: RiskLevel;
  recommendedAction: EnforcementAction;
}

/**
 * A detected geographic impossibility.
 */
export interface GeographicAnomaly {
  session1: {
    sessionId: string;
    ip: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    time: number;
  };
  session2: {
    sessionId: string;
    ip: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    time: number;
  };
  distanceKm: number;
  timeDifferenceMinutes: number;
  requiredSpeedKmh: number;
  maxPlausibleSpeedKmh: number;
  isImpossible: boolean;
}

/**
 * Anti-sharing configuration per plan tier.
 */
export interface AntiSharingConfig {
  /** Maximum concurrent sessions allowed */
  maxConcurrentSessions: number;
  /** Maximum unique devices per rolling window */
  maxUniqueDevices: number;
  /** Rolling window for device counting (ms) */
  deviceWindowMs: number;
  /** Maximum distinct IPs in rolling window */
  maxDistinctIps: number;
  /** Rolling window for IP counting (ms) */
  ipWindowMs: number;
  /** Maximum plausible travel speed (km/h) for geographic checks */
  maxPlausibleSpeedKmh: number;
  /** Grace period before enforcement (ms) */
  gracePeriodMs: number;
  /** Minimum confidence to raise signal */
  minConfidence: number;
}

// ============================================================================
// Seat Abuse Types
// ============================================================================

/**
 * Seat abuse indicator types.
 */
export type SeatAbuseIndicatorType =
  | "ghost_seat"
  | "seat_sharing"
  | "seat_hopping";

/**
 * Seat assignment record.
 */
export interface SeatAssignment {
  seatId: string;
  userId: string;
  subscriptionId: string;
  workspaceId: string;
  assignedAt: number;
  lastActiveAt: number;
  isActive: boolean;
  /** Devices used on this seat */
  devices: DeviceFingerprint[];
  /** IPs used on this seat */
  ipAddresses: string[];
  /** Locations used on this seat */
  locations: Array<{ city: string; country: string }>;
}

/**
 * Seat reassignment event.
 */
export interface SeatReassignment {
  seatId: string;
  previousUserId: string;
  newUserId: string;
  reassignedAt: number;
  reassignedBy: string;
  reason?: string;
}

/**
 * Seat utilization score.
 */
export interface SeatUtilizationScore {
  seatId: string;
  userId: string;
  subscriptionId: string;
  /** 0-100 utilization score */
  score: number;
  /** Days since last activity */
  daysSinceLastActive: number;
  /** Number of active days in the evaluation window */
  activeDaysInWindow: number;
  /** Total days in the evaluation window */
  totalDaysInWindow: number;
  /** Number of distinct devices used */
  deviceCount: number;
  /** Number of distinct locations */
  locationCount: number;
  /** Classification */
  classification: "active" | "low_usage" | "ghost" | "shared";
}

/**
 * Seat abuse analysis result.
 */
export interface SeatAbuseAnalysis {
  subscriptionId: string;
  workspaceId: string;
  totalSeats: number;
  activeSeats: number;
  ghostSeats: SeatUtilizationScore[];
  sharedSeats: SeatUtilizationScore[];
  hoppingSeats: string[];
  signals: AbuseSignal[];
  overallRisk: RiskLevel;
  recommendedAction: EnforcementAction;
  deprovisioningRecommendations: DeprovisioningRecommendation[];
}

/**
 * Recommendation to deprovision an underused seat.
 */
export interface DeprovisioningRecommendation {
  seatId: string;
  userId: string;
  reason: string;
  daysSinceLastActive: number;
  utilizationScore: number;
  estimatedSavingsPerMonth: number;
}

/**
 * Seat abuse configuration.
 */
export interface SeatAbuseConfig {
  /** Days of inactivity before a seat is considered ghost */
  ghostSeatThresholdDays: number;
  /** Max devices per seat before flagging sharing */
  maxDevicesPerSeat: number;
  /** Max unique IPs per seat in window */
  maxIpsPerSeat: number;
  /** Rolling window for IP/device checks (ms) */
  windowMs: number;
  /** Max reassignments per seat in rolling window before flagging hopping */
  maxReassignmentsPerWindow: number;
  /** Rolling window for reassignment counting (ms) */
  reassignmentWindowMs: number;
  /** Utilization score below which seat is flagged */
  lowUtilizationThreshold: number;
  /** Cost per seat per month in cents (for savings calculation) */
  costPerSeatCents: number;
}

// ============================================================================
// Payment Abuse Types
// ============================================================================

/**
 * Payment abuse indicator types.
 */
export type PaymentAbuseIndicatorType =
  | "card_testing"
  | "velocity_exceeded"
  | "bin_country_mismatch"
  | "disposable_card"
  | "refund_abuse"
  | "chargeback_risk"
  | "amount_anomaly";

/**
 * Card metadata for heuristic analysis.
 */
export interface CardMetadata {
  last4: string;
  brand: string;
  country: string;
  fingerprint: string;
  fundingType: "credit" | "debit" | "prepaid" | "unknown";
  issuingBank?: string;
  bin: string;
}

/**
 * Payment event for heuristic analysis.
 */
export interface PaymentEvent {
  id: string;
  userId: string;
  subscriptionId: string;
  workspaceId: string;
  amount: number;
  currency: string;
  card: CardMetadata;
  ipAddress: string;
  userCountry: string;
  timestamp: number;
  status: "succeeded" | "failed" | "refunded" | "disputed";
  failureReason?: string;
  isRefund: boolean;
  refundReason?: string;
}

/**
 * Refund history for an account.
 */
export interface RefundHistory {
  userId: string;
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  recentRefunds: PaymentEvent[];
  refundReasons: Record<string, number>;
}

/**
 * Chargeback risk assessment.
 */
export interface ChargebackRiskScore {
  userId: string;
  score: number;
  riskLevel: RiskLevel;
  factors: ChargebackRiskFactor[];
  recommendation: string;
}

/**
 * Individual chargeback risk factor.
 */
export interface ChargebackRiskFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
  description: string;
}

/**
 * Payment abuse analysis result.
 */
export interface PaymentAbuseAnalysis {
  userId: string;
  workspaceId: string;
  signals: AbuseSignal[];
  cardTestingDetected: boolean;
  velocityExceeded: boolean;
  binMismatchDetected: boolean;
  disposableCardDetected: boolean;
  refundAbuseDetected: boolean;
  chargebackRisk: ChargebackRiskScore;
  overallRisk: RiskLevel;
  recommendedAction: EnforcementAction;
}

/**
 * Payment heuristics configuration.
 */
export interface PaymentHeuristicsConfig {
  /** Max failed payment attempts in window before flagging card testing */
  maxFailedAttemptsInWindow: number;
  /** Window for card testing detection (ms) */
  cardTestingWindowMs: number;
  /** Max small-amount charges in window (card testing pattern) */
  maxSmallChargesInWindow: number;
  /** Amount threshold for "small charge" (cents) */
  smallChargeThreshold: number;
  /** Max payment attempts per hour */
  maxAttemptsPerHour: number;
  /** Max payment attempts per day */
  maxAttemptsPerDay: number;
  /** Whether to flag BIN country mismatches */
  flagBinCountryMismatch: boolean;
  /** Whether to flag prepaid/virtual cards */
  flagPrepaidCards: boolean;
  /** Refund rate threshold (0-1) above which refund abuse is flagged */
  refundRateThreshold: number;
  /** Min refunds to consider for refund rate */
  minRefundsForRate: number;
  /** Chargeback risk score threshold (0-100) */
  chargebackRiskThreshold: number;
  /** Expected amount ranges per plan tier */
  expectedAmountRanges: Record<string, { min: number; max: number }>;
}

// ============================================================================
// Abuse Engine Types
// ============================================================================

/**
 * Unified abuse report combining all detection modules.
 */
export interface AbuseReport {
  /** Unique report identifier */
  id: string;
  /** Account under review */
  accountId: string;
  /** Subscription ID */
  subscriptionId: string;
  /** Workspace ID */
  workspaceId: string;
  /** Plan tier */
  planTier: PlanTier;
  /** When the report was generated */
  generatedAt: number;
  /** Aggregated risk score (0-100) */
  riskScore: number;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** All detected signals */
  signals: AbuseSignal[];
  /** Sharing analysis (if applicable) */
  sharingAnalysis: SharingAnalysis | null;
  /** Seat abuse analysis (if applicable) */
  seatAnalysis: SeatAbuseAnalysis | null;
  /** Payment abuse analysis (if applicable) */
  paymentAnalysis: PaymentAbuseAnalysis | null;
  /** Recommended enforcement action */
  recommendedAction: EnforcementAction;
  /** Whether action was auto-applied */
  actionApplied: boolean;
  /** Action that was applied (if any) */
  appliedAction: EnforcementAction | null;
  /** Appeal (if any) */
  appeal: AbuseAppeal | null;
  /** Audit trail */
  auditTrail: AbuseAuditEntry[];
}

/**
 * An appeal against an enforcement action.
 */
export interface AbuseAppeal {
  id: string;
  reportId: string;
  accountId: string;
  status: AppealStatus;
  reason: string;
  evidence?: string;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  resolution?: string;
  restoredAccess: boolean;
}

/**
 * Audit trail entry for abuse enforcement.
 */
export interface AbuseAuditEntry {
  id: string;
  reportId: string;
  action: string;
  actor: string;
  actorType: "system" | "admin" | "user";
  timestamp: number;
  details: Record<string, unknown>;
}

/**
 * Configuration for the abuse prevention engine.
 */
export interface AbuseEngineConfig {
  /** Whether the engine is enabled */
  enabled: boolean;
  /** Per-plan tier configurations */
  planConfigs: Partial<Record<PlanTier, PlanAbuseConfig>>;
  /** Default config for plans not explicitly configured */
  defaultConfig: PlanAbuseConfig;
  /** Risk score thresholds for each level */
  riskThresholds: RiskThresholds;
  /** Automated enforcement actions per risk level */
  enforcementPolicy: Record<RiskLevel, EnforcementAction>;
  /** Whether to auto-apply enforcement actions */
  autoEnforce: boolean;
  /** Categories to enable */
  enabledCategories: AbuseCategory[];
  /** Global cooldown between repeated enforcement on same account (ms) */
  enforcementCooldownMs: number;
}

/**
 * Plan-specific abuse configuration.
 */
export interface PlanAbuseConfig {
  sharing: AntiSharingConfig;
  seatAbuse: SeatAbuseConfig;
  paymentHeuristics: PaymentHeuristicsConfig;
}

/**
 * Risk score thresholds mapping to risk levels.
 */
export interface RiskThresholds {
  /** Score at or below which risk is "low" */
  low: number;
  /** Score at or below which risk is "medium" */
  medium: number;
  /** Score at or below which risk is "high" */
  high: number;
  /** Score above "high" is "critical" */
}

/**
 * Batch scan result for periodic audits.
 */
export interface BatchScanResult {
  scannedAt: number;
  totalAccounts: number;
  accountsScanned: number;
  reportsGenerated: AbuseReport[];
  riskDistribution: Record<RiskLevel, number>;
  actionsApplied: number;
  errors: Array<{ accountId: string; error: string }>;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_ANTI_SHARING_CONFIG: AntiSharingConfig = {
  maxConcurrentSessions: 3,
  maxUniqueDevices: 5,
  deviceWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxDistinctIps: 10,
  ipWindowMs: 60 * 60 * 1000, // 1 hour
  maxPlausibleSpeedKmh: 900, // roughly max commercial flight speed
  gracePeriodMs: 15 * 60 * 1000, // 15 minutes
  minConfidence: 0.6,
};

export const DEFAULT_SEAT_ABUSE_CONFIG: SeatAbuseConfig = {
  ghostSeatThresholdDays: 30,
  maxDevicesPerSeat: 3,
  maxIpsPerSeat: 5,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxReassignmentsPerWindow: 3,
  reassignmentWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  lowUtilizationThreshold: 20,
  costPerSeatCents: 1500, // $15/seat/month
};

export const DEFAULT_PAYMENT_HEURISTICS_CONFIG: PaymentHeuristicsConfig = {
  maxFailedAttemptsInWindow: 5,
  cardTestingWindowMs: 10 * 60 * 1000, // 10 minutes
  maxSmallChargesInWindow: 5,
  smallChargeThreshold: 100, // $1.00
  maxAttemptsPerHour: 10,
  maxAttemptsPerDay: 30,
  flagBinCountryMismatch: true,
  flagPrepaidCards: true,
  refundRateThreshold: 0.3, // 30% refund rate
  minRefundsForRate: 3,
  chargebackRiskThreshold: 70,
  expectedAmountRanges: {
    free: { min: 0, max: 0 },
    starter: { min: 500, max: 5000 },
    professional: { min: 2000, max: 20000 },
    enterprise: { min: 10000, max: 500000 },
    custom: { min: 0, max: 1000000 },
  },
};

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  low: 25,
  medium: 50,
  high: 75,
  // critical is > 75
};

export const DEFAULT_ENFORCEMENT_POLICY: Record<RiskLevel, EnforcementAction> =
  {
    low: "none",
    medium: "warn",
    high: "throttle",
    critical: "suspend",
  };

export const DEFAULT_PLAN_ABUSE_CONFIG: PlanAbuseConfig = {
  sharing: DEFAULT_ANTI_SHARING_CONFIG,
  seatAbuse: DEFAULT_SEAT_ABUSE_CONFIG,
  paymentHeuristics: DEFAULT_PAYMENT_HEURISTICS_CONFIG,
};

export const DEFAULT_ABUSE_ENGINE_CONFIG: AbuseEngineConfig = {
  enabled: true,
  planConfigs: {
    free: {
      sharing: {
        ...DEFAULT_ANTI_SHARING_CONFIG,
        maxConcurrentSessions: 1,
        maxUniqueDevices: 2,
      },
      seatAbuse: { ...DEFAULT_SEAT_ABUSE_CONFIG, ghostSeatThresholdDays: 14 },
      paymentHeuristics: DEFAULT_PAYMENT_HEURISTICS_CONFIG,
    },
    enterprise: {
      sharing: {
        ...DEFAULT_ANTI_SHARING_CONFIG,
        maxConcurrentSessions: 10,
        maxUniqueDevices: 20,
      },
      seatAbuse: { ...DEFAULT_SEAT_ABUSE_CONFIG, ghostSeatThresholdDays: 60 },
      paymentHeuristics: DEFAULT_PAYMENT_HEURISTICS_CONFIG,
    },
  },
  defaultConfig: DEFAULT_PLAN_ABUSE_CONFIG,
  riskThresholds: DEFAULT_RISK_THRESHOLDS,
  enforcementPolicy: DEFAULT_ENFORCEMENT_POLICY,
  autoEnforce: true,
  enabledCategories: ["sharing", "seat_abuse", "payment_abuse"],
  enforcementCooldownMs: 60 * 60 * 1000, // 1 hour
};
