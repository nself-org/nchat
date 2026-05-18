/**
 * Report Store - Manages user and message reporting state for the nself-chat application
 *
 * Handles submitting reports, viewing report history, and admin moderation queue
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "violence"
  | "nudity"
  | "misinformation"
  | "impersonation"
  | "copyright"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export type ReportType = "user" | "message";

export interface ReportReasonOption {
  value: ReportReason;
  label: string;
  description: string;
}

export const REPORT_REASONS: ReportReasonOption[] = [
  {
    value: "spam",
    label: "Spam",
    description: "Unwanted promotional content or repetitive messages",
  },
  {
    value: "harassment",
    label: "Harassment or Bullying",
    description: "Targeted behavior intended to harm or intimidate",
  },
  {
    value: "hate_speech",
    label: "Hate Speech",
    description: "Content promoting hatred against protected groups",
  },
  {
    value: "violence",
    label: "Violence or Threats",
    description: "Content depicting or threatening violence",
  },
  {
    value: "nudity",
    label: "Nudity or Sexual Content",
    description: "Inappropriate sexual or nude imagery",
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "False or misleading information",
  },
  {
    value: "impersonation",
    label: "Impersonation",
    description: "Pretending to be someone else",
  },
  {
    value: "copyright",
    label: "Copyright Violation",
    description: "Unauthorized use of copyrighted material",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
  },
];

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface MessageInfo {
  id: string;
  content: string;
  userId: string;
  user: UserInfo;
  channelId: string;
  channelName: string;
  createdAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  evidenceUrls?: string[];
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  reporter: UserInfo;
  reportedUser: UserInfo;
  moderator?: UserInfo;
}

export interface MessageReport {
  id: string;
  reporterId: string;
  messageId: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  reporter: UserInfo;
  message: MessageInfo;
  moderator?: UserInfo;
}

export type Report = UserReport | MessageReport;

// ============================================================================
// State Interface
// ============================================================================

export interface ReportState {
  // User reports
  userReports: UserReport[];
  userReportsTotal: number;
  isLoadingUserReports: boolean;

  // Message reports
  messageReports: MessageReport[];
  messageReportsTotal: number;
  isLoadingMessageReports: boolean;

  // Report user modal state
  reportUserModalOpen: boolean;
  reportUserTarget: UserInfo | null;

  // Report message modal state
  reportMessageModalOpen: boolean;
  reportMessageTarget: MessageInfo | null;

  // Form state
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;

  // My reports (user's own report history)
  myReports: Report[];
  isLoadingMyReports: boolean;

  // Filters (admin)
  statusFilter: ReportStatus | null;
  typeFilter: ReportType | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface ReportActions {
  // User reports (admin)
  setUserReports: (reports: UserReport[], total: number) => void;
  addUserReport: (report: UserReport) => void;
  updateUserReport: (reportId: string, updates: Partial<UserReport>) => void;
  removeUserReport: (reportId: string) => void;
  setLoadingUserReports: (loading: boolean) => void;

  // Message reports (admin)
  setMessageReports: (reports: MessageReport[], total: number) => void;
  addMessageReport: (report: MessageReport) => void;
  updateMessageReport: (
    reportId: string,
    updates: Partial<MessageReport>,
  ) => void;
  removeMessageReport: (reportId: string) => void;
  setLoadingMessageReports: (loading: boolean) => void;

  // Report user modal
  openReportUserModal: (user: UserInfo) => void;
  closeReportUserModal: () => void;

  // Report message modal
  openReportMessageModal: (message: MessageInfo) => void;
  closeReportMessageModal: () => void;

  // Form state
  setSubmitting: (submitting: boolean) => void;
  setSubmitError: (error: string | null) => void;
  setSubmitSuccess: (success: boolean) => void;
  resetFormState: () => void;

  // My reports
  setMyReports: (reports: Report[]) => void;
  setLoadingMyReports: (loading: boolean) => void;

  // Filters
  setStatusFilter: (status: ReportStatus | null) => void;
  setTypeFilter: (type: ReportType | null) => void;

  // Utility
  reset: () => void;
}

export type ReportStore = ReportState & ReportActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ReportState = {
  userReports: [],
  userReportsTotal: 0,
  isLoadingUserReports: false,

  messageReports: [],
  messageReportsTotal: 0,
  isLoadingMessageReports: false,

  reportUserModalOpen: false,
  reportUserTarget: null,

  reportMessageModalOpen: false,
  reportMessageTarget: null,

  isSubmitting: false,
  submitError: null,
  submitSuccess: false,

  myReports: [],
  isLoadingMyReports: false,

  statusFilter: "pending",
  typeFilter: null,
};

// ============================================================================
// Store
// ============================================================================

export const useReportStore = create<ReportStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // User reports (admin)
      setUserReports: (reports, total) =>
        set(
          (state) => {
            state.userReports = reports;
            state.userReportsTotal = total;
          },
          false,
          "report/setUserReports",
        ),

      addUserReport: (report) =>
        set(
          (state) => {
            state.userReports.unshift(report);
            state.userReportsTotal += 1;
          },
          false,
          "report/addUserReport",
        ),

      updateUserReport: (reportId, updates) =>
        set(
          (state) => {
            const index = state.userReports.findIndex((r) => r.id === reportId);
            if (index !== -1) {
              state.userReports[index] = {
                ...state.userReports[index],
                ...updates,
              };
            }
          },
          false,
          "report/updateUserReport",
        ),

      removeUserReport: (reportId) =>
        set(
          (state) => {
            state.userReports = state.userReports.filter(
              (r) => r.id !== reportId,
            );
            state.userReportsTotal -= 1;
          },
          false,
          "report/removeUserReport",
        ),

      setLoadingUserReports: (loading) =>
        set(
          (state) => {
            state.isLoadingUserReports = loading;
          },
          false,
          "report/setLoadingUserReports",
        ),

      // Message reports (admin)
      setMessageReports: (reports, total) =>
        set(
          (state) => {
            state.messageReports = reports;
            state.messageReportsTotal = total;
          },
          false,
          "report/setMessageReports",
        ),

      addMessageReport: (report) =>
        set(
          (state) => {
            state.messageReports.unshift(report);
            state.messageReportsTotal += 1;
          },
          false,
          "report/addMessageReport",
        ),

      updateMessageReport: (reportId, updates) =>
        set(
          (state) => {
            const index = state.messageReports.findIndex(
              (r) => r.id === reportId,
            );
            if (index !== -1) {
              state.messageReports[index] = {
                ...state.messageReports[index],
                ...updates,
              };
            }
          },
          false,
          "report/updateMessageReport",
        ),

      removeMessageReport: (reportId) =>
        set(
          (state) => {
            state.messageReports = state.messageReports.filter(
              (r) => r.id !== reportId,
            );
            state.messageReportsTotal -= 1;
          },
          false,
          "report/removeMessageReport",
        ),

      setLoadingMessageReports: (loading) =>
        set(
          (state) => {
            state.isLoadingMessageReports = loading;
          },
          false,
          "report/setLoadingMessageReports",
        ),

      // Report user modal
      openReportUserModal: (user) =>
        set(
          (state) => {
            state.reportUserModalOpen = true;
            state.reportUserTarget = user;
            state.submitError = null;
            state.submitSuccess = false;
          },
          false,
          "report/openReportUserModal",
        ),

      closeReportUserModal: () =>
        set(
          (state) => {
            state.reportUserModalOpen = false;
            state.reportUserTarget = null;
            state.submitError = null;
            state.submitSuccess = false;
          },
          false,
          "report/closeReportUserModal",
        ),

      // Report message modal
      openReportMessageModal: (message) =>
        set(
          (state) => {
            state.reportMessageModalOpen = true;
            state.reportMessageTarget = message;
            state.submitError = null;
            state.submitSuccess = false;
          },
          false,
          "report/openReportMessageModal",
        ),

      closeReportMessageModal: () =>
        set(
          (state) => {
            state.reportMessageModalOpen = false;
            state.reportMessageTarget = null;
            state.submitError = null;
            state.submitSuccess = false;
          },
          false,
          "report/closeReportMessageModal",
        ),

      // Form state
      setSubmitting: (submitting) =>
        set(
          (state) => {
            state.isSubmitting = submitting;
          },
          false,
          "report/setSubmitting",
        ),

      setSubmitError: (error) =>
        set(
          (state) => {
            state.submitError = error;
          },
          false,
          "report/setSubmitError",
        ),

      setSubmitSuccess: (success) =>
        set(
          (state) => {
            state.submitSuccess = success;
          },
          false,
          "report/setSubmitSuccess",
        ),

      resetFormState: () =>
        set(
          (state) => {
            state.isSubmitting = false;
            state.submitError = null;
            state.submitSuccess = false;
          },
          false,
          "report/resetFormState",
        ),

      // My reports
      setMyReports: (reports) =>
        set(
          (state) => {
            state.myReports = reports;
          },
          false,
          "report/setMyReports",
        ),

      setLoadingMyReports: (loading) =>
        set(
          (state) => {
            state.isLoadingMyReports = loading;
          },
          false,
          "report/setLoadingMyReports",
        ),

      // Filters
      setStatusFilter: (status) =>
        set(
          (state) => {
            state.statusFilter = status;
          },
          false,
          "report/setStatusFilter",
        ),

      setTypeFilter: (type) =>
        set(
          (state) => {
            state.typeFilter = type;
          },
          false,
          "report/setTypeFilter",
        ),

      // Utility
      reset: () => set(() => initialState, false, "report/reset"),
    })),
    { name: "report-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectUserReports = (state: ReportStore) => state.userReports;

export const selectMessageReports = (state: ReportStore) =>
  state.messageReports;

export const selectAllReports = (state: ReportStore): Report[] =>
  [...state.userReports, ...state.messageReports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

export const selectPendingReportsCount = (state: ReportStore) =>
  state.userReports.filter((r) => r.status === "pending").length +
  state.messageReports.filter((r) => r.status === "pending").length;

export const selectReportUserModal = (state: ReportStore) => ({
  isOpen: state.reportUserModalOpen,
  target: state.reportUserTarget,
});

export const selectReportMessageModal = (state: ReportStore) => ({
  isOpen: state.reportMessageModalOpen,
  target: state.reportMessageTarget,
});

export const selectFormState = (state: ReportStore) => ({
  isSubmitting: state.isSubmitting,
  error: state.submitError,
  success: state.submitSuccess,
});

export const selectMyReports = (state: ReportStore) => state.myReports;

export const selectFilters = (state: ReportStore) => ({
  status: state.statusFilter,
  type: state.typeFilter,
});

// Helper to check if a report is for a user
export const isUserReport = (report: Report): report is UserReport => {
  return "reportedUserId" in report;
};

// Helper to check if a report is for a message
export const isMessageReport = (report: Report): report is MessageReport => {
  return "messageId" in report;
};
