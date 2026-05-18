/**
 * Seat Abuse Controls Module
 *
 * Detects seat-related abuse patterns:
 * - Ghost seats (allocated but inactive)
 * - Seat sharing (same seat used from multiple locations)
 * - Seat hopping (frequent reassignment to dodge limits)
 * - Auto-deprovisioning recommendations
 * - Seat utilization scoring
 *
 * @module @/lib/billing/abuse/seat-abuse
 * @version 1.0.0
 */

import type {
  SeatAssignment,
  SeatReassignment,
  SeatUtilizationScore,
  SeatAbuseAnalysis,
  SeatAbuseConfig,
  DeprovisioningRecommendation,
  AbuseSignal,
  RiskLevel,
  EnforcementAction,
} from "./types";
import { DEFAULT_SEAT_ABUSE_CONFIG } from "./types";

// ============================================================================
// Seat Abuse Detector
// ============================================================================

/**
 * Detects seat abuse patterns including ghost seats, sharing, and hopping.
 */
export class SeatAbuseDetector {
  private config: SeatAbuseConfig;
  /** Seat assignments indexed by subscriptionId */
  private seats = new Map<string, SeatAssignment[]>();
  /** Reassignment history indexed by subscriptionId */
  private reassignments = new Map<string, SeatReassignment[]>();
  private signalCounter = 0;

  constructor(config?: Partial<SeatAbuseConfig>) {
    this.config = { ...DEFAULT_SEAT_ABUSE_CONFIG, ...config };
  }

  /**
   * Register or update a seat assignment.
   */
  registerSeat(seat: SeatAssignment): void {
    const key = seat.subscriptionId;
    const existing = this.seats.get(key) || [];
    const idx = existing.findIndex((s) => s.seatId === seat.seatId);
    if (idx >= 0) {
      existing[idx] = seat;
    } else {
      existing.push(seat);
    }
    this.seats.set(key, existing);
  }

  /**
   * Record a seat reassignment.
   */
  recordReassignment(reassignment: SeatReassignment): void {
    // Find subscription by seat
    let subscriptionId: string | null = null;
    for (const [subId, seats] of this.seats.entries()) {
      if (seats.some((s) => s.seatId === reassignment.seatId)) {
        subscriptionId = subId;
        break;
      }
    }
    if (!subscriptionId) return;

    const existing = this.reassignments.get(subscriptionId) || [];
    existing.push(reassignment);
    this.reassignments.set(subscriptionId, existing);
  }

  /**
   * Get all seats for a subscription.
   */
  getSeats(subscriptionId: string): SeatAssignment[] {
    return this.seats.get(subscriptionId) || [];
  }

  /**
   * Calculate utilization score for a single seat.
   */
  calculateUtilizationScore(seat: SeatAssignment): SeatUtilizationScore {
    const now = Date.now();
    const daysSinceLastActive =
      (now - seat.lastActiveAt) / (24 * 60 * 60 * 1000);
    const totalDaysInWindow = this.config.ghostSeatThresholdDays;
    const assignedDuration = now - seat.assignedAt;
    const assignedDays = assignedDuration / (24 * 60 * 60 * 1000);

    // Calculate active days as a ratio of the window
    // If last active recently, score higher
    let activeDaysInWindow: number;
    if (daysSinceLastActive < 1) {
      activeDaysInWindow = Math.min(assignedDays, totalDaysInWindow);
    } else if (daysSinceLastActive < totalDaysInWindow) {
      activeDaysInWindow = Math.max(totalDaysInWindow - daysSinceLastActive, 0);
    } else {
      activeDaysInWindow = 0;
    }

    // Base score from activity
    let score = (activeDaysInWindow / totalDaysInWindow) * 100;

    // Penalty for many devices (sharing indicator)
    if (seat.devices.length > this.config.maxDevicesPerSeat) {
      score = Math.max(score - 20, 0);
    }

    // Penalty for many IPs
    if (seat.ipAddresses.length > this.config.maxIpsPerSeat) {
      score = Math.max(score - 10, 0);
    }

    // Determine classification
    let classification: "active" | "low_usage" | "ghost" | "shared";
    if (daysSinceLastActive >= this.config.ghostSeatThresholdDays) {
      classification = "ghost";
      score = 0;
    } else if (
      seat.devices.length > this.config.maxDevicesPerSeat ||
      seat.ipAddresses.length > this.config.maxIpsPerSeat
    ) {
      classification = "shared";
    } else if (score < this.config.lowUtilizationThreshold) {
      classification = "low_usage";
    } else {
      classification = "active";
    }

    return {
      seatId: seat.seatId,
      userId: seat.userId,
      subscriptionId: seat.subscriptionId,
      score: Math.round(score),
      daysSinceLastActive: Math.round(daysSinceLastActive),
      activeDaysInWindow: Math.round(activeDaysInWindow),
      totalDaysInWindow,
      deviceCount: seat.devices.length,
      locationCount: seat.locations.length,
      classification,
    };
  }

  /**
   * Detect ghost seats (allocated but inactive for > threshold days).
   */
  detectGhostSeats(subscriptionId: string): SeatUtilizationScore[] {
    const seats = this.seats.get(subscriptionId) || [];
    return seats
      .map((seat) => this.calculateUtilizationScore(seat))
      .filter((score) => score.classification === "ghost");
  }

  /**
   * Detect seat sharing (same seat used from multiple locations/devices).
   */
  detectSeatSharing(subscriptionId: string): SeatUtilizationScore[] {
    const seats = this.seats.get(subscriptionId) || [];
    const now = Date.now();

    return seats
      .filter((seat) => {
        // Check devices within the window
        const recentDeviceCount = seat.devices.length;
        const recentIpCount = seat.ipAddresses.length;
        const recentLocationCount = seat.locations.length;

        return (
          recentDeviceCount > this.config.maxDevicesPerSeat ||
          recentIpCount > this.config.maxIpsPerSeat ||
          recentLocationCount > this.config.maxDevicesPerSeat
        );
      })
      .map((seat) => this.calculateUtilizationScore(seat));
  }

  /**
   * Detect seat hopping (frequent reassignment to circumvent limits).
   */
  detectSeatHopping(subscriptionId: string): string[] {
    const reassignments = this.reassignments.get(subscriptionId) || [];
    const now = Date.now();

    // Group reassignments by seat within the window
    const seatReassignmentCounts = new Map<string, number>();
    for (const r of reassignments) {
      if (now - r.reassignedAt < this.config.reassignmentWindowMs) {
        seatReassignmentCounts.set(
          r.seatId,
          (seatReassignmentCounts.get(r.seatId) || 0) + 1,
        );
      }
    }

    const hoppingSeatIds: string[] = [];
    for (const [seatId, count] of seatReassignmentCounts.entries()) {
      if (count > this.config.maxReassignmentsPerWindow) {
        hoppingSeatIds.push(seatId);
      }
    }

    return hoppingSeatIds;
  }

  /**
   * Generate deprovisioning recommendations for underused seats.
   */
  generateDeprovisioningRecommendations(
    subscriptionId: string,
  ): DeprovisioningRecommendation[] {
    const seats = this.seats.get(subscriptionId) || [];
    const recommendations: DeprovisioningRecommendation[] = [];

    for (const seat of seats) {
      const score = this.calculateUtilizationScore(seat);
      if (
        score.classification === "ghost" ||
        (score.classification === "low_usage" &&
          score.score < this.config.lowUtilizationThreshold)
      ) {
        let reason: string;
        if (score.classification === "ghost") {
          reason = `Seat inactive for ${score.daysSinceLastActive} days (threshold: ${this.config.ghostSeatThresholdDays} days)`;
        } else {
          reason = `Low utilization score: ${score.score}% (threshold: ${this.config.lowUtilizationThreshold}%)`;
        }

        recommendations.push({
          seatId: seat.seatId,
          userId: seat.userId,
          reason,
          daysSinceLastActive: score.daysSinceLastActive,
          utilizationScore: score.score,
          estimatedSavingsPerMonth: this.config.costPerSeatCents,
        });
      }
    }

    return recommendations.sort(
      (a, b) => a.utilizationScore - b.utilizationScore,
    );
  }

  /**
   * Run full seat abuse analysis for a subscription.
   */
  analyze(subscriptionId: string, workspaceId: string): SeatAbuseAnalysis {
    const signals: AbuseSignal[] = [];
    const seats = this.seats.get(subscriptionId) || [];
    const activeSeats = seats.filter((s) => s.isActive);

    // 1. Ghost seat detection
    const ghostSeats = this.detectGhostSeats(subscriptionId);
    if (ghostSeats.length > 0) {
      const ghostRatio = ghostSeats.length / Math.max(seats.length, 1);
      signals.push(
        this.createSignal(
          "ghost_seat",
          subscriptionId,
          workspaceId,
          `${ghostSeats.length} ghost seats detected (${(ghostRatio * 100).toFixed(0)}% of total)`,
          Math.min(0.5 + ghostRatio * 0.5, 1.0),
          ghostRatio > 0.5 ? "medium" : "low",
          { ghostSeats: ghostSeats.map((g) => g.seatId), ghostRatio },
        ),
      );
    }

    // 2. Seat sharing detection
    const sharedSeats = this.detectSeatSharing(subscriptionId);
    if (sharedSeats.length > 0) {
      signals.push(
        this.createSignal(
          "seat_sharing",
          subscriptionId,
          workspaceId,
          `${sharedSeats.length} seats show sharing patterns`,
          Math.min(0.6 + sharedSeats.length * 0.1, 1.0),
          sharedSeats.length >= 3 ? "high" : "medium",
          { sharedSeats: sharedSeats.map((s) => s.seatId) },
        ),
      );
    }

    // 3. Seat hopping detection
    const hoppingSeats = this.detectSeatHopping(subscriptionId);
    if (hoppingSeats.length > 0) {
      signals.push(
        this.createSignal(
          "seat_hopping",
          subscriptionId,
          workspaceId,
          `${hoppingSeats.length} seats with excessive reassignments`,
          0.85,
          "high",
          { hoppingSeats },
        ),
      );
    }

    // Deprovisioning recommendations
    const deprovisioningRecommendations =
      this.generateDeprovisioningRecommendations(subscriptionId);

    // Overall risk assessment
    const overallRisk = this.calculateOverallRisk(signals);
    const recommendedAction = this.getRecommendedAction(overallRisk);

    return {
      subscriptionId,
      workspaceId,
      totalSeats: seats.length,
      activeSeats: activeSeats.length,
      ghostSeats,
      sharedSeats,
      hoppingSeats,
      signals,
      overallRisk,
      recommendedAction,
      deprovisioningRecommendations,
    };
  }

  /**
   * Get the configuration.
   */
  getConfig(): SeatAbuseConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(update: Partial<SeatAbuseConfig>): void {
    this.config = { ...this.config, ...update };
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.seats.clear();
    this.reassignments.clear();
    this.signalCounter = 0;
  }

  // ---- Private helpers ----

  private createSignal(
    indicatorType: string,
    subscriptionId: string,
    workspaceId: string,
    description: string,
    confidence: number,
    riskLevel: RiskLevel,
    evidence: Record<string, unknown>,
  ): AbuseSignal {
    this.signalCounter++;
    return {
      id: `sig_seat_${this.signalCounter}_${Date.now()}`,
      category: "seat_abuse",
      indicatorType,
      riskLevel,
      confidence,
      description,
      accountId: subscriptionId,
      workspaceId,
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

  private getRecommendedAction(riskLevel: RiskLevel): EnforcementAction {
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
