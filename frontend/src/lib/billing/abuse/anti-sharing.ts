/**
 * Anti-Sharing Detection Module
 *
 * Detects credential/account sharing through:
 * - Concurrent session monitoring
 * - Device fingerprint analysis
 * - IP pattern analysis
 * - Geographic impossibility detection (haversine)
 *
 * @module @/lib/billing/abuse/anti-sharing
 * @version 1.0.0
 */

import type {
  SessionRecord,
  DeviceFingerprint,
  AntiSharingConfig,
  SharingAnalysis,
  GeographicAnomaly,
  AbuseSignal,
  RiskLevel,
  EnforcementAction,
} from "./types";
import { DEFAULT_ANTI_SHARING_CONFIG } from "./types";

// ============================================================================
// Haversine Distance Calculation
// ============================================================================

/**
 * Calculate the distance between two geographic points using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const EARTH_RADIUS_KM = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// ============================================================================
// Device Fingerprint Utilities
// ============================================================================

/**
 * Compute a hash for a device fingerprint using a simple but deterministic approach.
 * In production, this would use a proper hashing algorithm.
 */
export function computeFingerprintHash(
  fp: Omit<DeviceFingerprint, "hash">,
): string {
  const raw = `${fp.userAgent}|${fp.screenResolution}|${fp.timezone}|${fp.language}|${fp.platform}`;
  // Simple djb2-like hash for in-memory use
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate similarity score between two device fingerprints (0-1).
 * 1 = identical, 0 = completely different.
 */
export function fingerprintSimilarity(
  a: DeviceFingerprint,
  b: DeviceFingerprint,
): number {
  let matches = 0;
  const fields: (keyof Omit<DeviceFingerprint, "hash">)[] = [
    "userAgent",
    "screenResolution",
    "timezone",
    "language",
    "platform",
  ];

  for (const field of fields) {
    if (a[field] === b[field]) {
      matches++;
    }
  }

  return matches / fields.length;
}

// ============================================================================
// Anti-Sharing Detector
// ============================================================================

/**
 * Anti-sharing detector that analyzes sessions for account sharing indicators.
 */
export class AntiSharingDetector {
  private config: AntiSharingConfig;
  /** Active sessions indexed by subscriptionId */
  private sessions = new Map<string, SessionRecord[]>();
  /** Grace period tracker: subscriptionId -> first violation timestamp */
  private graceTracker = new Map<string, number>();
  private signalCounter = 0;

  constructor(config?: Partial<AntiSharingConfig>) {
    this.config = { ...DEFAULT_ANTI_SHARING_CONFIG, ...config };
  }

  /**
   * Register or update a session.
   */
  registerSession(session: SessionRecord): void {
    const key = session.subscriptionId;
    const existing = this.sessions.get(key) || [];

    const idx = existing.findIndex((s) => s.sessionId === session.sessionId);
    if (idx >= 0) {
      existing[idx] = session;
    } else {
      existing.push(session);
    }

    this.sessions.set(key, existing);
  }

  /**
   * Remove a session (e.g., on logout).
   */
  removeSession(subscriptionId: string, sessionId: string): void {
    const existing = this.sessions.get(subscriptionId);
    if (!existing) return;
    this.sessions.set(
      subscriptionId,
      existing.filter((s) => s.sessionId !== sessionId),
    );
  }

  /**
   * Get all active sessions for a subscription.
   */
  getActiveSessions(subscriptionId: string): SessionRecord[] {
    const all = this.sessions.get(subscriptionId) || [];
    return all.filter((s) => s.isActive);
  }

  /**
   * Run full sharing analysis for a subscription.
   */
  analyze(subscriptionId: string, userId: string): SharingAnalysis {
    const signals: AbuseSignal[] = [];
    const activeSessions = this.getActiveSessions(subscriptionId);

    // 1. Concurrent session check
    const concurrentSignal = this.checkConcurrentSessions(
      subscriptionId,
      userId,
      activeSessions,
    );
    if (concurrentSignal) signals.push(concurrentSignal);

    // 2. Device fingerprint analysis
    const deviceSignal = this.checkDeviceFingerprints(
      subscriptionId,
      userId,
      activeSessions,
    );
    if (deviceSignal) signals.push(deviceSignal);

    // 3. IP pattern analysis
    const ipSignal = this.checkIpPatterns(
      subscriptionId,
      userId,
      activeSessions,
    );
    if (ipSignal) signals.push(ipSignal);

    // 4. Geographic impossibility
    const geoAnomalies = this.checkGeographicImpossibility(activeSessions);
    for (const anomaly of geoAnomalies) {
      if (anomaly.isImpossible) {
        signals.push(
          this.createSignal(
            "sharing",
            "geographic_impossibility",
            subscriptionId,
            userId,
            `Geographic impossibility: ${anomaly.distanceKm.toFixed(0)}km in ${anomaly.timeDifferenceMinutes.toFixed(0)}min`,
            0.95,
            "high",
            { anomaly },
          ),
        );
      }
    }

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(signals);
    const recommendedAction = this.getRecommendedAction(
      overallRisk,
      subscriptionId,
    );

    // Unique devices and IPs
    const uniqueDevices = new Set(
      activeSessions.map((s) => s.deviceFingerprint.hash),
    );
    const uniqueIps = new Set(activeSessions.map((s) => s.ipAddress));

    return {
      subscriptionId,
      userId,
      signals,
      concurrentSessionCount: activeSessions.length,
      uniqueDeviceCount: uniqueDevices.size,
      uniqueIpCount: uniqueIps.size,
      geographicAnomalies: geoAnomalies,
      overallRisk,
      recommendedAction,
    };
  }

  /**
   * Check concurrent session count against limit.
   */
  checkConcurrentSessions(
    subscriptionId: string,
    userId: string,
    sessions: SessionRecord[],
  ): AbuseSignal | null {
    if (sessions.length <= this.config.maxConcurrentSessions) {
      return null;
    }

    const excess = sessions.length - this.config.maxConcurrentSessions;
    const confidence = Math.min(0.5 + excess * 0.15, 1.0);

    if (confidence < this.config.minConfidence) return null;

    return this.createSignal(
      "sharing",
      "concurrent_sessions",
      subscriptionId,
      userId,
      `${sessions.length} concurrent sessions detected (max: ${this.config.maxConcurrentSessions})`,
      confidence,
      excess >= 3 ? "high" : "medium",
      { sessionCount: sessions.length, max: this.config.maxConcurrentSessions },
    );
  }

  /**
   * Analyze device fingerprints for diversity suggesting sharing.
   */
  checkDeviceFingerprints(
    subscriptionId: string,
    userId: string,
    sessions: SessionRecord[],
  ): AbuseSignal | null {
    const now = Date.now();
    const windowSessions = sessions.filter(
      (s) => now - s.lastActiveAt < this.config.deviceWindowMs,
    );

    const uniqueFingerprints = new Set(
      windowSessions.map((s) => s.deviceFingerprint.hash),
    );

    if (uniqueFingerprints.size <= this.config.maxUniqueDevices) {
      return null;
    }

    const excess = uniqueFingerprints.size - this.config.maxUniqueDevices;
    const confidence = Math.min(0.5 + excess * 0.1, 1.0);

    if (confidence < this.config.minConfidence) return null;

    // Check if fingerprints are very different (low similarity = more likely sharing)
    const fingerprints = windowSessions.map((s) => s.deviceFingerprint);
    let avgSimilarity = 0;
    let comparisons = 0;
    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        avgSimilarity += fingerprintSimilarity(
          fingerprints[i],
          fingerprints[j],
        );
        comparisons++;
      }
    }
    if (comparisons > 0) {
      avgSimilarity /= comparisons;
    }

    return this.createSignal(
      "sharing",
      "device_fingerprint_mismatch",
      subscriptionId,
      userId,
      `${uniqueFingerprints.size} unique devices in window (max: ${this.config.maxUniqueDevices}), avg similarity: ${(avgSimilarity * 100).toFixed(0)}%`,
      confidence,
      avgSimilarity < 0.3 ? "high" : "medium",
      {
        uniqueDevices: uniqueFingerprints.size,
        max: this.config.maxUniqueDevices,
        avgSimilarity,
      },
    );
  }

  /**
   * Analyze IP patterns for anomalies.
   */
  checkIpPatterns(
    subscriptionId: string,
    userId: string,
    sessions: SessionRecord[],
  ): AbuseSignal | null {
    const now = Date.now();
    const windowSessions = sessions.filter(
      (s) => now - s.lastActiveAt < this.config.ipWindowMs,
    );

    const uniqueIps = new Set(windowSessions.map((s) => s.ipAddress));

    if (uniqueIps.size <= this.config.maxDistinctIps) {
      return null;
    }

    const excess = uniqueIps.size - this.config.maxDistinctIps;
    const confidence = Math.min(0.4 + excess * 0.1, 0.95);

    if (confidence < this.config.minConfidence) return null;

    return this.createSignal(
      "sharing",
      "ip_pattern_anomaly",
      subscriptionId,
      userId,
      `${uniqueIps.size} distinct IPs in ${this.config.ipWindowMs / 60000}min window (max: ${this.config.maxDistinctIps})`,
      confidence,
      excess >= 5 ? "high" : "medium",
      {
        uniqueIps: uniqueIps.size,
        max: this.config.maxDistinctIps,
        windowMinutes: this.config.ipWindowMs / 60000,
      },
    );
  }

  /**
   * Check for geographic impossibility between session pairs.
   */
  checkGeographicImpossibility(sessions: SessionRecord[]): GeographicAnomaly[] {
    const anomalies: GeographicAnomaly[] = [];
    const geoSessions = sessions.filter(
      (s) => s.latitude !== undefined && s.longitude !== undefined,
    );

    for (let i = 0; i < geoSessions.length; i++) {
      for (let j = i + 1; j < geoSessions.length; j++) {
        const s1 = geoSessions[i];
        const s2 = geoSessions[j];

        const distance = haversineDistance(
          s1.latitude!,
          s1.longitude!,
          s2.latitude!,
          s2.longitude!,
        );

        // Use the most recent activity time for each session
        const time1 = s1.lastActiveAt;
        const time2 = s2.lastActiveAt;
        const timeDiffMs = Math.abs(time2 - time1);
        const timeDiffMinutes = timeDiffMs / 60000;
        const timeDiffHours = timeDiffMs / 3600000;

        // Skip if time difference is 0 (same timestamp would mean infinite speed)
        if (timeDiffMs === 0 && distance > 0) {
          anomalies.push({
            session1: {
              sessionId: s1.sessionId,
              ip: s1.ipAddress,
              city: s1.city || "Unknown",
              country: s1.country || "Unknown",
              lat: s1.latitude!,
              lng: s1.longitude!,
              time: time1,
            },
            session2: {
              sessionId: s2.sessionId,
              ip: s2.ipAddress,
              city: s2.city || "Unknown",
              country: s2.country || "Unknown",
              lat: s2.latitude!,
              lng: s2.longitude!,
              time: time2,
            },
            distanceKm: distance,
            timeDifferenceMinutes: 0,
            requiredSpeedKmh: Infinity,
            maxPlausibleSpeedKmh: this.config.maxPlausibleSpeedKmh,
            isImpossible: distance > 1, // More than 1km apart at exact same time
          });
          continue;
        }

        if (timeDiffHours === 0) continue;

        const requiredSpeed = distance / timeDiffHours;

        const isImpossible =
          requiredSpeed > this.config.maxPlausibleSpeedKmh && distance > 50;

        anomalies.push({
          session1: {
            sessionId: s1.sessionId,
            ip: s1.ipAddress,
            city: s1.city || "Unknown",
            country: s1.country || "Unknown",
            lat: s1.latitude!,
            lng: s1.longitude!,
            time: time1,
          },
          session2: {
            sessionId: s2.sessionId,
            ip: s2.ipAddress,
            city: s2.city || "Unknown",
            country: s2.country || "Unknown",
            lat: s2.latitude!,
            lng: s2.longitude!,
            time: time2,
          },
          distanceKm: distance,
          timeDifferenceMinutes: timeDiffMinutes,
          requiredSpeedKmh: requiredSpeed,
          maxPlausibleSpeedKmh: this.config.maxPlausibleSpeedKmh,
          isImpossible,
        });
      }
    }

    return anomalies;
  }

  /**
   * Check if a subscription is currently in its grace period for enforcement.
   */
  isInGracePeriod(subscriptionId: string): boolean {
    const firstViolation = this.graceTracker.get(subscriptionId);
    if (!firstViolation) return false;
    return Date.now() - firstViolation < this.config.gracePeriodMs;
  }

  /**
   * Start or continue the grace period for a subscription.
   */
  startGracePeriod(subscriptionId: string): void {
    if (!this.graceTracker.has(subscriptionId)) {
      this.graceTracker.set(subscriptionId, Date.now());
    }
  }

  /**
   * Clear grace period for a subscription.
   */
  clearGracePeriod(subscriptionId: string): void {
    this.graceTracker.delete(subscriptionId);
  }

  /**
   * Get the configuration.
   */
  getConfig(): AntiSharingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(update: Partial<AntiSharingConfig>): void {
    this.config = { ...this.config, ...update };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.sessions.clear();
    this.graceTracker.clear();
    this.signalCounter = 0;
  }

  // ---- Private helpers ----

  private createSignal(
    category: "sharing",
    indicatorType: string,
    subscriptionId: string,
    userId: string,
    description: string,
    confidence: number,
    riskLevel: RiskLevel,
    evidence: Record<string, unknown>,
  ): AbuseSignal {
    this.signalCounter++;
    return {
      id: `sig_sharing_${this.signalCounter}_${Date.now()}`,
      category,
      indicatorType,
      riskLevel,
      confidence,
      description,
      accountId: userId,
      workspaceId: subscriptionId, // subscriptionId used as workspace context
      detectedAt: Date.now(),
      evidence,
      isFalsePositive: false,
    };
  }

  private calculateOverallRisk(signals: AbuseSignal[]): RiskLevel {
    if (signals.length === 0) return "low";

    const hasHigh = signals.some((s) => s.riskLevel === "high");
    const hasCritical = signals.some((s) => s.riskLevel === "critical");
    const mediumCount = signals.filter((s) => s.riskLevel === "medium").length;

    if (hasCritical) return "critical";
    if (hasHigh && signals.length >= 2) return "critical";
    if (hasHigh) return "high";
    if (mediumCount >= 2) return "high";
    if (mediumCount >= 1) return "medium";
    return "low";
  }

  private getRecommendedAction(
    riskLevel: RiskLevel,
    subscriptionId: string,
  ): EnforcementAction {
    // If in grace period, only warn
    if (this.isInGracePeriod(subscriptionId)) {
      return riskLevel === "low" ? "none" : "warn";
    }

    switch (riskLevel) {
      case "low":
        return "none";
      case "medium":
        return "warn";
      case "high":
        return "throttle";
      case "critical":
        return "suspend";
    }
  }
}
