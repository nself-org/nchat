/**
 * Tests for team-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { TeamStore, TeamState } from "../team-store";
import {
  selectTeam,
  selectSettings,
  selectIsLoadingTeam,
  selectMembers,
  selectMembersTotal,
  selectIsLoadingMembers,
  selectInvitations,
  selectInvitationsTotal,
  selectInviteLinks,
  selectBilling,
  selectUsage,
  selectExportRequests,
} from "../team-store";

import type {
  Team,
  TeamSettings,
  TeamMember,
  TeamInvitation,
  InviteLink,
  BillingInfo,
  UsageStatistics,
  TeamExportResult,
} from "@/lib/team/team-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<TeamState>): TeamStore {
  const defaultState: TeamState = {
    team: null,
    settings: null,
    isLoadingTeam: false,
    members: [],
    membersTotal: 0,
    isLoadingMembers: false,
    invitations: [],
    invitationsTotal: 0,
    isLoadingInvitations: false,
    inviteLinks: [],
    isLoadingInviteLinks: false,
    billing: null,
    usage: null,
    isLoadingBilling: false,
    exportRequests: [],
    isLoadingExport: false,
    selectedMemberId: null,
    selectedInvitationId: null,
    inviteModalOpen: false,
    inviteModalMode: "email",
    transferOwnershipModalOpen: false,
    deleteTeamModalOpen: false,
    exportDataModalOpen: false,
    changePlanModalOpen: false,
    paymentMethodModalOpen: false,
  };
  return { ...defaultState, ...overrides } as unknown as TeamStore;
}

// ---------------------------------------------------------------------------
// selectTeam
// ---------------------------------------------------------------------------

describe("selectTeam", () => {
  it("returns null when no team is loaded", () => {
    expect(selectTeam(makeState())).toBeNull();
  });

  it("returns the loaded team", () => {
    const team = { id: "t1", name: "My Team" } as Team;
    expect(selectTeam(makeState({ team }))).toBe(team);
  });
});

// ---------------------------------------------------------------------------
// selectSettings
// ---------------------------------------------------------------------------

describe("selectSettings", () => {
  it("returns null when no settings are loaded", () => {
    expect(selectSettings(makeState())).toBeNull();
  });

  it("returns the team settings", () => {
    const settings = { allowGuestAccess: true } as TeamSettings;
    expect(selectSettings(makeState({ settings }))).toBe(settings);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingTeam
// ---------------------------------------------------------------------------

describe("selectIsLoadingTeam", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingTeam(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoadingTeam(makeState({ isLoadingTeam: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMembers
// ---------------------------------------------------------------------------

describe("selectMembers", () => {
  it("returns empty array by default", () => {
    expect(selectMembers(makeState())).toEqual([]);
  });

  it("returns the members array", () => {
    const members = [
      { userId: "u1" } as TeamMember,
      { userId: "u2" } as TeamMember,
    ];
    expect(selectMembers(makeState({ members }))).toBe(members);
  });
});

// ---------------------------------------------------------------------------
// selectMembersTotal
// ---------------------------------------------------------------------------

describe("selectMembersTotal", () => {
  it("returns 0 by default", () => {
    expect(selectMembersTotal(makeState())).toBe(0);
  });

  it("returns the total member count", () => {
    expect(selectMembersTotal(makeState({ membersTotal: 42 }))).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingMembers
// ---------------------------------------------------------------------------

describe("selectIsLoadingMembers", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingMembers(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(
      selectIsLoadingMembers(makeState({ isLoadingMembers: true })),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectInvitations
// ---------------------------------------------------------------------------

describe("selectInvitations", () => {
  it("returns empty array by default", () => {
    expect(selectInvitations(makeState())).toEqual([]);
  });

  it("returns the invitations array", () => {
    const invitations = [
      { id: "inv1", email: "test@example.com" } as TeamInvitation,
    ];
    expect(selectInvitations(makeState({ invitations }))).toBe(invitations);
  });
});

// ---------------------------------------------------------------------------
// selectInvitationsTotal
// ---------------------------------------------------------------------------

describe("selectInvitationsTotal", () => {
  it("returns 0 by default", () => {
    expect(selectInvitationsTotal(makeState())).toBe(0);
  });

  it("returns the total invitations count", () => {
    expect(selectInvitationsTotal(makeState({ invitationsTotal: 7 }))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// selectInviteLinks
// ---------------------------------------------------------------------------

describe("selectInviteLinks", () => {
  it("returns empty array by default", () => {
    expect(selectInviteLinks(makeState())).toEqual([]);
  });

  it("returns the invite links array", () => {
    const inviteLinks = [{ id: "link1", url: "https://example.com/invite/abc" } as InviteLink];
    expect(selectInviteLinks(makeState({ inviteLinks }))).toBe(inviteLinks);
  });
});

// ---------------------------------------------------------------------------
// selectBilling
// ---------------------------------------------------------------------------

describe("selectBilling", () => {
  it("returns null by default", () => {
    expect(selectBilling(makeState())).toBeNull();
  });

  it("returns the billing info", () => {
    const billing = { plan: "pro", status: "active" } as BillingInfo;
    expect(selectBilling(makeState({ billing }))).toBe(billing);
  });
});

// ---------------------------------------------------------------------------
// selectUsage
// ---------------------------------------------------------------------------

describe("selectUsage", () => {
  it("returns null by default", () => {
    expect(selectUsage(makeState())).toBeNull();
  });

  it("returns the usage statistics", () => {
    const usage = { messageCount: 1000 } as UsageStatistics;
    expect(selectUsage(makeState({ usage }))).toBe(usage);
  });
});

// ---------------------------------------------------------------------------
// selectExportRequests
// ---------------------------------------------------------------------------

describe("selectExportRequests", () => {
  it("returns empty array by default", () => {
    expect(selectExportRequests(makeState())).toEqual([]);
  });

  it("returns the export requests array", () => {
    const exportRequests = [
      { id: "exp1", status: "completed" } as TeamExportResult,
    ];
    expect(selectExportRequests(makeState({ exportRequests }))).toBe(
      exportRequests,
    );
  });

  it("returns multiple export requests", () => {
    const exportRequests = [
      { id: "exp1", status: "pending" } as TeamExportResult,
      { id: "exp2", status: "completed" } as TeamExportResult,
    ];
    expect(
      selectExportRequests(makeState({ exportRequests })),
    ).toHaveLength(2);
  });
});
