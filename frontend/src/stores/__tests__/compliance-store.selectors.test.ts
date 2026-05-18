/**
 * Tests for compliance-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ComplianceStore } from "../compliance-store";
import {
  selectRetentionPolicies,
  selectEnabledPolicies,
  selectActiveLegalHolds,
  selectPendingExportRequests,
  selectPendingDeletionRequests,
  selectGrantedConsents,
  selectPrivacyScore,
  selectComplianceStats,
} from "../compliance-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(
  overrides?: Partial<Record<string, unknown>>,
): ComplianceStore {
  const defaultState = {
    retentionPolicies: [],
    autoDeleteConfig: null,
    retentionJobs: [],
    legalHolds: [],
    exportRequests: [],
    deletionRequests: [],
    userConsents: [],
    consentConfigs: [],
    cookiePreferences: null,
    privacySettings: null,
    classificationPolicies: [],
    encryptionConfig: null,
    reports: [],
    reportSchedules: [],
    badges: [],
    dpas: [],
    loading: false,
    error: null,
    selectedPolicyId: null,
    selectedHoldId: null,
  };
  return { ...defaultState, ...overrides } as unknown as ComplianceStore;
}

// ---------------------------------------------------------------------------
// selectRetentionPolicies
// ---------------------------------------------------------------------------

describe("selectRetentionPolicies", () => {
  it("returns empty array by default", () => {
    expect(selectRetentionPolicies(makeState())).toEqual([]);
  });

  it("returns the retentionPolicies array", () => {
    const retentionPolicies = [
      { id: "rp1", name: "30 day", enabled: true } as never,
    ];
    expect(selectRetentionPolicies(makeState({ retentionPolicies }))).toBe(
      retentionPolicies,
    );
  });
});

// ---------------------------------------------------------------------------
// selectEnabledPolicies
// ---------------------------------------------------------------------------

describe("selectEnabledPolicies", () => {
  it("returns empty array when retentionPolicies is empty", () => {
    expect(selectEnabledPolicies(makeState())).toEqual([]);
  });

  it("returns only enabled policies", () => {
    const retentionPolicies = [
      { id: "rp1", name: "30 day", enabled: true } as never,
      { id: "rp2", name: "90 day", enabled: false } as never,
      { id: "rp3", name: "1 year", enabled: true } as never,
    ];
    const result = selectEnabledPolicies(makeState({ retentionPolicies }));
    expect(result).toHaveLength(2);
    expect(result.every((p: { enabled: boolean }) => p.enabled)).toBe(true);
  });

  it("returns empty array when no policies are enabled", () => {
    const retentionPolicies = [
      { id: "rp1", name: "30 day", enabled: false } as never,
    ];
    expect(selectEnabledPolicies(makeState({ retentionPolicies }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectActiveLegalHolds
// ---------------------------------------------------------------------------

describe("selectActiveLegalHolds", () => {
  it("returns empty array when legalHolds is empty", () => {
    expect(selectActiveLegalHolds(makeState())).toEqual([]);
  });

  it("returns only active legal holds", () => {
    const legalHolds = [
      { id: "lh1", status: "active" } as never,
      { id: "lh2", status: "released" } as never,
      { id: "lh3", status: "active" } as never,
    ];
    const result = selectActiveLegalHolds(makeState({ legalHolds }));
    expect(result).toHaveLength(2);
    expect(result.every((h: { status: string }) => h.status === "active")).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectPendingExportRequests
// ---------------------------------------------------------------------------

describe("selectPendingExportRequests", () => {
  it("returns empty array when exportRequests is empty", () => {
    expect(selectPendingExportRequests(makeState())).toEqual([]);
  });

  it("returns pending and processing export requests", () => {
    const exportRequests = [
      { id: "er1", status: "pending" } as never,
      { id: "er2", status: "processing" } as never,
      { id: "er3", status: "completed" } as never,
    ];
    const result = selectPendingExportRequests(makeState({ exportRequests }));
    expect(result).toHaveLength(2);
  });

  it("excludes completed and failed requests", () => {
    const exportRequests = [
      { id: "er1", status: "completed" } as never,
      { id: "er2", status: "failed" } as never,
    ];
    expect(
      selectPendingExportRequests(makeState({ exportRequests })),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectPendingDeletionRequests
// ---------------------------------------------------------------------------

describe("selectPendingDeletionRequests", () => {
  it("returns empty array when deletionRequests is empty", () => {
    expect(selectPendingDeletionRequests(makeState())).toEqual([]);
  });

  it("returns pending, pending_verification, approved, and processing deletion requests", () => {
    const deletionRequests = [
      { id: "dr1", status: "pending" } as never,
      { id: "dr2", status: "pending_verification" } as never,
      { id: "dr3", status: "approved" } as never,
      { id: "dr4", status: "processing" } as never,
      { id: "dr5", status: "completed" } as never,
    ];
    const result = selectPendingDeletionRequests(
      makeState({ deletionRequests }),
    );
    expect(result).toHaveLength(4);
  });

  it("excludes completed requests", () => {
    const deletionRequests = [{ id: "dr1", status: "completed" } as never];
    expect(
      selectPendingDeletionRequests(makeState({ deletionRequests })),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectGrantedConsents
// ---------------------------------------------------------------------------

describe("selectGrantedConsents", () => {
  it("returns empty array when userConsents is empty", () => {
    expect(selectGrantedConsents(makeState())).toEqual([]);
  });

  it("returns only consents with status granted", () => {
    const userConsents = [
      { id: "c1", status: "granted" } as never,
      { id: "c2", status: "denied" } as never,
      { id: "c3", status: "granted" } as never,
    ];
    const result = selectGrantedConsents(makeState({ userConsents }));
    expect(result).toHaveLength(2);
    expect(
      result.every((c: { status: string }) => c.status === "granted"),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectPrivacyScore
// ---------------------------------------------------------------------------

describe("selectPrivacyScore", () => {
  it("returns null when privacySettings is null", () => {
    expect(selectPrivacyScore(makeState())).toBeNull();
  });

  it("returns 0 when all privacy-degrading settings are on", () => {
    const privacySettings = {
      profileVisibility: "public",
      showOnlineStatus: true,
      showLastSeen: true,
      shareAnalytics: true,
      personalizedAds: true,
    } as never;
    expect(selectPrivacyScore(makeState({ privacySettings }))).toBe(0);
  });

  it("computes higher score for privacy-preserving settings", () => {
    const privacySettings = {
      profileVisibility: "private",
      showOnlineStatus: false,
      showLastSeen: false,
      shareAnalytics: false,
      personalizedAds: false,
    } as never;
    const score = selectPrivacyScore(makeState({ privacySettings }));
    // private=20 + showOnlineStatus=10 + showLastSeen=10 + shareAnalytics=15 + personalizedAds=10 = 65
    expect(score).toBe(65);
  });

  it("adds partial score for contacts visibility", () => {
    const privacySettings = {
      profileVisibility: "contacts",
      showOnlineStatus: true,
      showLastSeen: true,
      shareAnalytics: true,
      personalizedAds: true,
    } as never;
    expect(selectPrivacyScore(makeState({ privacySettings }))).toBe(15);
  });

  it("caps score at 100", () => {
    const privacySettings = {
      profileVisibility: "private",
      showOnlineStatus: false,
      showLastSeen: false,
      shareAnalytics: false,
      personalizedAds: false,
    } as never;
    const score = selectPrivacyScore(makeState({ privacySettings }));
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// selectComplianceStats
// ---------------------------------------------------------------------------

describe("selectComplianceStats", () => {
  it("returns all-zero stats by default", () => {
    const result = selectComplianceStats(makeState());
    expect(result.totalPolicies).toBe(0);
    expect(result.activePolicies).toBe(0);
    expect(result.activeLegalHolds).toBe(0);
    expect(result.pendingExports).toBe(0);
    expect(result.pendingDeletions).toBe(0);
    expect(result.totalReports).toBe(0);
  });

  it("counts total and active policies correctly", () => {
    const retentionPolicies = [
      { id: "rp1", enabled: true } as never,
      { id: "rp2", enabled: false } as never,
      { id: "rp3", enabled: true } as never,
    ];
    const result = selectComplianceStats(makeState({ retentionPolicies }));
    expect(result.totalPolicies).toBe(3);
    expect(result.activePolicies).toBe(2);
  });

  it("counts active legal holds correctly", () => {
    const legalHolds = [
      { id: "lh1", status: "active" } as never,
      { id: "lh2", status: "released" } as never,
    ];
    const result = selectComplianceStats(makeState({ legalHolds }));
    expect(result.activeLegalHolds).toBe(1);
  });

  it("counts pending exports and deletions correctly", () => {
    const exportRequests = [
      { id: "er1", status: "pending" } as never,
      { id: "er2", status: "completed" } as never,
    ];
    const deletionRequests = [
      { id: "dr1", status: "pending" } as never,
      { id: "dr2", status: "approved" } as never,
    ];
    const result = selectComplianceStats(
      makeState({ exportRequests, deletionRequests }),
    );
    expect(result.pendingExports).toBe(1);
    expect(result.pendingDeletions).toBe(1);
  });

  it("counts total reports correctly", () => {
    const reports = [{ id: "r1" } as never, { id: "r2" } as never];
    const result = selectComplianceStats(makeState({ reports }));
    expect(result.totalReports).toBe(2);
  });
});
