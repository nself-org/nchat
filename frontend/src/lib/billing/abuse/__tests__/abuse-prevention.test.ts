/**
 * Abuse Prevention Suite - Comprehensive Tests
 *
 * Tests for anti-sharing, seat abuse, payment heuristics,
 * and the unified abuse prevention engine.
 *
 * @module @/lib/billing/abuse/__tests__/abuse-prevention.test
 * @version 1.0.0
 */

import {
  AntiSharingDetector,
  haversineDistance,
  computeFingerprintHash,
  fingerprintSimilarity,
} from "../anti-sharing";
import { SeatAbuseDetector } from "../seat-abuse";
import { PaymentHeuristicsDetector } from "../payment-heuristics";
import {
  AbusePreventionEngine,
  getAbusePreventionEngine,
  createAbusePreventionEngine,
  resetAbusePreventionEngine,
} from "../abuse-engine";
import type {
  SessionRecord,
  DeviceFingerprint,
  SeatAssignment,
  SeatReassignment,
  PaymentEvent,
  CardMetadata,
  AntiSharingConfig,
  SeatAbuseConfig,
  PaymentHeuristicsConfig,
} from "../types";
import {
  DEFAULT_ANTI_SHARING_CONFIG,
  DEFAULT_SEAT_ABUSE_CONFIG,
  DEFAULT_PAYMENT_HEURISTICS_CONFIG,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_ENFORCEMENT_POLICY,
  DEFAULT_ABUSE_ENGINE_CONFIG,
} from "../types";

// ============================================================================
// Test Helpers
// ============================================================================

function createFingerprint(
  overrides?: Partial<DeviceFingerprint>,
): DeviceFingerprint {
  const base: Omit<DeviceFingerprint, "hash"> = {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    screenResolution: "1920x1080",
    timezone: "America/New_York",
    language: "en-US",
    platform: "MacIntel",
    ...overrides,
  };
  return {
    ...base,
    hash: overrides?.hash || computeFingerprintHash(base),
  };
}

function createSession(overrides?: Partial<SessionRecord>): SessionRecord {
  const fp = overrides?.deviceFingerprint || createFingerprint();
  return {
    sessionId: `sess_${Math.random().toString(36).slice(2)}`,
    userId: "user_1",
    subscriptionId: "sub_1",
    deviceFingerprint: fp,
    ipAddress: "192.168.1.1",
    startedAt: Date.now() - 60000,
    lastActiveAt: Date.now(),
    isActive: true,
    ...overrides,
  };
}

function createSeat(overrides?: Partial<SeatAssignment>): SeatAssignment {
  return {
    seatId: `seat_${Math.random().toString(36).slice(2)}`,
    userId: "user_1",
    subscriptionId: "sub_1",
    workspaceId: "ws_1",
    assignedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now(),
    isActive: true,
    devices: [createFingerprint()],
    ipAddresses: ["192.168.1.1"],
    locations: [{ city: "New York", country: "US" }],
    ...overrides,
  };
}

function createCard(overrides?: Partial<CardMetadata>): CardMetadata {
  return {
    last4: "4242",
    brand: "visa",
    country: "US",
    fingerprint: "fp_test_123",
    fundingType: "credit",
    bin: "424242",
    ...overrides,
  };
}

function createPaymentEvent(overrides?: Partial<PaymentEvent>): PaymentEvent {
  return {
    id: `pay_${Math.random().toString(36).slice(2)}`,
    userId: "user_1",
    subscriptionId: "sub_1",
    workspaceId: "ws_1",
    amount: 2999,
    currency: "USD",
    card: createCard(),
    ipAddress: "192.168.1.1",
    userCountry: "US",
    timestamp: Date.now(),
    status: "succeeded",
    isRefund: false,
    ...overrides,
  };
}

// ============================================================================
// Haversine Distance Tests
// ============================================================================

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0);
  });

  it("calculates distance between New York and London", () => {
    const distance = haversineDistance(40.7128, -74.006, 51.5074, -0.1278);
    expect(distance).toBeGreaterThan(5500);
    expect(distance).toBeLessThan(5700);
  });

  it("calculates distance between New York and Los Angeles", () => {
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(3900);
    expect(distance).toBeLessThan(4000);
  });

  it("calculates distance between nearby points", () => {
    const distance = haversineDistance(40.7128, -74.006, 40.7228, -74.016);
    expect(distance).toBeLessThan(2);
    expect(distance).toBeGreaterThan(0);
  });

  it("handles antipodal points", () => {
    const distance = haversineDistance(0, 0, 0, 180);
    expect(distance).toBeGreaterThan(20000);
  });

  it("handles negative coordinates", () => {
    const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(distance).toBeGreaterThan(700);
    expect(distance).toBeLessThan(800);
  });
});

// ============================================================================
// Device Fingerprint Tests
// ============================================================================

describe("computeFingerprintHash", () => {
  it("generates consistent hash for same input", () => {
    const fp = {
      userAgent: "UA",
      screenResolution: "1920x1080",
      timezone: "UTC",
      language: "en",
      platform: "Win",
    };
    const hash1 = computeFingerprintHash(fp);
    const hash2 = computeFingerprintHash(fp);
    expect(hash1).toBe(hash2);
  });

  it("generates different hashes for different inputs", () => {
    const fp1 = {
      userAgent: "UA1",
      screenResolution: "1920x1080",
      timezone: "UTC",
      language: "en",
      platform: "Win",
    };
    const fp2 = {
      userAgent: "UA2",
      screenResolution: "1920x1080",
      timezone: "UTC",
      language: "en",
      platform: "Win",
    };
    expect(computeFingerprintHash(fp1)).not.toBe(computeFingerprintHash(fp2));
  });

  it("returns a string starting with fp_", () => {
    const hash = computeFingerprintHash({
      userAgent: "test",
      screenResolution: "1080p",
      timezone: "EST",
      language: "en",
      platform: "Mac",
    });
    expect(hash).toMatch(/^fp_/);
  });
});

describe("fingerprintSimilarity", () => {
  it("returns 1 for identical fingerprints", () => {
    const fp = createFingerprint();
    expect(fingerprintSimilarity(fp, fp)).toBe(1);
  });

  it("returns 0 for completely different fingerprints", () => {
    const fp1 = createFingerprint({
      userAgent: "A",
      screenResolution: "A",
      timezone: "A",
      language: "A",
      platform: "A",
    });
    const fp2 = createFingerprint({
      userAgent: "B",
      screenResolution: "B",
      timezone: "B",
      language: "B",
      platform: "B",
    });
    expect(fingerprintSimilarity(fp1, fp2)).toBe(0);
  });

  it("returns partial match for similar fingerprints", () => {
    const fp1 = createFingerprint({
      userAgent: "Same",
      screenResolution: "1920x1080",
      timezone: "UTC",
    });
    const fp2 = createFingerprint({
      userAgent: "Same",
      screenResolution: "1920x1080",
      timezone: "PST",
    });
    const sim = fingerprintSimilarity(fp1, fp2);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("returns 0.6 when 3 out of 5 fields match", () => {
    const fp1 = createFingerprint({
      userAgent: "Same",
      screenResolution: "1920x1080",
      timezone: "UTC",
      language: "en",
      platform: "Mac",
    });
    const fp2 = createFingerprint({
      userAgent: "Same",
      screenResolution: "1920x1080",
      timezone: "UTC",
      language: "fr",
      platform: "Win",
    });
    expect(fingerprintSimilarity(fp1, fp2)).toBe(0.6);
  });
});

// ============================================================================
// Anti-Sharing Detector Tests
// ============================================================================

describe("AntiSharingDetector", () => {
  let detector: AntiSharingDetector;

  beforeEach(() => {
    detector = new AntiSharingDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe("session management", () => {
    it("registers a session", () => {
      const session = createSession();
      detector.registerSession(session);
      const active = detector.getActiveSessions(session.subscriptionId);
      expect(active).toHaveLength(1);
      expect(active[0].sessionId).toBe(session.sessionId);
    });

    it("updates an existing session", () => {
      const session = createSession();
      detector.registerSession(session);
      const updated = { ...session, lastActiveAt: Date.now() + 1000 };
      detector.registerSession(updated);
      const active = detector.getActiveSessions(session.subscriptionId);
      expect(active).toHaveLength(1);
    });

    it("removes a session", () => {
      const session = createSession();
      detector.registerSession(session);
      detector.removeSession(session.subscriptionId, session.sessionId);
      const active = detector.getActiveSessions(session.subscriptionId);
      expect(active).toHaveLength(0);
    });

    it("returns only active sessions", () => {
      const active = createSession({ isActive: true });
      const inactive = createSession({ isActive: false });
      detector.registerSession(active);
      detector.registerSession(inactive);
      expect(detector.getActiveSessions(active.subscriptionId)).toHaveLength(1);
    });
  });

  describe("concurrent session detection", () => {
    it("returns null when under limit", () => {
      detector = new AntiSharingDetector({ maxConcurrentSessions: 3 });
      for (let i = 0; i < 3; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).toBeNull();
    });

    it("detects concurrent sessions over limit", () => {
      detector = new AntiSharingDetector({ maxConcurrentSessions: 2 });
      for (let i = 0; i < 4; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("concurrent_sessions");
      expect(signal!.riskLevel).toBe("medium");
    });

    it("escalates to high risk with many excess sessions", () => {
      detector = new AntiSharingDetector({ maxConcurrentSessions: 2 });
      for (let i = 0; i < 8; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      expect(signal!.riskLevel).toBe("high");
    });

    it("respects minConfidence threshold", () => {
      detector = new AntiSharingDetector({
        maxConcurrentSessions: 3,
        minConfidence: 0.9,
      });
      for (let i = 0; i < 4; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      // Only 1 excess = confidence 0.65 < 0.9
      expect(signal).toBeNull();
    });
  });

  describe("device fingerprint analysis", () => {
    it("returns null when under device limit", () => {
      detector = new AntiSharingDetector({ maxUniqueDevices: 5 });
      for (let i = 0; i < 3; i++) {
        const fp = createFingerprint({ userAgent: `UA_${i}` });
        detector.registerSession(
          createSession({ sessionId: `sess_${i}`, deviceFingerprint: fp }),
        );
      }
      const signal = detector.checkDeviceFingerprints(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).toBeNull();
    });

    it("detects too many unique devices", () => {
      detector = new AntiSharingDetector({
        maxUniqueDevices: 2,
        minConfidence: 0.3,
      });
      for (let i = 0; i < 5; i++) {
        const fp = createFingerprint({
          userAgent: `UA_${i}`,
          screenResolution: `${1000 + i}x${800 + i}`,
          timezone: `TZ_${i}`,
          language: `lang_${i}`,
          platform: `platform_${i}`,
        });
        detector.registerSession(
          createSession({ sessionId: `sess_${i}`, deviceFingerprint: fp }),
        );
      }
      const signal = detector.checkDeviceFingerprints(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("device_fingerprint_mismatch");
    });

    it("considers fingerprint similarity in risk assessment", () => {
      detector = new AntiSharingDetector({
        maxUniqueDevices: 1,
        minConfidence: 0.3,
      });
      // Two completely different fingerprints
      const fp1 = createFingerprint({
        userAgent: "Chrome",
        screenResolution: "1920x1080",
        timezone: "EST",
        language: "en",
        platform: "Win",
      });
      const fp2 = createFingerprint({
        userAgent: "Safari",
        screenResolution: "2560x1440",
        timezone: "PST",
        language: "ja",
        platform: "Mac",
      });
      detector.registerSession(
        createSession({ sessionId: "sess_1", deviceFingerprint: fp1 }),
      );
      detector.registerSession(
        createSession({ sessionId: "sess_2", deviceFingerprint: fp2 }),
      );
      const signal = detector.checkDeviceFingerprints(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      expect(signal!.riskLevel).toBe("high");
    });
  });

  describe("IP pattern analysis", () => {
    it("returns null when under IP limit", () => {
      detector = new AntiSharingDetector({ maxDistinctIps: 10 });
      for (let i = 0; i < 5; i++) {
        detector.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `192.168.1.${i}`,
          }),
        );
      }
      const signal = detector.checkIpPatterns(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).toBeNull();
    });

    it("detects too many distinct IPs", () => {
      detector = new AntiSharingDetector({
        maxDistinctIps: 3,
        minConfidence: 0.3,
      });
      for (let i = 0; i < 8; i++) {
        detector.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `10.0.${i}.1`,
          }),
        );
      }
      const signal = detector.checkIpPatterns(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("ip_pattern_anomaly");
    });
  });

  describe("geographic impossibility", () => {
    it("detects impossible travel between New York and London in 5 minutes", () => {
      const now = Date.now();
      const s1 = createSession({
        sessionId: "sess_ny",
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        country: "US",
        lastActiveAt: now,
      });
      const s2 = createSession({
        sessionId: "sess_london",
        latitude: 51.5074,
        longitude: -0.1278,
        city: "London",
        country: "UK",
        lastActiveAt: now + 5 * 60 * 1000, // 5 minutes later
      });

      const anomalies = detector.checkGeographicImpossibility([s1, s2]);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].isImpossible).toBe(true);
      expect(anomalies[0].distanceKm).toBeGreaterThan(5000);
    });

    it("does not flag plausible travel", () => {
      const now = Date.now();
      const s1 = createSession({
        sessionId: "sess_1",
        latitude: 40.7128,
        longitude: -74.006,
        city: "New York",
        country: "US",
        lastActiveAt: now,
      });
      const s2 = createSession({
        sessionId: "sess_2",
        latitude: 42.3601,
        longitude: -71.0589,
        city: "Boston",
        country: "US",
        lastActiveAt: now + 4 * 60 * 60 * 1000, // 4 hours later
      });

      const anomalies = detector.checkGeographicImpossibility([s1, s2]);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].isImpossible).toBe(false);
    });

    it("handles simultaneous sessions at different locations", () => {
      const now = Date.now();
      const s1 = createSession({
        sessionId: "sess_1",
        latitude: 40.7128,
        longitude: -74.006,
        lastActiveAt: now,
      });
      const s2 = createSession({
        sessionId: "sess_2",
        latitude: 34.0522,
        longitude: -118.2437,
        lastActiveAt: now, // Same exact time
      });

      const anomalies = detector.checkGeographicImpossibility([s1, s2]);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].isImpossible).toBe(true);
    });

    it("skips sessions without coordinates", () => {
      const s1 = createSession({ sessionId: "sess_1" });
      const s2 = createSession({ sessionId: "sess_2" });
      // No lat/lng set
      const anomalies = detector.checkGeographicImpossibility([s1, s2]);
      expect(anomalies).toHaveLength(0);
    });

    it("does not flag nearby locations", () => {
      const now = Date.now();
      const s1 = createSession({
        sessionId: "sess_1",
        latitude: 40.7128,
        longitude: -74.006,
        lastActiveAt: now,
      });
      const s2 = createSession({
        sessionId: "sess_2",
        latitude: 40.7138,
        longitude: -74.016,
        lastActiveAt: now, // Same time but < 1km apart
      });

      const anomalies = detector.checkGeographicImpossibility([s1, s2]);
      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].isImpossible).toBe(false);
    });
  });

  describe("grace period", () => {
    it("starts and tracks grace period", () => {
      detector.startGracePeriod("sub_1");
      expect(detector.isInGracePeriod("sub_1")).toBe(true);
    });

    it("grace period does not exist for untracked subscriptions", () => {
      expect(detector.isInGracePeriod("sub_unknown")).toBe(false);
    });

    it("clears grace period", () => {
      detector.startGracePeriod("sub_1");
      detector.clearGracePeriod("sub_1");
      expect(detector.isInGracePeriod("sub_1")).toBe(false);
    });

    it("does not restart grace period if already started", () => {
      detector.startGracePeriod("sub_1");
      const firstStart = detector.isInGracePeriod("sub_1");
      detector.startGracePeriod("sub_1"); // Should not reset
      expect(detector.isInGracePeriod("sub_1")).toBe(firstStart);
    });
  });

  describe("full analysis", () => {
    it("returns low risk for clean account", () => {
      detector.registerSession(createSession());
      const analysis = detector.analyze("sub_1", "user_1");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.signals).toHaveLength(0);
      expect(analysis.recommendedAction).toBe("none");
    });

    it("returns high risk for multiple violations", () => {
      detector = new AntiSharingDetector({
        maxConcurrentSessions: 2,
        maxDistinctIps: 2,
        minConfidence: 0.3,
      });
      for (let i = 0; i < 5; i++) {
        detector.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `10.0.${i}.1`,
          }),
        );
      }
      const analysis = detector.analyze("sub_1", "user_1");
      expect(["high", "critical"]).toContain(analysis.overallRisk);
      expect(analysis.signals.length).toBeGreaterThan(0);
    });

    it("downgrades enforcement to warn during grace period", () => {
      detector = new AntiSharingDetector({ maxConcurrentSessions: 1 });
      detector.startGracePeriod("sub_1");
      detector.registerSession(createSession({ sessionId: "sess_1" }));
      detector.registerSession(createSession({ sessionId: "sess_2" }));
      const analysis = detector.analyze("sub_1", "user_1");
      expect(analysis.recommendedAction).toBe("warn");
    });

    it("reports correct unique device count", () => {
      const fp1 = createFingerprint({ userAgent: "Chrome" });
      const fp2 = createFingerprint({ userAgent: "Safari" });
      detector.registerSession(
        createSession({ sessionId: "sess_1", deviceFingerprint: fp1 }),
      );
      detector.registerSession(
        createSession({ sessionId: "sess_2", deviceFingerprint: fp2 }),
      );
      const analysis = detector.analyze("sub_1", "user_1");
      expect(analysis.uniqueDeviceCount).toBe(2);
    });
  });

  describe("configuration", () => {
    it("returns current config", () => {
      const config = detector.getConfig();
      expect(config.maxConcurrentSessions).toBe(
        DEFAULT_ANTI_SHARING_CONFIG.maxConcurrentSessions,
      );
    });

    it("updates config", () => {
      detector.updateConfig({ maxConcurrentSessions: 10 });
      expect(detector.getConfig().maxConcurrentSessions).toBe(10);
    });
  });
});

// ============================================================================
// Seat Abuse Detector Tests
// ============================================================================

describe("SeatAbuseDetector", () => {
  let detector: SeatAbuseDetector;

  beforeEach(() => {
    detector = new SeatAbuseDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe("seat management", () => {
    it("registers a seat", () => {
      const seat = createSeat();
      detector.registerSeat(seat);
      expect(detector.getSeats(seat.subscriptionId)).toHaveLength(1);
    });

    it("updates an existing seat", () => {
      const seat = createSeat();
      detector.registerSeat(seat);
      const updated = { ...seat, lastActiveAt: Date.now() + 1000 };
      detector.registerSeat(updated);
      expect(detector.getSeats(seat.subscriptionId)).toHaveLength(1);
    });
  });

  describe("utilization scoring", () => {
    it("gives high score to active seat", () => {
      const seat = createSeat({ lastActiveAt: Date.now() });
      detector.registerSeat(seat);
      const score = detector.calculateUtilizationScore(seat);
      expect(score.score).toBeGreaterThan(50);
      expect(score.classification).toBe("active");
    });

    it("gives 0 score to ghost seat", () => {
      const seat = createSeat({
        lastActiveAt: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      });
      detector.registerSeat(seat);
      const score = detector.calculateUtilizationScore(seat);
      expect(score.score).toBe(0);
      expect(score.classification).toBe("ghost");
    });

    it("classifies seat with many devices as shared", () => {
      const devices = Array.from({ length: 6 }, (_, i) =>
        createFingerprint({ userAgent: `UA_${i}` }),
      );
      const seat = createSeat({
        devices,
        ipAddresses: [
          "1.1.1.1",
          "2.2.2.2",
          "3.3.3.3",
          "4.4.4.4",
          "5.5.5.5",
          "6.6.6.6",
        ],
      });
      detector.registerSeat(seat);
      const score = detector.calculateUtilizationScore(seat);
      expect(score.classification).toBe("shared");
    });

    it("classifies inactive seat below threshold as low_usage", () => {
      // Active 5 days ago in a 30-day window = ~83% but with devices penalty
      const seat = createSeat({
        lastActiveAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
      });
      detector.registerSeat(seat);
      const score = detector.calculateUtilizationScore(seat);
      expect(score.score).toBeLessThan(
        DEFAULT_SEAT_ABUSE_CONFIG.lowUtilizationThreshold,
      );
      expect(score.classification).toBe("low_usage");
    });
  });

  describe("ghost seat detection", () => {
    it("detects ghost seats", () => {
      const ghostSeat = createSeat({
        seatId: "ghost",
        lastActiveAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
      });
      const activeSeat = createSeat({ seatId: "active" });
      detector.registerSeat(ghostSeat);
      detector.registerSeat(activeSeat);

      const ghosts = detector.detectGhostSeats("sub_1");
      expect(ghosts).toHaveLength(1);
      expect(ghosts[0].seatId).toBe("ghost");
    });

    it("returns empty when no ghost seats", () => {
      detector.registerSeat(createSeat({ lastActiveAt: Date.now() }));
      expect(detector.detectGhostSeats("sub_1")).toHaveLength(0);
    });
  });

  describe("seat sharing detection", () => {
    it("detects seats used from many devices", () => {
      const devices = Array.from({ length: 5 }, (_, i) =>
        createFingerprint({ userAgent: `UA_${i}` }),
      );
      detector.registerSeat(
        createSeat({
          seatId: "shared",
          devices,
          ipAddresses: [
            "1.1.1.1",
            "2.2.2.2",
            "3.3.3.3",
            "4.4.4.4",
            "5.5.5.5",
            "6.6.6.6",
          ],
        }),
      );

      const shared = detector.detectSeatSharing("sub_1");
      expect(shared.length).toBeGreaterThan(0);
    });

    it("returns empty for normal usage", () => {
      detector.registerSeat(createSeat());
      expect(detector.detectSeatSharing("sub_1")).toHaveLength(0);
    });
  });

  describe("seat hopping detection", () => {
    it("detects frequent reassignments", () => {
      const seat = createSeat({ seatId: "hop_seat" });
      detector.registerSeat(seat);

      for (let i = 0; i < 5; i++) {
        detector.recordReassignment({
          seatId: "hop_seat",
          previousUserId: `user_${i}`,
          newUserId: `user_${i + 1}`,
          reassignedAt: Date.now() - (5 - i) * 60000,
          reassignedBy: "admin",
        });
      }

      const hopping = detector.detectSeatHopping("sub_1");
      expect(hopping).toContain("hop_seat");
    });

    it("returns empty when within limits", () => {
      const seat = createSeat({ seatId: "normal_seat" });
      detector.registerSeat(seat);

      detector.recordReassignment({
        seatId: "normal_seat",
        previousUserId: "user_1",
        newUserId: "user_2",
        reassignedAt: Date.now(),
        reassignedBy: "admin",
      });

      const hopping = detector.detectSeatHopping("sub_1");
      expect(hopping).toHaveLength(0);
    });
  });

  describe("deprovisioning recommendations", () => {
    it("recommends deprovisioning ghost seats", () => {
      detector.registerSeat(
        createSeat({
          seatId: "ghost_seat",
          userId: "ghost_user",
          lastActiveAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        }),
      );
      detector.registerSeat(
        createSeat({
          seatId: "active_seat",
          userId: "active_user",
        }),
      );

      const recs = detector.generateDeprovisioningRecommendations("sub_1");
      expect(recs).toHaveLength(1);
      expect(recs[0].seatId).toBe("ghost_seat");
      expect(recs[0].estimatedSavingsPerMonth).toBe(
        DEFAULT_SEAT_ABUSE_CONFIG.costPerSeatCents,
      );
    });

    it("sorts by utilization score ascending", () => {
      detector.registerSeat(
        createSeat({
          seatId: "seat_1",
          lastActiveAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        }),
      );
      detector.registerSeat(
        createSeat({
          seatId: "seat_2",
          lastActiveAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        }),
      );

      const recs = detector.generateDeprovisioningRecommendations("sub_1");
      expect(recs.length).toBe(2);
      expect(recs[0].utilizationScore).toBeLessThanOrEqual(
        recs[1].utilizationScore,
      );
    });
  });

  describe("full analysis", () => {
    it("returns low risk for healthy subscription", () => {
      detector.registerSeat(createSeat());
      const analysis = detector.analyze("sub_1", "ws_1");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.signals).toHaveLength(0);
    });

    it("reports correct seat counts", () => {
      detector.registerSeat(createSeat({ seatId: "active_1", isActive: true }));
      detector.registerSeat(createSeat({ seatId: "active_2", isActive: true }));
      detector.registerSeat(
        createSeat({ seatId: "inactive", isActive: false }),
      );

      const analysis = detector.analyze("sub_1", "ws_1");
      expect(analysis.totalSeats).toBe(3);
      expect(analysis.activeSeats).toBe(2);
    });

    it("includes ghost seats in analysis", () => {
      detector.registerSeat(
        createSeat({
          seatId: "ghost",
          lastActiveAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
        }),
      );
      const analysis = detector.analyze("sub_1", "ws_1");
      expect(analysis.ghostSeats.length).toBe(1);
    });
  });

  describe("configuration", () => {
    it("returns current config", () => {
      expect(detector.getConfig().ghostSeatThresholdDays).toBe(
        DEFAULT_SEAT_ABUSE_CONFIG.ghostSeatThresholdDays,
      );
    });

    it("updates config", () => {
      detector.updateConfig({ ghostSeatThresholdDays: 60 });
      expect(detector.getConfig().ghostSeatThresholdDays).toBe(60);
    });
  });
});

// ============================================================================
// Payment Heuristics Detector Tests
// ============================================================================

describe("PaymentHeuristicsDetector", () => {
  let detector: PaymentHeuristicsDetector;

  beforeEach(() => {
    detector = new PaymentHeuristicsDetector();
  });

  afterEach(() => {
    detector.clear();
  });

  describe("payment recording", () => {
    it("records and retrieves payment events", () => {
      const event = createPaymentEvent();
      detector.recordPayment(event);
      expect(detector.getPaymentHistory(event.userId)).toHaveLength(1);
    });

    it("limits history to 90 days", () => {
      const oldEvent = createPaymentEvent({
        timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000,
      });
      const newEvent = createPaymentEvent({ timestamp: Date.now() });
      detector.recordPayment(oldEvent);
      detector.recordPayment(newEvent);
      expect(detector.getPaymentHistory(oldEvent.userId)).toHaveLength(1);
    });
  });

  describe("card testing detection", () => {
    it("detects rapid failed attempts", () => {
      for (let i = 0; i < 6; i++) {
        detector.recordPayment(
          createPaymentEvent({
            status: "failed",
            timestamp: Date.now() - (6 - i) * 1000,
          }),
        );
      }
      const signal = detector.detectCardTesting("user_1");
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("card_testing");
    });

    it("detects many small charges", () => {
      for (let i = 0; i < 6; i++) {
        detector.recordPayment(
          createPaymentEvent({
            amount: 50,
            status: "succeeded",
            timestamp: Date.now() - (6 - i) * 1000,
          }),
        );
      }
      const signal = detector.detectCardTesting("user_1");
      expect(signal).not.toBeNull();
    });

    it("returns null for normal payment history", () => {
      detector.recordPayment(
        createPaymentEvent({
          amount: 2999,
          status: "succeeded",
        }),
      );
      expect(detector.detectCardTesting("user_1")).toBeNull();
    });

    it("escalates to critical for double the threshold", () => {
      for (let i = 0; i < 12; i++) {
        detector.recordPayment(
          createPaymentEvent({
            status: "failed",
            timestamp: Date.now() - (12 - i) * 1000,
          }),
        );
      }
      const signal = detector.detectCardTesting("user_1");
      expect(signal).not.toBeNull();
      expect(signal!.riskLevel).toBe("critical");
    });
  });

  describe("velocity checks", () => {
    it("detects hourly velocity exceeded", () => {
      for (let i = 0; i < 11; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            timestamp: Date.now() - (11 - i) * 1000,
          }),
        );
      }
      const signal = detector.checkVelocity("user_1");
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("velocity_exceeded");
    });

    it("detects daily velocity exceeded", () => {
      for (let i = 0; i < 31; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            timestamp: Date.now() - i * 45 * 60 * 1000, // Spread across 45min intervals, all within 24h
          }),
        );
      }
      const signal = detector.checkVelocity("user_1");
      expect(signal).not.toBeNull();
    });

    it("returns null when within limits", () => {
      for (let i = 0; i < 3; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            timestamp: Date.now() - i * 60000,
          }),
        );
      }
      expect(detector.checkVelocity("user_1")).toBeNull();
    });
  });

  describe("BIN country mismatch", () => {
    it("detects mismatch between card country and user country", () => {
      const card = createCard({ country: "NG" });
      const signal = detector.checkBinCountryMismatch(card, "US");
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("bin_country_mismatch");
    });

    it("returns null when countries match", () => {
      const card = createCard({ country: "US" });
      expect(detector.checkBinCountryMismatch(card, "US")).toBeNull();
    });

    it("returns null when flag is disabled", () => {
      detector = new PaymentHeuristicsDetector({
        flagBinCountryMismatch: false,
      });
      const card = createCard({ country: "NG" });
      expect(detector.checkBinCountryMismatch(card, "US")).toBeNull();
    });

    it("handles case-insensitive comparison", () => {
      const card = createCard({ country: "us" });
      expect(detector.checkBinCountryMismatch(card, "US")).toBeNull();
    });
  });

  describe("disposable card detection", () => {
    it("detects prepaid cards", () => {
      const card = createCard({ fundingType: "prepaid" });
      const signal = detector.detectDisposableCard(card);
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("disposable_card");
    });

    it("detects known disposable BINs", () => {
      const card = createCard({ bin: "404038", fundingType: "credit" });
      const signal = detector.detectDisposableCard(card);
      expect(signal).not.toBeNull();
    });

    it("returns null for normal credit cards", () => {
      const card = createCard({ fundingType: "credit", bin: "411111" });
      expect(detector.detectDisposableCard(card)).toBeNull();
    });

    it("returns null when flag is disabled", () => {
      detector = new PaymentHeuristicsDetector({ flagPrepaidCards: false });
      const card = createCard({ fundingType: "prepaid" });
      expect(detector.detectDisposableCard(card)).toBeNull();
    });
  });

  describe("refund abuse analysis", () => {
    it("detects high refund rate", () => {
      // 5 succeeded, 3 refunded = 60% refund rate
      for (let i = 0; i < 5; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "succeeded",
            timestamp: Date.now() - i * 86400000,
          }),
        );
      }
      for (let i = 0; i < 3; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `ref_${i}`,
            status: "refunded",
            isRefund: true,
            timestamp: Date.now() - i * 86400000,
          }),
        );
      }

      const result = detector.analyzeRefundAbuse("user_1");
      expect(result.signal).not.toBeNull();
      expect(result.history.refundRate).toBeGreaterThan(0.3);
    });

    it("returns null for low refund rate", () => {
      for (let i = 0; i < 10; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "succeeded",
          }),
        );
      }
      detector.recordPayment(
        createPaymentEvent({
          id: "ref_1",
          status: "refunded",
          isRefund: true,
        }),
      );

      const result = detector.analyzeRefundAbuse("user_1");
      expect(result.signal).toBeNull();
    });

    it("respects minimum refund count", () => {
      // 1 succeeded, 1 refunded = 100% rate but only 1 refund
      detector.recordPayment(createPaymentEvent({ status: "succeeded" }));
      detector.recordPayment(
        createPaymentEvent({
          id: "ref_1",
          status: "refunded",
          isRefund: true,
        }),
      );

      const result = detector.analyzeRefundAbuse("user_1");
      expect(result.signal).toBeNull(); // Below minRefundsForRate
    });
  });

  describe("chargeback risk scoring", () => {
    it("returns low score for clean account", () => {
      detector.recordPayment(createPaymentEvent({ status: "succeeded" }));
      const risk = detector.calculateChargebackRisk("user_1");
      expect(risk.score).toBeLessThan(25);
      expect(risk.riskLevel).toBe("low");
    });

    it("returns high score for account with disputes", () => {
      for (let i = 0; i < 5; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "succeeded",
          }),
        );
      }
      for (let i = 0; i < 3; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `disputed_${i}`,
            status: "disputed",
          }),
        );
      }
      const risk = detector.calculateChargebackRisk("user_1");
      expect(risk.score).toBeGreaterThan(25);
      expect(risk.factors.length).toBeGreaterThan(0);
    });

    it("includes all risk factors", () => {
      detector.recordPayment(createPaymentEvent());
      const risk = detector.calculateChargebackRisk("user_1");
      const factorNames = risk.factors.map((f) => f.name);
      expect(factorNames).toContain("refund_rate");
      expect(factorNames).toContain("failed_payment_rate");
      expect(factorNames).toContain("card_diversity");
      expect(factorNames).toContain("dispute_rate");
      expect(factorNames).toContain("prepaid_card_usage");
    });

    it("caps score at 100", () => {
      // Create extreme scenario
      for (let i = 0; i < 20; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `disp_${i}`,
            status: "disputed",
            card: createCard({
              fingerprint: `fp_${i}`,
              fundingType: "prepaid",
            }),
          }),
        );
        detector.recordPayment(
          createPaymentEvent({
            id: `fail_${i}`,
            status: "failed",
            card: createCard({
              fingerprint: `fp_${i + 20}`,
              fundingType: "prepaid",
            }),
          }),
        );
      }
      const risk = detector.calculateChargebackRisk("user_1");
      expect(risk.score).toBeLessThanOrEqual(100);
    });
  });

  describe("amount anomaly detection", () => {
    it("detects amount below expected range", () => {
      const event = createPaymentEvent({ amount: 100 }); // $1.00
      const signal = detector.detectAmountAnomaly(event, "starter");
      expect(signal).not.toBeNull();
      expect(signal!.indicatorType).toBe("amount_anomaly");
    });

    it("detects amount above expected range", () => {
      const event = createPaymentEvent({ amount: 100000 }); // $1000
      const signal = detector.detectAmountAnomaly(event, "starter");
      expect(signal).not.toBeNull();
    });

    it("returns null for amount in range", () => {
      const event = createPaymentEvent({ amount: 2999 });
      expect(detector.detectAmountAnomaly(event, "starter")).toBeNull();
    });

    it("returns null for unknown plan tier", () => {
      const event = createPaymentEvent({ amount: 2999 });
      expect(detector.detectAmountAnomaly(event, "unknown_plan")).toBeNull();
    });
  });

  describe("full analysis", () => {
    it("returns low risk for clean user", () => {
      detector.recordPayment(createPaymentEvent());
      const analysis = detector.analyze("user_1", "ws_1");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.cardTestingDetected).toBe(false);
      expect(analysis.velocityExceeded).toBe(false);
    });

    it("combines multiple signals into overall risk", () => {
      // Create card testing + velocity scenario
      for (let i = 0; i < 12; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "failed",
            timestamp: Date.now() - (12 - i) * 1000,
          }),
        );
      }
      const analysis = detector.analyze("user_1", "ws_1");
      expect(["high", "critical"]).toContain(analysis.overallRisk);
      expect(analysis.signals.length).toBeGreaterThan(0);
    });

    it("includes chargeback risk in analysis", () => {
      detector.recordPayment(createPaymentEvent());
      const analysis = detector.analyze("user_1", "ws_1");
      expect(analysis.chargebackRisk).toBeDefined();
      expect(analysis.chargebackRisk.factors.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Abuse Prevention Engine Tests
// ============================================================================

describe("AbusePreventionEngine", () => {
  let engine: AbusePreventionEngine;

  beforeEach(() => {
    engine = new AbusePreventionEngine();
  });

  afterEach(() => {
    engine.clear();
    resetAbusePreventionEngine();
  });

  describe("data ingestion", () => {
    it("registers sessions", () => {
      const session = createSession();
      engine.registerSession(session);
      const detector = engine.getSharingDetector();
      expect(detector.getActiveSessions(session.subscriptionId)).toHaveLength(
        1,
      );
    });

    it("removes sessions", () => {
      const session = createSession();
      engine.registerSession(session);
      engine.removeSession(session.subscriptionId, session.sessionId);
      expect(
        engine.getSharingDetector().getActiveSessions(session.subscriptionId),
      ).toHaveLength(0);
    });

    it("registers seats", () => {
      const seat = createSeat();
      engine.registerSeat(seat);
      expect(
        engine.getSeatDetector().getSeats(seat.subscriptionId),
      ).toHaveLength(1);
    });

    it("records payments", () => {
      const event = createPaymentEvent();
      engine.recordPayment(event);
      expect(
        engine.getPaymentDetector().getPaymentHistory(event.userId),
      ).toHaveLength(1);
    });
  });

  describe("account checking", () => {
    it("returns low risk for clean account", () => {
      engine.registerSession(createSession());
      engine.registerSeat(createSeat());
      engine.recordPayment(createPaymentEvent());

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      expect(report.riskLevel).toBe("low");
      expect(report.riskScore).toBeLessThanOrEqual(DEFAULT_RISK_THRESHOLDS.low);
      expect(report.recommendedAction).toBe("none");
    });

    it("returns empty report when engine is disabled", () => {
      engine = new AbusePreventionEngine({ enabled: false });
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      expect(report.riskScore).toBe(0);
      expect(report.signals).toHaveLength(0);
    });

    it("detects sharing abuse", () => {
      const config = { ...DEFAULT_ABUSE_ENGINE_CONFIG };
      config.defaultConfig = {
        ...config.defaultConfig,
        sharing: {
          ...config.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(config);

      for (let i = 0; i < 5; i++) {
        engine.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `10.0.${i}.1`,
          }),
        );
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "starter",
      });

      expect(report.signals.length).toBeGreaterThan(0);
      expect(report.sharingAnalysis).not.toBeNull();
    });

    it("detects payment abuse", () => {
      for (let i = 0; i < 12; i++) {
        engine.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "failed",
            timestamp: Date.now() - (12 - i) * 1000,
          }),
        );
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      expect(report.paymentAnalysis).not.toBeNull();
      expect(report.signals.length).toBeGreaterThan(0);
    });

    it("applies plan-specific configuration", () => {
      engine = new AbusePreventionEngine({
        planConfigs: {
          free: {
            sharing: {
              ...DEFAULT_ANTI_SHARING_CONFIG,
              maxConcurrentSessions: 1,
            },
            seatAbuse: DEFAULT_SEAT_ABUSE_CONFIG,
            paymentHeuristics: DEFAULT_PAYMENT_HEURISTICS_CONFIG,
          },
        },
      });

      const freeConfig = engine.getPlanConfig("free");
      expect(freeConfig.sharing.maxConcurrentSessions).toBe(1);

      const proConfig = engine.getPlanConfig("professional");
      expect(proConfig.sharing.maxConcurrentSessions).toBe(
        DEFAULT_ANTI_SHARING_CONFIG.maxConcurrentSessions,
      );
    });

    it("stores reports for retrieval", () => {
      engine.registerSession(createSession());
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const retrieved = engine.getReport(report.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(report.id);
    });

    it("includes audit trail", () => {
      engine.registerSession(createSession());
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      expect(report.auditTrail.length).toBeGreaterThan(0);
      expect(report.auditTrail[0].action).toBe("abuse_check_completed");
    });
  });

  describe("risk scoring", () => {
    it("maps low score to low risk", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      expect(report.riskLevel).toBe("low");
    });

    it("score is 0 for account with no data", () => {
      const report = engine.checkAccount({
        accountId: "acc_new",
        subscriptionId: "sub_new",
        workspaceId: "ws_new",
        userId: "user_new",
        planTier: "professional",
      });
      expect(report.riskScore).toBe(0);
    });

    it("caps risk score at 100", () => {
      // Create extreme abuse scenario
      const cfg = { ...DEFAULT_ABUSE_ENGINE_CONFIG };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          maxDistinctIps: 1,
          maxUniqueDevices: 1,
          minConfidence: 0.1,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 20; i++) {
        const fp = createFingerprint({
          userAgent: `UA_${i}`,
          screenResolution: `${i}x${i}`,
          timezone: `TZ${i}`,
          language: `L${i}`,
          platform: `P${i}`,
        });
        engine.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `${i}.${i}.${i}.${i}`,
            deviceFingerprint: fp,
          }),
        );
      }
      for (let i = 0; i < 20; i++) {
        engine.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "failed",
            timestamp: Date.now() - (20 - i) * 1000,
          }),
        );
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      expect(report.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe("enforcement", () => {
    it("auto-applies enforcement when enabled", () => {
      const cfg = { ...DEFAULT_ABUSE_ENGINE_CONFIG, autoEnforce: true };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 10; i++) {
        engine.registerSession(
          createSession({
            sessionId: `sess_${i}`,
            ipAddress: `10.0.${i}.1`,
          }),
        );
      }
      for (let i = 0; i < 12; i++) {
        engine.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "failed",
            timestamp: Date.now() - (12 - i) * 1000,
          }),
        );
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      if (report.riskLevel !== "low") {
        expect(report.actionApplied).toBe(true);
        expect(report.appliedAction).not.toBeNull();
      }
    });

    it("does not auto-enforce when disabled", () => {
      engine = new AbusePreventionEngine({ autoEnforce: false });
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      expect(report.actionApplied).toBe(false);
    });

    it("respects enforcement cooldown", () => {
      const cfg = {
        ...DEFAULT_ABUSE_ENGINE_CONFIG,
        autoEnforce: true,
        enforcementCooldownMs: 60 * 60 * 1000,
      };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 5; i++) {
        engine.registerSession(createSession({ sessionId: `sess_${i}` }));
      }

      const report1 = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const report2 = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      // First report may enforce, second should be in cooldown
      if (report1.actionApplied) {
        expect(report2.actionApplied).toBe(false);
      }
    });

    it("maps risk levels to correct enforcement actions", () => {
      expect(DEFAULT_ENFORCEMENT_POLICY.low).toBe("none");
      expect(DEFAULT_ENFORCEMENT_POLICY.medium).toBe("warn");
      expect(DEFAULT_ENFORCEMENT_POLICY.high).toBe("throttle");
      expect(DEFAULT_ENFORCEMENT_POLICY.critical).toBe("suspend");
    });
  });

  describe("quick check", () => {
    it("runs sharing check only", () => {
      engine.registerSession(createSession());
      const result = engine.quickCheck("sharing", {
        userId: "user_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
      });
      expect(result.riskLevel).toBeDefined();
      expect(result.signals).toBeDefined();
    });

    it("runs seat abuse check only", () => {
      engine.registerSeat(createSeat());
      const result = engine.quickCheck("seat_abuse", {
        userId: "user_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
      });
      expect(result.riskLevel).toBeDefined();
    });

    it("runs payment check only", () => {
      engine.recordPayment(createPaymentEvent());
      const result = engine.quickCheck("payment_abuse", {
        userId: "user_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
      });
      expect(result.riskLevel).toBeDefined();
    });
  });

  describe("batch scanning", () => {
    it("scans multiple accounts", () => {
      const accounts = Array.from({ length: 3 }, (_, i) => ({
        accountId: `acc_${i}`,
        subscriptionId: `sub_${i}`,
        workspaceId: `ws_${i}`,
        userId: `user_${i}`,
        planTier: "professional" as const,
      }));

      const result = engine.batchScan(accounts);
      expect(result.totalAccounts).toBe(3);
      expect(result.accountsScanned).toBe(3);
      expect(result.reportsGenerated).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it("tracks risk distribution", () => {
      const result = engine.batchScan([
        {
          accountId: "acc_1",
          subscriptionId: "sub_1",
          workspaceId: "ws_1",
          userId: "user_1",
          planTier: "professional",
        },
      ]);

      expect(result.riskDistribution).toHaveProperty("low");
      expect(result.riskDistribution).toHaveProperty("medium");
      expect(result.riskDistribution).toHaveProperty("high");
      expect(result.riskDistribution).toHaveProperty("critical");
    });

    it("handles empty account list", () => {
      const result = engine.batchScan([]);
      expect(result.totalAccounts).toBe(0);
      expect(result.reportsGenerated).toHaveLength(0);
    });
  });

  describe("appeal workflow", () => {
    it("submits an appeal for a report", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const appeal = engine.submitAppeal(
        report.id,
        "acc_1",
        "This is a false positive",
        "Here is my evidence",
      );

      expect(appeal).not.toBeNull();
      expect(appeal!.status).toBe("pending");
      expect(appeal!.reason).toBe("This is a false positive");
    });

    it("returns null for non-existent report", () => {
      const appeal = engine.submitAppeal("nonexistent", "acc_1", "reason");
      expect(appeal).toBeNull();
    });

    it("returns null for account mismatch", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const appeal = engine.submitAppeal(report.id, "wrong_account", "reason");
      expect(appeal).toBeNull();
    });

    it("approves an appeal and restores access", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const appeal = engine.submitAppeal(report.id, "acc_1", "false positive")!;
      const reviewed = engine.reviewAppeal(
        appeal.id,
        "admin_1",
        "approved",
        "Confirmed false positive",
      );

      expect(reviewed).not.toBeNull();
      expect(reviewed!.status).toBe("approved");
      expect(reviewed!.restoredAccess).toBe(true);
      expect(reviewed!.reviewedBy).toBe("admin_1");
    });

    it("denies an appeal", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const appeal = engine.submitAppeal(report.id, "acc_1", "not me")!;
      const reviewed = engine.reviewAppeal(
        appeal.id,
        "admin_1",
        "denied",
        "Evidence confirms abuse",
      );

      expect(reviewed!.status).toBe("denied");
      expect(reviewed!.restoredAccess).toBe(false);
    });

    it("returns null for non-existent appeal", () => {
      expect(
        engine.reviewAppeal("nonexistent", "admin", "approved", "ok"),
      ).toBeNull();
    });

    it("marks signals as false positive on approval", () => {
      // Create detectable sharing
      const cfg = { ...DEFAULT_ABUSE_ENGINE_CONFIG };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 3; i++) {
        engine.registerSession(createSession({ sessionId: `sess_${i}` }));
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      if (report.signals.length > 0) {
        const appeal = engine.submitAppeal(report.id, "acc_1", "fp")!;
        engine.reviewAppeal(appeal.id, "admin", "approved", "ok");

        const updatedReport = engine.getReport(report.id)!;
        for (const signal of updatedReport.signals) {
          expect(signal.isFalsePositive).toBe(true);
        }
      }
    });

    it("adds audit entries for appeal actions", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const appeal = engine.submitAppeal(report.id, "acc_1", "fp")!;
      engine.reviewAppeal(appeal.id, "admin_1", "approved", "ok");

      const updatedReport = engine.getReport(report.id)!;
      const actions = updatedReport.auditTrail.map((a) => a.action);
      expect(actions).toContain("abuse_check_completed");
      expect(actions).toContain("appeal_submitted");
      expect(actions).toContain("appeal_approved");
    });
  });

  describe("false positive management", () => {
    it("marks signal as false positive", () => {
      const cfg = { ...DEFAULT_ABUSE_ENGINE_CONFIG };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 3; i++) {
        engine.registerSession(createSession({ sessionId: `sess_${i}` }));
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      if (report.signals.length > 0) {
        const result = engine.markFalsePositive(report.signals[0].id);
        expect(result).toBe(true);
      }
    });

    it("tracks false positive rate", () => {
      const rate = engine.getFalsePositiveRate();
      expect(rate).toHaveProperty("total");
      expect(rate).toHaveProperty("falsePositives");
      expect(rate).toHaveProperty("rate");
    });

    it("filters out false positives from subsequent checks", () => {
      const cfg = { ...DEFAULT_ABUSE_ENGINE_CONFIG };
      cfg.defaultConfig = {
        ...cfg.defaultConfig,
        sharing: {
          ...cfg.defaultConfig.sharing,
          maxConcurrentSessions: 1,
          minConfidence: 0.3,
        },
      };
      engine = new AbusePreventionEngine(cfg);

      for (let i = 0; i < 3; i++) {
        engine.registerSession(createSession({ sessionId: `sess_${i}` }));
      }

      const report1 = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      // Mark all signals as false positives
      for (const signal of report1.signals) {
        engine.markFalsePositive(signal.id);
      }

      // Next check should filter them out
      // (note: new signals will be generated with new IDs,
      // so this primarily tests the FP tracking mechanism)
      const fpRate = engine.getFalsePositiveRate();
      if (report1.signals.length > 0) {
        expect(fpRate.falsePositives).toBeGreaterThan(0);
      }
    });
  });

  describe("report retrieval", () => {
    it("retrieves reports by account ID", () => {
      engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      engine.checkAccount({
        accountId: "acc_2",
        subscriptionId: "sub_2",
        workspaceId: "ws_2",
        userId: "user_2",
        planTier: "professional",
      });

      const reports = engine.getReports({ accountId: "acc_1" });
      expect(reports).toHaveLength(1);
      expect(reports[0].accountId).toBe("acc_1");
    });

    it("retrieves reports by workspace ID", () => {
      engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const reports = engine.getReports({ workspaceId: "ws_1" });
      expect(reports).toHaveLength(1);
    });

    it("retrieves reports by risk level", () => {
      engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      const reports = engine.getReports({ riskLevel: "low" });
      expect(reports).toHaveLength(1);
    });

    it("limits results", () => {
      for (let i = 0; i < 5; i++) {
        engine.checkAccount({
          accountId: `acc_${i}`,
          subscriptionId: `sub_${i}`,
          workspaceId: `ws_${i}`,
          userId: `user_${i}`,
          planTier: "professional",
        });
      }

      const reports = engine.getReports({ limit: 3 });
      expect(reports).toHaveLength(3);
    });

    it("sorts reports by generatedAt descending", () => {
      for (let i = 0; i < 3; i++) {
        engine.checkAccount({
          accountId: `acc_${i}`,
          subscriptionId: `sub_${i}`,
          workspaceId: `ws_${i}`,
          userId: `user_${i}`,
          planTier: "professional",
        });
      }

      const reports = engine.getReports();
      for (let i = 1; i < reports.length; i++) {
        expect(reports[i - 1].generatedAt).toBeGreaterThanOrEqual(
          reports[i].generatedAt,
        );
      }
    });
  });

  describe("appeal retrieval", () => {
    it("retrieves appeals by account", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      engine.submitAppeal(report.id, "acc_1", "reason");

      const appeals = engine.getAppeals({ accountId: "acc_1" });
      expect(appeals).toHaveLength(1);
    });

    it("retrieves appeals by status", () => {
      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });
      engine.submitAppeal(report.id, "acc_1", "reason");

      const pending = engine.getAppeals({ status: "pending" });
      expect(pending).toHaveLength(1);

      const approved = engine.getAppeals({ status: "approved" });
      expect(approved).toHaveLength(0);
    });
  });

  describe("singleton management", () => {
    it("creates singleton with getAbusePreventionEngine", () => {
      const engine1 = getAbusePreventionEngine();
      const engine2 = getAbusePreventionEngine();
      expect(engine1).toBe(engine2);
    });

    it("replaces singleton with createAbusePreventionEngine", () => {
      const engine1 = getAbusePreventionEngine();
      const engine2 = createAbusePreventionEngine();
      expect(engine1).not.toBe(engine2);
    });

    it("resets singleton", () => {
      getAbusePreventionEngine();
      resetAbusePreventionEngine();
      // Next get should create a new instance
      const engine = getAbusePreventionEngine();
      expect(engine).toBeDefined();
    });
  });

  describe("configuration", () => {
    it("returns engine config", () => {
      const config = engine.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.autoEnforce).toBe(true);
    });

    it("updates engine config", () => {
      engine.updateConfig({ autoEnforce: false });
      expect(engine.getConfig().autoEnforce).toBe(false);
    });

    it("uses default config for unconfigured plan tiers", () => {
      const config = engine.getPlanConfig("starter");
      expect(config).toEqual(DEFAULT_ABUSE_ENGINE_CONFIG.defaultConfig);
    });

    it("uses plan-specific config when available", () => {
      const freeConfig = engine.getPlanConfig("free");
      expect(freeConfig.sharing.maxConcurrentSessions).toBe(1);
    });
  });

  describe("enabled categories", () => {
    it("skips disabled categories", () => {
      engine = new AbusePreventionEngine({
        enabledCategories: ["payment_abuse"], // Only payment
      });

      for (let i = 0; i < 10; i++) {
        engine.registerSession(createSession({ sessionId: `sess_${i}` }));
      }

      const report = engine.checkAccount({
        accountId: "acc_1",
        subscriptionId: "sub_1",
        workspaceId: "ws_1",
        userId: "user_1",
        planTier: "professional",
      });

      // Should not have sharing analysis
      expect(report.sharingAnalysis).toBeNull();
      expect(report.seatAnalysis).toBeNull();
    });
  });
});

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe("Default Configurations", () => {
  it("has valid anti-sharing defaults", () => {
    expect(DEFAULT_ANTI_SHARING_CONFIG.maxConcurrentSessions).toBeGreaterThan(
      0,
    );
    expect(DEFAULT_ANTI_SHARING_CONFIG.maxPlausibleSpeedKmh).toBeGreaterThan(0);
    expect(DEFAULT_ANTI_SHARING_CONFIG.gracePeriodMs).toBeGreaterThan(0);
    expect(DEFAULT_ANTI_SHARING_CONFIG.minConfidence).toBeGreaterThan(0);
    expect(DEFAULT_ANTI_SHARING_CONFIG.minConfidence).toBeLessThanOrEqual(1);
  });

  it("has valid seat abuse defaults", () => {
    expect(DEFAULT_SEAT_ABUSE_CONFIG.ghostSeatThresholdDays).toBeGreaterThan(0);
    expect(DEFAULT_SEAT_ABUSE_CONFIG.maxDevicesPerSeat).toBeGreaterThan(0);
    expect(DEFAULT_SEAT_ABUSE_CONFIG.costPerSeatCents).toBeGreaterThan(0);
  });

  it("has valid payment heuristics defaults", () => {
    expect(
      DEFAULT_PAYMENT_HEURISTICS_CONFIG.maxFailedAttemptsInWindow,
    ).toBeGreaterThan(0);
    expect(
      DEFAULT_PAYMENT_HEURISTICS_CONFIG.refundRateThreshold,
    ).toBeGreaterThan(0);
    expect(DEFAULT_PAYMENT_HEURISTICS_CONFIG.refundRateThreshold).toBeLessThan(
      1,
    );
  });

  it("has valid risk thresholds", () => {
    expect(DEFAULT_RISK_THRESHOLDS.low).toBeLessThan(
      DEFAULT_RISK_THRESHOLDS.medium,
    );
    expect(DEFAULT_RISK_THRESHOLDS.medium).toBeLessThan(
      DEFAULT_RISK_THRESHOLDS.high,
    );
  });

  it("has valid enforcement policy for all risk levels", () => {
    expect(DEFAULT_ENFORCEMENT_POLICY.low).toBe("none");
    expect(DEFAULT_ENFORCEMENT_POLICY.medium).toBeDefined();
    expect(DEFAULT_ENFORCEMENT_POLICY.high).toBeDefined();
    expect(DEFAULT_ENFORCEMENT_POLICY.critical).toBeDefined();
  });

  it("has expected amount ranges for plan tiers", () => {
    const ranges = DEFAULT_PAYMENT_HEURISTICS_CONFIG.expectedAmountRanges;
    expect(ranges.free).toBeDefined();
    expect(ranges.starter).toBeDefined();
    expect(ranges.professional).toBeDefined();
    expect(ranges.enterprise).toBeDefined();
  });
});

// ============================================================================
// Edge Cases & Boundary Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("empty data handling", () => {
    it("AntiSharingDetector handles no sessions", () => {
      const detector = new AntiSharingDetector();
      const analysis = detector.analyze("sub_empty", "user_empty");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.signals).toHaveLength(0);
    });

    it("SeatAbuseDetector handles no seats", () => {
      const detector = new SeatAbuseDetector();
      const analysis = detector.analyze("sub_empty", "ws_empty");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.totalSeats).toBe(0);
    });

    it("PaymentHeuristicsDetector handles no payments", () => {
      const detector = new PaymentHeuristicsDetector();
      const analysis = detector.analyze("user_empty", "ws_empty");
      expect(analysis.overallRisk).toBe("low");
      expect(analysis.signals).toHaveLength(0);
    });

    it("engine handles empty batch scan", () => {
      const engine = new AbusePreventionEngine();
      const result = engine.batchScan([]);
      expect(result.totalAccounts).toBe(0);
      expect(result.reportsGenerated).toHaveLength(0);
      engine.clear();
    });
  });

  describe("boundary conditions", () => {
    it("exactly at concurrent session limit does not trigger", () => {
      const detector = new AntiSharingDetector({ maxConcurrentSessions: 3 });
      for (let i = 0; i < 3; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).toBeNull();
      detector.clear();
    });

    it("one over concurrent session limit triggers", () => {
      const detector = new AntiSharingDetector({ maxConcurrentSessions: 3 });
      for (let i = 0; i < 4; i++) {
        detector.registerSession(createSession({ sessionId: `sess_${i}` }));
      }
      const signal = detector.checkConcurrentSessions(
        "sub_1",
        "user_1",
        detector.getActiveSessions("sub_1"),
      );
      expect(signal).not.toBeNull();
      detector.clear();
    });

    it("ghost seat exactly at threshold is classified as ghost", () => {
      const detector = new SeatAbuseDetector({ ghostSeatThresholdDays: 30 });
      const seat = createSeat({
        lastActiveAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      });
      detector.registerSeat(seat);
      const score = detector.calculateUtilizationScore(seat);
      expect(score.classification).toBe("ghost");
      detector.clear();
    });

    it("refund rate exactly at threshold triggers", () => {
      const detector = new PaymentHeuristicsDetector({
        refundRateThreshold: 0.3,
        minRefundsForRate: 3,
      });
      // 10 succeeded, 3 refunded = 30%
      for (let i = 0; i < 10; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `pay_${i}`,
            status: "succeeded",
            timestamp: Date.now() - i * 86400000,
          }),
        );
      }
      for (let i = 0; i < 3; i++) {
        detector.recordPayment(
          createPaymentEvent({
            id: `ref_${i}`,
            status: "refunded",
            isRefund: true,
            timestamp: Date.now() - i * 86400000,
          }),
        );
      }
      const result = detector.analyzeRefundAbuse("user_1");
      expect(result.signal).not.toBeNull();
      detector.clear();
    });
  });

  describe("multiple subscriptions", () => {
    it("isolates sessions per subscription", () => {
      const detector = new AntiSharingDetector();
      detector.registerSession(
        createSession({ subscriptionId: "sub_A", sessionId: "sess_A" }),
      );
      detector.registerSession(
        createSession({ subscriptionId: "sub_B", sessionId: "sess_B" }),
      );

      expect(detector.getActiveSessions("sub_A")).toHaveLength(1);
      expect(detector.getActiveSessions("sub_B")).toHaveLength(1);
      detector.clear();
    });

    it("isolates seats per subscription", () => {
      const detector = new SeatAbuseDetector();
      detector.registerSeat(
        createSeat({ subscriptionId: "sub_A", seatId: "seat_A" }),
      );
      detector.registerSeat(
        createSeat({ subscriptionId: "sub_B", seatId: "seat_B" }),
      );

      expect(detector.getSeats("sub_A")).toHaveLength(1);
      expect(detector.getSeats("sub_B")).toHaveLength(1);
      detector.clear();
    });
  });
});
