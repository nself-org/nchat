/**
 * Tests for report-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ReportStore, UserReport, MessageReport } from "../report-store";
import {
  selectUserReports,
  selectMessageReports,
  selectAllReports,
  selectPendingReportsCount,
  selectReportUserModal,
  selectReportMessageModal,
  selectFormState,
  selectMyReports,
  selectFilters,
} from "../report-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserReport(overrides?: Partial<Record<string, unknown>>): UserReport {
  return {
    id: "ur1",
    reporterId: "u1",
    reportedUserId: "u2",
    reason: "spam",
    status: "pending",
    createdAt: "2024-01-01T00:00:00Z",
    reporter: { id: "u1", username: "alice", displayName: "Alice" },
    reportedUser: { id: "u2", username: "bob", displayName: "Bob" },
    ...overrides,
  } as UserReport;
}

function makeMessageReport(overrides?: Partial<Record<string, unknown>>): MessageReport {
  return {
    id: "mr1",
    reporterId: "u1",
    messageId: "msg1",
    reason: "harassment",
    status: "pending",
    createdAt: "2024-01-02T00:00:00Z",
    reporter: { id: "u1", username: "alice", displayName: "Alice" },
    message: {
      id: "msg1",
      content: "bad content",
      userId: "u3",
      user: { id: "u3", username: "charlie", displayName: "Charlie" },
      channelId: "c1",
      channelName: "general",
      createdAt: "2024-01-02T00:00:00Z",
    },
    ...overrides,
  } as MessageReport;
}

function makeState(overrides?: Partial<Record<string, unknown>>): ReportStore {
  const defaultState = {
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
    statusFilter: null,
    typeFilter: null,
    // stub actions
    setUserReports: () => undefined,
    addUserReport: () => undefined,
    updateUserReport: () => undefined,
    removeUserReport: () => undefined,
    setLoadingUserReports: () => undefined,
    setMessageReports: () => undefined,
    addMessageReport: () => undefined,
    updateMessageReport: () => undefined,
    removeMessageReport: () => undefined,
    setLoadingMessageReports: () => undefined,
    openReportUserModal: () => undefined,
    closeReportUserModal: () => undefined,
    openReportMessageModal: () => undefined,
    closeReportMessageModal: () => undefined,
    setSubmitting: () => undefined,
    setSubmitError: () => undefined,
    setSubmitSuccess: () => undefined,
    resetForm: () => undefined,
    setMyReports: () => undefined,
    setLoadingMyReports: () => undefined,
    setStatusFilter: () => undefined,
    setTypeFilter: () => undefined,
    reset: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as ReportStore;
}

// ---------------------------------------------------------------------------
// selectUserReports
// ---------------------------------------------------------------------------

describe("selectUserReports", () => {
  it("returns empty array by default", () => {
    expect(selectUserReports(makeState())).toEqual([]);
  });

  it("returns the userReports array", () => {
    const userReports = [makeUserReport()];
    expect(selectUserReports(makeState({ userReports }))).toBe(userReports);
  });
});

// ---------------------------------------------------------------------------
// selectMessageReports
// ---------------------------------------------------------------------------

describe("selectMessageReports", () => {
  it("returns empty array by default", () => {
    expect(selectMessageReports(makeState())).toEqual([]);
  });

  it("returns the messageReports array", () => {
    const messageReports = [makeMessageReport()];
    expect(selectMessageReports(makeState({ messageReports }))).toBe(messageReports);
  });
});

// ---------------------------------------------------------------------------
// selectAllReports (derived — merges and sorts by createdAt descending)
// ---------------------------------------------------------------------------

describe("selectAllReports", () => {
  it("returns empty array when no reports", () => {
    expect(selectAllReports(makeState())).toEqual([]);
  });

  it("merges user and message reports into one sorted array", () => {
    const ur = makeUserReport({ id: "ur1", createdAt: "2024-01-01T00:00:00Z" });
    const mr = makeMessageReport({ id: "mr1", createdAt: "2024-01-02T00:00:00Z" });
    const result = selectAllReports(makeState({ userReports: [ur], messageReports: [mr] }));
    expect(result).toHaveLength(2);
    // Most recent first (mr has the later date)
    expect(result[0].id).toBe("mr1");
    expect(result[1].id).toBe("ur1");
  });

  it("returns only user reports when message reports is empty", () => {
    const ur = makeUserReport();
    const result = selectAllReports(makeState({ userReports: [ur] }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ur1");
  });
});

// ---------------------------------------------------------------------------
// selectPendingReportsCount (derived)
// ---------------------------------------------------------------------------

describe("selectPendingReportsCount", () => {
  it("returns 0 when no reports", () => {
    expect(selectPendingReportsCount(makeState())).toBe(0);
  });

  it("counts pending user and message reports", () => {
    const userReports = [
      makeUserReport({ status: "pending" }),
      makeUserReport({ id: "ur2", status: "resolved" }),
    ];
    const messageReports = [
      makeMessageReport({ status: "pending" }),
    ];
    expect(selectPendingReportsCount(makeState({ userReports, messageReports }))).toBe(2);
  });

  it("returns 0 when all reports are non-pending", () => {
    const userReports = [makeUserReport({ status: "resolved" })];
    const messageReports = [makeMessageReport({ status: "dismissed" })];
    expect(selectPendingReportsCount(makeState({ userReports, messageReports }))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// selectReportUserModal
// ---------------------------------------------------------------------------

describe("selectReportUserModal", () => {
  it("returns closed modal with null target by default", () => {
    const result = selectReportUserModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with the reported user as target", () => {
    const target = { id: "u2", username: "bob", displayName: "Bob" };
    const result = selectReportUserModal(
      makeState({ reportUserModalOpen: true, reportUserTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectReportMessageModal
// ---------------------------------------------------------------------------

describe("selectReportMessageModal", () => {
  it("returns closed modal with null target by default", () => {
    const result = selectReportMessageModal(makeState());
    expect(result.isOpen).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns open modal with the reported message as target", () => {
    const target = {
      id: "msg1",
      content: "rude message",
      userId: "u3",
      user: { id: "u3", username: "charlie", displayName: "Charlie" },
      channelId: "c1",
      channelName: "general",
      createdAt: "2024-01-01T00:00:00Z",
    };
    const result = selectReportMessageModal(
      makeState({ reportMessageModalOpen: true, reportMessageTarget: target }),
    );
    expect(result.isOpen).toBe(true);
    expect(result.target).toBe(target);
  });
});

// ---------------------------------------------------------------------------
// selectFormState
// ---------------------------------------------------------------------------

describe("selectFormState", () => {
  it("returns default form state", () => {
    const result = selectFormState(makeState());
    expect(result.isSubmitting).toBe(false);
    expect(result.error).toBeNull();
    expect(result.success).toBe(false);
  });

  it("returns submitting state when form is submitting", () => {
    const result = selectFormState(makeState({ isSubmitting: true }));
    expect(result.isSubmitting).toBe(true);
  });

  it("returns error and success when set", () => {
    const result = selectFormState(
      makeState({ submitError: "Failed to submit", submitSuccess: true }),
    );
    expect(result.error).toBe("Failed to submit");
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMyReports
// ---------------------------------------------------------------------------

describe("selectMyReports", () => {
  it("returns empty array by default", () => {
    expect(selectMyReports(makeState())).toEqual([]);
  });

  it("returns the myReports array", () => {
    const myReports = [makeUserReport()];
    expect(selectMyReports(makeState({ myReports }))).toBe(myReports);
  });
});

// ---------------------------------------------------------------------------
// selectFilters
// ---------------------------------------------------------------------------

describe("selectFilters", () => {
  it("returns null filters by default", () => {
    const result = selectFilters(makeState());
    expect(result.status).toBeNull();
    expect(result.type).toBeNull();
  });

  it("returns the active filters when set", () => {
    const result = selectFilters(makeState({ statusFilter: "pending", typeFilter: "user" }));
    expect(result.status).toBe("pending");
    expect(result.type).toBe("user");
  });
});
