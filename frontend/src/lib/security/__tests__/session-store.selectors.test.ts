/**
 * Tests for session-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { SessionStore } from "../session-store";
import {
  selectSessions,
  selectCurrentSession,
  selectOtherSessions,
  selectLoginHistory,
  selectRecentFailedAttempts,
  selectSessionsPagination,
} from "../session-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "s1",
    userId: "u1",
    device: "Desktop",
    browser: "Chrome",
    os: "macOS",
    ipAddress: "127.0.0.1",
    isCurrent: false,
    createdAt: "2024-01-01T00:00:00Z",
    lastActiveAt: "2024-01-02T00:00:00Z",
    expiresAt: "2024-02-01T00:00:00Z",
    ...overrides,
  } as never;
}

function makeLoginAttempt(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "la1",
    userId: "u1",
    success: true,
    ipAddress: "127.0.0.1",
    device: "Desktop",
    browser: "Chrome",
    os: "macOS",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  } as never;
}

function makeState(overrides?: Partial<Record<string, unknown>>): SessionStore {
  const defaultState = {
    sessions: [],
    currentSession: null,
    isLoadingSessions: false,
    sessionsError: null,
    loginHistory: [],
    loginHistoryTotal: 0,
    loginHistoryPage: 1,
    loginHistoryPerPage: 10,
    isLoadingHistory: false,
    historyError: null,
    isRevoking: false,
    revokeError: null,
  };
  return { ...defaultState, ...overrides } as unknown as SessionStore;
}

// ---------------------------------------------------------------------------
// selectSessions
// ---------------------------------------------------------------------------

describe("selectSessions", () => {
  it("returns empty array by default", () => {
    expect(selectSessions(makeState())).toEqual([]);
  });

  it("returns the sessions array", () => {
    const sessions = [makeSession()];
    expect(selectSessions(makeState({ sessions }))).toBe(sessions);
  });
});

// ---------------------------------------------------------------------------
// selectCurrentSession
// ---------------------------------------------------------------------------

describe("selectCurrentSession", () => {
  it("returns null by default", () => {
    expect(selectCurrentSession(makeState())).toBeNull();
  });

  it("returns the current session when set", () => {
    const currentSession = makeSession({ isCurrent: true });
    expect(selectCurrentSession(makeState({ currentSession }))).toBe(currentSession);
  });
});

// ---------------------------------------------------------------------------
// selectOtherSessions
// ---------------------------------------------------------------------------

describe("selectOtherSessions", () => {
  it("returns empty array by default", () => {
    expect(selectOtherSessions(makeState())).toEqual([]);
  });

  it("excludes the current session", () => {
    const sessions = [
      makeSession({ id: "s1", isCurrent: true }),
      makeSession({ id: "s2", isCurrent: false }),
      makeSession({ id: "s3", isCurrent: false }),
    ];
    const result = selectOtherSessions(makeState({ sessions }));
    expect(result).toHaveLength(2);
    expect(result.every((s: { isCurrent: boolean }) => !s.isCurrent)).toBe(true);
  });

  it("returns all sessions when none is current", () => {
    const sessions = [
      makeSession({ id: "s1", isCurrent: false }),
      makeSession({ id: "s2", isCurrent: false }),
    ];
    expect(selectOtherSessions(makeState({ sessions }))).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// selectLoginHistory
// ---------------------------------------------------------------------------

describe("selectLoginHistory", () => {
  it("returns empty array by default", () => {
    expect(selectLoginHistory(makeState())).toEqual([]);
  });

  it("returns the login history array", () => {
    const loginHistory = [makeLoginAttempt()];
    expect(selectLoginHistory(makeState({ loginHistory }))).toBe(loginHistory);
  });
});

// ---------------------------------------------------------------------------
// selectRecentFailedAttempts
// ---------------------------------------------------------------------------

describe("selectRecentFailedAttempts", () => {
  it("returns empty array when no failed attempts", () => {
    const loginHistory = [makeLoginAttempt({ success: true })];
    expect(selectRecentFailedAttempts(makeState({ loginHistory }))).toEqual([]);
  });

  it("returns only failed attempts", () => {
    const loginHistory = [
      makeLoginAttempt({ id: "la1", success: true }),
      makeLoginAttempt({ id: "la2", success: false }),
      makeLoginAttempt({ id: "la3", success: false }),
    ];
    const result = selectRecentFailedAttempts(makeState({ loginHistory }));
    expect(result).toHaveLength(2);
    expect(result.every((a: { success: boolean }) => !a.success)).toBe(true);
  });

  it("limits failed attempts to 5", () => {
    const loginHistory = Array.from({ length: 8 }, (_, i) =>
      makeLoginAttempt({ id: `la${i}`, success: false }),
    );
    const result = selectRecentFailedAttempts(makeState({ loginHistory }));
    expect(result).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// selectSessionsPagination
// ---------------------------------------------------------------------------

describe("selectSessionsPagination", () => {
  it("returns the default pagination config", () => {
    const result = selectSessionsPagination(makeState());
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(10);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("computes totalPages correctly", () => {
    const result = selectSessionsPagination(
      makeState({
        loginHistoryTotal: 25,
        loginHistoryPage: 2,
        loginHistoryPerPage: 10,
      }),
    );
    expect(result.page).toBe(2);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
  });
});
