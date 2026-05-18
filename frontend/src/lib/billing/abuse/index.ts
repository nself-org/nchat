/**
 * Monetization Abuse Prevention Suite
 *
 * Comprehensive anti-sharing, seat abuse, and payment fraud detection
 * for the nchat billing system.
 *
 * @module @/lib/billing/abuse
 * @version 1.0.0
 */

// Types
export {
  // Risk & enforcement
  type RiskLevel,
  type EnforcementAction,
  type AbuseCategory,
  type AppealStatus,

  // Abuse signals
  type AbuseSignal,

  // Anti-sharing types
  type SharingIndicatorType,
  type DeviceFingerprint,
  type SessionRecord,
  type SharingAnalysis,
  type GeographicAnomaly,
  type AntiSharingConfig,

  // Seat abuse types
  type SeatAbuseIndicatorType,
  type SeatAssignment,
  type SeatReassignment,
  type SeatUtilizationScore,
  type SeatAbuseAnalysis,
  type DeprovisioningRecommendation,
  type SeatAbuseConfig,

  // Payment abuse types
  type PaymentAbuseIndicatorType,
  type CardMetadata,
  type PaymentEvent,
  type RefundHistory,
  type ChargebackRiskScore,
  type ChargebackRiskFactor,
  type PaymentAbuseAnalysis,
  type PaymentHeuristicsConfig,

  // Engine types
  type AbuseReport,
  type AbuseAppeal,
  type AbuseAuditEntry,
  type AbuseEngineConfig,
  type PlanAbuseConfig,
  type RiskThresholds,
  type BatchScanResult,

  // Default configs
  DEFAULT_ANTI_SHARING_CONFIG,
  DEFAULT_SEAT_ABUSE_CONFIG,
  DEFAULT_PAYMENT_HEURISTICS_CONFIG,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_ENFORCEMENT_POLICY,
  DEFAULT_PLAN_ABUSE_CONFIG,
  DEFAULT_ABUSE_ENGINE_CONFIG,
} from "./types";

// Anti-Sharing Detection
export {
  AntiSharingDetector,
  haversineDistance,
  computeFingerprintHash,
  fingerprintSimilarity,
} from "./anti-sharing";

// Seat Abuse Controls
export { SeatAbuseDetector } from "./seat-abuse";

// Payment Heuristics
export { PaymentHeuristicsDetector } from "./payment-heuristics";

// Abuse Prevention Engine
export {
  AbusePreventionEngine,
  getAbusePreventionEngine,
  createAbusePreventionEngine,
  resetAbusePreventionEngine,
} from "./abuse-engine";
