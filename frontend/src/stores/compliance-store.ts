/**
 * Compliance Store
 *
 * Zustand store for managing compliance, retention, and privacy state.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  ComplianceStore,
  ComplianceState,
  RetentionPolicy,
  AutoDeleteConfig,
  RetentionJobStatus,
  LegalHold,
  DataExportRequest,
  DataDeletionRequest,
  UserConsent,
  ConsentConfig,
  ConsentType,
  ConsentStatus,
  CookiePreferences,
  PrivacySettings,
  DataClassificationPolicy,
  EncryptionConfig,
  ComplianceReport,
  ReportSchedule,
  ComplianceBadge,
  DataProcessingAgreement,
} from "@/lib/compliance/compliance-types";

// ============================================================================
// Initial State
// ============================================================================

const initialState: ComplianceState = {
  // Retention
  retentionPolicies: [],
  autoDeleteConfig: null,
  retentionJobs: [],

  // Legal Holds
  legalHolds: [],

  // Export/Deletion Requests
  exportRequests: [],
  deletionRequests: [],

  // Consent
  userConsents: [],
  consentConfigs: [],
  cookiePreferences: null,

  // Privacy
  privacySettings: null,

  // Classification
  classificationPolicies: [],

  // Encryption
  encryptionConfig: null,

  // Reports
  reports: [],
  reportSchedules: [],

  // Certifications
  badges: [],

  // DPAs
  dpas: [],

  // UI State
  loading: false,
  error: null,
  selectedPolicyId: null,
  selectedHoldId: null,
};

// ============================================================================
// Store
// ============================================================================

export const useComplianceStore = create<ComplianceStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // ========================================
      // Retention Policies
      // ========================================

      setRetentionPolicies: (policies: RetentionPolicy[]) =>
        set(
          (state) => {
            state.retentionPolicies = policies;
          },
          false,
          "compliance/setRetentionPolicies",
        ),

      addRetentionPolicy: (policy: RetentionPolicy) =>
        set(
          (state) => {
            state.retentionPolicies.push(policy);
          },
          false,
          "compliance/addRetentionPolicy",
        ),

      updateRetentionPolicy: (id: string, updates: Partial<RetentionPolicy>) =>
        set(
          (state) => {
            const index = state.retentionPolicies.findIndex((p) => p.id === id);
            if (index !== -1) {
              state.retentionPolicies[index] = {
                ...state.retentionPolicies[index],
                ...updates,
                updatedAt: new Date(),
              };
            }
          },
          false,
          "compliance/updateRetentionPolicy",
        ),

      deleteRetentionPolicy: (id: string) =>
        set(
          (state) => {
            state.retentionPolicies = state.retentionPolicies.filter(
              (p) => p.id !== id,
            );
            if (state.selectedPolicyId === id) {
              state.selectedPolicyId = null;
            }
          },
          false,
          "compliance/deleteRetentionPolicy",
        ),

      setAutoDeleteConfig: (config: AutoDeleteConfig | null) =>
        set(
          (state) => {
            state.autoDeleteConfig = config;
          },
          false,
          "compliance/setAutoDeleteConfig",
        ),

      // ========================================
      // Legal Holds
      // ========================================

      setLegalHolds: (holds: LegalHold[]) =>
        set(
          (state) => {
            state.legalHolds = holds;
          },
          false,
          "compliance/setLegalHolds",
        ),

      addLegalHold: (hold: LegalHold) =>
        set(
          (state) => {
            state.legalHolds.push(hold);
          },
          false,
          "compliance/addLegalHold",
        ),

      updateLegalHold: (id: string, updates: Partial<LegalHold>) =>
        set(
          (state) => {
            const index = state.legalHolds.findIndex((h) => h.id === id);
            if (index !== -1) {
              state.legalHolds[index] = {
                ...state.legalHolds[index],
                ...updates,
              };
            }
          },
          false,
          "compliance/updateLegalHold",
        ),

      releaseLegalHold: (id: string, releasedBy: string) =>
        set(
          (state) => {
            const index = state.legalHolds.findIndex((h) => h.id === id);
            if (index !== -1) {
              state.legalHolds[index] = {
                ...state.legalHolds[index],
                status: "released",
                releasedAt: new Date(),
                releasedBy,
              };
            }
          },
          false,
          "compliance/releaseLegalHold",
        ),

      // ========================================
      // Export Requests
      // ========================================

      setExportRequests: (requests: DataExportRequest[]) =>
        set(
          (state) => {
            state.exportRequests = requests;
          },
          false,
          "compliance/setExportRequests",
        ),

      addExportRequest: (request: DataExportRequest) =>
        set(
          (state) => {
            state.exportRequests.push(request);
          },
          false,
          "compliance/addExportRequest",
        ),

      updateExportRequest: (id: string, updates: Partial<DataExportRequest>) =>
        set(
          (state) => {
            const index = state.exportRequests.findIndex((r) => r.id === id);
            if (index !== -1) {
              state.exportRequests[index] = {
                ...state.exportRequests[index],
                ...updates,
              };
            }
          },
          false,
          "compliance/updateExportRequest",
        ),

      // ========================================
      // Deletion Requests
      // ========================================

      setDeletionRequests: (requests: DataDeletionRequest[]) =>
        set(
          (state) => {
            state.deletionRequests = requests;
          },
          false,
          "compliance/setDeletionRequests",
        ),

      addDeletionRequest: (request: DataDeletionRequest) =>
        set(
          (state) => {
            state.deletionRequests.push(request);
          },
          false,
          "compliance/addDeletionRequest",
        ),

      updateDeletionRequest: (
        id: string,
        updates: Partial<DataDeletionRequest>,
      ) =>
        set(
          (state) => {
            const index = state.deletionRequests.findIndex((r) => r.id === id);
            if (index !== -1) {
              state.deletionRequests[index] = {
                ...state.deletionRequests[index],
                ...updates,
              };
            }
          },
          false,
          "compliance/updateDeletionRequest",
        ),

      // ========================================
      // Consent
      // ========================================

      setUserConsents: (consents: UserConsent[]) =>
        set(
          (state) => {
            state.userConsents = consents;
          },
          false,
          "compliance/setUserConsents",
        ),

      updateConsent: (type: ConsentType, status: ConsentStatus) =>
        set(
          (state) => {
            const index = state.userConsents.findIndex(
              (c) => c.consentType === type,
            );
            if (index !== -1) {
              const now = new Date();
              state.userConsents[index] = {
                ...state.userConsents[index],
                status,
                grantedAt:
                  status === "granted"
                    ? now
                    : state.userConsents[index].grantedAt,
                revokedAt:
                  status === "denied"
                    ? now
                    : state.userConsents[index].revokedAt,
              };
            }
          },
          false,
          "compliance/updateConsent",
        ),

      setCookiePreferences: (prefs: CookiePreferences) =>
        set(
          (state) => {
            state.cookiePreferences = prefs;
          },
          false,
          "compliance/setCookiePreferences",
        ),

      // ========================================
      // Privacy
      // ========================================

      setPrivacySettings: (settings: PrivacySettings | null) =>
        set(
          (state) => {
            state.privacySettings = settings;
          },
          false,
          "compliance/setPrivacySettings",
        ),

      updatePrivacySettings: (updates: Partial<PrivacySettings>) =>
        set(
          (state) => {
            if (state.privacySettings) {
              state.privacySettings = {
                ...state.privacySettings,
                ...updates,
                updatedAt: new Date(),
              };
            }
          },
          false,
          "compliance/updatePrivacySettings",
        ),

      // ========================================
      // Encryption
      // ========================================

      setEncryptionConfig: (config: EncryptionConfig | null) =>
        set(
          (state) => {
            state.encryptionConfig = config;
          },
          false,
          "compliance/setEncryptionConfig",
        ),

      // ========================================
      // Reports
      // ========================================

      setReports: (reports: ComplianceReport[]) =>
        set(
          (state) => {
            state.reports = reports;
          },
          false,
          "compliance/setReports",
        ),

      addReport: (report: ComplianceReport) =>
        set(
          (state) => {
            state.reports.push(report);
          },
          false,
          "compliance/addReport",
        ),

      // ========================================
      // UI State
      // ========================================

      setLoading: (loading: boolean) =>
        set(
          (state) => {
            state.loading = loading;
          },
          false,
          "compliance/setLoading",
        ),

      setError: (error: string | null) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "compliance/setError",
        ),

      setSelectedPolicyId: (id: string | null) =>
        set(
          (state) => {
            state.selectedPolicyId = id;
          },
          false,
          "compliance/setSelectedPolicyId",
        ),

      setSelectedHoldId: (id: string | null) =>
        set(
          (state) => {
            state.selectedHoldId = id;
          },
          false,
          "compliance/setSelectedHoldId",
        ),

      // ========================================
      // Reset
      // ========================================

      reset: () => set(() => initialState, false, "compliance/reset"),
    })),
    { name: "compliance-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRetentionPolicies = (state: ComplianceStore) =>
  state.retentionPolicies;

export const selectEnabledPolicies = (state: ComplianceStore) =>
  state.retentionPolicies.filter((p) => p.enabled);

export const selectActiveLegalHolds = (state: ComplianceStore) =>
  state.legalHolds.filter((h) => h.status === "active");

export const selectPendingExportRequests = (state: ComplianceStore) =>
  state.exportRequests.filter((r) =>
    ["pending", "processing"].includes(r.status),
  );

export const selectPendingDeletionRequests = (state: ComplianceStore) =>
  state.deletionRequests.filter((r) =>
    ["pending", "pending_verification", "approved", "processing"].includes(
      r.status,
    ),
  );

export const selectGrantedConsents = (state: ComplianceStore) =>
  state.userConsents.filter((c) => c.status === "granted");

export const selectPrivacyScore = (state: ComplianceStore) => {
  if (!state.privacySettings) return null;

  let score = 0;
  const settings = state.privacySettings;

  if (settings.profileVisibility === "private") score += 20;
  else if (settings.profileVisibility === "contacts") score += 15;
  else if (settings.profileVisibility === "members") score += 10;

  if (!settings.showOnlineStatus) score += 10;
  if (!settings.showLastSeen) score += 10;
  if (!settings.shareAnalytics) score += 15;
  if (!settings.personalizedAds) score += 10;

  return Math.min(100, score);
};

export const selectComplianceStats = (state: ComplianceStore) => ({
  totalPolicies: state.retentionPolicies.length,
  activePolicies: state.retentionPolicies.filter((p) => p.enabled).length,
  activeLegalHolds: state.legalHolds.filter((h) => h.status === "active")
    .length,
  pendingExports: state.exportRequests.filter((r) => r.status === "pending")
    .length,
  pendingDeletions: state.deletionRequests.filter((r) => r.status === "pending")
    .length,
  totalReports: state.reports.length,
});
