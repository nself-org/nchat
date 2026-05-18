/**
 * Tests for invite-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { InviteStore } from "../invite-store";
import {
  selectIsCreateModalOpen,
  selectCreateModalOptions,
  selectIsCreating,
  selectCreatedInvite,
  selectCreateError,
  selectInvitePreview,
  selectIsAccepting,
  selectAcceptError,
  selectAcceptSuccess,
  selectRecentInvites,
  selectActiveInvites,
  selectIsLoadingInvites,
  selectInvitesError,
  selectHasCreatedInvite,
  selectCanAccept,
} from "../invite-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): InviteStore {
  const defaultState = {
    isCreateModalOpen: false,
    createModalOptions: null,
    isCreating: false,
    createdInvite: null,
    createError: null,
    invitePreview: null,
    isAccepting: false,
    acceptError: null,
    acceptSuccess: false,
    recentInvites: [],
    activeInvites: [],
    isLoadingInvites: false,
    invitesError: null,
  };
  return { ...defaultState, ...overrides } as unknown as InviteStore;
}

// ---------------------------------------------------------------------------
// selectIsCreateModalOpen
// ---------------------------------------------------------------------------

describe("selectIsCreateModalOpen", () => {
  it("returns false by default", () => {
    expect(selectIsCreateModalOpen(makeState())).toBe(false);
  });

  it("returns true when modal is open", () => {
    expect(selectIsCreateModalOpen(makeState({ isCreateModalOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCreateModalOptions
// ---------------------------------------------------------------------------

describe("selectCreateModalOptions", () => {
  it("returns null by default", () => {
    expect(selectCreateModalOptions(makeState())).toBeNull();
  });

  it("returns the modal options when set", () => {
    const options = { type: "workspace", channelId: null } as never;
    expect(selectCreateModalOptions(makeState({ createModalOptions: options }))).toBe(options);
  });
});

// ---------------------------------------------------------------------------
// selectIsCreating
// ---------------------------------------------------------------------------

describe("selectIsCreating", () => {
  it("returns false by default", () => {
    expect(selectIsCreating(makeState())).toBe(false);
  });

  it("returns true when creating an invite", () => {
    expect(selectIsCreating(makeState({ isCreating: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCreatedInvite
// ---------------------------------------------------------------------------

describe("selectCreatedInvite", () => {
  it("returns null by default", () => {
    expect(selectCreatedInvite(makeState())).toBeNull();
  });

  it("returns the created invite when set", () => {
    const invite = { id: "inv1", code: "ABC123", type: "workspace" } as never;
    expect(selectCreatedInvite(makeState({ createdInvite: invite }))).toBe(invite);
  });
});

// ---------------------------------------------------------------------------
// selectCreateError
// ---------------------------------------------------------------------------

describe("selectCreateError", () => {
  it("returns null by default", () => {
    expect(selectCreateError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(
      selectCreateError(makeState({ createError: "Failed to create invite" })),
    ).toBe("Failed to create invite");
  });
});

// ---------------------------------------------------------------------------
// selectInvitePreview
// ---------------------------------------------------------------------------

describe("selectInvitePreview", () => {
  it("returns null by default", () => {
    expect(selectInvitePreview(makeState())).toBeNull();
  });

  it("returns the invite preview when set", () => {
    const preview = {
      code: "ABC123",
      invite: { id: "inv1" },
      isLoading: false,
      error: null,
    } as never;
    expect(selectInvitePreview(makeState({ invitePreview: preview }))).toBe(preview);
  });
});

// ---------------------------------------------------------------------------
// selectIsAccepting
// ---------------------------------------------------------------------------

describe("selectIsAccepting", () => {
  it("returns false by default", () => {
    expect(selectIsAccepting(makeState())).toBe(false);
  });

  it("returns true when accepting an invite", () => {
    expect(selectIsAccepting(makeState({ isAccepting: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectAcceptError
// ---------------------------------------------------------------------------

describe("selectAcceptError", () => {
  it("returns null by default", () => {
    expect(selectAcceptError(makeState())).toBeNull();
  });

  it("returns the error when set", () => {
    expect(
      selectAcceptError(makeState({ acceptError: "Invite expired" })),
    ).toBe("Invite expired");
  });
});

// ---------------------------------------------------------------------------
// selectAcceptSuccess
// ---------------------------------------------------------------------------

describe("selectAcceptSuccess", () => {
  it("returns false by default", () => {
    expect(selectAcceptSuccess(makeState())).toBe(false);
  });

  it("returns true when accept succeeded", () => {
    expect(selectAcceptSuccess(makeState({ acceptSuccess: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectRecentInvites
// ---------------------------------------------------------------------------

describe("selectRecentInvites", () => {
  it("returns empty array by default", () => {
    expect(selectRecentInvites(makeState())).toEqual([]);
  });

  it("returns the recentInvites array", () => {
    const recentInvites = [{ id: "inv1", code: "ABC" } as never];
    expect(selectRecentInvites(makeState({ recentInvites }))).toBe(recentInvites);
  });
});

// ---------------------------------------------------------------------------
// selectActiveInvites
// ---------------------------------------------------------------------------

describe("selectActiveInvites", () => {
  it("returns empty array by default", () => {
    expect(selectActiveInvites(makeState())).toEqual([]);
  });

  it("returns the activeInvites array", () => {
    const activeInvites = [{ id: "inv2", code: "XYZ" } as never];
    expect(selectActiveInvites(makeState({ activeInvites }))).toBe(activeInvites);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoadingInvites
// ---------------------------------------------------------------------------

describe("selectIsLoadingInvites", () => {
  it("returns false by default", () => {
    expect(selectIsLoadingInvites(makeState())).toBe(false);
  });

  it("returns true when loading invites", () => {
    expect(selectIsLoadingInvites(makeState({ isLoadingInvites: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectInvitesError
// ---------------------------------------------------------------------------

describe("selectInvitesError", () => {
  it("returns null by default", () => {
    expect(selectInvitesError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(
      selectInvitesError(makeState({ invitesError: "Failed to load invites" })),
    ).toBe("Failed to load invites");
  });
});

// ---------------------------------------------------------------------------
// selectHasCreatedInvite
// ---------------------------------------------------------------------------

describe("selectHasCreatedInvite", () => {
  it("returns false when createdInvite is null", () => {
    expect(selectHasCreatedInvite(makeState())).toBe(false);
  });

  it("returns true when createdInvite is set", () => {
    const createdInvite = { id: "inv1", code: "ABC" } as never;
    expect(selectHasCreatedInvite(makeState({ createdInvite }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCanAccept
// ---------------------------------------------------------------------------

describe("selectCanAccept", () => {
  it("returns false when invitePreview has invite set to null explicitly", () => {
    // When invite is explicitly null inside a preview, invite !== null is false
    const invitePreview = {
      code: "ABC",
      invite: null,
      isLoading: false,
      error: null,
    } as never;
    expect(selectCanAccept(makeState({ invitePreview }))).toBe(false);
  });

  it("returns false when invitePreview has an error", () => {
    const invitePreview = {
      code: "ABC",
      invite: { id: "inv1" },
      isLoading: false,
      error: { type: "expired" },
    } as never;
    expect(selectCanAccept(makeState({ invitePreview }))).toBe(false);
  });

  it("returns false when isAccepting is true", () => {
    const invitePreview = {
      code: "ABC",
      invite: { id: "inv1" },
      isLoading: false,
      error: null,
    } as never;
    expect(
      selectCanAccept(makeState({ invitePreview, isAccepting: true })),
    ).toBe(false);
  });

  it("returns true when preview is valid and not accepting", () => {
    const invitePreview = {
      code: "ABC",
      invite: { id: "inv1" },
      isLoading: false,
      error: null,
    } as never;
    expect(
      selectCanAccept(makeState({ invitePreview, isAccepting: false })),
    ).toBe(true);
  });
});
