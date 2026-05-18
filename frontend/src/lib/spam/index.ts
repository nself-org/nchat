/**
 * Anti-Spam and Abuse Defense Module
 *
 * Complete spam detection and abuse prevention system including:
 * - Heuristic and rule-based spam detection
 * - Configurable rate limiting
 * - User trust/abuse scoring
 * - Raid protection and mass-join detection
 *
 * @module lib/spam
 */

// Import factory functions for internal use
import {
  createSpamDetector as createDetector,
  getSpamDetector as getDetector,
} from "./spam-detector";
import {
  createRateLimiter as createLimiter,
  getRateLimiter as getLimiter,
} from "./rate-limiter";
import {
  createAbuseScorer as createScorer,
  getAbuseScorer as getScorer,
} from "./abuse-scorer";
import {
  createRaidProtection as createProtection,
  getRaidProtection as getProtection,
} from "./raid-protection";

import type { SpamDetectorConfig } from "./spam-detector";
import type { RateLimiterOptions } from "./rate-limiter";
import type { AbuseScorerConfig } from "./abuse-scorer";
import type { RaidProtectionConfig } from "./raid-protection";

// Spam Detector
export {
  SpamDetector,
  getSpamDetector,
  createSpamDetector,
  DEFAULT_SPAM_CONFIG,
} from "./spam-detector";

export type {
  SpamCategory,
  SpamSeverity,
  SpamRule,
  SpamAction,
  SpamDetectionResult,
  SpamRuleMatch,
  HeuristicMatch,
  SpamMetadata,
  SpamDetectorConfig,
} from "./spam-detector";

// Rate Limiter
export {
  RateLimiter,
  getRateLimiter,
  createRateLimiter,
  formatRetryAfter,
  createRateLimitHeaders,
  DEFAULT_RATE_LIMITS,
  STRICT_RATE_LIMITS,
} from "./rate-limiter";

export type {
  RateLimitAction,
  RateLimitScope,
  RateLimitConfig,
  RateLimitResult,
  RateLimitState,
  RateLimitEntry,
  RateLimiterOptions,
} from "./rate-limiter";

// Abuse Scorer
export {
  AbuseScorer,
  getAbuseScorer,
  createAbuseScorer,
  getRecommendedAction,
  formatTrustScore,
  DEFAULT_SCORER_CONFIG,
} from "./abuse-scorer";

export type {
  TrustLevel,
  BehaviorEvent,
  UserProfile,
  BehaviorRecord,
  UserTrustScore,
  TrustFactors,
  ScoreHistoryEntry,
  AbuseScorerConfig,
} from "./abuse-scorer";

// Raid Protection
export {
  RaidProtection,
  getRaidProtection,
  createRaidProtection,
  DEFAULT_RAID_CONFIG,
  LOCKDOWN_PRESETS,
} from "./raid-protection";

export type {
  RaidType,
  RaidSeverity,
  RaidStatus,
  LockdownLevel,
  RaidEvent,
  RaidMetrics,
  RaidMitigation,
  JoinEvent,
  LockdownState,
  LockdownRestrictions,
  InviteTracker,
  RaidProtectionConfig,
} from "./raid-protection";

/**
 * Creates a complete anti-spam system with all components configured
 */
export function createAntiSpamSystem(config?: {
  spamDetector?: Partial<SpamDetectorConfig>;
  rateLimiter?: Partial<RateLimiterOptions>;
  abuseScorer?: Partial<AbuseScorerConfig>;
  raidProtection?: Partial<RaidProtectionConfig>;
}) {
  return {
    spamDetector: createDetector(config?.spamDetector),
    rateLimiter: createLimiter(config?.rateLimiter),
    abuseScorer: createScorer(config?.abuseScorer),
    raidProtection: createProtection(config?.raidProtection),
  };
}

/**
 * Gets singleton instances of all anti-spam components
 */
export function getAntiSpamSystem() {
  return {
    spamDetector: getDetector(),
    rateLimiter: getLimiter(),
    abuseScorer: getScorer(),
    raidProtection: getProtection(),
  };
}
